import express from 'express';
import { WebSocketServer } from 'ws';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { setupWebSocket } from './websockets/yjsHandler';
import { verifyToken } from './auth/jwt';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Basic API route
app.get('/', (req, res) => {
  res.send('CollabDocs Real-time API is running');
});

// Authentication Placeholder
app.post('/api/auth/login', (req, res) => {
  res.json({ token: 'dummy-jwt-token', user: { id: '123', name: 'Test User' } });
});

// Document CRUD Placeholder
app.post('/api/documents', (req, res) => {
  res.json({ id: `doc-${Date.now()}`, title: req.body.title || 'Untitled Document' });
});

const server = http.createServer(app);

// Custom WebSocket server setup without relying on y-websocket HTTP server
const wss = new WebSocketServer({ noServer: true });

wss.on('connection', (ws, req) => {
  setupWebSocket(ws, req);
});

// Handle upgrade requests manually to support authentication before creating a WebSocket connection
server.on('upgrade', (request, socket, head) => {
  const pathname = request.url;

  if (pathname?.startsWith('/yjs/')) {
    
    // 1. Extract token (e.g., from url query parameters like ?token=123)
    // For MVP we just allow connections, but a real auth check looks like this:
    /*
    const url = new URL(request.url, `ws://${request.headers.host}`);
    const token = url.searchParams.get('token');
    
    if (!token || !verifyToken(token)) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }
    // Check if user has access to `docId` in the database here...
    */
    
    // 2. Accept upgrade and pass the `ws` object to `setupWebSocket`
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });

  } else {
    socket.destroy();
  }
});

server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
