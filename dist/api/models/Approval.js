"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const approvalSchema = new mongoose_1.default.Schema({
    entityType: { type: String, required: true },
    entityId: { type: mongoose_1.default.Schema.Types.ObjectId, required: true },
    studentId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Student', required: true },
    mentorId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Mentor', required: true },
    status: { type: String, required: true },
    approvedAt: { type: Date, default: Date.now },
    feedback: { type: String },
    pointsAwarded: { type: Number, default: 0 }
});
const Approval = mongoose_1.default.model('Approval', approvalSchema);
exports.default = Approval;
