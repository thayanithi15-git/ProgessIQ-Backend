"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSurveyResponses = exports.listSurveys = exports.createSurvey = void 0;
const Survey_1 = __importDefault(require("../../models/Survey"));
const SurveyResponse_1 = __importDefault(require("../../models/SurveyResponse"));
const Student_1 = __importDefault(require("../../models/Student"));
const MentorStudentMapping_1 = __importDefault(require("../../models/MentorStudentMapping"));
const notificationService_1 = require("../../services/notificationService");
const createSurvey = async (req, res) => {
    try {
        const mentorId = req.user.mentorId || req.user.id;
        const { title, description, questions } = req.body;
        if (!title || !Array.isArray(questions) || questions.length === 0) {
            return res.status(400).json({ success: false, message: 'Title and questions are required' });
        }
        const survey = new Survey_1.default({
            mentorId,
            title,
            description,
            questions: questions.filter((q) => typeof q === 'string' && q.trim()),
            status: 'Active'
        });
        await survey.save();
        // Notify all assigned students
        const mappings = await MentorStudentMapping_1.default.find({ mentorId, isActive: true }).select('studentId');
        if (mappings.length > 0) {
            const studentIds = mappings.map((m) => m.studentId);
            const studentsToNotify = await Student_1.default.find({ _id: { $in: studentIds } });
            for (const st of studentsToNotify) {
                if (st.userId) {
                    await notificationService_1.NotificationService.send({
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
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to create survey', error: error.message });
    }
};
exports.createSurvey = createSurvey;
const listSurveys = async (req, res) => {
    try {
        const mentorId = req.user.mentorId || req.user.id;
        const { page = 1, limit = 20, search = '', status } = req.query;
        const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
        const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
        const skip = (parsedPage - 1) * parsedLimit;
        const filter = { mentorId };
        if (status)
            filter.status = status;
        if (search) {
            filter.$or = [
                { title: { $regex: String(search), $options: 'i' } },
                { description: { $regex: String(search), $options: 'i' } }
            ];
        }
        const [surveys, total] = await Promise.all([
            Survey_1.default.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parsedLimit),
            Survey_1.default.countDocuments(filter)
        ]);
        const surveyIds = surveys.map(s => s._id);
        const responseCounts = await SurveyResponse_1.default.aggregate([
            { $match: { surveyId: { $in: surveyIds } } },
            { $group: { _id: '$surveyId', respondents: { $sum: 1 } } }
        ]);
        const countMap = {};
        responseCounts.forEach((r) => { countMap[r._id.toString()] = r.respondents; });
        const data = surveys.map((s) => ({
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
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch surveys', error: error.message });
    }
};
exports.listSurveys = listSurveys;
const getSurveyResponses = async (req, res) => {
    try {
        const mentorId = req.user.mentorId || req.user.id;
        const { id } = req.params;
        const { page = 1, limit = 20, search = '', department, year } = req.query;
        const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
        const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
        const survey = await Survey_1.default.findOne({ _id: id, mentorId });
        if (!survey) {
            return res.status(404).json({ success: false, message: 'Survey not found' });
        }
        const responses = await SurveyResponse_1.default.find({ surveyId: id }).populate({
            path: 'studentId',
            populate: { path: 'userId', select: 'email' }
        });
        let data = responses.map((r) => ({
            responseId: r._id,
            student: {
                id: r.studentId?._id,
                name: `${r.studentId?.firstName || ''} ${r.studentId?.lastName || ''}`.trim(),
                email: r.studentId?.userId?.email || '',
                department: r.studentId?.department,
                year: r.studentId?.year
            },
            submittedAt: r.submittedAt,
            answers: (survey.questions || []).map((question, idx) => ({
                question,
                answer: r.answers?.[idx] || ''
            }))
        }));
        if (department)
            data = data.filter((row) => row.student.department === department);
        if (year)
            data = data.filter((row) => row.student.year === year);
        if (search) {
            const q = String(search).toLowerCase();
            data = data.filter((row) => row.student.name.toLowerCase().includes(q) ||
                row.student.email.toLowerCase().includes(q) ||
                row.answers.some((a) => String(a.answer || '').toLowerCase().includes(q)));
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
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch survey responses', error: error.message });
    }
};
exports.getSurveyResponses = getSurveyResponses;
