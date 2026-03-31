import { Request, Response } from 'express';
import * as authService from '../services/authService';

export async function register(req: Request, res: Response) {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Missing required explicit fields' });
    }

    const unsecureUser = await authService.registerUser(email, password, name);
    res.status(201).json({ message: 'User explicitly created successfully', user: unsecureUser });
  } catch (err: any) {
    if (err.code === '23505') { // Postgres duplicate unique violation
      return res.status(409).json({ error: 'Email directly conflicts with existing record' });
    }
    console.error(`[AuthControl] User registration failed:`, err);
    res.status(500).json({ error: 'Failed registering explicit node' });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const { token, user } = await authService.loginUser(email, password);
    res.json({ token, user });
  } catch (err: any) {
    if (err.message === 'Invalid email or password') {
      return res.status(401).json({ error: err.message });
    }
    console.error(`[AuthControl] Auth logic failed:`, err);
    res.status(500).json({ error: 'Login node execution randomly failed' });
  }
}
