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
    githubLink: { type: String },
    websiteLink: { type: String },
    completedAt: { type: Date },
    status: {
        type: String,
        required: true,
        enum: ['PENDING', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'REJECTED'],
        default: 'PENDING'
    },
    // Mentor-created vs student-uploaded
    createdByMentor: { type: Boolean, default: false },
    // Student's submission note when reporting completion
    submissionNote: { type: String },
    // Mentor verification
    verifiedBy: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Mentor' },
    verificationNote: { type: String },
    pointsAwarded: { type: Number, default: 0 },
    verifiedAt: { type: Date },
}, { timestamps: true });
const Project = mongoose_1.default.model('Project', projectSchema);
exports.default = Project;
