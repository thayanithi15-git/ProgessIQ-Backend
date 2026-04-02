"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProjectFeedback = exports.startProject = exports.submitProjectUpdate = exports.deleteProject = exports.updateProject = exports.getProjectById = exports.listStudentProjects = exports.createProject = void 0;
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
            status: 'PENDING',
            createdByMentor: false
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
        // Status mapping equivalent to front-end for students
        if (status) {
            if (status === 'ALL') {
                // no filter
            }
            else {
                filter.status = status;
            }
        }
        const projects = await Project_1.default.find(filter)
            .populate('mentorId', 'firstName lastName department')
            .sort({ createdAt: -1 })
            .skip(parseInt(skip))
            .limit(parseInt(limit));
        const total = await Project_1.default.countDocuments(filter);
        res.json({
            success: true,
            data: {
                projects,
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
        res.json({
            success: true,
            data: project
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
        // Allow update only if not approved or rejected or submitted
        if (['APPROVED', 'REJECTED', 'SUBMITTED'].includes(project.status)) {
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
        // Allow delete only if pending and not mentor created
        if (project.status !== 'PENDING') {
            return res.status(400).json({ success: false, message: 'Cannot delete project after it has been worked on' });
        }
        if (project.createdByMentor) {
            return res.status(403).json({ success: false, message: 'Cannot delete a project assigned by a mentor' });
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
 * SUBMIT PROJECT UPDATE
 * PUT /api/student/projects/:id/complete
 */
const submitProjectUpdate = async (req, res) => {
    try {
        const studentId = req.user.studentId;
        const { id } = req.params;
        const { completedAt, submissionNote, githubLink, websiteLink } = req.body;
        const project = await Project_1.default.findOne({ _id: id, studentId });
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }
        if (['APPROVED', 'SUBMITTED'].includes(project.status)) {
            return res.status(400).json({ success: false, message: 'Project already submitted or approved' });
        }
        const updated = await Project_1.default.findByIdAndUpdate(id, {
            status: 'SUBMITTED',
            completedAt: completedAt || new Date(),
            submissionNote: submissionNote || project.submissionNote || '',
            githubLink: githubLink !== undefined ? githubLink : project.githubLink,
            websiteLink: websiteLink !== undefined ? websiteLink : project.websiteLink,
        }, { new: true });
        res.json({
            success: true,
            message: 'Project submitted for review',
            data: updated
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error submitting project', error });
    }
};
exports.submitProjectUpdate = submitProjectUpdate;
/**
 * START PROJECT (mark In Progress)
 * PUT /api/student/projects/:id/start
 */
const startProject = async (req, res) => {
    try {
        const studentId = req.user.studentId;
        const { id } = req.params;
        const project = await Project_1.default.findOne({ _id: id, studentId });
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }
        if (project.status !== 'PENDING') {
            return res.status(400).json({ success: false, message: 'Project can only be started when PENDING' });
        }
        const updated = await Project_1.default.findByIdAndUpdate(id, { status: 'IN_PROGRESS' }, { new: true });
        res.json({
            success: true,
            message: 'Project started',
            data: updated
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error starting project', error });
    }
};
exports.startProject = startProject;
/**
 * GET PROJECT FEEDBACK/REJECTION REASON (Legacy/Compatibility)
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
