import { Request, Response } from 'express';
import MentorStudentMapping from '../models/MentorStudentMapping';
import Student from '../models/Student';
import Approval from '../models/Approval';
import Feedback from '../models/Feedback';
import Point from '../models/Point';

export const getAssignedStudents = async (req: Request, res: Response) => {
  const mentorId = req.query.mentorId as string;
  if (!mentorId) return res.status(400).json({ message: 'mentorId required' });

  const mappings = await MentorStudentMapping.find({ mentorId }).populate('studentId');
  res.json({ students: mappings.map(m => m.studentId) });
};

export const approveEntity = async (req: Request, res: Response) => {
  const { entityType, entityId, studentId, status } = req.body;
  if (!entityType || !entityId || !studentId || !status) return res.status(400).json({ message: 'Invalid payload' });
  const approval = new Approval({ entityType, entityId, studentId, mentorId: (req as any).user.id, status });
  await approval.save();
  res.json({ approval });
};

export const giveFeedback = async (req: Request, res: Response) => {
  const { studentId, message } = req.body;
  if (!studentId || !message) return res.status(400).json({ message: 'Invalid payload' });
  const feedback = new Feedback({ studentId, mentorId: (req as any).user.id, message });
  await feedback.save();
  res.json({ feedback });
};

export const awardPoints = async (req: Request, res: Response) => {
  const { studentId, source, points } = req.body;
  if (!studentId || !source || typeof points !== 'number') return res.status(400).json({ message: 'Invalid payload' });
  const point = new Point({ studentId, source, points });
  await point.save();
  res.json({ point });
};