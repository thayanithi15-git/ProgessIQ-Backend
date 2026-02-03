import { Request, Response } from 'express';
import Project from '../../models/Project';

export const listProjects = async (req: Request, res: Response) => {
  const { page = 1, limit = 20, search } = req.query as any;
  const q: any = {};
  if (search) q.title = { $regex: search, $options: 'i' };
  const projects = await Project.find(q).skip((page - 1) * limit).limit(Number(limit)).populate('studentId mentorId');
  const total = await Project.countDocuments(q);
  res.json({ projects, total });
};

export const viewProject = async (req: Request, res: Response) => {
  const project = await Project.findById(req.params.id).populate('studentId mentorId');
  if (!project) return res.status(404).json({ message: 'Not found' });
  res.json({ project });
};
