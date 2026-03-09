"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listLogs = void 0;
const SystemLog_1 = __importDefault(require("../../models/SystemLog"));
const listLogs = async (req, res) => {
    const { page = 1, limit = 50 } = req.query;
    const logs = await SystemLog_1.default.find().sort({ timestamp: -1 }).skip((page - 1) * limit).limit(Number(limit));
    const total = await SystemLog_1.default.countDocuments();
    res.json({ logs, total });
};
exports.listLogs = listLogs;
