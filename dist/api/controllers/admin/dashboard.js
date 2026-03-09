"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPointsBySource = exports.getMonthlySubmissions = exports.getInternshipTypesChart = exports.getProjectStatusChart = exports.getYearDistribution = exports.getDepartmentDistribution = exports.getPointsTrendChart = exports.getActivityChart = exports.getTopStudents = exports.getAdminStats = void 0;
const Student_1 = __importDefault(require("../../models/Student"));
const Mentor_1 = __importDefault(require("../../models/Mentor"));
const Project_1 = __importDefault(require("../../models/Project"));
const Internship_1 = __importDefault(require("../../models/Internship"));
const Certification_1 = __importDefault(require("../../models/Certification"));
const Point_1 = __importDefault(require("../../models/Point"));
const DailyActivityLog_1 = __importDefault(require("../../models/DailyActivityLog"));
/**
 * GET /api/admin/stats
 * Query params: none
 * Returns: Overall statistics
 */
const getAdminStats = async (req, res) => {
    try {
        const totalStudents = await Student_1.default.countDocuments();
        const totalMentors = await Mentor_1.default.countDocuments();
        const totalProjects = await Project_1.default.countDocuments();
        const totalInternships = await Internship_1.default.countDocuments();
        const totalCertifications = await Certification_1.default.countDocuments();
        // Students above average points
        const agg = await Point_1.default.aggregate([
            { $group: { _id: '$studentId', points: { $sum: '$points' } } },
            { $group: { _id: null, avgPoints: { $avg: '$points' } } }
        ]);
        const avgPoints = agg[0]?.avgPoints || 0;
        const studentsAboveAvg = await Point_1.default.aggregate([
            { $group: { _id: '$studentId', points: { $sum: '$points' } } },
            { $match: { points: { $gt: avgPoints } } },
            { $count: 'count' }
        ]);
        const aboveAvgCount = studentsAboveAvg[0]?.count || 0;
        const activeStudents = await Student_1.default.countDocuments({ status: 'Active' });
        res.json({
            success: true,
            data: {
                totalStudents,
                totalMentors,
                totalProjects,
                totalInternships,
                totalCertifications,
                aboveAvgCount,
                activeStudents,
                avgPoints: Math.round(avgPoints)
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching stats', error });
    }
};
exports.getAdminStats = getAdminStats;
/**
 * GET /api/admin/top-students
 * Query params: limit (default: 10)
 * Returns: Top students with full details
 */
const getTopStudents = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const topStudents = await Point_1.default.aggregate([
            {
                $group: {
                    _id: '$studentId',
                    totalPoints: { $sum: '$points' }
                }
            },
            { $sort: { totalPoints: -1 } },
            { $limit: limit },
            {
                $lookup: {
                    from: 'students',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'studentInfo'
                }
            },
            { $unwind: '$studentInfo' },
            {
                $lookup: {
                    from: 'projects',
                    localField: '_id',
                    foreignField: 'studentId',
                    as: 'projects'
                }
            },
            {
                $lookup: {
                    from: 'internships',
                    localField: '_id',
                    foreignField: 'studentId',
                    as: 'internships'
                }
            },
            {
                $lookup: {
                    from: 'certifications',
                    localField: '_id',
                    foreignField: 'studentId',
                    as: 'certifications'
                }
            },
            {
                $lookup: {
                    from: 'rankings',
                    localField: '_id',
                    foreignField: 'studentId',
                    as: 'ranking'
                }
            },
            {
                $project: {
                    rank: { $literal: 0 }, // Will be set in post-processing
                    name: {
                        $concat: [
                            '$studentInfo.firstName',
                            ' ',
                            '$studentInfo.lastName'
                        ]
                    },
                    email: '$studentInfo.userId.email',
                    department: '$studentInfo.department',
                    year: '$studentInfo.year',
                    designation: {
                        $cond: {
                            if: { $gte: ['$totalPoints', 500] },
                            then: 'Gold Scholar',
                            else: {
                                $cond: {
                                    if: { $gte: ['$totalPoints', 300] },
                                    then: 'Silver Scholar',
                                    else: 'Bronze Scholar'
                                }
                            }
                        }
                    },
                    points: '$totalPoints',
                    projectsCompleted: {
                        $size: {
                            $filter: {
                                input: '$projects',
                                as: 'p',
                                cond: { $eq: ['$$p.status', 'Completed'] }
                            }
                        }
                    },
                    internshipsCompleted: {
                        $size: {
                            $filter: {
                                input: '$internships',
                                as: 'i',
                                cond: { $eq: ['$$i.status', 'Approved'] }
                            }
                        }
                    },
                    certificationsEarned: { $size: '$certifications' },
                    departmentRank: { $arrayElemAt: ['$ranking.departmentRank', 0] },
                    overallRank: { $arrayElemAt: ['$ranking.overallRank', 0] },
                    lastActive: '$studentInfo.createdAt'
                }
            }
        ]);
        // Add rank position
        const rankedStudents = topStudents.map((student, index) => ({
            ...student,
            rank: index + 1
        }));
        res.json({
            success: true,
            data: rankedStudents
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching top students', error });
    }
};
exports.getTopStudents = getTopStudents;
/**
 * GET /api/admin/charts/activities
 * Query params: filter (week|month|year), startDate, endDate
 * Returns: Daily activity hours data for line chart
 */
const getActivityChart = async (req, res) => {
    try {
        const { filter = 'month', startDate, endDate } = req.query;
        let dateFilter = {};
        const now = new Date();
        if (startDate && endDate) {
            dateFilter = {
                date: {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                }
            };
        }
        else if (filter === 'week') {
            const weekAgo = new Date(now);
            weekAgo.setDate(weekAgo.getDate() - 7);
            dateFilter = { date: { $gte: weekAgo } };
        }
        else if (filter === 'month') {
            const monthAgo = new Date(now);
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            dateFilter = { date: { $gte: monthAgo } };
        }
        else if (filter === 'year') {
            const yearAgo = new Date(now);
            yearAgo.setFullYear(yearAgo.getFullYear() - 1);
            dateFilter = { date: { $gte: yearAgo } };
        }
        const activityData = await DailyActivityLog_1.default.aggregate([
            { $match: dateFilter },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$date' }
                    },
                    totalHours: { $sum: '$hoursSpent' },
                    activityCount: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } },
            {
                $project: {
                    date: '$_id',
                    hours: '$totalHours',
                    activities: '$activityCount',
                    _id: 0
                }
            }
        ]);
        res.json({
            success: true,
            filter,
            data: activityData
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching activity chart', error });
    }
};
exports.getActivityChart = getActivityChart;
/**
 * GET /api/admin/charts/points-trend
 * Query params: filter (week|month|year)
 * Returns: Points awarded over time (line chart)
 */
const getPointsTrendChart = async (req, res) => {
    try {
        const { filter = 'month' } = req.query;
        let dateFilter = {};
        const now = new Date();
        if (filter === 'week') {
            const weekAgo = new Date(now);
            weekAgo.setDate(weekAgo.getDate() - 7);
            dateFilter = { awardedOn: { $gte: weekAgo } };
        }
        else if (filter === 'month') {
            const monthAgo = new Date(now);
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            dateFilter = { awardedOn: { $gte: monthAgo } };
        }
        else if (filter === 'year') {
            const yearAgo = new Date(now);
            yearAgo.setFullYear(yearAgo.getFullYear() - 1);
            dateFilter = { awardedOn: { $gte: yearAgo } };
        }
        const pointsData = await Point_1.default.aggregate([
            { $match: dateFilter },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$awardedOn' }
                    },
                    totalPoints: { $sum: '$points' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } },
            {
                $project: {
                    date: '$_id',
                    points: '$totalPoints',
                    awards: '$count',
                    _id: 0
                }
            }
        ]);
        res.json({
            success: true,
            filter,
            data: pointsData
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching points trend', error });
    }
};
exports.getPointsTrendChart = getPointsTrendChart;
/**
 * GET /api/admin/charts/department-distribution
 * Query params: none
 * Returns: Student distribution by department (pie chart)
 */
const getDepartmentDistribution = async (req, res) => {
    try {
        const distribution = await Student_1.default.aggregate([
            {
                $group: {
                    _id: '$department',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } },
            {
                $project: {
                    department: '$_id',
                    students: '$count',
                    _id: 0
                }
            }
        ]);
        const total = distribution.reduce((sum, d) => sum + d.students, 0);
        const withPercentage = distribution.map(d => ({
            ...d,
            percentage: Math.round((d.students / total) * 100)
        }));
        res.json({
            success: true,
            data: withPercentage
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching department distribution', error });
    }
};
exports.getDepartmentDistribution = getDepartmentDistribution;
/**
 * GET /api/admin/charts/year-distribution
 * Query params: none
 * Returns: Student distribution by year (pie chart)
 */
const getYearDistribution = async (req, res) => {
    try {
        const distribution = await Student_1.default.aggregate([
            {
                $group: {
                    _id: '$year',
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } },
            {
                $project: {
                    year: '$_id',
                    students: '$count',
                    _id: 0
                }
            }
        ]);
        const total = distribution.reduce((sum, d) => sum + d.students, 0);
        const withPercentage = distribution.map(d => ({
            ...d,
            percentage: Math.round((d.students / total) * 100)
        }));
        res.json({
            success: true,
            data: withPercentage
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching year distribution', error });
    }
};
exports.getYearDistribution = getYearDistribution;
/**
 * GET /api/admin/charts/project-status
 * Query params: filter (week|month|year|all)
 * Returns: Project status distribution (pie chart)
 */
const getProjectStatusChart = async (req, res) => {
    try {
        const { filter = 'all' } = req.query;
        let dateFilter = {};
        const now = new Date();
        if (filter === 'week') {
            const weekAgo = new Date(now);
            weekAgo.setDate(weekAgo.getDate() - 7);
            dateFilter = { createdAt: { $gte: weekAgo } };
        }
        else if (filter === 'month') {
            const monthAgo = new Date(now);
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            dateFilter = { createdAt: { $gte: monthAgo } };
        }
        else if (filter === 'year') {
            const yearAgo = new Date(now);
            yearAgo.setFullYear(yearAgo.getFullYear() - 1);
            dateFilter = { createdAt: { $gte: yearAgo } };
        }
        const statusData = await Project_1.default.aggregate([
            { $match: dateFilter },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    status: '$_id',
                    count: '$count',
                    _id: 0
                }
            }
        ]);
        const total = statusData.reduce((sum, s) => sum + s.count, 0);
        const withPercentage = statusData.map(s => ({
            ...s,
            percentage: Math.round((s.count / total) * 100)
        }));
        res.json({
            success: true,
            filter,
            data: withPercentage
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching project status', error });
    }
};
exports.getProjectStatusChart = getProjectStatusChart;
/**
 * GET /api/admin/charts/internship-types
 * Query params: none
 * Returns: Internship type distribution (pie chart)
 */
const getInternshipTypesChart = async (req, res) => {
    try {
        const typeData = await Internship_1.default.aggregate([
            {
                $group: {
                    _id: '$type',
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    type: '$_id',
                    count: '$count',
                    _id: 0
                }
            }
        ]);
        const total = typeData.reduce((sum, t) => sum + t.count, 0);
        const withPercentage = typeData.map(t => ({
            ...t,
            percentage: Math.round((t.count / total) * 100)
        }));
        res.json({
            success: true,
            data: withPercentage
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching internship types', error });
    }
};
exports.getInternshipTypesChart = getInternshipTypesChart;
/**
 * GET /api/admin/charts/monthly-submissions
 * Query params: filter (6months|year|all)
 * Returns: Monthly submission counts for projects, internships, certifications (multi-line chart)
 */
const getMonthlySubmissions = async (req, res) => {
    try {
        const { filter = '6months' } = req.query;
        let dateFilter = {};
        const now = new Date();
        if (filter === '6months') {
            const sixMonthsAgo = new Date(now);
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
            dateFilter = { createdAt: { $gte: sixMonthsAgo } };
        }
        else if (filter === 'year') {
            const yearAgo = new Date(now);
            yearAgo.setFullYear(yearAgo.getFullYear() - 1);
            dateFilter = { createdAt: { $gte: yearAgo } };
        }
        // Projects by month
        const projects = await Project_1.default.aggregate([
            { $match: dateFilter },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m', date: '$createdAt' }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);
        // Internships by month
        const internships = await Internship_1.default.aggregate([
            { $match: dateFilter },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m', date: '$createdAt' }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);
        // Certifications by month
        const certifications = await Certification_1.default.aggregate([
            { $match: dateFilter },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m', date: '$createdAt' }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);
        // Merge all months
        const allMonths = new Set([
            ...projects.map(p => p._id),
            ...internships.map(i => i._id),
            ...certifications.map(c => c._id)
        ]);
        const data = Array.from(allMonths).sort().map(month => ({
            month,
            projects: projects.find(p => p._id === month)?.count || 0,
            internships: internships.find(i => i._id === month)?.count || 0,
            certifications: certifications.find(c => c._id === month)?.count || 0
        }));
        res.json({
            success: true,
            filter,
            data
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching monthly submissions', error });
    }
};
exports.getMonthlySubmissions = getMonthlySubmissions;
/**
 * GET /api/admin/charts/points-by-source
 * Query params: filter (week|month|year|all)
 * Returns: Points distribution by source (bar chart)
 */
const getPointsBySource = async (req, res) => {
    try {
        const { filter = 'month' } = req.query;
        let dateFilter = {};
        const now = new Date();
        if (filter === 'week') {
            const weekAgo = new Date(now);
            weekAgo.setDate(weekAgo.getDate() - 7);
            dateFilter = { awardedOn: { $gte: weekAgo } };
        }
        else if (filter === 'month') {
            const monthAgo = new Date(now);
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            dateFilter = { awardedOn: { $gte: monthAgo } };
        }
        else if (filter === 'year') {
            const yearAgo = new Date(now);
            yearAgo.setFullYear(yearAgo.getFullYear() - 1);
            dateFilter = { awardedOn: { $gte: yearAgo } };
        }
        const sourceData = await Point_1.default.aggregate([
            { $match: dateFilter },
            {
                $group: {
                    _id: '$source',
                    totalPoints: { $sum: '$points' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { totalPoints: -1 } },
            {
                $project: {
                    source: '$_id',
                    points: '$totalPoints',
                    awards: '$count',
                    _id: 0
                }
            }
        ]);
        res.json({
            success: true,
            filter,
            data: sourceData
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching points by source', error });
    }
};
exports.getPointsBySource = getPointsBySource;
