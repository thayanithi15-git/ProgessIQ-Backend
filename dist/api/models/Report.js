"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const reportSchema = new mongoose_1.default.Schema({
    generatedBy: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'User', required: true },
    reportType: { type: String, enum: ['pdf', 'excel', 'csv'], required: true },
    category: {
        type: String,
        enum: ['students', 'mentors', 'projects', 'internships', 'certifications', 'performance', 'comprehensive'],
        required: true
    },
    filters: {
        startDate: Date,
        endDate: Date,
        department: [String],
        year: [String],
        status: String,
        minPoints: Number,
        maxPoints: Number,
        designation: String,
        projectStatus: String,
        internshipType: String,
        internshipStatus: String,
        certificationStatus: String,
        platform: String,
        mentorId: mongoose_1.default.Schema.Types.ObjectId,
        includeInactive: { type: Boolean, default: false },
        sortBy: { type: String, enum: ['name', 'points', 'date', 'department'], default: 'name' },
        sortOrder: { type: String, enum: ['asc', 'desc'], default: 'asc' },
        limit: Number
    },
    status: { type: String, enum: ['queued', 'processing', 'completed', 'failed'], default: 'queued' },
    fileUrl: String,
    fileSize: Number,
    recordCount: Number,
    generatedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }, // 30 days
    error: String
});
const Report = mongoose_1.default.model('Report', reportSchema);
exports.default = Report;
