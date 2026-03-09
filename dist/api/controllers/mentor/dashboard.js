"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMentorStats = void 0;
const MentorStudentMapping_1 = __importDefault(require("../../models/MentorStudentMapping"));
const Project_1 = __importDefault(require("../../models/Project"));
const Task_1 = __importDefault(require("../../models/Task"));
const Internship_1 = __importDefault(require("../../models/Internship"));
const Certification_1 = __importDefault(require("../../models/Certification"));
const Point_1 = __importDefault(require("../../models/Point"));
const Student_1 = __importDefault(require("../../models/Student"));
const Approval_1 = __importDefault(require("../../models/Approval"));
const mongoose_1 = __importDefault(require("mongoose"));
const getMentorStats = async (req, res) => {
    try {
        const mentorId = req.user.mentorId || req.user.id;
        const mappings = await MentorStudentMapping_1.default.find({ mentorId, isActive: true }).select('studentId');
        const studentIds = mappings.map(m => m.studentId);
        const totalAssignedStudents = studentIds.length;
        const [totalProjects, totalTasks, totalInternships, totalCertifications, pendingApprovals, completedProjects, activeStudents, projectStatusAgg, taskStatusAgg, internshipStatusAgg, certificationStatusAgg] = await Promise.all([
            Project_1.default.countDocuments({ mentorId }),
            Task_1.default.countDocuments({ mentorId }),
            Internship_1.default.countDocuments({ mentorId }),
            Certification_1.default.countDocuments({ mentorId }),
            Promise.all([
                Project_1.default.countDocuments({ mentorId, status: 'PENDING' }),
                Task_1.default.countDocuments({ mentorId, status: 'PENDING' }),
                Internship_1.default.countDocuments({ mentorId, status: 'PENDING' }),
                Certification_1.default.countDocuments({ mentorId, status: 'PENDING' })
            ]).then(vals => vals.reduce((a, b) => a + b, 0)),
            Project_1.default.countDocuments({ mentorId, status: 'APPROVED' }),
            Student_1.default.countDocuments({ _id: { $in: studentIds }, status: 'Active' }),
            Project_1.default.aggregate([
                { $match: { mentorId: new mongoose_1.default.Types.ObjectId(mentorId) } },
                { $group: { _id: '$status', total: { $sum: 1 } } }
            ]),
            Task_1.default.aggregate([
                { $match: { mentorId: new mongoose_1.default.Types.ObjectId(mentorId) } },
                { $group: { _id: '$status', total: { $sum: 1 } } }
            ]),
            Internship_1.default.aggregate([
                { $match: { mentorId: new mongoose_1.default.Types.ObjectId(mentorId) } },
                { $group: { _id: '$status', total: { $sum: 1 } } }
            ]),
            Certification_1.default.aggregate([
                { $match: { mentorId: new mongoose_1.default.Types.ObjectId(mentorId) } },
                { $group: { _id: '$status', total: { $sum: 1 } } }
            ])
        ]);
        // Top students under mentor based on points
        const top = await Point_1.default.aggregate([
            { $match: { studentId: { $in: studentIds } } },
            { $group: { _id: '$studentId', points: { $sum: '$points' } } },
            { $sort: { points: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: 'students',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'student'
                }
            },
            { $unwind: '$student' },
            {
                $project: {
                    _id: 0,
                    studentId: '$student._id',
                    name: { $concat: ['$student.firstName', ' ', '$student.lastName'] },
                    department: '$student.department',
                    year: '$student.year',
                    points: '$points'
                }
            }
        ]);
        // Approval trend for dashboard chart (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
        const approvalTrend = await Approval_1.default.aggregate([
            {
                $match: {
                    mentorId: new mongoose_1.default.Types.ObjectId(mentorId),
                    approvedAt: { $gte: thirtyDaysAgo }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$approvedAt' }
                    },
                    approvals: { $sum: 1 },
                    approved: {
                        $sum: {
                            $cond: [{ $in: [{ $toUpper: { $ifNull: ['$status', ''] } }, ['APPROVED', 'COMPLETED']] }, 1, 0]
                        }
                    },
                    rejected: {
                        $sum: {
                            $cond: [{ $eq: [{ $toUpper: { $ifNull: ['$status', ''] } }, 'REJECTED'] }, 1, 0]
                        }
                    },
                    feedback: {
                        $sum: {
                            $cond: [{ $gt: [{ $strLenCP: { $ifNull: ['$feedback', ''] } }, 0] }, 1, 0]
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    date: '$_id',
                    approvals: 1,
                    approved: 1,
                    rejected: 1,
                    feedback: 1
                }
            }
        ]);
        const pointsTrend = await Point_1.default.aggregate([
            {
                $match: {
                    mentorId: new mongoose_1.default.Types.ObjectId(mentorId),
                    awardedOn: { $gte: thirtyDaysAgo }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$awardedOn' } },
                    points: { $sum: '$points' },
                    awards: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } },
            { $project: { _id: 0, date: '$_id', points: 1, awards: 1 } }
        ]);
        const projectRows = await Project_1.default.find({ mentorId })
            .populate('studentId', 'firstName lastName')
            .sort({ completedAt: -1, _id: -1 })
            .limit(10);
        const taskRows = await Task_1.default.find({ mentorId })
            .populate('studentId', 'firstName lastName')
            .sort({ dueDate: -1, _id: -1 })
            .limit(10);
        const internshipRows = await Internship_1.default.find({ mentorId })
            .populate('studentId', 'firstName lastName')
            .sort({ from: -1, _id: -1 })
            .limit(10);
        const certificationRows = await Certification_1.default.find({ mentorId })
            .populate('studentId', 'firstName lastName')
            .sort({ to: -1, _id: -1 })
            .limit(10);
        const statusCount = (rows) => ({
            total: rows.reduce((sum, row) => sum + row.total, 0),
            approved: rows.filter((r) => ['APPROVED', 'COMPLETED'].includes(String(r._id || '').toUpperCase())).reduce((sum, r) => sum + r.total, 0),
            pending: rows.filter((r) => String(r._id || '').toUpperCase() === 'PENDING').reduce((sum, r) => sum + r.total, 0),
            rejected: rows.filter((r) => String(r._id || '').toUpperCase() === 'REJECTED').reduce((sum, r) => sum + r.total, 0)
        });
        res.json({
            success: true,
            data: {
                totalAssignedStudents,
                totalProjects,
                totalTasks,
                totalInternships,
                totalCertifications,
                pendingApprovals,
                completedProjects,
                activeStudents,
                topStudents: top,
                activityData: approvalTrend,
                charts: {
                    approvalTrend,
                    pointsTrend
                },
                approvals: {
                    projects: statusCount(projectStatusAgg),
                    tasks: statusCount(taskStatusAgg),
                    internships: statusCount(internshipStatusAgg),
                    certifications: statusCount(certificationStatusAgg)
                },
                tables: {
                    recentProjects: projectRows.map((p) => ({
                        id: p._id,
                        title: p.title,
                        status: p.status,
                        studentName: `${p.studentId?.firstName || ''} ${p.studentId?.lastName || ''}`.trim(),
                        submittedAt: p.completedAt || p.createdAt || p._id.getTimestamp()
                    })),
                    recentTasks: taskRows.map((t) => ({
                        id: t._id,
                        title: t.title,
                        status: t.status,
                        studentName: `${t.studentId?.firstName || ''} ${t.studentId?.lastName || ''}`.trim(),
                        submittedAt: t.completedAt || t.dueDate || t.createdAt || t._id.getTimestamp()
                    })),
                    recentInternships: internshipRows.map((i) => ({
                        id: i._id,
                        title: `${i.companyName} - ${i.role}`,
                        status: i.status,
                        studentName: `${i.studentId?.firstName || ''} ${i.studentId?.lastName || ''}`.trim(),
                        submittedAt: i.from || i.createdAt || i._id.getTimestamp()
                    })),
                    recentCertifications: certificationRows.map((c) => ({
                        id: c._id,
                        title: c.title,
                        status: c.status,
                        studentName: `${c.studentId?.firstName || ''} ${c.studentId?.lastName || ''}`.trim(),
                        submittedAt: c.to || c.createdAt || c._id.getTimestamp()
                    }))
                }
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch mentor stats', error: error.message });
    }
};
exports.getMentorStats = getMentorStats;
