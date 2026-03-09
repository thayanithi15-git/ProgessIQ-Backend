"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const surveySchema = new mongoose_1.default.Schema({
    mentorId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Mentor', required: true },
    title: { type: String, required: true },
    questions: { type: [String], required: true },
    createdAt: { type: Date, default: Date.now }
});
const Survey = mongoose_1.default.model('Survey', surveySchema);
exports.default = Survey;
