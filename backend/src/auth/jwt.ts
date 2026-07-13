import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/env';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

/**
 * Validates a JWT token and returns the decoded user payload.
 */
export function verifyToken(token: string): AuthUser | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    return decoded;
  } catch (err) {
    return null;
  }
}
