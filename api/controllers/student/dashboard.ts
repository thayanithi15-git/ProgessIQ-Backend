import { Request, Response } from 'express';
import Task from '../../models/Task';
import Project from '../../models/Project';
import DailyActivityLog from '../../models/DailyActivityLog';
import Point from '../../models/Point';

export const getStudentDashboard = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const tasks = await Task.find({ studentId: user.id });
  const projects = await Project.find({ studentId: user.id });
  const logs = await DailyActivityLog.find({ studentId: user.id });
  const points = await Point.find({ studentId: user.id });

  res.json({ tasks, projects, logs, points });
};
