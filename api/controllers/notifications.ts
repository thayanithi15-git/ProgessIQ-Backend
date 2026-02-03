import { Request, Response } from 'express';
import Notification from '../models/Notification';

export const listNotifications = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const notifications = await Notification.find({ userId }).sort({ createdAt: -1 });
  res.json({ notifications });
};

export const createNotification = async (req: Request, res: Response) => {
  const { userId, message, type = 'INFO' } = req.body;
  const n = new Notification({ userId, message, type, read: false, createdAt: new Date() });
  await n.save();
  res.status(201).json({ n });
};

export const markRead = async (req: Request, res: Response) => {
  const { id } = req.params;
  const notification = await Notification.findById(id);
  if (!notification) return res.status(404).json({ message: 'Not found' });
  notification.read = true;
  await notification.save();
  res.json({ notification });
};
