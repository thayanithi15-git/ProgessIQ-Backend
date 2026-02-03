import { Request, Response } from 'express';
import Approval from '../../models/Approval';

export const listApprovals = async (req: Request, res: Response) => {
  const mentorId = (req as any).user.id;
  const approvals = await Approval.find({ mentorId }).sort({ approvedAt: -1 });
  res.json({ approvals });
};

export const updateApproval = async (req: Request, res: Response) => {
  const mentorId = (req as any).user.id;
  const { id } = req.params;
  const { status, points, feedback } = req.body;
  const approval = await Approval.findById(id);
  if (!approval) return res.status(404).json({ message: 'Not found' });
  if (approval.mentorId.toString() !== mentorId) return res.status(403).json({ message: 'Forbidden' });
  approval.status = status;
  approval.feedback = feedback;
  approval.pointsAwarded = points;
  approval.approvedAt = status === 'Approved' ? new Date() : approval.approvedAt;
  await approval.save();
  res.json({ approval });
};
