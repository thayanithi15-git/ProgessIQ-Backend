import { Request, Response } from 'express';
import Project from '../../models/Project';

export const listProjects = async (req: Request, res: Response) => {
  const { page = 1, limit = 20, search, status, sort, from, to } = req.query as any;
  const q: any = {};
  if (search) q.title = { $regex: search, $options: 'i' };
  if (status) q.status = status;
  if (from || to) {
    q.completedAt = {} as any;
    if (from) q.completedAt.$gte = new Date(from);
    if (to) q.completedAt.$lte = new Date(to);
  }

  let query = Project.find(q).populate('studentId mentorId');

  // sorting support, e.g. sort=completedAt:desc or title:asc
  if (sort) {
    const [field, dir] = sort.split(':');
    const order = dir === 'desc' ? -1 : 1;
    query = query.sort({ [field]: order });
  } else {
    query = query.sort({ createdAt: -1 });
  }

  const projects = await query.skip((page - 1) * limit).limit(Number(limit));
  const total = await Project.countDocuments(q);
  res.json({ projects, total });
};

export const viewProject = async (req: Request, res: Response) => {
  const project = await Project.findById(req.params.id).populate('studentId mentorId');
  if (!project) return res.status(404).json({ message: 'Not found' });
  res.json({ project });
};
