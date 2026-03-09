"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const projectSchema = new mongoose_1.default.Schema({
    studentId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Student', required: true },
    mentorId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Mentor', required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    githubLink: { type: String, required: true },
    websiteLink: { type: String, required: true },
    completedAt: { type: Date, required: true },
    status: { type: String, required: true }
});
const Project = mongoose_1.default.model('Project', projectSchema);
exports.default = Project;
