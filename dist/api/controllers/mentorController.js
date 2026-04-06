"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.awardPoints = exports.giveFeedback = exports.approveEntity = exports.getAssignedStudentProfile = exports.getAssignedStudents = exports.getMentorProfile = void 0;
const MentorStudentMapping_1 = __importDefault(require("../models/MentorStudentMapping"));
const Student_1 = __importDefault(require("../models/Student"));
const Approval_1 = __importDefault(require("../models/Approval"));
const Feedback_1 = __importDefault(require("../models/Feedback"));
const Point_1 = __importDefault(require("../models/Point"));
const mongoose_1 = __importDefault(require("mongoose"));
const Project_1 = __importDefault(require("../models/Project"));
const Task_1 = __importDefault(require("../models/Task"));
const Certification_1 = __importDefault(require("../models/Certification"));
const Internship_1 = __importDefault(require("../models/Internship"));
const Mentor_1 = __importDefault(require("../models/Mentor"));
const getMentorId = (req) => req.user.mentorId || req.user.id;
const getMentorProfile = async (req, res) => {
    try {
        const mentorId = req.user.mentorId;
        const email = req.user.email;
        const mentor = mentorId
            ? await Mentor_1.default.findById(mentorId)
            : await Mentor_1.default.findOne({ email });
        if (!mentor) {
            return res.status(404).json({ success: false, message: 'Mentor profile not found' });
        }
        res.json({
            success: true,
            data: {
                id: mentor._id,
                name: mentor.name,
                email: mentor.email,
                department: mentor.department,
                designation: mentor.designation,
                contactNo: mentor.contactNo,
                place: mentor.place,
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch mentor profile', error: error.message });
    }
};
exports.getMentorProfile = getMentorProfile;
const getAssignedStudents = async (req, res) => {
    try {
        const mentorId = getMentorId(req);
        const { page = 1, limit = 20, search = '', department, year, academicYear, place, status, minPoints, maxPoints, sortBy = 'name', sortOrder = 'asc' } = req.query;
        const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
        const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
        const skip = (parsedPage - 1) * parsedLimit;
        const mappings = await MentorStudentMapping_1.default.find({ mentorId, isActive: true }).select('studentId');
        const studentIds = mappings.map(m => m.studentId);
        const filter = { _id: { $in: studentIds } };
        if (department)
            filter.department = department;
        if (year)
            filter.year = year;
        if (academicYear)
            filter.academicYear = academicYear;
        if (place)
            filter.place = { $regex: String(place), $options: 'i' };
        if (status)
            filter.status = status;
        if (req.query.rollNo)
            filter.rollNo = { $regex: req.query.rollNo, $options: 'i' };
        if (req.query.familyIncome)
            filter.familyIncome = { $regex: req.query.familyIncome, $options: 'i' };
        if (req.query.minCgpa)
            filter.cgpa = { $gte: parseFloat(req.query.minCgpa) };
        if (req.query.maxArrears)
            filter.arrearCount = { $lte: parseInt(req.query.maxArrears) };
        if (req.query.goodAt)
            filter.goodAt = { $in: req.query.goodAt.split(',').map(s => s.trim()) };
        if (search) {
            filter.$or = [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } }
            ];
        }
        const students = await Student_1.default.find(filter).populate('userId', 'email');
        const pointsAgg = await Point_1.default.aggregate([
            { $match: { studentId: { $in: studentIds } } },
            { $group: { _id: '$studentId', points: { $sum: '$points' } } }
        ]);
        const pointsMap = {};
        pointsAgg.forEach((p) => { pointsMap[p._id.toString()] = p.points; });
        const projectAgg = await Project_1.default.aggregate([
            { $match: { studentId: { $in: studentIds }, status: 'APPROVED' } },
            { $group: { _id: '$studentId', total: { $sum: 1 } } }
        ]);
        const taskAgg = await Task_1.default.aggregate([
            { $match: { studentId: { $in: studentIds }, status: 'APPROVED' } },
            { $group: { _id: '$studentId', total: { $sum: 1 } } }
        ]);
        const certAgg = await Certification_1.default.aggregate([
            { $match: { studentId: { $in: studentIds }, status: 'APPROVED' } },
            { $group: { _id: '$studentId', total: { $sum: 1 } } }
        ]);
        const internshipAgg = await Internship_1.default.aggregate([
            { $match: { studentId: { $in: studentIds }, status: 'APPROVED' } },
            { $group: { _id: '$studentId', total: { $sum: 1 } } }
        ]);
        const projectMap = {};
        const taskMap = {};
        const certMap = {};
        const internshipMap = {};
        projectAgg.forEach((p) => { projectMap[p._id.toString()] = p.total; });
        taskAgg.forEach((p) => { taskMap[p._id.toString()] = p.total; });
        certAgg.forEach((p) => { certMap[p._id.toString()] = p.total; });
        internshipAgg.forEach((p) => { internshipMap[p._id.toString()] = p.total; });
        const profiles = await require('../models/OnlineProfile').default.find({ studentId: { $in: studentIds } });
        const profileMap = {};
        profiles.forEach((p) => { profileMap[p.studentId.toString()] = { github: p.github, linkedin: p.linkedin, leetcode: p.leetcode, portfolio: p.portfolio, codechef: p.codechef }; });
        let data = students.map((s) => ({
            id: s._id,
            firstName: s.firstName,
            lastName: s.lastName,
            email: s.userId?.email || '',
            department: s.department,
            year: s.year,
            academicYear: s.academicYear,
            phone: s.phone,
            place: s.place,
            points: pointsMap[s._id.toString()] || 0,
            projectsCompleted: projectMap[s._id.toString()] || 0,
            tasksCompleted: taskMap[s._id.toString()] || 0,
            certificationsCompleted: certMap[s._id.toString()] || 0,
            internshipsCompleted: internshipMap[s._id.toString()] || 0,
            socials: profileMap[s._id.toString()] || null,
            lastActive: s.createdAt,
            status: s.status === 'Active' ? 'Active' : 'Inactive'
        }));
        if (minPoints !== undefined && minPoints !== null && String(minPoints).trim() !== '') {
            const min = Number(minPoints);
            if (!Number.isNaN(min))
                data = data.filter((student) => student.points >= min);
        }
        if (maxPoints !== undefined && maxPoints !== null && String(maxPoints).trim() !== '') {
            const max = Number(maxPoints);
            if (!Number.isNaN(max))
                data = data.filter((student) => student.points <= max);
        }
        const sorted = [...data].sort((a, b) => {
            const dir = sortOrder === 'desc' ? -1 : 1;
            if (sortBy === 'points')
                return (a.points - b.points) * dir;
            if (sortBy === 'department')
                return (a.department || '').localeCompare(b.department || '') * dir;
            if (sortBy === 'year')
                return (a.year || '').localeCompare(b.year || '') * dir;
            const aName = `${a.firstName} ${a.lastName}`.trim();
            const bName = `${b.firstName} ${b.lastName}`.trim();
            return aName.localeCompare(bName) * dir;
        });
        const paginated = sorted.slice(skip, skip + parsedLimit);
        res.json({
            success: true,
            data: paginated,
            pagination: {
                total: sorted.length,
                page: parsedPage,
                limit: parsedLimit,
                totalPages: Math.ceil(sorted.length / parsedLimit)
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch assigned students', error: error.message });
    }
};
exports.getAssignedStudents = getAssignedStudents;
const getAssignedStudentProfile = async (req, res) => {
    try {
        const mentorId = getMentorId(req);
        const { id } = req.params;
        const isMapped = await MentorStudentMapping_1.default.findOne({ mentorId, studentId: id, isActive: true });
        if (!isMapped) {
            return res.status(403).json({ success: false, message: 'Student not mapped to this mentor' });
        }
        const student = await Student_1.default.findById(id).populate('userId', 'email');
        if (!student)
            return res.status(404).json({ success: false, message: 'Student not found' });
        const [projects, tasks, certifications, internships, points] = await Promise.all([
            Project_1.default.find({ studentId: id, mentorId }),
            Task_1.default.find({ studentId: id, mentorId }),
            Certification_1.default.find({ studentId: id, mentorId }),
            Internship_1.default.find({ studentId: id, mentorId }),
            Point_1.default.aggregate([
                { $match: { studentId: new mongoose_1.default.Types.ObjectId(id) } },
                { $group: { _id: '$studentId', totalPoints: { $sum: '$points' } } }
            ])
        ]);
        res.json({
            success: true,
            data: {
                profile: {
                    id: student._id,
                    firstName: student.firstName,
                    lastName: student.lastName,
                    email: student.userId?.email || '',
                    department: student.department,
                    year: student.year,
                    academicYear: student.academicYear,
                    phone: student.phone,
                    place: student.place,
                    status: student.status
                },
                stats: {
                    totalPoints: points[0]?.totalPoints || 0,
                    projects: { total: projects.length, approved: projects.filter(p => p.status === 'APPROVED').length, pending: projects.filter(p => p.status === 'PENDING').length },
                    tasks: { total: tasks.length, approved: tasks.filter(t => t.status === 'APPROVED').length, pending: tasks.filter(t => t.status === 'PENDING').length },
                    certifications: { total: certifications.length, approved: certifications.filter(c => c.status === 'APPROVED').length, pending: certifications.filter(c => c.status === 'PENDING').length },
                    internships: { total: internships.length, approved: internships.filter(i => i.status === 'APPROVED').length, pending: internships.filter(i => i.status === 'PENDING').length }
                },
                recent: {
                    projects: projects.slice(0, 5),
                    tasks: tasks.slice(0, 5),
                    certifications: certifications.slice(0, 5),
                    internships: internships.slice(0, 5)
                }
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch student profile', error: error.message });
    }
};
exports.getAssignedStudentProfile = getAssignedStudentProfile;
const approveEntity = async (req, res) => {
    try {
        const mentorId = getMentorId(req);
        const { entityType, entityId, studentId, status } = req.body;
        if (!entityType || !entityId || !studentId || !status) {
            return res.status(400).json({ success: false, message: 'Invalid payload' });
        }
        const approval = new Approval_1.default({ entityType, entityId, studentId, mentorId, status, approvedAt: new Date() });
        await approval.save();
        res.json({ success: true, data: approval });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to approve entity', error: error.message });
    }
};
exports.approveEntity = approveEntity;
const giveFeedback = async (req, res) => {
    try {
        const mentorId = getMentorId(req);
        const { studentId, message, source, sourceId } = req.body;
        if (!studentId || !message)
            return res.status(400).json({ success: false, message: 'Invalid payload' });
        const feedback = new Feedback_1.default({ studentId, mentorId, source, sourceId, message });
        await feedback.save();
        res.json({ success: true, data: feedback });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to save feedback', error: error.message });
    }
};
exports.giveFeedback = giveFeedback;
const awardPoints = async (req, res) => {
    try {
        const mentorId = getMentorId(req);
        const { studentId, source, points, referenceId, description } = req.body;
        if (!studentId || !source || typeof points !== 'number') {
            return res.status(400).json({ success: false, message: 'Invalid payload' });
        }
        const point = new Point_1.default({ studentId, mentorId, source, referenceId, description, points });
        await point.save();
        await Student_1.default.findByIdAndUpdate(studentId, { $inc: { rewardPoints: points } });
        res.json({ success: true, data: point });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to award points', error: error.message });
    }
};
exports.awardPoints = awardPoints;
