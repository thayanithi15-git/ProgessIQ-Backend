import { Request, Response } from 'express';
import User from '../../models/User';
import Student from '../../models/Student';
import Mentor from '../../models/Mentor';
import bcrypt from 'bcrypt';

export const listUsers = async (req: Request, res: Response) => {
  const { page = 1, limit = 10, role, isActive, email } = req.query as any;
  const q: any = {};

  if (email) q.email = { $regex: email, $options: 'i' };
  if (role && role !== 'all') q.role = role;
  if (isActive !== undefined) q.isActive = isActive === 'true';

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);

  const users = await User.find(q)
    .sort({ createdAt: -1 })
    .skip((pageNum - 1) * limitNum)
    .limit(limitNum);

  const total = await User.countDocuments(q);

  res.json({
    users,
    total,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum)
  });
};

export const viewUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = await User.findById(id);
  if (!user) return res.status(404).json({ message: 'Not found' });
  res.json({ user });
};

export const createStudentUser = async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const password = data.password || 'ChangeMe123!';
    const existing = await User.findOne({ email: data.email });
    if (existing) return res.status(400).json({ message: 'Email exists' });
    const passwordHash = await bcrypt.hash(password, 10);
    const user = new User({ role: 'STUDENT', email: data.email, passwordHash });
    await user.save();

    try {
      const student = new Student({ ...data, userId: user._id });
      await student.save();
      res.status(201).json({ student, userId: user._id });
    } catch (studentError: any) {
      await User.findByIdAndDelete(user._id);
      return res.status(400).json({ message: studentError.message || 'Failed to create student details' });
    }
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
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
