"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProjectFeedback = exports.deleteProject = exports.updateProject = exports.getProjectById = exports.listStudentProjects = exports.createProject = void 0;
const Project_1 = __importDefault(require("../../models/Project"));
const Feedback_1 = __importDefault(require("../../models/Feedback"));
/**
 * CREATE PROJECT
 * POST /api/student/projects
 */
const createProject = async (req, res) => {
    try {
        const studentId = req.user.studentId;
        const { mentorId, title, description, githubLink, websiteLink, completedAt } = req.body;
        if (!mentorId || !title || !description) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }
        const project = new Project_1.default({
            studentId,
            mentorId,
            title,
            description,
            githubLink,
            websiteLink,
            completedAt: new Date(completedAt),
            status: 'PENDING'
        });
        await project.save();
        res.status(201).json({
            success: true,
            message: 'Project created',
            data: project
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error creating project', error });
    }
};
exports.createProject = createProject;
/**
 * GET ALL PROJECTS
 * GET /api/student/projects
 */
const listStudentProjects = async (req, res) => {
    try {
        const studentId = req.user.studentId;
        const { status, limit = 20, skip = 0 } = req.query;
        const filter = { studentId };
        if (status)
            filter.status = status;
        const projects = await Project_1.default.find(filter)
            .populate('mentorId', 'firstName lastName department')
            .sort({ createdAt: -1 })
            .skip(parseInt(skip))
            .limit(parseInt(limit));
        const total = await Project_1.default.countDocuments(filter);
        // Get feedback for each project
        const projectsWithFeedback = await Promise.all(projects.map(async (project) => {
            const feedback = await Feedback_1.default.findOne({
                studentId,
                source: 'PROJECT',
                sourceId: project._id
            });
            return {
                ...project.toObject(),
                feedback: feedback?.message || null
            };
        }));
        res.json({
            success: true,
            data: {
                projects: projectsWithFeedback,
                pagination: {
                    total,
                    limit: parseInt(limit),
                    skip: parseInt(skip)
                }
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching projects', error });
    }
};
exports.listStudentProjects = listStudentProjects;
/**
 * GET SINGLE PROJECT
 * GET /api/student/projects/:id
 */
const getProjectById = async (req, res) => {
    try {
        const studentId = req.user.studentId;
        const { id } = req.params;
        const project = await Project_1.default.findOne({ _id: id, studentId }).populate('mentorId', 'firstName lastName');
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }
        // Get feedback
        const feedback = await Feedback_1.default.findOne({
            studentId,
            source: 'PROJECT',
            sourceId: id
        }).populate('mentorId', 'firstName lastName');
        res.json({
            success: true,
            data: {
                ...project.toObject(),
                feedback: feedback ? {
                    id: feedback._id,
                    mentorName: `${feedback.mentorId?.firstName} ${feedback.mentorId?.lastName}`,
                    message: feedback.message,
                    createdAt: feedback.createdAt
                } : null
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching project', error });
    }
};
exports.getProjectById = getProjectById;
/**
 * UPDATE PROJECT
 * PUT /api/student/projects/:id
 */
const updateProject = async (req, res) => {
    try {
        const studentId = req.user.studentId;
        const { id } = req.params;
        const project = await Project_1.default.findOne({ _id: id, studentId });
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }
        // Allow update only if not approved or rejected
        if (project.status === 'APPROVED' || project.status === 'REJECTED') {
            return res.status(400).json({ success: false, message: 'Cannot update project with this status' });
        }
        const updated = await Project_1.default.findByIdAndUpdate(id, { ...req.body, status: 'PENDING' }, // Reset to pending on edit
        { new: true });
        res.json({
            success: true,
            message: 'Project updated',
            data: updated
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error updating project', error });
    }
};
exports.updateProject = updateProject;
/**
 * DELETE PROJECT
 * DELETE /api/student/projects/:id
 */
const deleteProject = async (req, res) => {
    try {
        const studentId = req.user.studentId;
        const { id } = req.params;
        const project = await Project_1.default.findOne({ _id: id, studentId });
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }
        // Allow delete only if pending
        if (project.status !== 'PENDING') {
            return res.status(400).json({ success: false, message: 'Cannot delete project with this status' });
        }
        await Project_1.default.findByIdAndDelete(id);
        await Feedback_1.default.deleteOne({ sourceId: id, source: 'PROJECT' });
        res.json({
            success: true,
            message: 'Project deleted'
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error deleting project', error });
    }
};
exports.deleteProject = deleteProject;
/**
 * GET PROJECT FEEDBACK/REJECTION REASON
 * GET /api/student/projects/:id/feedback
 */
const getProjectFeedback = async (req, res) => {
    try {
        const studentId = req.user.studentId;
        const { id } = req.params;
        const feedback = await Feedback_1.default.findOne({
            studentId,
            source: 'PROJECT',
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
                type: 'REJECTION'
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching feedback', error });
    }
};
exports.getProjectFeedback = getProjectFeedback;
