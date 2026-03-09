"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCertificationFeedback = exports.deleteCertification = exports.updateCertification = exports.getCertificationById = exports.listCertifications = exports.createCertification = void 0;
const Certification_1 = __importDefault(require("../../models/Certification"));
const Feedback_1 = __importDefault(require("../../models/Feedback"));
/**
 * CREATE CERTIFICATION
 * POST /api/student/certifications
 */
const createCertification = async (req, res) => {
    try {
        const studentId = req.user.studentId;
        const { mentorId, title, platform, platformLink, from, to } = req.body;
        if (!mentorId || !title || !platform || !platformLink || !from || !to) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }
        const certification = new Certification_1.default({
            studentId,
            mentorId,
            title,
            platform,
            platformLink,
            from: new Date(from),
            to: new Date(to),
            status: 'PENDING'
        });
        await certification.save();
        res.status(201).json({
            success: true,
            message: 'Certification created',
            data: certification
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error creating certification', error });
    }
};
exports.createCertification = createCertification;
/**
 * GET ALL CERTIFICATIONS
 * GET /api/student/certifications
 */
const listCertifications = async (req, res) => {
    try {
        const studentId = req.user.studentId;
        const { status, limit = 20, skip = 0 } = req.query;
        const filter = { studentId };
        if (status)
            filter.status = status;
        const certifications = await Certification_1.default.find(filter)
            .populate('mentorId', 'firstName lastName')
            .sort({ createdAt: -1 })
            .skip(parseInt(skip))
            .limit(parseInt(limit));
        const total = await Certification_1.default.countDocuments(filter);
        const certificationsWithFeedback = await Promise.all(certifications.map(async (cert) => {
            const feedback = await Feedback_1.default.findOne({
                studentId,
                source: 'CERTIFICATION',
                sourceId: cert._id
            });
            return {
                ...cert.toObject(),
                feedback: feedback?.message || null
            };
        }));
        res.json({
            success: true,
            data: {
                certifications: certificationsWithFeedback,
                pagination: {
                    total,
                    limit: parseInt(limit),
                    skip: parseInt(skip)
                }
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching certifications', error });
    }
};
exports.listCertifications = listCertifications;
/**
 * GET SINGLE CERTIFICATION
 * GET /api/student/certifications/:id
 */
const getCertificationById = async (req, res) => {
    try {
        const studentId = req.user.studentId;
        const { id } = req.params;
        const certification = await Certification_1.default.findOne({ _id: id, studentId }).populate('mentorId', 'firstName lastName');
        if (!certification) {
            return res.status(404).json({ success: false, message: 'Certification not found' });
        }
        const feedback = await Feedback_1.default.findOne({
            studentId,
            source: 'CERTIFICATION',
            sourceId: id
        }).populate('mentorId', 'firstName lastName');
        res.json({
            success: true,
            data: {
                ...certification.toObject(),
                feedback: feedback ? {
                    id: feedback._id,
                    mentorName: `${feedback.mentorId?.firstName} ${feedback.mentorId?.lastName}`,
                    message: feedback.message,
                    createdAt: feedback.createdAt
                } : null
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching certification', error });
    }
};
exports.getCertificationById = getCertificationById;
/**
 * UPDATE CERTIFICATION
 * PUT /api/student/certifications/:id
 */
const updateCertification = async (req, res) => {
    try {
        const studentId = req.user.studentId;
        const { id } = req.params;
        const certification = await Certification_1.default.findOne({ _id: id, studentId });
        if (!certification) {
            return res.status(404).json({ success: false, message: 'Certification not found' });
        }
        if (certification.status === 'APPROVED' || certification.status === 'REJECTED') {
            return res.status(400).json({ success: false, message: 'Cannot update this certification' });
        }
        const updated = await Certification_1.default.findByIdAndUpdate(id, { ...req.body, status: 'PENDING' }, { new: true });
        res.json({
            success: true,
            message: 'Certification updated',
            data: updated
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error updating certification', error });
    }
};
exports.updateCertification = updateCertification;
/**
 * DELETE CERTIFICATION
 * DELETE /api/student/certifications/:id
 */
const deleteCertification = async (req, res) => {
    try {
        const studentId = req.user.studentId;
        const { id } = req.params;
        const certification = await Certification_1.default.findOne({ _id: id, studentId });
        if (!certification) {
            return res.status(404).json({ success: false, message: 'Certification not found' });
        }
        if (certification.status !== 'PENDING') {
            return res.status(400).json({ success: false, message: 'Cannot delete this certification' });
        }
        await Certification_1.default.findByIdAndDelete(id);
        await Feedback_1.default.deleteOne({ sourceId: id, source: 'CERTIFICATION' });
        res.json({
            success: true,
            message: 'Certification deleted'
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error deleting certification', error });
    }
};
exports.deleteCertification = deleteCertification;
/**
 * GET CERTIFICATION FEEDBACK
 * GET /api/student/certifications/:id/feedback
 */
const getCertificationFeedback = async (req, res) => {
    try {
        const studentId = req.user.studentId;
        const { id } = req.params;
        const feedback = await Feedback_1.default.findOne({
            studentId,
            source: 'CERTIFICATION',
            sourceId: id
        }).populate('mentorId', 'firstName lastName email');
        if (!feedback) {
            return res.status(404).json({ success: false, message: 'No feedback found' });
        }
        res.json({
            success: true,
            data: {
                id: feedback._id,
                mentor: `${feedback.mentorId?.firstName} ${feedback.mentorId?.lastName}`,
                mentorEmail: feedback.mentorId?.email,
                message: feedback.message,
                createdAt: feedback.createdAt,
                type: feedback.feedbackType || 'REJECTION'
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching feedback', error });
    }
};
exports.getCertificationFeedback = getCertificationFeedback;
