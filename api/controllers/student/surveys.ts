import { Request, Response } from 'express';
import Survey from '../../models/Survey';
import SurveyResponse from '../../models/SurveyResponse';

type NormalizedSurveyQuestion = {
  question: string;
  type: 'TEXT' | 'MULTIPLE_CHOICE' | 'RATING' | 'YES_NO';
  options?: string[];
  required?: boolean;
};

function normalizeQuestions(questions: any[]): NormalizedSurveyQuestion[] {
  return (questions || []).map((q: any) => {
    if (typeof q === 'string') {
      return {
        question: q,
        type: 'TEXT',
        options: [],
        required: true
      };
    }

    return {
      question: q?.question || '',
      type: q?.type || 'TEXT',
      options: Array.isArray(q?.options) ? q.options : [],
      required: typeof q?.required === 'boolean' ? q.required : true
    };
  });
}

function getMentorName(survey: any): string {
  const mentor = survey?.mentorId;
  if (!mentor) return 'Mentor';
  if (typeof mentor === 'string') return 'Mentor';
  if (mentor.name) return mentor.name;
  return 'Mentor';
}

/**
 * GET ALL SURVEYS POSTED BY MENTOR
 * GET /api/student/surveys
 */
export const listAvailableSurveys = async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).user.studentId;
    const { limit = 20, skip = 0 } = req.query;
    const parsedLimit = parseInt(limit as string);
    const parsedSkip = parseInt(skip as string);

    // Get surveys posted for this student's mentor
    const surveys = await Survey.find()
      .populate('mentorId', 'name')
      .sort({ createdAt: -1 })
      .skip(parsedSkip)
      .limit(parsedLimit);

    // Get responses for this student
    const responses = await SurveyResponse.find({ studentId }).select('surveyId');
    const respondedSurveyIds = responses.map(r => r.surveyId.toString());

    // Add response status to surveys
    const surveysWithStatus = surveys.map(survey => {
      const surveyObj = survey.toObject() as any;
      return {
        ...surveyObj,
        questions: normalizeQuestions(surveyObj.questions),
        hasResponded: respondedSurveyIds.includes(survey._id.toString()),
        postedBy: getMentorName(surveyObj)
      };
    });
    const total = await Survey.countDocuments();

    res.json({
      success: true,
      data: {
        surveys: surveysWithStatus,
        pagination: {
          total,
          limit: parsedLimit,
          skip: parsedSkip
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching surveys', error });
  }
};

/**
 * GET SINGLE SURVEY WITH QUESTIONS
 * GET /api/student/surveys/:id
 */
export const getSurveyById = async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).user.studentId;
    const { id } = req.params;

    const survey = await Survey.findById(id).populate('mentorId', 'name');

    if (!survey) {
      return res.status(404).json({ success: false, message: 'Survey not found' });
    }

    // Check if student already responded
    const existingResponse = await SurveyResponse.findOne({ surveyId: id, studentId });

    res.json({
      success: true,
      data: {
        ...survey.toObject(),
        questions: normalizeQuestions((survey.toObject() as any).questions),
        hasResponded: !!existingResponse,
        previousAnswer: existingResponse
          ? existingResponse.answers.reduce((acc: Record<number, string>, ans: string, idx: number) => {
              acc[idx] = ans;
              return acc;
            }, {})
          : null,
        postedBy: getMentorName(survey.toObject())
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching survey', error });
  }
};

/**
 * RESPOND TO SURVEY / ANSWER QUESTIONS
 * POST /api/student/surveys/:id/respond
 */
export const respondToSurvey = async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).user.studentId;
    const { id } = req.params;
    const { answers } = req.body;

    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({ success: false, message: 'Answers are required' });
    }

    const normalizedAnswers = Object.keys(answers)
      .sort((a, b) => Number(a) - Number(b))
      .map((key) => {
        const value = answers[key];
        if (Array.isArray(value)) {
          return value.join(', ');
        }
        return String(value ?? '');
      });

    // Check if survey exists
    const survey = await Survey.findById(id);
    if (!survey) {
      return res.status(404).json({ success: false, message: 'Survey not found' });
    }

    // Check if already responded
    const existingResponse = await SurveyResponse.findOne({ surveyId: id, studentId });
    if (existingResponse) {
      return res.status(400).json({ success: false, message: 'You have already responded to this survey' });
    }

    const response = new SurveyResponse({
      surveyId: id,
      studentId,
      answers: normalizedAnswers,
      submittedAt: new Date()
    });

    await response.save();

    res.status(201).json({
      success: true,
      message: 'Survey response submitted',
      data: response
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error submitting survey response', error });
  }
};

/**
 * GET ALL RESPONSES FOR A SURVEY (Questions and Answers)
 * GET /api/student/surveys/:id/responses
 */
export const getSurveyResponses = async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).user.studentId;
    const { id } = req.params;

    const response = await SurveyResponse.findOne({ surveyId: id, studentId })
      .populate('surveyId', 'questions title');

    if (!response) {
      return res.status(404).json({ success: false, message: 'No response found for this survey' });
    }

    const survey = response.surveyId as any;

    // Format questions and answers together
    const normalizedQuestions = normalizeQuestions(survey.questions);
    const questionsWithAnswers = normalizedQuestions.map((question: any, index: number) => ({
      question,
      answer: response.answers[index],
      questionIndex: index
    }));

    res.json({
      success: true,
      data: {
        surveyId: id,
        surveyTitle: survey.title,
        questionsWithAnswers,
        submittedAt: response.submittedAt
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching survey responses', error });
  }
};

/**
 * UPDATE SURVEY RESPONSE
 * PUT /api/student/surveys/:id/respond
 */
export const updateSurveyResponse = async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).user.studentId;
    const { id } = req.params;
    const { answers } = req.body;

    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({ success: false, message: 'Answers are required' });
    }

    const normalizedAnswers = Object.keys(answers)
      .sort((a, b) => Number(a) - Number(b))
      .map((key) => {
        const value = answers[key];
        if (Array.isArray(value)) {
          return value.join(', ');
        }
        return String(value ?? '');
      });

    const response = await SurveyResponse.findOneAndUpdate(
      { surveyId: id, studentId },
      { answers: normalizedAnswers, updatedAt: new Date() },
      { new: true }
    );

    if (!response) {
      return res.status(404).json({ success: false, message: 'Response not found' });
    }

    res.json({
      success: true,
      message: 'Survey response updated',
      data: response
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating survey response', error });
  }
};
