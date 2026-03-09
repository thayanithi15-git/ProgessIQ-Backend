"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listTasks = void 0;
const Task_1 = __importDefault(require("../../models/Task"));
const listTasks = async (req, res) => {
    try {
        const { page = '1', limit = '20', search, status, sort, from, to, } = req.query;
        const q = {};
        // 🔍 Search by title
        if (search) {
            q.title = { $regex: search, $options: 'i' };
        }
        // 📌 Filter by status
        if (status) {
            q.status = status;
        }
        // 📅 Date range filter
        if (from || to) {
            q.dueDate = {};
            if (from) {
                q.dueDate.$gte = new Date(from);
            }
            if (to) {
                q.dueDate.$lte = new Date(to);
            }
        }
        // Base query
        let query = Task_1.default.find(q).populate([
            { path: 'studentId', select: 'name email' },
            { path: 'mentorId', select: 'name email department' },
        ]);
        // ↕ Sorting
        if (sort) {
            const [field, dir] = sort.split(':');
            const order = dir === 'desc' ? -1 : 1;
            query = query.sort({ [field]: order });
        }
        else {
            query = query.sort({ createdAt: -1 });
        }
        // 🔢 Pagination
        const pageNum = Number(page);
        const limitNum = Number(limit);
        const tasks = await query
            .skip((pageNum - 1) * limitNum)
            .limit(limitNum);
        const total = await Task_1.default.countDocuments(q);
        res.json({ tasks, total });
    }
    catch (err) {
        res.status(500).json({
            message: err.message || 'Failed to fetch tasks',
        });
    }
};
exports.listTasks = listTasks;
