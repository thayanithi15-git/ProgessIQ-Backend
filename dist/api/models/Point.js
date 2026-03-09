"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const pointSchema = new mongoose_1.default.Schema({
    studentId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Student', required: true },
    mentorId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Mentor' },
    source: { type: String, required: true },
    referenceId: { type: mongoose_1.default.Schema.Types.ObjectId },
    points: { type: Number, required: true },
    description: { type: String },
    awardedOn: { type: Date, default: Date.now }
});
const Point = mongoose_1.default.model('Point', pointSchema);
exports.default = Point;
