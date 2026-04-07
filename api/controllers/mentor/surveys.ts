import { Request, Response } from 'express';
import Survey from '../../models/Survey';
import SurveyResponse from '../../models/SurveyResponse';
import Student from '../../models/Student';
import MentorStudentMapping from '../../models/MentorStudentMapping';
import { NotificationService } from '../../services/notificationService';

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

    const mappings = await MentorStudentMapping.find({ mentorId, isActive: true }).select('studentId');
    if (mappings.length > 0) {
      const studentIds = mappings.map((m: any) => m.studentId);
      const studentsToNotify = await Student.find({ _id: { $in: studentIds } });

      for (const st of studentsToNotify) {
        if (st.userId) {
          await NotificationService.send({
            userId: st.userId.toString(),
            title: 'New Survey Available',
            message: `A new survey "${title}" has been published by your mentor.`,
            type: 'SURVEY',
            sendEmail: true
          });
        }
      }
    }

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
    const {
      page = 1,
      limit = 20,
      search = '',
      status
    } = req.query as any;
    const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const skip = (parsedPage - 1) * parsedLimit;

    const filter: any = { mentorId };
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { title: { $regex: String(search), $options: 'i' } },
        { description: { $regex: String(search), $options: 'i' } }
      ];
    }

    const [surveys, total] = await Promise.all([
      Survey.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parsedLimit),
      Survey.countDocuments(filter)
    ]);

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

    res.json({
      success: true,
      data,
      pagination: {
        total,
        page: parsedPage,
        limit: parsedLimit,
        totalPages: Math.ceil(total / parsedLimit)
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch surveys', error: error.message });
  }
};

export const getSurveyResponses = async (req: Request, res: Response) => {
  try {
    const mentorId = (req as any).user.mentorId || (req as any).user.id;
    const { id } = req.params;
    const {
      page = 1,
      limit = 20,
      search = '',
      department,
      year
    } = req.query as any;
    const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

    const survey = await Survey.findOne({ _id: id, mentorId });
    if (!survey) {
      return res.status(404).json({ success: false, message: 'Survey not found' });
    }

    const responses = await SurveyResponse.find({ surveyId: id }).populate({
      path: 'studentId',
      populate: { path: 'userId', select: 'email' }
    });

    let data = responses.map((r: any) => ({
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

    if (department) data = data.filter((row: any) => row.student.department === department);
    if (year) data = data.filter((row: any) => row.student.year === year);
    if (search) {
      const q = String(search).toLowerCase();
      data = data.filter((row: any) =>
        row.student.name.toLowerCase().includes(q) ||
        row.student.email.toLowerCase().includes(q) ||
        row.answers.some((a: any) => String(a.answer || '').toLowerCase().includes(q))
      );
    }

    const total = data.length;
    const paginated = data.slice((parsedPage - 1) * parsedLimit, parsedPage * parsedLimit);

    res.json({
      success: true,
      data: {
        survey: {
          id: survey._id,
          title: survey.title,
          questions: survey.questions || []
        },
        responses: paginated
      },
      pagination: {
        total,
        page: parsedPage,
        limit: parsedLimit,
        totalPages: Math.ceil(total / parsedLimit)
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch survey responses', error: error.message });
  }
};
