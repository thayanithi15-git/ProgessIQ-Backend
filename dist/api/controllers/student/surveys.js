"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSurveyResponse = exports.getSurveyResponses = exports.respondToSurvey = exports.getSurveyById = exports.listAvailableSurveys = void 0;
const Survey_1 = __importDefault(require("../../models/Survey"));
const SurveyResponse_1 = __importDefault(require("../../models/SurveyResponse"));
function normalizeQuestions(questions) {
    return (questions || []).map((q) => {
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
function getMentorName(survey) {
    const mentor = survey?.mentorId;
    if (!mentor)
        return 'Mentor';
    if (typeof mentor === 'string')
        return 'Mentor';
    if (mentor.name)
        return mentor.name;
    return 'Mentor';
}
/**
 * GET ALL SURVEYS POSTED BY MENTOR
 * GET /api/student/surveys
 */
const listAvailableSurveys = async (req, res) => {
    try {
        const studentId = req.user.studentId;
        const { limit = 20, skip = 0 } = req.query;
        const parsedLimit = parseInt(limit);
        const parsedSkip = parseInt(skip);
        // Get surveys posted for this student's mentor
        const surveys = await Survey_1.default.find()
            .populate('mentorId', 'name')
            .sort({ createdAt: -1 })
            .skip(parsedSkip)
            .limit(parsedLimit);
        // Get responses for this student
        const responses = await SurveyResponse_1.default.find({ studentId }).select('surveyId');
        const respondedSurveyIds = responses.map(r => r.surveyId.toString());
        // Add response status to surveys
        const surveysWithStatus = surveys.map(survey => {
            const surveyObj = survey.toObject();
            return {
                ...surveyObj,
                questions: normalizeQuestions(surveyObj.questions),
                hasResponded: respondedSurveyIds.includes(survey._id.toString()),
                postedBy: getMentorName(surveyObj)
            };
        });
        const total = await Survey_1.default.countDocuments();
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
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching surveys', error });
    }
};
exports.listAvailableSurveys = listAvailableSurveys;
/**
 * GET SINGLE SURVEY WITH QUESTIONS
 * GET /api/student/surveys/:id
 */
const getSurveyById = async (req, res) => {
    try {
        const studentId = req.user.studentId;
        const { id } = req.params;
        const survey = await Survey_1.default.findById(id).populate('mentorId', 'name');
        if (!survey) {
            return res.status(404).json({ success: false, message: 'Survey not found' });
        }
        // Check if student already responded
        const existingResponse = await SurveyResponse_1.default.findOne({ surveyId: id, studentId });
        res.json({
            success: true,
            data: {
                ...survey.toObject(),
                questions: normalizeQuestions(survey.toObject().questions),
                hasResponded: !!existingResponse,
                previousAnswer: existingResponse
                    ? existingResponse.answers.reduce((acc, ans, idx) => {
                        acc[idx] = ans;
                        return acc;
                    }, {})
                    : null,
                postedBy: getMentorName(survey.toObject())
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching survey', error });
    }
};
exports.getSurveyById = getSurveyById;
/**
 * RESPOND TO SURVEY / ANSWER QUESTIONS
 * POST /api/student/surveys/:id/respond
 */
const respondToSurvey = async (req, res) => {
    try {
        const studentId = req.user.studentId;
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
        const survey = await Survey_1.default.findById(id);
        if (!survey) {
            return res.status(404).json({ success: false, message: 'Survey not found' });
        }
        // Check if already responded
        const existingResponse = await SurveyResponse_1.default.findOne({ surveyId: id, studentId });
        if (existingResponse) {
            return res.status(400).json({ success: false, message: 'You have already responded to this survey' });
        }
        const response = new SurveyResponse_1.default({
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
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error submitting survey response', error });
    }
};
exports.respondToSurvey = respondToSurvey;
/**
 * GET ALL RESPONSES FOR A SURVEY (Questions and Answers)
 * GET /api/student/surveys/:id/responses
 */
const getSurveyResponses = async (req, res) => {
    try {
        const studentId = req.user.studentId;
        const { id } = req.params;
        const response = await SurveyResponse_1.default.findOne({ surveyId: id, studentId })
            .populate('surveyId', 'questions title');
        if (!response) {
            return res.status(404).json({ success: false, message: 'No response found for this survey' });
        }
        const survey = response.surveyId;
        // Format questions and answers together
        const normalizedQuestions = normalizeQuestions(survey.questions);
        const questionsWithAnswers = normalizedQuestions.map((question, index) => ({
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
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching survey responses', error });
    }
};
exports.getSurveyResponses = getSurveyResponses;
/**
 * UPDATE SURVEY RESPONSE
 * PUT /api/student/surveys/:id/respond
 */
const updateSurveyResponse = async (req, res) => {
    try {
        const studentId = req.user.studentId;
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
        const response = await SurveyResponse_1.default.findOneAndUpdate({ surveyId: id, studentId }, { answers: normalizedAnswers, updatedAt: new Date() }, { new: true });
        if (!response) {
            return res.status(404).json({ success: false, message: 'Response not found' });
        }
        res.json({
            success: true,
            message: 'Survey response updated',
            data: response
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error updating survey response', error });
    }
};
exports.updateSurveyResponse = updateSurveyResponse;
