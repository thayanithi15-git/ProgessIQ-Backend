import { Request, Response } from 'express';
import SystemLog from '../models/SystemLog';

export const getSystemLogs = async (req: Request, res: Response) => {
  try {
    const { role, page = '1', limit = '10' } = req.query;

    const query: any = {};
    if (role && role !== 'all') {
      query.role = { $regex: new RegExp(`^${role}$`, 'i') };
    }

    const pageNumber = parseInt(page as string);
    const limitNumber = parseInt(limit as string);
    const skip = (pageNumber - 1) * limitNumber;

    const logs = await SystemLog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber);

    const total = await SystemLog.countDocuments(query);

    res.status(200).json({
      logs,
      total,
      page: pageNumber,
      totalPages: Math.ceil(total / limitNumber)
    });
  } catch (error) {
    console.error('Error fetching system logs:', error);
    res.status(500).json({ message: 'Error fetching system logs' });
  }
};
