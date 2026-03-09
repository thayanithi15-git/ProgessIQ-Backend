"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSurveyResponse = exports.getSurveyResponses = exports.respondToSurvey = exports.getSurveyById = exports.listAvailableSurveys = void 0;
const Survey_1 = __importDefault(require("../../models/Survey"));
const SurveyResponse_1 = __importDefault(require("../../models/SurveyResponse"));
/**
 * GET ALL SURVEYS POSTED BY MENTOR
 * GET /api/student/surveys
 */
const listAvailableSurveys = async (req, res) => {
    try {
        const studentId = req.user.studentId;
        const { limit = 20, skip = 0, answered = false } = req.query;
        // Get surveys posted for this student's mentor
        const surveys = await Survey_1.default.find()
            .populate('createdBy', 'firstName lastName')
            .sort({ createdAt: -1 })
            .skip(parseInt(skip))
            .limit(parseInt(limit));
        // Get responses for this student
        const responses = await SurveyResponse_1.default.find({ studentId }).select('surveyId');
        const respondedSurveyIds = responses.map(r => r.surveyId.toString());
        const total = await Survey_1.default.countDocuments();
        // Add response status to surveys
        const surveysWithStatus = surveys.map(survey => ({
            ...survey.toObject(),
            hasResponded: respondedSurveyIds.includes(survey._id.toString()),
            postedBy: survey.createdBy?.firstName + ' ' + (survey.createdBy?.lastName || '')
        }));
        res.json({
            success: true,
            data: {
                surveys: surveysWithStatus,
                pagination: {
                    total,
                    limit: parseInt(limit),
                    skip: parseInt(skip)
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
        const survey = await Survey_1.default.findById(id).populate('createdBy', 'firstName lastName');
        if (!survey) {
            return res.status(404).json({ success: false, message: 'Survey not found' });
        }
        // Check if student already responded
        const existingResponse = await SurveyResponse_1.default.findOne({ surveyId: id, studentId });
        res.json({
            success: true,
            data: {
                ...survey.toObject(),
                hasResponded: !!existingResponse,
                previousAnswer: existingResponse ? existingResponse.answers : null,
                postedBy: survey.createdBy?.firstName + ' ' + (survey.createdBy?.lastName || '')
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
        if (!answers) {
            return res.status(400).json({ success: false, message: 'Answers are required' });
        }
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
            answers,
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
        const questionsWithAnswers = survey.questions.map((question, index) => ({
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
        if (!answers) {
            return res.status(400).json({ success: false, message: 'Answers are required' });
        }
        const response = await SurveyResponse_1.default.findOneAndUpdate({ surveyId: id, studentId }, { answers, updatedAt: new Date() }, { new: true });
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
