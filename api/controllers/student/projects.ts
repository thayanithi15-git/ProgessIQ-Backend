import Project from '../../models/Project';
import { Request, Response } from 'express';

export const createProject = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const project = new Project({ ...req.body, studentId: user.id });
  await project.save();
  res.status(201).json({ project });
};

export const listStudentProjects = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const projects = await Project.find({ studentId: user.id });
  res.json({ projects });
};
