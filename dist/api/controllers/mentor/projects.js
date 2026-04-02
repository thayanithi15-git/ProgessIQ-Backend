"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyMentorProject = exports.deleteMentorProject = exports.updateMentorProject = exports.createMentorProject = exports.getMentorProjectById = exports.listMentorProjects = void 0;
const Project_1 = __importDefault(require("../../models/Project"));
const Feedback_1 = __importDefault(require("../../models/Feedback"));
const MentorStudentMapping_1 = __importDefault(require("../../models/MentorStudentMapping"));
const Point_1 = __importDefault(require("../../models/Point"));
const Student_1 = __importDefault(require("../../models/Student"));
const notificationService_1 = require("../../services/notificationService");
const getMentorId = (req) => req.user.mentorId || req.user.id;
// ========================
// LIST PROJECTS
// ========================
const listMentorProjects = async (req, res) => {
    try {
        const mentorId = getMentorId(req);
        const { page = 1, limit = 20, search = '', status, studentId, department, year, fromDate, toDate, sortBy = 'completedAt', sortOrder = 'desc' } = req.query;
        const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
        const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
        const skip = (parsedPage - 1) * parsedLimit;
        const projects = await Project_1.default.find({ mentorId }).populate({
            path: 'studentId',
            populate: { path: 'userId', select: 'email' }
        });
        let data = await Promise.all(projects.map(async (p) => {
            const feedback = await Feedback_1.default.findOne({ studentId: p.studentId?._id, mentorId, source: 'PROJECT', sourceId: p._id });
            const displayStatus = p.status === 'APPROVED' ? 'Approved'
                : p.status === 'SUBMITTED' ? 'Submitted'
                    : p.status === 'REJECTED' ? 'Rejected'
                        : p.status === 'IN_PROGRESS' ? 'In Progress'
                            : 'Pending';
            const completionRate = p.status === 'APPROVED' ? 100
                : p.status === 'SUBMITTED' ? 70
                    : p.status === 'IN_PROGRESS' ? 40
                        : p.status === 'REJECTED' ? 0
                            : 10;
            return {
                id: p._id,
                title: p.title,
                description: p.description,
                status: displayStatus,
                rawStatus: p.status,
                studentsCount: 1,
                completionRate,
                createdDate: p.completedAt || p.createdAt || new Date(),
                createdByMentor: p.createdByMentor || false,
                student: {
                    id: p.studentId?._id,
                    name: `${p.studentId?.firstName || ''} ${p.studentId?.lastName || ''}`.trim(),
                    email: p.studentId?.userId?.email || '',
                    department: p.studentId?.department,
                    year: p.studentId?.year
                },
                links: { github: p.githubLink, website: p.websiteLink },
                submissionNote: p.submissionNote || null,
                verificationNote: p.verificationNote || null,
                pointsAwarded: p.pointsAwarded || 0,
                verifiedAt: p.verifiedAt || null,
                feedback: feedback?.message || null
            };
        }));
        if (status) {
            const normalized = String(status).toLowerCase();
            data = data.filter((p) => {
                const row = String(p.rawStatus || '').toLowerCase();
                if (normalized === 'approved' || normalized === 'completed')
                    return row === 'approved';
                if (normalized === 'pending')
                    return row === 'pending';
                if (normalized === 'rejected')
                    return row === 'rejected';
                if (normalized === 'submitted')
                    return row === 'submitted';
                if (normalized === 'in_progress' || normalized === 'in progress')
                    return row === 'in_progress';
                return row === normalized;
            });
        }
        if (studentId)
            data = data.filter((p) => p.student?.id?.toString() === String(studentId));
        if (department)
            data = data.filter((p) => p.student?.department === department);
        if (year)
            data = data.filter((p) => p.student?.year === year);
        if (fromDate) {
            const from = new Date(String(fromDate));
            if (!Number.isNaN(from.getTime()))
                data = data.filter((p) => new Date(p.createdDate).getTime() >= from.getTime());
        }
        if (toDate) {
            const to = new Date(String(toDate));
            if (!Number.isNaN(to.getTime()))
                data = data.filter((p) => new Date(p.createdDate).getTime() <= to.getTime());
        }
        if (search) {
            const q = String(search).toLowerCase();
            data = data.filter((p) => p.title.toLowerCase().includes(q) ||
                p.description.toLowerCase().includes(q) ||
                p.student?.name?.toLowerCase().includes(q));
        }
        data.sort((a, b) => {
            const dir = sortOrder === 'asc' ? 1 : -1;
            if (sortBy === 'title')
                return a.title.localeCompare(b.title) * dir;
            if (sortBy === 'student')
                return (a.student?.name || '').localeCompare(b.student?.name || '') * dir;
            if (sortBy === 'status')
                return (a.rawStatus || '').localeCompare(b.rawStatus || '') * dir;
            return (new Date(a.createdDate).getTime() - new Date(b.createdDate).getTime()) * dir;
        });
        const total = data.length;
        const paginated = data.slice(skip, skip + parsedLimit);
        res.json({
            success: true,
            data: paginated,
            pagination: { total, page: parsedPage, limit: parsedLimit, totalPages: Math.ceil(total / parsedLimit) }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch mentor projects', error: error.message });
    }
};
exports.listMentorProjects = listMentorProjects;
// ========================
// GET PROJECT BY ID
// ========================
const getMentorProjectById = async (req, res) => {
    try {
        const mentorId = getMentorId(req);
        const { id } = req.params;
        const project = await Project_1.default.findOne({ _id: id, mentorId }).populate({ path: 'studentId', populate: { path: 'userId', select: 'email' } });
        if (!project)
            return res.status(404).json({ success: false, message: 'Project not found' });
        const feedback = await Feedback_1.default.findOne({ studentId: project.studentId?._id, mentorId, source: 'PROJECT', sourceId: project._id });
        res.json({
            success: true,
            data: {
                id: project._id,
                title: project.title,
                description: project.description,
                githubLink: project.githubLink,
                websiteLink: project.websiteLink,
                completedAt: project.completedAt,
                status: project.status,
                createdByMentor: project.createdByMentor,
                submissionNote: project.submissionNote,
                verificationNote: project.verificationNote,
                pointsAwarded: project.pointsAwarded,
                verifiedAt: project.verifiedAt,
                student: {
                    id: project.studentId?._id,
                    name: `${project.studentId?.firstName || ''} ${project.studentId?.lastName || ''}`.trim(),
                    email: project.studentId?.userId?.email || '',
                    department: project.studentId?.department,
                    year: project.studentId?.year
                },
                feedback: feedback?.message || null
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch project details', error: error.message });
    }
};
exports.getMentorProjectById = getMentorProjectById;
// ========================
// CREATE PROJECT (mentor assigns to students)
// ========================
const createMentorProject = async (req, res) => {
    try {
        const mentorId = getMentorId(req);
        const { title, description, dueDate, studentId, studentIds, githubLink, websiteLink } = req.body;
        if (!title || !description) {
            return res.status(400).json({ success: false, message: 'title and description are required' });
        }
        let targets = [];
        if (Array.isArray(studentIds) && studentIds.length > 0)
            targets = studentIds;
        else if (studentId)
            targets = [studentId];
        if (targets.length === 0) {
            return res.status(400).json({ success: false, message: 'studentId or studentIds is required' });
        }
        const mapped = await MentorStudentMapping_1.default.find({ mentorId, studentId: { $in: targets }, isActive: true }).select('studentId');
        const mappedIds = new Set(mapped.map((m) => m.studentId.toString()));
        const validTargets = targets.filter((id) => mappedIds.has(String(id)));
        if (validTargets.length === 0) {
            return res.status(400).json({ success: false, message: 'No valid mapped students found' });
        }
        const docs = validTargets.map((sid) => ({
            studentId: sid,
            mentorId,
            title,
            description,
            githubLink: githubLink || '',
            websiteLink: websiteLink || '',
            completedAt: dueDate ? new Date(dueDate) : undefined,
            status: 'PENDING',
            createdByMentor: true
        }));
        const created = await Project_1.default.insertMany(docs);
        // Notify students
        const studentsToNotify = await Student_1.default.find({ _id: { $in: validTargets } });
        for (const st of studentsToNotify) {
            if (st.userId) {
                await notificationService_1.NotificationService.send({
                    userId: st.userId.toString(),
                    title: 'New Project Assigned',
                    message: `You have been assigned a new project: "${title}".${dueDate ? ` Due date: ${new Date(dueDate).toLocaleDateString()}.` : ''}`,
                    type: 'PROJECT',
                    sendEmail: true
                });
            }
        }
        res.status(201).json({ success: true, message: 'Project created successfully', data: created });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to create project', error: error.message });
    }
};
exports.createMentorProject = createMentorProject;
// ========================
// UPDATE PROJECT
// ========================
const updateMentorProject = async (req, res) => {
    try {
        const mentorId = getMentorId(req);
        const { id } = req.params;
        const { title, description, githubLink, websiteLink, dueDate } = req.body;
        const project = await Project_1.default.findOne({ _id: id, mentorId });
        if (!project)
            return res.status(404).json({ success: false, message: 'Project not found' });
        if (['SUBMITTED', 'APPROVED'].includes(project.status)) {
            return res.status(400).json({ success: false, message: 'Cannot edit a submitted or approved project' });
        }
        const updated = await Project_1.default.findByIdAndUpdate(id, {
            ...(title && { title }),
            ...(description && { description }),
            ...(githubLink !== undefined && { githubLink }),
            ...(websiteLink !== undefined && { websiteLink }),
            ...(dueDate && { completedAt: new Date(dueDate) })
        }, { new: true });
        res.json({ success: true, message: 'Project updated', data: updated });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to update project', error: error.message });
    }
};
exports.updateMentorProject = updateMentorProject;
// ========================
// DELETE PROJECT
// ========================
const deleteMentorProject = async (req, res) => {
    try {
        const mentorId = getMentorId(req);
        const { id } = req.params;
        const project = await Project_1.default.findOne({ _id: id, mentorId });
        if (!project)
            return res.status(404).json({ success: false, message: 'Project not found' });
        if (['SUBMITTED', 'APPROVED'].includes(project.status)) {
            return res.status(400).json({ success: false, message: 'Cannot delete a submitted or approved project' });
        }
        await Project_1.default.findByIdAndDelete(id);
        await Feedback_1.default.deleteMany({ sourceId: id, source: 'PROJECT' });
        res.json({ success: true, message: 'Project deleted' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to delete project', error: error.message });
    }
};
exports.deleteMentorProject = deleteMentorProject;
// ========================
// VERIFY PROJECT (approve/reject + award points)
// ========================
const verifyMentorProject = async (req, res) => {
    try {
        const mentorId = getMentorId(req);
        const { id } = req.params;
        const { status, verificationNote, points } = req.body;
        if (!['APPROVED', 'REJECTED'].includes(status)) {
            return res.status(400).json({ success: false, message: 'status must be APPROVED or REJECTED' });
        }
        const project = await Project_1.default.findOne({ _id: id, mentorId });
        if (!project)
            return res.status(404).json({ success: false, message: 'Project not found' });
        if (project.status !== 'SUBMITTED') {
            return res.status(400).json({ success: false, message: 'Only SUBMITTED projects can be verified' });
        }
        const pointsToAward = status === 'APPROVED' && typeof points === 'number' && points > 0 ? points : 0;
        const updated = await Project_1.default.findByIdAndUpdate(id, { status, verifiedBy: mentorId, verificationNote: verificationNote || '', pointsAwarded: pointsToAward, verifiedAt: new Date() }, { new: true });
        if (pointsToAward > 0) {
            await Point_1.default.create({
                studentId: project.studentId,
                mentorId,
                source: 'PROJECT',
                referenceId: project._id,
                points: pointsToAward,
                description: `Project: ${project.title}`
            });
            await Student_1.default.findByIdAndUpdate(project.studentId, { $inc: { rewardPoints: pointsToAward } });
        }
        // Notify student
        const st = await Student_1.default.findById(project.studentId);
        if (st && st.userId) {
            await notificationService_1.NotificationService.send({
                userId: st.userId.toString(),
                title: `Project ${status === 'APPROVED' ? 'Approved' : 'Rejected'}`,
                message: `Your project "${project.title}" has been ${status.toLowerCase()}.${pointsToAward > 0 ? ` You earned ${pointsToAward} points!` : ''}`,
                type: status === 'APPROVED' ? 'SUCCESS' : 'ERROR',
                sendEmail: true
            });
        }
        res.json({ success: true, message: `Project ${status.toLowerCase()}`, data: updated });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to verify project', error: error.message });
    }
};
exports.verifyMentorProject = verifyMentorProject;
