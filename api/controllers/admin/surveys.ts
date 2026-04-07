import { Request, Response } from 'express';
import Survey from '../../models/Survey';
import SurveyResponse from '../../models/SurveyResponse';
import Mentor from '../../models/Mentor';
import Student from '../../models/Student';

export const listSurveys = async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '20', status = '' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    const filter: any = {};
    if (status && status !== 'all') filter.status = status;

    const surveys: any[] = await Survey.find(filter)
      .populate('mentorId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    const total = await Survey.countDocuments(filter);

    const responseCounts = await SurveyResponse.aggregate([
      { $match: { surveyId: { $in: surveys.map(s => s._id) } } },
      { $group: { _id: '$surveyId', count: { $sum: 1 } } }
    ]);

    const countsMap: Record<string, number> = {};
    responseCounts.forEach(rc => { countsMap[rc._id.toString()] = rc.count; });

    const mapped = surveys.map(s => ({
      id: s._id,
      title: s.title,
      description: s.description,
      status: s.status,
      createdAt: s.createdAt,
      mentor: s.mentorId ? {
        name: `${s.mentorId.firstName} ${s.mentorId.lastName}`,
        email: s.mentorId.email
      } : null,
      questions: s.questions,
      respondents: countsMap[s._id.toString()] || 0
    }));

    res.json({
      surveys: mapped,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

export const viewSurveyResponses = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { department = '', year = '' } = req.query;

    const survey = await Survey.findById(id);
    if (!survey) return res.status(404).json({ message: 'Survey not found' });

    const filter: any = { surveyId: id };

    const studentFilter: any = {};
    if (department && department !== 'all') studentFilter.department = department;
    if (year && year !== 'all') studentFilter.year = year;

    if (Object.keys(studentFilter).length > 0) {
      const students = await Student.find(studentFilter).select('_id');
      filter.studentId = { $in: students.map(s => s._id) };
    }

    const responses: any[] = await SurveyResponse.find(filter)
      .populate('studentId', 'firstName lastName department year email')
      .sort({ submittedAt: -1 });

    const mapped = responses.map(r => ({
      id: r._id,
      submittedAt: r.submittedAt,
      student: r.studentId ? {
        name: `${r.studentId.firstName} ${r.studentId.lastName}`,
        department: r.studentId.department,
        year: r.studentId.year,
        email: r.studentId.email
      } : null,
      answers: r.answers.map((ans: string, idx: number) => ({
        question: (survey as any).questions[idx] || `Question ${idx + 1}`,
        answer: ans
      }))
    }));

    res.json({ responses: mapped });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};
