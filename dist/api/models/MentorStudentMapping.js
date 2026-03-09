"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const mentorStudentMappingSchema = new mongoose_1.default.Schema({
    mentorId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Mentor', required: true },
    studentId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Student', required: true },
    mappedOn: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true }
});
const MentorStudentMapping = mongoose_1.default.model('MentorStudentMapping', mentorStudentMappingSchema);
exports.default = MentorStudentMapping;
