"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const notificationSchema = new mongoose_1.default.Schema({
    userId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true },
    title: { type: String, required: false }, // Optional title for email subject or rich UI
    type: {
        type: String,
        enum: ['INFO', 'WARNING', 'SUCCESS', 'ERROR', 'TASK', 'PROJECT', 'SURVEY', 'POINTS'],
        default: 'INFO',
        required: true
    },
    read: { type: Boolean, default: false },
    link: { type: String, required: false }, // URL to redirect when clicked
    sentEmail: { type: Boolean, default: false }, // Tracks if an email was sent for this
    createdAt: { type: Date, default: Date.now }
});
const Notification = mongoose_1.default.model('Notification', notificationSchema);
exports.default = Notification;
