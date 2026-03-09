"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const rankingSchema = new mongoose_1.default.Schema({
    studentId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Student', required: true },
    departmentRank: { type: Number, required: true },
    overallRank: { type: Number, required: true },
    calculatedOn: { type: Date, default: Date.now }
});
const Ranking = mongoose_1.default.model('Ranking', rankingSchema);
exports.default = Ranking;
