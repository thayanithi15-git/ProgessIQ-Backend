"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateApproval = exports.listApprovals = void 0;
const Approval_1 = __importDefault(require("../../models/Approval"));
const listApprovals = async (req, res) => {
    const mentorId = req.user.id;
    const approvals = await Approval_1.default.find({ mentorId }).sort({ approvedAt: -1 });
    res.json({ approvals });
};
exports.listApprovals = listApprovals;
const updateApproval = async (req, res) => {
    const mentorId = req.user.id;
    const { id } = req.params;
    const { status, points, feedback } = req.body;
    const approval = await Approval_1.default.findById(id);
    if (!approval)
        return res.status(404).json({ message: 'Not found' });
    if (approval.mentorId.toString() !== mentorId)
        return res.status(403).json({ message: 'Forbidden' });
    approval.status = status;
    approval.feedback = feedback;
    approval.pointsAwarded = points;
    approval.approvedAt = status === 'Approved' ? new Date() : approval.approvedAt;
    await approval.save();
    res.json({ approval });
};
exports.updateApproval = updateApproval;
