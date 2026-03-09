"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const surveyResponseSchema = new mongoose_1.default.Schema({
    surveyId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Survey', required: true },
    studentId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Student', required: true },
    answers: { type: [String], required: true },
    submittedAt: { type: Date, default: Date.now }
});
const SurveyResponse = mongoose_1.default.model('SurveyResponse', surveyResponseSchema);
exports.default = SurveyResponse;
