"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const internshipSchema = new mongoose_1.default.Schema({
    studentId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Student', required: true },
    mentorId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Mentor', required: true },
    companyName: { type: String, required: true },
    companyUrl: { type: String, required: true },
    role: { type: String, required: true },
    type: { type: String, required: true },
    paid: { type: Boolean, required: true },
    from: { type: Date, required: true },
    to: { type: Date, required: true },
    description: { type: String, required: true },
    status: { type: String, required: true }
});
const Internship = mongoose_1.default.model('Internship', internshipSchema);
exports.default = Internship;
