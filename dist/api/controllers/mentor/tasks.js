"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listMentorTasks = void 0;
const Task_1 = __importDefault(require("../../models/Task"));
const listMentorTasks = async (req, res) => {
    const mentorId = req.user.id;
    const tasks = await Task_1.default.find({ mentorId }).populate('studentId');
    res.json({ tasks });
};
exports.listMentorTasks = listMentorTasks;
