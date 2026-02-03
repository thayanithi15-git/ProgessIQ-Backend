import { Request, Response } from 'express';
import Survey from '../../models/Survey';
import SurveyResponse from '../../models/SurveyResponse';

export const listAvailableSurveys = async (req: Request, res: Response) => {
  const surveys = await Survey.find();
  res.json({ surveys });
};

export const respondToSurvey = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;
  const { answers } = req.body;
  const s = new SurveyResponse({ surveyId: id, studentId: user.id, answers, submittedAt: new Date() });
  await s.save();
  res.status(201).json({ response: s });
};
