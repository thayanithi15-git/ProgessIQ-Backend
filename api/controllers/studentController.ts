import { Request, Response } from 'express';
import Task from '../models/Task';
import Project from '../models/Project';
import DailyActivityLog from '../models/DailyActivityLog';
import Point from '../models/Point';

export const getDashboard = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const tasks = await Task.find({ studentId: user.studentId });
  const projects = await Project.find({ studentId: user.studentId });
  const logs = await DailyActivityLog.find({ studentId: user.studentId });
  const points = await Point.find({ studentId: user.studentId });

  const chartData = {
    weeklyHours: [2, 4, 5, 3, 6, 0, 2],
    tasksCompletedByType: [
      { type: 'Task', count: tasks.filter(t => t.status === 'Completed').length },
      { type: 'Project', count: projects.filter(p => p.status === 'Completed').length }
    ],
    leaderboardSample: [
      { studentId: 's1', name: 'Alice', points: 420 },
      { studentId: 's2', name: 'Bob', points: 390 },
      { studentId: user.id, name: 'You', points: points.reduce((acc, p) => acc + p.points, 0) }
    ]
  };

  res.json({ tasks, projects, logs, points, chartData });
};

export const submitDailyLog = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { date, activity, hoursSpent } = req.body;
  const log = new DailyActivityLog({ studentId: user.studentId, date, activity, hoursSpent });
  await log.save();
  res.status(201).json({ log });
};