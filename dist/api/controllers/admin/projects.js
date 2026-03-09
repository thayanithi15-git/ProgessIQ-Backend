"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.viewProject = exports.listProjects = void 0;
const Project_1 = __importDefault(require("../../models/Project"));
const listProjects = async (req, res) => {
    const { page = 1, limit = 20, search, status, sort, from, to } = req.query;
    const q = {};
    if (search)
        q.title = { $regex: search, $options: 'i' };
    if (status)
        q.status = status;
    if (from || to) {
        q.completedAt = {};
        if (from)
            q.completedAt.$gte = new Date(from);
        if (to)
            q.completedAt.$lte = new Date(to);
    }
    let query = Project_1.default.find(q).populate('studentId mentorId');
    // sorting support, e.g. sort=completedAt:desc or title:asc
    if (sort) {
        const [field, dir] = sort.split(':');
        const order = dir === 'desc' ? -1 : 1;
        query = query.sort({ [field]: order });
    }
    else {
        query = query.sort({ createdAt: -1 });
    }
    const projects = await query.skip((page - 1) * limit).limit(Number(limit));
    const total = await Project_1.default.countDocuments(q);
    res.json({ projects, total });
};
exports.listProjects = listProjects;
const viewProject = async (req, res) => {
    const project = await Project_1.default.findById(req.params.id).populate('studentId mentorId');
    if (!project)
        return res.status(404).json({ message: 'Not found' });
    res.json({ project });
};
exports.viewProject = viewProject;
