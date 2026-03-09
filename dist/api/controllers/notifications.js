"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.markRead = exports.createNotification = exports.listNotifications = void 0;
const Notification_1 = __importDefault(require("../models/Notification"));
const listNotifications = async (req, res) => {
    const userId = req.user.id;
    const notifications = await Notification_1.default.find({ userId }).sort({ createdAt: -1 });
    res.json({ notifications });
};
exports.listNotifications = listNotifications;
const createNotification = async (req, res) => {
    const { userId, message, type = 'INFO' } = req.body;
    const n = new Notification_1.default({ userId, message, type, read: false, createdAt: new Date() });
    await n.save();
    res.status(201).json({ n });
};
exports.createNotification = createNotification;
const markRead = async (req, res) => {
    const { id } = req.params;
    const notification = await Notification_1.default.findById(id);
    if (!notification)
        return res.status(404).json({ message: 'Not found' });
    notification.read = true;
    await notification.save();
    res.json({ notification });
};
exports.markRead = markRead;
