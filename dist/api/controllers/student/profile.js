"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCompleteProfile = exports.updateProfile = exports.getProfile = void 0;
const Student_1 = __importDefault(require("../../models/Student"));
const Mentor_1 = __importDefault(require("../../models/Mentor"));
/**
 * GET COMPLETE PROFILE
 * GET /api/student/profile
 */
const getProfile = async (req, res) => {
    try {
        const studentId = req.user.studentId;
        const student = await Student_1.default.findById(studentId).populate({
            path: 'userId',
            select: 'email'
        });
        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }
        // Get mentor info
        const mentor = await Mentor_1.default.findOne({ studentId }).populate({
            path: 'userId',
            select: 'email firstName lastName'
        });
        res.json({
            success: true,
            data: {
                id: student._id,
                firstName: student.firstName,
                lastName: student.lastName,
                email: student.userId?.email,
                gender: student.gender,
                dob: student.dob,
                phone: student.phone,
                parentName: student.parentName,
                parentPhone: student.parentPhone,
                place: student.place,
                department: student.department,
                year: student.year,
                academicYear: student.academicYear,
                status: student.status,
                rewardPoints: student.rewardPoints,
                createdAt: student.createdAt,
                mentor: mentor ? {
                    id: mentor._id,
                    name: `${mentor.userId?.firstName || ''} ${mentor.userId?.lastName || ''}`,
                    email: mentor.userId?.email,
                    department: mentor.department,
                    expertise: mentor.expertise,
                    phone: mentor.phone
                } : null
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching profile', error });
    }
};
exports.getProfile = getProfile;
/**
 * UPDATE PROFILE (not name, email, password)
 * PUT /api/student/profile
 */
const updateProfile = async (req, res) => {
    try {
        const studentId = req.user.studentId;
        // Fields that cannot be updated
        const restrictedFields = ['firstName', 'lastName', 'email', 'userId', 'createdAt'];
        // Remove restricted fields from request
        const updateData = {};
        Object.keys(req.body).forEach(key => {
            if (!restrictedFields.includes(key)) {
                updateData[key] = req.body[key];
            }
        });
        const updated = await Student_1.default.findByIdAndUpdate(studentId, updateData, { new: true });
        if (!updated) {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }
        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: updated
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error updating profile', error });
    }
};
exports.updateProfile = updateProfile;
/**
 * GET ALL PROFILE DETAILS (Complete Profile)
 * GET /api/student/profile/complete
 */
const getCompleteProfile = async (req, res) => {
    try {
        const studentId = req.user.studentId;
        const student = await Student_1.default.findById(studentId).populate({
            path: 'userId',
            select: 'email'
        });
        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }
        // Get mentor with all details
        const mentor = await Mentor_1.default.findOne({ studentId }).populate({
            path: 'userId',
            select: 'email firstName lastName'
        });
        res.json({
            success: true,
            data: {
                // Personal Information
                personalInfo: {
                    id: student._id,
                    firstName: student.firstName,
                    lastName: student.lastName,
                    email: student.userId?.email,
                    gender: student.gender,
                    dob: student.dob,
                    phone: student.phone,
                    place: student.place,
                    status: student.status
                },
                // Family Information
                familyInfo: {
                    parentName: student.parentName,
                    parentPhone: student.parentPhone
                },
                // Academic Information
                academicInfo: {
                    department: student.department,
                    year: student.year,
                    academicYear: student.academicYear
                },
                // Achievement Information
                achievementInfo: {
                    rewardPoints: student.rewardPoints
                },
                // Mentor Information
                mentorInfo: mentor ? {
                    id: mentor._id,
                    fullName: `${mentor.userId?.firstName || ''} ${mentor.userId?.lastName || ''}`,
                    email: mentor.userId?.email,
                    department: mentor.department,
                    expertise: mentor.expertise || [],
                    phone: mentor.phone || null,
                    experience: mentor.experience || null
                } : null,
                // Account Information
                accountInfo: {
                    createdAt: student.createdAt,
                    lastUpdated: student.createdAt
                }
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching complete profile', error });
    }
};
exports.getCompleteProfile = getCompleteProfile;
