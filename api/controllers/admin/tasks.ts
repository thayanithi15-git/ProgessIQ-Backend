import { Request, Response } from 'express';
import Task from '../../models/Task';

export const listTasks = async (req: Request, res: Response) => {
  const { page = 1, limit = 20 } = req.query as any;
  const tasks = await Task.find().skip((page - 1) * limit).limit(Number(limit)).populate('studentId mentorId');
  const total = await Task.countDocuments();
  res.json({ tasks, total });
};
