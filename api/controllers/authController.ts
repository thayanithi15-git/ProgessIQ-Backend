import { Request, Response } from 'express';
import User from '../models/User';
import bcrypt from 'bcrypt';
import { signToken } from '../utils/jwt';

import SystemLog from '../models/SystemLog';

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });

  // Get full user detail logic can vary, let's look up using general User model to get basic info
  // Wait, if it's admin, mentor, or student, the User model only has role, email, passwordHash, isActive.
  // We need to fetch name. But the User model only has email and role!
  // I need to use `req.body.email` and figure out the name based on the role, or just use email as name if name isn't on User.
  // Actually, let's keep it simple: fetch the actual profile (Student, Mentor, Admin) to get the name.
  const user = await User.findOne({ email });
  console.log('User found:', user);
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });

  // Direct comparison instead of bcrypt
  const match = await bcrypt.compare(password, user.passwordHash);

  if (!match)
    return res.status(401).json({ message: 'Invalid credentials' });

  // Fetch name for log based on role
  let name = user.email;
  try {
    if (user.role === 'Student') {
      const Student = require('../models/Student').default;
      const profile = await Student.findOne({ userId: user._id });
      if (profile) name = `${profile.firstName} ${profile.lastName}`;
    } else if (user.role === 'Mentor') {
      const Mentor = require('../models/Mentor').default;
      const profile = await Mentor.findOne({ userId: user._id });
      if (profile) name = `${profile.firstName} ${profile.lastName}`;
    } else if (user.role === 'Admin') {
      const Admin = require('../models/Admin').default;
      const profile = await Admin.findOne({ userId: user._id });
      if (profile) name = profile.name || user.email;
    }
  } catch (err) {
    console.error('Error fetching name for log:', err);
  }

  // Record System Log
  try {
    await SystemLog.create({
      userId: user._id,
      name,
      email: user.email,
      role: user.role,
      action: 'LOGIN'
    });

    // Auto-delete to keep only 50 logs using a simple approach
    const logs = await SystemLog.find().sort({ createdAt: -1 }).skip(50);
    if (logs.length > 0) {
      const idsToDelete = logs.map(log => log._id);
      await SystemLog.deleteMany({ _id: { $in: idsToDelete } });
    }
  } catch (err) {
    console.error('Failed to write SystemLog:', err);
  }

  const token = signToken({ id: user._id, role: user.role });
  res.json({ token, role: user.role, userId: user._id });
};
