"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const feedbackSchema = new mongoose_1.default.Schema({
    studentId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Student', required: true },
    mentorId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Mentor', required: true },
    source: { type: String },
    sourceId: { type: mongoose_1.default.Schema.Types.ObjectId },
    message: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});
const Feedback = mongoose_1.default.model('Feedback', feedbackSchema);
exports.default = Feedback;
