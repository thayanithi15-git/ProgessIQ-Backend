import { Request, Response } from 'express';
import SystemLog from '../../models/SystemLog';

export const listLogs = async (req: Request, res: Response) => {
  const { page = 1, limit = 50 } = req.query as any;
  const logs = await SystemLog.find().sort({ timestamp: -1 }).skip((page - 1) * limit).limit(Number(limit));
  const total = await SystemLog.countDocuments();
  res.json({ logs, total });
};
