"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const certificationSchema = new mongoose_1.default.Schema({
    studentId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Student', required: true },
    mentorId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Mentor', required: true },
    title: { type: String, required: true },
    platform: { type: String, required: true },
    platformLink: { type: String, required: true },
    from: { type: Date, required: true },
    to: { type: Date, required: true },
    status: { type: String, required: true }
});
const Certification = mongoose_1.default.model('Certification', certificationSchema);
exports.default = Certification;
