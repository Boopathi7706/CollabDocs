import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from the backend's .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const requiredEnvVars = [
  { name: 'DATABASE_URL', val: process.env.DATABASE_URL },
  { name: 'JWT_SECRET', val: process.env.JWT_SECRET },
  { name: 'PORT', val: process.env.PORT },
  { name: 'CORS_ORIGIN', val: process.env.CORS_ORIGIN },
  { name: 'FRONTEND_URL', val: process.env.FRONTEND_URL },
];

const missing = requiredEnvVars.filter(v => !v.val);
if (missing.length > 0) {
  const errorMsg = `CRITICAL CONFIGURATION ERROR: The following required environment variables are missing:\n${missing.map(m => ` - ${m.name}`).join('\n')}\nPlease configure them in your backend .env file.`;
  console.error(errorMsg);
  throw new Error(errorMsg);
}

// Validate NODE_ENV if provided; default to 'development'
const VALID_NODE_ENVS = ['development', 'test', 'production'] as const;
type NodeEnv = typeof VALID_NODE_ENVS[number];
const rawNodeEnv = process.env.NODE_ENV || 'development';
if (!VALID_NODE_ENVS.includes(rawNodeEnv as NodeEnv)) {
  throw new Error(
    `Invalid NODE_ENV value: "${rawNodeEnv}". Must be one of: ${VALID_NODE_ENVS.join(', ')}`
  );
}
export const NODE_ENV: NodeEnv = rawNodeEnv as NodeEnv;

export const PORT = parseInt(process.env.PORT!, 10);
export const DATABASE_URL = process.env.DATABASE_URL!;
export const JWT_SECRET = process.env.JWT_SECRET!;
export const FRONTEND_URL = process.env.FRONTEND_URL!;

export const CORS_ORIGIN = process.env.CORS_ORIGIN!;
export const CORS_ORIGINS = CORS_ORIGIN.split(',').map(origin => origin.trim());
