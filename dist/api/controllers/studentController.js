"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitDailyLog = exports.getDashboard = void 0;
const Task_1 = __importDefault(require("../models/Task"));
const Project_1 = __importDefault(require("../models/Project"));
const DailyActivityLog_1 = __importDefault(require("../models/DailyActivityLog"));
const Point_1 = __importDefault(require("../models/Point"));
const getDashboard = async (req, res) => {
    const user = req.user;
    const tasks = await Task_1.default.find({ studentId: user.studentId });
    const projects = await Project_1.default.find({ studentId: user.studentId });
    const logs = await DailyActivityLog_1.default.find({ studentId: user.studentId });
    const points = await Point_1.default.find({ studentId: user.studentId });
    const chartData = {
        weeklyHours: [2, 4, 5, 3, 6, 0, 2],
        tasksCompletedByType: [
            { type: 'Task', count: tasks.filter(t => t.status === 'COMPLETED').length },
            { type: 'Project', count: projects.filter(p => p.status === 'COMPLETED').length }
        ],
        leaderboardSample: [
            { studentId: 's1', name: 'Alice', points: 420 },
            { studentId: 's2', name: 'Bob', points: 390 },
            { studentId: user.id, name: 'You', points: points.reduce((acc, p) => acc + p.points, 0) }
        ]
    };
    res.json({ tasks, projects, logs, points, chartData });
};
exports.getDashboard = getDashboard;
const submitDailyLog = async (req, res) => {
    const user = req.user;
    const { date, activity, hoursSpent } = req.body;
    const log = new DailyActivityLog_1.default({ studentId: user.studentId, date, activity, hoursSpent });
    await log.save();
    res.status(201).json({ log });
};
exports.submitDailyLog = submitDailyLog;
