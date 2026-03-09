"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listMentorProjects = void 0;
const Project_1 = __importDefault(require("../../models/Project"));
const listMentorProjects = async (req, res) => {
    const mentorId = req.user.id;
    const projects = await Project_1.default.find({ mentorId }).populate('studentId');
    res.json({ projects });
};
exports.listMentorProjects = listMentorProjects;
