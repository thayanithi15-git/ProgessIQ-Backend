"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHeatmapData = exports.submitActivityLog = exports.getActivityLogs = exports.getTaskCompletionChart = exports.getMonthlyActivityChart = exports.getPointsTrendChart = exports.getStudentDashboard = void 0;
const Student_1 = __importDefault(require("../../models/Student"));
const Mentor_1 = __importDefault(require("../../models/Mentor"));
const Project_1 = __importDefault(require("../../models/Project"));
const Task_1 = __importDefault(require("../../models/Task"));
const Certification_1 = __importDefault(require("../../models/Certification"));
const Point_1 = __importDefault(require("../../models/Point"));
const DailyActivityLog_1 = __importDefault(require("../../models/DailyActivityLog"));
const Ranking_1 = __importDefault(require("../../models/Ranking"));
const Feedback_1 = __importDefault(require("../../models/Feedback"));
const Internship_1 = __importDefault(require("../../models/Internship"));
const mongoose_1 = __importDefault(require("mongoose"));
/**
 * GET /api/student/dashboard
 * Returns complete student dashboard with stats, charts, and heatmap data
 */
const getStudentDashboard = async (req, res) => {
    try {
        const studentId = req.user.studentId;
        // Get student basic info
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
        // Get projects stats
        const projects = await Project_1.default.find({ studentId });
        const projectStats = {
            total: projects.length,
            completed: projects.filter(p => p.status === 'APPROVED').length,
            pending: projects.filter(p => p.status === 'PENDING').length,
            rejected: projects.filter(p => p.status === 'REJECTED').length
        };
        // Get tasks stats
        const tasks = await Task_1.default.find({ studentId });
        const taskStats = {
            total: tasks.length,
            completed: tasks.filter(t => t.status === 'COMPLETED').length,
            pending: tasks.filter(t => t.status === 'PENDING').length,
            overdue: tasks.filter(t => t.dueDate < new Date() && t.status !== 'COMPLETED').length
        };
        // Get certifications stats
        const certifications = await Certification_1.default.find({ studentId });
        const certificationStats = {
            total: certifications.length,
            completed: certifications.filter(c => c.status === 'APPROVED').length,
            pending: certifications.filter(c => c.status === 'PENDING').length,
            rejected: certifications.filter(c => c.status === 'REJECTED').length
        };
        // Get internships stats
        const internships = await Internship_1.default.find({ studentId });
        const internshipStats = {
            total: internships.length,
            completed: internships.filter(i => i.status === 'APPROVED').length,
            pending: internships.filter(i => i.status === 'PENDING').length,
            rejected: internships.filter(i => i.status === 'REJECTED').length
        };
        // Get points and activity
        const pointsData = await Point_1.default.find({ studentId }).sort({ awardedOn: -1 });
        const totalPoints = pointsData.reduce((sum, p) => sum + p.points, 0);
        // Get ranking
        const ranking = await Ranking_1.default.findOne({ studentId });
        // Get points heatmap data for current year
        const currentYear = new Date().getFullYear();
        const activityData = await getPointsHeatmapData(studentId, currentYear);
        // Get activity logs for stats
        const activityLogs = await DailyActivityLog_1.default.find({ studentId });
        const totalHoursSpent = activityLogs.reduce((sum, log) => sum + log.hoursSpent, 0);
        // Get recent feedback
        const recentFeedback = await Feedback_1.default.find({ studentId })
            .populate('mentorId', 'firstName lastName')
            .sort({ createdAt: -1 })
            .limit(5);
        // Get monthly activity data for chart
        const monthlyActivity = await getMonthlyActivityData(studentId);
        // Get points by source breakdown
        const pointsBySource = await getPointsBySourceBreakdown(studentId);
        res.json({
            success: true,
            data: {
                student: {
                    id: student._id,
                    name: `${student.firstName} ${student.lastName}`,
                    email: student.userId?.email,
                    department: student.department,
                    year: student.year,
                    phone: student.phone,
                    place: student.place,
                    status: student.status,
                    academicYear: student.academicYear
                },
                mentor: mentor ? {
                    id: mentor._id,
                    name: `${mentor?.userId?.firstName || ''} ${mentor?.userId?.lastName || ''}`,
                    email: mentor?.userId?.email,
                    department: mentor.department,
                    expertise: mentor?.expertise
                } : null,
                stats: {
                    totalPoints,
                    totalHoursSpent: Math.round(totalHoursSpent),
                    projects: projectStats,
                    tasks: taskStats,
                    certifications: certificationStats,
                    internships: internshipStats,
                    ranking: ranking ? {
                        overallRank: ranking.overallRank,
                        departmentRank: ranking.departmentRank
                    } : null
                },
                charts: {
                    monthlyActivity,
                    pointsBySource,
                    projectCompletion: {
                        completed: projectStats.completed,
                        pending: projectStats.pending,
                        rejected: projectStats.rejected
                    },
                    taskCompletion: {
                        completed: taskStats.completed,
                        pending: taskStats.pending,
                        overdue: taskStats.overdue
                    },
                    certificationCompletion: {
                        completed: certificationStats.completed,
                        pending: certificationStats.pending,
                        rejected: certificationStats.rejected
                    }
                },
                heatmap: activityData,
                recentFeedback: recentFeedback.map(f => ({
                    id: f._id,
                    mentor: f.mentorId?.firstName,
                    message: f.message,
                    date: f.createdAt
                })),
                recentActivities: activityLogs.slice(0, 10).map(log => ({
                    date: log.date,
                    activity: log.activity,
                    hoursSpent: log.hoursSpent
                }))
            }
        });
    }
    catch (error) {
        console.error('Error fetching student dashboard:', error);
        res.status(500).json({ success: false, message: 'Error fetching dashboard', error });
    }
};
exports.getStudentDashboard = getStudentDashboard;
/**
 * Generate points heatmap data for a year
 */
async function getPointsHeatmapData(studentId, year) {
    const start = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0, 0));
    const grouped = await Point_1.default.aggregate([
        {
            $match: {
                studentId: new mongoose_1.default.Types.ObjectId(studentId),
                awardedOn: { $gte: start, $lt: end }
            }
        },
        {
            $group: {
                _id: {
                    $dateToString: {
                        format: '%Y-%m-%d',
                        date: '$awardedOn'
                    }
                },
                value: { $sum: '$points' }
            }
        },
        { $sort: { _id: 1 } }
    ]);
    const maxValue = grouped.reduce((max, item) => Math.max(max, item.value || 0), 0);
    return grouped.map((item) => {
        const value = item.value || 0;
        const intensity = maxValue > 0
            ? Math.max(1, Math.min(4, Math.ceil((value / maxValue) * 4)))
            : 0;
        return {
            date: item._id,
            value,
            intensity
        };
    });
}
/**
 * Get monthly activity data for line chart
 */
async function getMonthlyActivityData(studentId) {
    const logs = await DailyActivityLog_1.default.find({ studentId });
    const monthlyMap = {};
    logs.forEach(log => {
        const date = new Date(log.date);
        const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthlyMap[monthStr] = (monthlyMap[monthStr] || 0) + log.hoursSpent;
    });
    return Object.entries(monthlyMap)
        .sort()
        .map(([month, hours]) => ({
        month,
        hours: Math.round(hours)
    }));
}
/**
 * Get points by source breakdown
 */
async function getPointsBySourceBreakdown(studentId) {
    const breakdown = await Point_1.default.aggregate([
        { $match: { studentId: new mongoose_1.default.Types.ObjectId(studentId) } },
        { $group: { _id: '$source', points: { $sum: '$points' } } },
        { $sort: { points: -1 } }
    ]);
    return breakdown.map(b => ({
        source: b._id,
        points: b.points
    }));
}
function getDateFilter(filter) {
    const now = new Date();
    if (filter === 'week') {
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return { $gte: weekAgo };
    }
    if (filter === 'month') {
        const monthAgo = new Date(now);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return { $gte: monthAgo };
    }
    if (filter === 'year') {
        const yearAgo = new Date(now);
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        return { $gte: yearAgo };
    }
    return {};
}
/**
 * GET /api/student/charts/points-trend?filter=week|month|year
 * Returns student points trend grouped by day
 */
const getPointsTrendChart = async (req, res) => {
    try {
        const studentId = req.user.studentId;
        const filter = req.query.filter || 'month';
        const awardedOnFilter = getDateFilter(filter);
        const pointsData = await Point_1.default.aggregate([
            {
                $match: {
                    studentId: new mongoose_1.default.Types.ObjectId(studentId),
                    ...(Object.keys(awardedOnFilter).length ? { awardedOn: awardedOnFilter } : {})
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$awardedOn' }
                    },
                    points: { $sum: '$points' },
                    awards: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } },
            {
                $project: {
                    _id: 0,
                    date: '$_id',
                    points: 1,
                    awards: 1
                }
            }
        ]);
        res.json({ success: true, data: pointsData });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching points trend', error });
    }
};
exports.getPointsTrendChart = getPointsTrendChart;
/**
 * GET /api/student/charts/monthly-activity?filter=week|month|year
 * Returns student activity grouped by day
 */
const getMonthlyActivityChart = async (req, res) => {
    try {
        const studentId = req.user.studentId;
        const filter = req.query.filter || 'month';
        const dateFilter = getDateFilter(filter);
        const activityData = await DailyActivityLog_1.default.aggregate([
            {
                $match: {
                    studentId: new mongoose_1.default.Types.ObjectId(studentId),
                    ...(Object.keys(dateFilter).length ? { date: dateFilter } : {})
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$date' }
                    },
                    hours: { $sum: '$hoursSpent' }
                }
            },
            { $sort: { _id: 1 } },
            {
                $project: {
                    _id: 0,
                    month: '$_id',
                    hours: { $round: ['$hours', 2] }
                }
            }
        ]);
        res.json({ success: true, data: activityData });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching activity chart', error });
    }
};
exports.getMonthlyActivityChart = getMonthlyActivityChart;
/**
 * GET /api/student/charts/task-completion
 * Returns task status totals
 */
const getTaskCompletionChart = async (req, res) => {
    try {
        const studentId = req.user.studentId;
        const tasks = await Task_1.default.find({ studentId }).select('status dueDate');
        const completed = tasks.filter(t => t.status === 'COMPLETED').length;
        const pending = tasks.filter(t => t.status === 'PENDING').length;
        const overdue = tasks.filter(t => t.status !== 'COMPLETED' && t.dueDate < new Date()).length;
        res.json({
            success: true,
            data: [
                {
                    month: new Date().toISOString().slice(0, 7),
                    completed,
                    pending,
                    overdue
                }
            ]
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching task completion', error });
    }
};
exports.getTaskCompletionChart = getTaskCompletionChart;
/**
 * GET /api/student/activity-logs
 * Get all activity logs for the student
 */
const getActivityLogs = async (req, res) => {
    try {
        const studentId = req.user.studentId;
        const { month, year, limit = 100, skip = 0 } = req.query;
        const filter = { studentId };
        if (month && year) {
            const date = new Date(`${year}-${month}-01`);
            const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1);
            filter.date = { $gte: date, $lt: nextMonth };
        }
        const logs = await DailyActivityLog_1.default.find(filter)
            .sort({ date: -1 })
            .skip(parseInt(skip))
            .limit(parseInt(limit));
        const total = await DailyActivityLog_1.default.countDocuments(filter);
        res.json({
            success: true,
            data: {
                logs,
                pagination: {
                    total,
                    limit: parseInt(limit),
                    skip: parseInt(skip)
                }
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching activity logs', error });
    }
};
exports.getActivityLogs = getActivityLogs;
/**
 * POST /api/student/activity-logs
 * Submit daily activity log
 */
const submitActivityLog = async (req, res) => {
    try {
        const studentId = req.user.studentId;
        const { date, activity, hoursSpent } = req.body;
        if (!date || !activity || !hoursSpent) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }
        const log = new DailyActivityLog_1.default({
            studentId,
            date: new Date(date),
            activity,
            hoursSpent: parseFloat(hoursSpent)
        });
        await log.save();
        res.status(201).json({
            success: true,
            message: 'Activity log submitted',
            data: log
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error submitting activity log', error });
    }
};
exports.submitActivityLog = submitActivityLog;
/**
 * GET /api/student/heatmap?year=YYYY
 * Returns points heatmap data grouped by day for the given year
 */
const getHeatmapData = async (req, res) => {
    try {
        const studentId = req.user.studentId;
        const requestedYear = parseInt(req.query.year);
        const year = Number.isFinite(requestedYear) ? requestedYear : new Date().getFullYear();
        const data = await getPointsHeatmapData(studentId, year);
        res.json({
            success: true,
            data
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching heatmap data', error });
    }
};
exports.getHeatmapData = getHeatmapData;
