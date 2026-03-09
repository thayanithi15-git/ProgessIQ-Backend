"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.awardPoints = exports.giveFeedback = exports.approveEntity = exports.getAssignedStudents = void 0;
const MentorStudentMapping_1 = __importDefault(require("../models/MentorStudentMapping"));
const Approval_1 = __importDefault(require("../models/Approval"));
const Feedback_1 = __importDefault(require("../models/Feedback"));
const Point_1 = __importDefault(require("../models/Point"));
const getAssignedStudents = async (req, res) => {
    const mentorId = req.query.mentorId;
    if (!mentorId)
        return res.status(400).json({ message: 'mentorId required' });
    const mappings = await MentorStudentMapping_1.default.find({ mentorId }).populate('studentId');
    res.json({ students: mappings.map(m => m.studentId) });
};
exports.getAssignedStudents = getAssignedStudents;
const approveEntity = async (req, res) => {
    const { entityType, entityId, studentId, status } = req.body;
    if (!entityType || !entityId || !studentId || !status)
        return res.status(400).json({ message: 'Invalid payload' });
    const approval = new Approval_1.default({ entityType, entityId, studentId, mentorId: req.user.id, status });
    await approval.save();
    res.json({ approval });
};
exports.approveEntity = approveEntity;
const giveFeedback = async (req, res) => {
    const { studentId, message } = req.body;
    if (!studentId || !message)
        return res.status(400).json({ message: 'Invalid payload' });
    const feedback = new Feedback_1.default({ studentId, mentorId: req.user.id, message });
    await feedback.save();
    res.json({ feedback });
};
exports.giveFeedback = giveFeedback;
const awardPoints = async (req, res) => {
    const { studentId, source, points } = req.body;
    if (!studentId || !source || typeof points !== 'number')
        return res.status(400).json({ message: 'Invalid payload' });
    const point = new Point_1.default({ studentId, source, points });
    await point.save();
    res.json({ point });
};
exports.awardPoints = awardPoints;
