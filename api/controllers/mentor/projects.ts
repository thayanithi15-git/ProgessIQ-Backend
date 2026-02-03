import Project from '../../models/Project';
import { Request, Response } from 'express';

export const listMentorProjects = async (req: Request, res: Response) => {
  const mentorId = (req as any).user.id;
  const projects = await Project.find({ mentorId }).populate('studentId');
  res.json({ projects });
};
