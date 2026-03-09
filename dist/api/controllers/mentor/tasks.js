"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMentorTask = exports.getMentorTaskById = exports.listMentorTasks = void 0;
const Task_1 = __importDefault(require("../../models/Task"));
const Feedback_1 = __importDefault(require("../../models/Feedback"));
const MentorStudentMapping_1 = __importDefault(require("../../models/MentorStudentMapping"));
const listMentorTasks = async (req, res) => {
    try {
        const mentorId = req.user.mentorId || req.user.id;
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
            const status = t.status === 'COMPLETED'
                ? 'Done'
                : t.status === 'APPROVED'
                    ? 'Done'
                    : t.status === 'PENDING'
                        ? 'To Do'
                        : 'In Progress';
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
                status,
                dueDate: t.dueDate,
                priority,
                feedback: feedback?.message || null
            };
        }));
        if (status) {
            const normalized = String(status).toLowerCase();
            data = data.filter((t) => {
                const row = String(t.status || '').toLowerCase();
                if (normalized === 'approved' || normalized === 'completed' || normalized === 'done')
                    return row === 'done';
                if (normalized === 'pending' || normalized === 'to do')
                    return row === 'to do';
                if (normalized === 'in_progress' || normalized === 'in progress')
                    return row === 'in progress';
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
                return (a.status || '').localeCompare(b.status || '') * dir;
            return (new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()) * dir;
        });
        const total = data.length;
        const paginated = data.slice(skip, skip + parsedLimit);
        res.json({
            success: true,
            data: paginated,
            pagination: {
                total,
                page: parsedPage,
                limit: parsedLimit,
                totalPages: Math.ceil(total / parsedLimit)
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch mentor tasks', error: error.message });
    }
};
exports.listMentorTasks = listMentorTasks;
const getMentorTaskById = async (req, res) => {
    try {
        const mentorId = req.user.mentorId || req.user.id;
        const { id } = req.params;
        const task = await Task_1.default.findOne({ _id: id, mentorId }).populate({
            path: 'studentId',
            populate: { path: 'userId', select: 'email' }
        });
        if (!task)
            return res.status(404).json({ success: false, message: 'Task not found' });
        const feedback = await Feedback_1.default.findOne({
            studentId: task.studentId?._id,
            mentorId,
            source: 'TASK',
            sourceId: task._id
        });
        res.json({
            success: true,
            data: {
                id: task._id,
                title: task.title,
                description: task.description,
                dueDate: task.dueDate,
                completedAt: task.completedAt,
                status: task.status,
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
const createMentorTask = async (req, res) => {
    try {
        const mentorId = req.user.mentorId || req.user.id;
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
        const mapped = await MentorStudentMapping_1.default.find({
            mentorId,
            studentId: { $in: targets },
            isActive: true
        }).select('studentId');
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
        res.status(201).json({
            success: true,
            message: 'Task assigned successfully',
            data: created
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to create task', error: error.message });
    }
};
exports.createMentorTask = createMentorTask;
