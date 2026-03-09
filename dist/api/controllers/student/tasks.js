"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTaskFeedback = exports.submitTaskUpdate = exports.deleteTask = exports.updateTask = exports.getTaskById = exports.listStudentTasks = exports.createTask = void 0;
const Task_1 = __importDefault(require("../../models/Task"));
const Feedback_1 = __importDefault(require("../../models/Feedback"));
/**
 * CREATE TASK
 * POST /api/student/tasks
 */
const createTask = async (req, res) => {
    try {
        const studentId = req.user.studentId;
        const { mentorId, title, description, dueDate } = req.body;
        if (!mentorId || !title || !description || !dueDate) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }
        const task = new Task_1.default({
            studentId,
            mentorId,
            title,
            description,
            dueDate: new Date(dueDate),
            status: 'PENDING'
        });
        await task.save();
        res.status(201).json({
            success: true,
            message: 'Task created',
            data: task
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error creating task', error });
    }
};
exports.createTask = createTask;
/**
 * GET ALL TASKS
 * GET /api/student/tasks
 */
const listStudentTasks = async (req, res) => {
    try {
        const studentId = req.user.studentId;
        const { status, limit = 20, skip = 0 } = req.query;
        const filter = { studentId };
        if (status)
            filter.status = status;
        const tasks = await Task_1.default.find(filter)
            .populate('mentorId', 'firstName lastName')
            .sort({ dueDate: 1 })
            .skip(parseInt(skip))
            .limit(parseInt(limit));
        const total = await Task_1.default.countDocuments(filter);
        // Get feedback for each task
        const tasksWithFeedback = await Promise.all(tasks.map(async (task) => {
            const feedback = await Feedback_1.default.findOne({
                studentId,
                source: 'TASK',
                sourceId: task._id
            });
            const isOverdue = task.dueDate < new Date() && task.status !== 'COMPLETED';
            return {
                ...task.toObject(),
                feedback: feedback?.message || null,
                isOverdue
            };
        }));
        res.json({
            success: true,
            data: {
                tasks: tasksWithFeedback,
                pagination: {
                    total,
                    limit: parseInt(limit),
                    skip: parseInt(skip)
                }
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching tasks', error });
    }
};
exports.listStudentTasks = listStudentTasks;
/**
 * GET SINGLE TASK
 * GET /api/student/tasks/:id
 */
const getTaskById = async (req, res) => {
    try {
        const studentId = req.user.studentId;
        const { id } = req.params;
        const task = await Task_1.default.findOne({ _id: id, studentId }).populate('mentorId', 'firstName lastName');
        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }
        const feedback = await Feedback_1.default.findOne({
            studentId,
            source: 'TASK',
            sourceId: id
        }).populate('mentorId', 'firstName lastName email');
        const isOverdue = task.dueDate < new Date() && task.status !== 'COMPLETED';
        const mentorId = feedback?.mentorId;
        res.json({
            success: true,
            data: {
                ...task.toObject(),
                isOverdue,
                feedback: feedback ? {
                    id: feedback._id,
                    mentorName: `${mentorId?.firstName} ${mentorId?.lastName}`,
                    message: feedback.message,
                    createdAt: feedback.createdAt
                } : null
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching task', error });
    }
};
exports.getTaskById = getTaskById;
/**
 * UPDATE TASK
 * PUT /api/student/tasks/:id
 */
const updateTask = async (req, res) => {
    try {
        const studentId = req.user.studentId;
        const { id } = req.params;
        const task = await Task_1.default.findOne({ _id: id, studentId });
        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }
        // Allow update only if not completed
        if (task.status === 'COMPLETED') {
            return res.status(400).json({ success: false, message: 'Cannot update completed task' });
        }
        const updated = await Task_1.default.findByIdAndUpdate(id, req.body, { new: true });
        res.json({
            success: true,
            message: 'Task updated',
            data: updated
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error updating task', error });
    }
};
exports.updateTask = updateTask;
/**
 * DELETE TASK
 * DELETE /api/student/tasks/:id
 */
const deleteTask = async (req, res) => {
    try {
        const studentId = req.user.studentId;
        const { id } = req.params;
        const task = await Task_1.default.findOne({ _id: id, studentId });
        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }
        // Allow delete only if pending
        if (task.status !== 'PENDING') {
            return res.status(400).json({ success: false, message: 'Cannot delete task with this status' });
        }
        await Task_1.default.findByIdAndDelete(id);
        await Feedback_1.default.deleteOne({ sourceId: id, source: 'TASK' });
        res.json({
            success: true,
            message: 'Task deleted'
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error deleting task', error });
    }
};
exports.deleteTask = deleteTask;
/**
 * SUBMIT/COMPLETE TASK
 * PUT /api/student/tasks/:id/complete
 */
const submitTaskUpdate = async (req, res) => {
    try {
        const studentId = req.user.studentId;
        const { id } = req.params;
        const { completedAt } = req.body;
        const task = await Task_1.default.findOne({ _id: id, studentId });
        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }
        const updated = await Task_1.default.findByIdAndUpdate(id, {
            status: 'SUBMITTED',
            completedAt: completedAt || new Date()
        }, { new: true });
        res.json({
            success: true,
            message: 'Task submitted for review',
            data: updated
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error submitting task', error });
    }
};
exports.submitTaskUpdate = submitTaskUpdate;
/**
 * GET TASK FEEDBACK
 * GET /api/student/tasks/:id/feedback
 */
const getTaskFeedback = async (req, res) => {
    try {
        const studentId = req.user.studentId;
        const { id } = req.params;
        const feedback = await Feedback_1.default.findOne({
            studentId,
            source: 'TASK',
            sourceId: id
        }).populate('mentorId', 'firstName lastName email');
        if (!feedback) {
            return res.status(404).json({ success: false, message: 'No feedback found' });
        }
        const mentor = feedback.mentorId;
        res.json({
            success: true,
            data: {
                id: feedback._id,
                mentor: `${mentor?.firstName} ${mentor?.lastName}`,
                mentorEmail: mentor?.email,
                message: feedback.message,
                createdAt: feedback.createdAt,
                type: 'FEEDBACK'
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching feedback', error });
    }
};
exports.getTaskFeedback = getTaskFeedback;
