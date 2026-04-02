"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const taskSchema = new mongoose_1.default.Schema({
    studentId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Student', required: true },
    mentorId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Mentor', required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    dueDate: { type: Date, required: true },
    completedAt: { type: Date },
    status: {
        type: String,
        required: true,
        enum: ['PENDING', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'REJECTED'],
        default: 'PENDING'
    },
    // Student's completion note submitted when they mark as done
    submissionNote: { type: String },
    // Mentor verification fields
    verifiedBy: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Mentor' },
    verificationNote: { type: String },
    pointsAwarded: { type: Number, default: 0 },
    verifiedAt: { type: Date },
}, { timestamps: true });
const Task = mongoose_1.default.model('Task', taskSchema);
exports.default = Task;
