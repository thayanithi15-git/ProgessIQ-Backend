import Task from '../../models/Task';
import { Request, Response } from 'express';

export const listMentorTasks = async (req: Request, res: Response) => {
  const mentorId = (req as any).user.id;
  const tasks = await Task.find({ mentorId }).populate('studentId');
  res.json({ tasks });
};
