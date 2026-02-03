import { Request, Response } from 'express';
import User from '../models/User';
import bcrypt from 'bcrypt';
import { signToken } from '../utils/jwt';

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });

  const user = await User.findOne({ email });
  console.log('User found:', user);
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });

  // Direct comparison instead of bcrypt
  const match = password === user.passwordHash;
  if (!match) return res.status(401).json({ message: 'Invalid credentials' });

  const token = signToken({ id: user._id, role: user.role });
  res.json({ token, role: user.role, userId: user._id });
};
