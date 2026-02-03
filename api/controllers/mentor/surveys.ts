import { Request, Response } from 'express';
import Survey from '../../models/Survey';

export const createSurvey = async (req: Request, res: Response) => {
  const survey = new Survey({ ...req.body, mentorId: (req as any).user.id });
  await survey.save();
  res.status(201).json({ survey });
};

export const listSurveys = async (req: Request, res: Response) => {
  const mentorId = (req as any).user.id;
  const surveys = await Survey.find({ mentorId });
  res.json({ surveys });
};
