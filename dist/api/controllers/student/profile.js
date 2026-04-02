"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSocialLinks = exports.getSocialLinks = exports.getCompleteProfile = exports.updateProfile = exports.getProfile = void 0;
const Student_1 = __importDefault(require("../../models/Student"));
const MentorStudentMapping_1 = __importDefault(require("../../models/MentorStudentMapping"));
const OnlineProfile_1 = __importDefault(require("../../models/OnlineProfile"));
const Point_1 = __importDefault(require("../../models/Point"));
/**
 * GET DASHBOARD PROFILE
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
        // Get mentor info via mapping
        const mapping = await MentorStudentMapping_1.default.findOne({ studentId, isActive: true }).populate('mentorId');
        const mentor = mapping?.mentorId;
        // Get points for sync
        const pointsData = await Point_1.default.find({ studentId });
        const calculatedPoints = pointsData.reduce((sum, p) => sum + p.points, 0);
        if (student.rewardPoints !== calculatedPoints) {
            await Student_1.default.findByIdAndUpdate(studentId, { rewardPoints: calculatedPoints });
            student.rewardPoints = calculatedPoints;
        }
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
                rollNo: student.rollNo,
                cgpa: student.cgpa,
                arrearCount: student.arrearCount,
                familyIncome: student.familyIncome,
                goodAt: student.goodAt,
                status: student.status,
                rewardPoints: student.rewardPoints,
                createdAt: student.createdAt,
                mentor: mentor ? {
                    id: mentor._id,
                    name: mentor.name,
                    email: mentor.email,
                    department: mentor.department,
                    expertise: mentor.expertise || [],
                    phone: mentor.contactNo || null
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
        // Get mentor with all details via mapping
        const mapping = await MentorStudentMapping_1.default.findOne({ studentId, isActive: true }).populate('mentorId');
        const mentor = mapping?.mentorId;
        // Get points for sync
        const pointsData = await Point_1.default.find({ studentId });
        const calculatedPoints = pointsData.reduce((sum, p) => sum + p.points, 0);
        if (student.rewardPoints !== calculatedPoints) {
            await Student_1.default.findByIdAndUpdate(studentId, { rewardPoints: calculatedPoints });
            student.rewardPoints = calculatedPoints;
        }
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
                    status: student.status,
                    rollNo: student.rollNo,
                    rewardPoints: student.rewardPoints
                },
                // Family Information
                familyInfo: {
                    parentName: student.parentName,
                    parentPhone: student.parentPhone,
                    familyIncome: student.familyIncome
                },
                // Academic Information
                academicInfo: {
                    department: student.department,
                    year: student.year,
                    academicYear: student.academicYear,
                    cgpa: student.cgpa,
                    arrearCount: student.arrearCount,
                    goodAt: student.goodAt
                },
                // Achievement Information
                achievementInfo: {
                    rewardPoints: student.rewardPoints
                },
                // Mentor Information
                mentorInfo: mentor ? {
                    id: mentor._id,
                    name: mentor.name,
                    email: mentor.email,
                    department: mentor.department,
                    expertise: mentor.expertise || [],
                    phone: mentor.contactNo || null,
                    experience: mentor.experience || mentor.designation || null
                } : null,
                // Account Information
                accountInfo: {
                    createdAt: student.createdAt,
                    lastUpdated: student.updatedAt || student.createdAt
                }
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching complete profile', error });
    }
};
exports.getCompleteProfile = getCompleteProfile;
/**
 * GET SOCIAL LINKS
 * GET /api/student/profile/socials
 */
const getSocialLinks = async (req, res) => {
    try {
        const studentId = req.user.studentId;
        let profile = await OnlineProfile_1.default.findOne({ studentId });
        if (!profile)
            return res.json({ success: true, data: null });
        res.json({ success: true, data: profile });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching social links', error });
    }
};
exports.getSocialLinks = getSocialLinks;
/**
 * UPDATE SOCIAL LINKS
 * POST /api/student/profile/socials
 */
const updateSocialLinks = async (req, res) => {
    try {
        const studentId = req.user.studentId;
        const { github, linkedin, leetcode, portfolio, codechef } = req.body;
        let profile = await OnlineProfile_1.default.findOne({ studentId });
        if (profile) {
            if (github !== undefined)
                profile.github = github;
            if (linkedin !== undefined)
                profile.linkedin = linkedin;
            if (leetcode !== undefined)
                profile.leetcode = leetcode;
            if (portfolio !== undefined)
                profile.portfolio = portfolio;
            if (codechef !== undefined)
                profile.codechef = codechef;
            await profile.save();
        }
        else {
            profile = new OnlineProfile_1.default({ studentId, github, linkedin, leetcode, portfolio, codechef });
            await profile.save();
        }
        res.json({ success: true, message: 'Social links updated', data: profile });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error updating social links', error });
    }
};
exports.updateSocialLinks = updateSocialLinks;
