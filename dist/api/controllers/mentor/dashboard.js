"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMentorStats = void 0;
const MentorStudentMapping_1 = __importDefault(require("../../models/MentorStudentMapping"));
const Project_1 = __importDefault(require("../../models/Project"));
const Internship_1 = __importDefault(require("../../models/Internship"));
const Certification_1 = __importDefault(require("../../models/Certification"));
const Point_1 = __importDefault(require("../../models/Point"));
const getMentorStats = async (req, res) => {
    const mentorId = req.user.id;
    const mappings = await MentorStudentMapping_1.default.find({ mentorId });
    const studentIds = mappings.map(m => m.studentId);
    const totalStudents = studentIds.length;
    const totalProjects = await Project_1.default.countDocuments({ mentorId });
    const totalInternships = await Internship_1.default.countDocuments({ mentorId });
    const totalCertifications = await Certification_1.default.countDocuments({ mentorId });
    // top students under mentor
    const top = await Point_1.default.aggregate([
        { $match: { studentId: { $in: studentIds } } },
        { $group: { _id: '$studentId', points: { $sum: '$points' } } },
        { $sort: { points: -1 } },
        { $limit: 10 }
    ]);
    res.json({ totalStudents, totalProjects, totalInternships, totalCertifications, top });
};
exports.getMentorStats = getMentorStats;
