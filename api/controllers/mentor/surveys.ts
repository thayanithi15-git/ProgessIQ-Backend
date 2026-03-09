import { Request, Response } from 'express';
import Survey from '../../models/Survey';
import SurveyResponse from '../../models/SurveyResponse';
import Student from '../../models/Student';

export const createSurvey = async (req: Request, res: Response) => {
  try {
    const mentorId = (req as any).user.mentorId || (req as any).user.id;
    const { title, description, questions } = req.body;

    if (!title || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ success: false, message: 'Title and questions are required' });
    }

    const survey = new Survey({
      mentorId,
      title,
      description,
      questions: questions.filter((q: string) => typeof q === 'string' && q.trim()),
      status: 'Active'
    });
    await survey.save();

    res.status(201).json({
      success: true,
      data: {
        id: survey._id,
        title: survey.title,
        description: survey.description || '',
        questions: survey.questions,
        createdDate: survey.createdAt,
        respondents: 0,
        status: survey.status
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to create survey', error: error.message });
  }
};

export const listSurveys = async (req: Request, res: Response) => {
  try {
    const mentorId = (req as any).user.mentorId || (req as any).user.id;
    const surveys = await Survey.find({ mentorId }).sort({ createdAt: -1 });

    const surveyIds = surveys.map(s => s._id);
    const responseCounts = await SurveyResponse.aggregate([
      { $match: { surveyId: { $in: surveyIds } } },
      { $group: { _id: '$surveyId', respondents: { $sum: 1 } } }
    ]);
    const countMap: Record<string, number> = {};
    responseCounts.forEach((r) => { countMap[r._id.toString()] = r.respondents; });

    const data = surveys.map((s: any) => ({
      id: s._id,
      title: s.title,
      description: s.description || '',
      questions: s.questions || [],
      createdDate: s.createdAt,
      respondents: countMap[s._id.toString()] || 0,
      status: s.status || 'Active'
    }));

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch surveys', error: error.message });
  }
};

export const getSurveyResponses = async (req: Request, res: Response) => {
  try {
    const mentorId = (req as any).user.mentorId || (req as any).user.id;
    const { id } = req.params;

    const survey = await Survey.findOne({ _id: id, mentorId });
    if (!survey) {
      return res.status(404).json({ success: false, message: 'Survey not found' });
    }

    const responses = await SurveyResponse.find({ surveyId: id }).populate({
      path: 'studentId',
      populate: { path: 'userId', select: 'email' }
    });

    const data = responses.map((r: any) => ({
      responseId: r._id,
      student: {
        id: r.studentId?._id,
        name: `${r.studentId?.firstName || ''} ${r.studentId?.lastName || ''}`.trim(),
        email: r.studentId?.userId?.email || '',
        department: r.studentId?.department,
        year: r.studentId?.year
      },
      submittedAt: r.submittedAt,
      answers: (survey.questions || []).map((question: string, idx: number) => ({
        question,
        answer: r.answers?.[idx] || ''
      }))
    }));

    res.json({
      success: true,
      data: {
        survey: {
          id: survey._id,
          title: survey.title,
          questions: survey.questions || []
        },
        responses: data
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch survey responses', error: error.message });
  }
};
