const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');
const net = require('net');

// Paths
const envPath = path.join(__dirname, '../frontend/.env.local');

// Stored child processes
let backendChild = null;
let frontendChild = null;
let cleaningUp = false;

/**
 * Dynamically resolves whether cloudflared or cloudflared.exe is installed and available in PATH.
 */
function getCloudflaredCommand() {
  const isWin = process.platform === 'win32';
  const commands = isWin ? ['cloudflared.exe', 'cloudflared'] : ['cloudflared'];
  for (const cmd of commands) {
    try {
      execSync(`${cmd} --version`, { stdio: 'ignore' });
      return cmd;
    } catch (e) {
      // Move to next option
    }
  }
  return null;
}

/**
 * Checks if a local port is open/listening.
 */
function checkPort(port, host = 'localhost') {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1000);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}

/**
 * Safe, preservative environment file editor.
 * Replaces or appends only the VITE_API_URL line and preserves all other keys, spacing, or comments.
 */
function updateEnvFile(url, isFrontendRunning) {
  try {
    let content = '';
    if (fs.existsSync(envPath)) {
      content = fs.readFileSync(envPath, 'utf8');
    }

    const regex = /^VITE_API_URL=.*$/m;
    if (regex.test(content)) {
      content = content.replace(regex, `VITE_API_URL=${url}`);
    } else {
      if (content && !content.endsWith('\n')) {
        content += '\n';
      }
      content += `VITE_API_URL=${url}\n`;
    }

    fs.writeFileSync(envPath, content, 'utf8');
    console.log(`[Env Sync] Successfully updated VITE_API_URL in frontend/.env.local`);

    if (isFrontendRunning) {
      console.log('\x1b[33m%s\x1b[0m', `\n⚠️  [Warning] Frontend dev server appears active.
   Restart Vite to load updated tunnel environment variables.\n`);
    }
  } catch (error) {
    console.error(`[Env Sync] Failed to update frontend/.env.local:`, error.message);
  }
}

/**
 * Verifies public URL propagation by performing lightweight GET requests.
 * Retries up to maxRetries before giving up, checking if the domain is reachable.
 */
function verifyUrlReadiness(url, maxRetries = 5, delayMs = 1500) {
  return new Promise((resolve) => {
    let attempts = 0;

    function attempt() {
      attempts++;
      const req = https.get(url, { headers: { 'User-Agent': 'Cloudflared-Readiness-Check' } }, (res) => {
        // Any HTTP response (including errors like 404, 502, etc.) means the DNS and routing are active.
        resolve(true);
      });

      req.on('error', (err) => {
        if (attempts >= maxRetries) {
          resolve(false);
        } else {
          setTimeout(attempt, delayMs);
        }
      });

      req.setTimeout(2000, () => {
        req.destroy();
      });
    }
  });
}

/**
 * Spawns an individual Cloudflare tunnel child process.
 */
function spawnTunnel(cmd, name, port, onUrlFound) {
  return new Promise((resolve) => {
    console.log(`[Tunnel] Launching ${name} tunnel on port ${port}...`);

    const child = spawn(cmd, ['tunnel', '--url', `http://localhost:${port}`]);
    let urlFound = false;
    let logBuffer = '';

    const handleData = (data) => {
      const chunk = data.toString();
      logBuffer += chunk;

      // Keep log buffer bounded to avoid memory issues with long streams
      if (logBuffer.length > 20000) {
        logBuffer = logBuffer.substring(logBuffer.length - 20000);
      }

      // Strong regex for trycloudflare URL
      const match = logBuffer.match(/https:\/\/[^\s]+\.trycloudflare\.com/);
      if (match && !urlFound) {
        urlFound = true;
        const url = match[0].trim();
        console.log(`[Tunnel] ${name} public URL detected: ${url}`);
        onUrlFound(url).then((success) => {
          resolve({ child, url, success });
        });
      }
    };

    child.stdout.on('data', handleData);
    child.stderr.on('data', handleData);

    child.on('error', (err) => {
      console.error(`[Tunnel] Failed to spawn ${name} tunnel process:`, err.message);
      resolve({ child: null, url: null, success: false });
    });

    child.on('exit', (code) => {
      if (!urlFound) {
        console.error(`[Tunnel] ${name} tunnel process exited prematurely with code ${code}`);
        resolve({ child: null, url: null, success: false });
      } else {
        console.log(`[Tunnel] ${name} tunnel connection terminated (exit code ${code})`);
      }
    });
  });
}

/**
 * Hardened process lifecycle cleanup.
 */
function cleanup() {
  if (cleaningUp) return;
  cleaningUp = true;
  console.log('\n================================================');
  console.log('Shutting down active Cloudflare tunnels...');
  console.log('================================================');

  if (backendChild) {
    try {
      console.log('Terminating Backend tunnel process...');
      backendChild.kill('SIGTERM');
    } catch (e) {
      // Ignore cleanup error
    }
  }

  if (frontendChild) {
    try {
      console.log('Terminating Frontend tunnel process...');
      frontendChild.kill('SIGTERM');
    } catch (e) {
      // Ignore cleanup error
    }
  }

  setTimeout(() => {
    process.exit(0);
  }, 300);
}

// Cleanup hooks
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('uncaughtException', (err) => {
  console.error('[Fatal Error] Uncaught Exception in Tunnel Manager:', err);
  cleanup();
});
process.on('exit', () => {
  if (backendChild) {
    try { backendChild.kill(); } catch (e) {}
  }
  if (frontendChild) {
    try { frontendChild.kill(); } catch (e) {}
  }
});

async function main() {
  console.log('================================================');
  console.log('   CollabDocs Cloudflare Tunnel Automator       ');
  console.log('================================================');

  const cmd = getCloudflaredCommand();
  if (!cmd) {
    console.error('❌ Error: "cloudflared" or "cloudflared.exe" not found in system PATH.');
    console.error('Please install Cloudflare Tunnel before running this script.');
    console.error('Download link: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/');
    process.exit(1);
  }

  console.log(`[Environment] Located Cloudflare Tunnel binary: "${cmd}"`);

  // Server pre-flight validation
  const backendRunning = await checkPort(3001);
  const frontendRunning = await checkPort(5173);

  if (!backendRunning) {
    console.warn('⚠️  Warning: Local Backend server does not appear to be running on port 3001.');
    console.warn('   (Ensure "npm run dev" is running in /backend)');
  }
  if (!frontendRunning) {
    console.warn('⚠️  Warning: Local Frontend server does not appear to be running on port 5173.');
    console.warn('   (Ensure "npm run dev" is running in /frontend)');
  }

  // 1. Spawning Backend Tunnel
  const backendRes = await spawnTunnel(cmd, 'Backend', 3001, async (url) => {
    console.log(`[Readiness] Validating backend tunnel routing: ${url}...`);
    const ready = await verifyUrlReadiness(url);
    if (ready) {
      console.log(`[Readiness] Backend tunnel verified and active.`);
      updateEnvFile(url, frontendRunning);
      return true;
    } else {
      console.warn(`[Readiness] ⚠️ Backend tunnel readiness verification timed out. Using URL but routing might be delayed.`);
      updateEnvFile(url, frontendRunning);
      return false;
    }
  });

  if (backendRes.child) {
    backendChild = backendRes.child;
  }

  // 2. Spawning Frontend Tunnel
  const frontendRes = await spawnTunnel(cmd, 'Frontend', 5173, async (url) => {
    console.log(`[Readiness] Validating frontend tunnel routing: ${url}...`);
    const ready = await verifyUrlReadiness(url);
    if (ready) {
      console.log(`[Readiness] Frontend tunnel verified and active.`);
      return true;
    } else {
      console.warn(`[Readiness] ⚠️ Frontend tunnel readiness verification timed out. Routing might be delayed.`);
      return false;
    }
  });

  if (frontendRes.child) {
    frontendChild = frontendRes.child;
  }

  // Final visual card display
  console.log('\n================================================');
  console.log('            CollabDocs Tunnel Ready             ');
  console.log('================================================');

  if (frontendRes.success) {
    console.log(`Frontend: \x1b[36m${frontendRes.url}\x1b[0m`);
  } else if (frontendRes.url) {
    console.log(`Frontend (Unverified): \x1b[33m${frontendRes.url}\x1b[0m`);
  } else {
    console.log('Frontend: \x1b[31mFailed to launch tunnel\x1b[0m');
  }

  if (backendRes.success) {
    console.log(`Backend:  \x1b[36m${backendRes.url}\x1b[0m`);
  } else if (backendRes.url) {
    console.log(`Backend (Unverified):  \x1b[33m${backendRes.url}\x1b[0m`);
  } else {
    console.log('Backend:  \x1b[31mFailed to launch tunnel\x1b[0m');
  }

  console.log('\nShare this frontend URL with your collaborators.');
  console.log('================================================');
  console.log('                  ⚠️  IMPORTANT  ⚠️');
  console.log('  Restart the Vite frontend server after');
  console.log('  backend tunnel URL changes to guarantee');
  console.log('  the updated API configuration is loaded.');
  console.log('================================================');
  console.log('Press Ctrl+C to stop tunnels.');
  console.log('================================================\n');
}

main();
