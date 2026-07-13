import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import { query } from '../config/db';

import { JWT_SECRET } from '../config/env';

export async function registerUser(email: string, passwordRaw: string, name: string) {
  // Hash password using bcrypt
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(passwordRaw, saltRounds);

  // Generate UUID
  const id = uuid();

  // Insert into users table
  await query(
    `INSERT INTO users (id, email, name, password) VALUES ($1, $2, $3, $4)`,
    [id, email, name, passwordHash]
  );

  return { id, email, name };
}

export async function loginUser(email: string, passwordRaw: string) {
  // Find user by email
  const userRes = await query(
    `SELECT id, email, name, password FROM users WHERE email = $1`,
    [email]
  );
  
  if (userRes.rows.length === 0) {
    throw new Error('Invalid email or password');
  }

  const user = userRes.rows[0];

  // Compare password using bcrypt
  const isValid = await bcrypt.compare(passwordRaw, user.password);
  if (!isValid) {
    throw new Error('Invalid email or password');
  }

  // Return JWT token
  const token = jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  return {
    token,
    user: { id: user.id, email: user.email, name: user.name }
  };
}
