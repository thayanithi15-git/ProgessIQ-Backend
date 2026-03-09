"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dailyActivityLogSchema = new mongoose_1.default.Schema({
    studentId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Student', required: true },
    date: { type: Date, required: true },
    activity: { type: String, required: true },
    hoursSpent: { type: Number, required: true }
});
const DailyActivityLog = mongoose_1.default.model('DailyActivityLog', dailyActivityLogSchema);
exports.default = DailyActivityLog;
