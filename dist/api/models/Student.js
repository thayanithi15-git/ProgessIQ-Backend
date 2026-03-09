"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const studentSchema = new mongoose_1.default.Schema({
    userId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'User', required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    gender: { type: String, required: true },
    dob: { type: Date, required: true },
    phone: { type: String, required: true },
    parentName: { type: String, required: true },
    parentPhone: { type: String, required: true },
    place: { type: String, required: true },
    department: { type: String, required: true },
    year: { type: String, required: true },
    academicYear: { type: String, required: true },
    rewardPoints: { type: Number, default: 0 },
    status: { type: String, default: 'Active' },
    createdAt: { type: Date, default: Date.now }
});
const Student = mongoose_1.default.model('Student', studentSchema);
exports.default = Student;
