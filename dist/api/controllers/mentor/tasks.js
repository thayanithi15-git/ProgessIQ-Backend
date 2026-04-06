"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyMentorTask = exports.deleteMentorTask = exports.updateMentorTask = exports.createMentorTask = exports.getMentorTaskById = exports.listMentorTasks = void 0;
const Task_1 = __importDefault(require("../../models/Task"));
const Feedback_1 = __importDefault(require("../../models/Feedback"));
const MentorStudentMapping_1 = __importDefault(require("../../models/MentorStudentMapping"));
const Point_1 = __importDefault(require("../../models/Point"));
const Student_1 = __importDefault(require("../../models/Student"));
const notificationService_1 = require("../../services/notificationService");
const getMentorId = (req) => req.user.mentorId || req.user.id;
// ========================
// LIST TASKS
// ========================
const listMentorTasks = async (req, res) => {
    try {
        const mentorId = getMentorId(req);
        const { page = 1, limit = 20, search = '', status, studentId, department, year, fromDate, toDate, sortBy = 'dueDate', sortOrder = 'asc' } = req.query;
        const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
        const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
        const skip = (parsedPage - 1) * parsedLimit;
        const tasks = await Task_1.default.find({ mentorId }).populate({
            path: 'studentId',
            populate: { path: 'userId', select: 'email' }
        });
        let data = await Promise.all(tasks.map(async (t) => {
            const feedback = await Feedback_1.default.findOne({
                studentId: t.studentId?._id,
                mentorId,
                source: 'TASK',
                sourceId: t._id
            });
            const displayStatus = t.status === 'APPROVED' ? 'Done'
                : t.status === 'SUBMITTED' ? 'Submitted'
                    : t.status === 'IN_PROGRESS' ? 'In Progress'
                        : t.status === 'REJECTED' ? 'Rejected'
                            : 'To Do';
            const due = t.dueDate ? new Date(t.dueDate) : new Date();
            const priority = due.getTime() < Date.now() ? 'High' : 'Medium';
            return {
                id: t._id,
                title: t.title,
                description: t.description,
                assignedTo: `${t.studentId?.firstName || ''} ${t.studentId?.lastName || ''}`.trim(),
                student: {
                    id: t.studentId?._id,
                    email: t.studentId?.userId?.email || '',
                    department: t.studentId?.department,
                    year: t.studentId?.year
                },
                status: displayStatus,
                rawStatus: t.status,
                dueDate: t.dueDate,
                priority,
                submissionNote: t.submissionNote || null,
                completedAt: t.completedAt || null,
                verificationNote: t.verificationNote || null,
                pointsAwarded: t.pointsAwarded || 0,
                verifiedAt: t.verifiedAt || null,
                feedback: feedback?.message || null
            };
        }));
        if (status) {
            const normalized = String(status).toLowerCase();
            data = data.filter((t) => {
                const row = String(t.rawStatus || '').toLowerCase();
                if (normalized === 'approved' || normalized === 'completed' || normalized === 'done')
                    return row === 'approved';
                if (normalized === 'pending' || normalized === 'to do')
                    return row === 'pending';
                if (normalized === 'in_progress' || normalized === 'in progress')
                    return row === 'in_progress';
                if (normalized === 'submitted')
                    return row === 'submitted';
                if (normalized === 'rejected')
                    return row === 'rejected';
                return row === normalized;
            });
        }
        if (studentId)
            data = data.filter((t) => t.student?.id?.toString() === String(studentId));
        if (department)
            data = data.filter((t) => t.student?.department === department);
        if (year)
            data = data.filter((t) => t.student?.year === year);
        if (fromDate) {
            const from = new Date(String(fromDate));
            if (!Number.isNaN(from.getTime()))
                data = data.filter((t) => new Date(t.dueDate).getTime() >= from.getTime());
        }
        if (toDate) {
            const to = new Date(String(toDate));
            if (!Number.isNaN(to.getTime()))
                data = data.filter((t) => new Date(t.dueDate).getTime() <= to.getTime());
        }
        if (search) {
            const q = String(search).toLowerCase();
            data = data.filter((t) => t.title.toLowerCase().includes(q) ||
                t.description.toLowerCase().includes(q) ||
                t.assignedTo.toLowerCase().includes(q));
        }
        data.sort((a, b) => {
            const dir = sortOrder === 'desc' ? -1 : 1;
            if (sortBy === 'title')
                return a.title.localeCompare(b.title) * dir;
            if (sortBy === 'student')
                return (a.assignedTo || '').localeCompare(b.assignedTo || '') * dir;
            if (sortBy === 'status')
                return (a.rawStatus || '').localeCompare(b.rawStatus || '') * dir;
            return (new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()) * dir;
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
        res.status(500).json({ success: false, message: 'Failed to fetch mentor tasks', error: error.message });
    }
};
exports.listMentorTasks = listMentorTasks;
// ========================
// GET TASK BY ID
// ========================
const getMentorTaskById = async (req, res) => {
    try {
        const mentorId = getMentorId(req);
        const { id } = req.params;
        const task = await Task_1.default.findOne({ _id: id, mentorId }).populate({
            path: 'studentId',
            populate: { path: 'userId', select: 'email' }
        });
        if (!task)
            return res.status(404).json({ success: false, message: 'Task not found' });
        const feedback = await Feedback_1.default.findOne({ studentId: task.studentId?._id, mentorId, source: 'TASK', sourceId: task._id });
        res.json({
            success: true,
            data: {
                id: task._id,
                title: task.title,
                description: task.description,
                dueDate: task.dueDate,
                completedAt: task.completedAt,
                status: task.status,
                submissionNote: task.submissionNote,
                verificationNote: task.verificationNote,
                pointsAwarded: task.pointsAwarded,
                verifiedAt: task.verifiedAt,
                student: {
                    id: task.studentId?._id,
                    name: `${task.studentId?.firstName || ''} ${task.studentId?.lastName || ''}`.trim(),
                    email: task.studentId?.userId?.email || '',
                    department: task.studentId?.department,
                    year: task.studentId?.year
                },
                feedback: feedback?.message || null
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch task details', error: error.message });
    }
};
exports.getMentorTaskById = getMentorTaskById;
// ========================
// CREATE TASK (assign to students)
// ========================
const createMentorTask = async (req, res) => {
    try {
        const mentorId = getMentorId(req);
        const { title, description, dueDate, studentId, studentIds } = req.body;
        if (!title || !description || !dueDate) {
            return res.status(400).json({ success: false, message: 'title, description and dueDate are required' });
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
            return res.status(400).json({ success: false, message: 'No valid mapped students found for task assignment' });
        }
        const docs = validTargets.map((sid) => ({
            studentId: sid,
            mentorId,
            title,
            description,
            dueDate: new Date(dueDate),
            status: 'PENDING'
        }));
        const created = await Task_1.default.insertMany(docs);
        // Notify students
        const studentsToNotify = await Student_1.default.find({ _id: { $in: validTargets } });
        for (const st of studentsToNotify) {
            if (st.userId) {
                await notificationService_1.NotificationService.send({
                    userId: st.userId.toString(),
                    title: 'New Task Assigned',
                    message: `You have been assigned a new task: "${title}". Due date: ${new Date(dueDate).toLocaleDateString()}.`,
                    type: 'TASK',
                    sendEmail: true
                });
            }
        }
        res.status(201).json({ success: true, message: 'Task assigned successfully', data: created });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to create task', error: error.message });
    }
};
exports.createMentorTask = createMentorTask;
// ========================
// UPDATE TASK
// ========================
const updateMentorTask = async (req, res) => {
    try {
        const mentorId = getMentorId(req);
        const { id } = req.params;
        const { title, description, dueDate } = req.body;
        const task = await Task_1.default.findOne({ _id: id, mentorId });
        if (!task)
            return res.status(404).json({ success: false, message: 'Task not found' });
        if (!['PENDING', 'IN_PROGRESS'].includes(task.status)) {
            return res.status(400).json({ success: false, message: 'Cannot edit a submitted or approved task' });
        }
        const updated = await Task_1.default.findByIdAndUpdate(id, { ...(title && { title }), ...(description && { description }), ...(dueDate && { dueDate: new Date(dueDate) }) }, { new: true });
        res.json({ success: true, message: 'Task updated', data: updated });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to update task', error: error.message });
    }
};
exports.updateMentorTask = updateMentorTask;
// ========================
// DELETE TASK
// ========================
const deleteMentorTask = async (req, res) => {
    try {
        const mentorId = getMentorId(req);
        const { id } = req.params;
        const task = await Task_1.default.findOne({ _id: id, mentorId });
        if (!task)
            return res.status(404).json({ success: false, message: 'Task not found' });
        if (['SUBMITTED', 'APPROVED'].includes(task.status)) {
            return res.status(400).json({ success: false, message: 'Cannot delete a submitted or approved task' });
        }
        await Task_1.default.findByIdAndDelete(id);
        await Feedback_1.default.deleteMany({ sourceId: id, source: 'TASK' });
        res.json({ success: true, message: 'Task deleted' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to delete task', error: error.message });
    }
};
exports.deleteMentorTask = deleteMentorTask;
// ========================
// VERIFY TASK (approve/reject + award points)
// ========================
const verifyMentorTask = async (req, res) => {
    try {
        const mentorId = getMentorId(req);
        const { id } = req.params;
        const { status, verificationNote, points } = req.body;
        if (!['APPROVED', 'REJECTED'].includes(status)) {
            return res.status(400).json({ success: false, message: 'status must be APPROVED or REJECTED' });
        }
        const task = await Task_1.default.findOne({ _id: id, mentorId });
        if (!task)
            return res.status(404).json({ success: false, message: 'Task not found' });
        if (task.status !== 'SUBMITTED') {
            return res.status(400).json({ success: false, message: 'Only SUBMITTED tasks can be verified' });
        }
        const pointsToAward = status === 'APPROVED' && typeof points === 'number' && points > 0 ? points : 0;
        const updated = await Task_1.default.findByIdAndUpdate(id, {
            status,
            verifiedBy: mentorId,
            verificationNote: verificationNote || '',
            pointsAwarded: pointsToAward,
            verifiedAt: new Date()
        }, { new: true });
        // Award points if approved
        if (pointsToAward > 0) {
            await Point_1.default.create({
                studentId: task.studentId,
                mentorId,
                source: 'TASK',
                referenceId: task._id,
                points: pointsToAward,
                description: `Task: ${task.title}`
            });
            await Student_1.default.findByIdAndUpdate(task.studentId, { $inc: { rewardPoints: pointsToAward } });
        }
        // Notify student
        const st = await Student_1.default.findById(task.studentId);
        if (st && st.userId) {
            await notificationService_1.NotificationService.send({
                userId: st.userId.toString(),
                title: `Task ${status === 'APPROVED' ? 'Approved' : 'Rejected'}`,
                message: `Your task "${task.title}" has been ${status.toLowerCase()}.${pointsToAward > 0 ? ` You earned ${pointsToAward} points!` : ''}`,
                type: status === 'APPROVED' ? 'SUCCESS' : 'ERROR',
                sendEmail: true
            });
        }
        res.json({ success: true, message: `Task ${status.toLowerCase()}`, data: updated });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to verify task', error: error.message });
    }
};
exports.verifyMentorTask = verifyMentorTask;
