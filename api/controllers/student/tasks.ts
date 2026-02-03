import Task from '../../models/Task';
import { Request, Response } from 'express';

export const listStudentTasks = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const tasks = await Task.find({ studentId: user.id });
  res.json({ tasks });
};

export const submitTaskUpdate = async (req: Request, res: Response) => {
  const { id } = req.params;
  const update = await Task.findByIdAndUpdate(id, req.body, { new: true });
  if (!update) return res.status(404).json({ message: 'Not found' });
  res.json({ task: update });
};
