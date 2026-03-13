import { Request, Response } from 'express';
import Notification from '../models/Notification';

export const listNotifications = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const notifications = await Notification.find({ userId }).sort({ createdAt: -1 });
  res.json({ notifications });
};

import { NotificationService } from '../services/notificationService';

export const createNotification = async (req: Request, res: Response) => {
  try {
    const { userId, title, message, type = 'INFO', link, sendEmail = false } = req.body;
    
    const notification = await NotificationService.send({
      userId,
      title: title || 'New Notification', // Fallback title
      message,
      type,
      link,
      sendEmail
    });
    
    res.status(201).json({ success: true, notification });
  } catch (error: any) {
    console.error('Error creating notification:', error);
    res.status(500).json({ success: false, message: 'Failed to create notification', error: error.message });
  }
};

export const markRead = async (req: Request, res: Response) => {
  const { id } = req.params;
  const notification = await Notification.findById(id);
  if (!notification) return res.status(404).json({ message: 'Not found' });
  notification.read = true;
  await notification.save();
  res.json({ notification });
};
