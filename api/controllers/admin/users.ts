import { Request, Response } from 'express';
import User from '../../models/User';
import Student from '../../models/Student';
import Mentor from '../../models/Mentor';
import bcrypt from 'bcrypt';

export const listUsers = async (req: Request, res: Response) => {
  const { page = 1, limit = 20, search } = req.query as any;
  const q: any = {};
  if (search) q.email = { $regex: search, $options: 'i' };
  const users = await User.find(q).skip((page - 1) * limit).limit(Number(limit));
  const total = await User.countDocuments(q);
  res.json({ users, total });
};

export const viewUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = await User.findById(id);
  if (!user) return res.status(404).json({ message: 'Not found' });
  res.json({ user });
};

export const createStudentUser = async (req: Request, res: Response) => {
  const data = req.body;
  const password = data.password || 'ChangeMe123!';
  const existing = await User.findOne({ email: data.email });
  if (existing) return res.status(400).json({ message: 'Email exists' });
  const passwordHash = await bcrypt.hash(password, 10);
  const user = new User({ role: 'STUDENT', email: data.email, passwordHash });
  await user.save();

  const student = new Student({ ...data, userId: user._id });
  await student.save();
  res.status(201).json({ student, userId: user._id });
};

export const updateUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  const updated = await User.findByIdAndUpdate(id, req.body, { new: true });
  if (!updated) return res.status(404).json({ message: 'Not found' });
  res.json({ user: updated });
};

export const deleteUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = await User.findByIdAndDelete(id);
  if (!user) return res.status(404).json({ message: 'Not found' });
  res.json({ message: 'Deleted' });
};

export const createAdminUser = async (req: Request, res: Response) => {
  const data = req.body;
  const password = data.password || 'ChangeMeAdmin!';
  const existing = await User.findOne({ email: data.email });
  if (existing) return res.status(400).json({ message: 'Email exists' });
  const passwordHash = await bcrypt.hash(password, 10);
  const user = new User({ role: 'ADMIN', email: data.email, passwordHash });
  await user.save();
  res.status(201).json({ user });
};
