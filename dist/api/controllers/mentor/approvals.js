"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewSubmission = exports.getSubmissionDetail = exports.updateApproval = exports.listSubmissions = exports.getApprovalStats = exports.listApprovals = void 0;
const Approval_1 = __importDefault(require("../../models/Approval"));
const Project_1 = __importDefault(require("../../models/Project"));
const Task_1 = __importDefault(require("../../models/Task"));
const Internship_1 = __importDefault(require("../../models/Internship"));
const Certification_1 = __importDefault(require("../../models/Certification"));
const Student_1 = __importDefault(require("../../models/Student"));
const Feedback_1 = __importDefault(require("../../models/Feedback"));
const Point_1 = __importDefault(require("../../models/Point"));
const mongoose_1 = __importDefault(require("mongoose"));
const toUiStatus = (status) => {
    if (status === 'APPROVED')
        return 'Approved';
    if (status === 'REJECTED')
        return 'Rejected';
    return 'Pending';
};
const toEntityStatus = (status) => (status === 'Approved' ? 'APPROVED' : status === 'Rejected' ? 'REJECTED' : 'PENDING');
const normalizeEntityType = (value) => String(value || '').toUpperCase();
const isApprovedStatus = (status) => {
    const s = String(status || '').toUpperCase();
    return s === 'APPROVED';
};
const getEntityModel = (entityType) => {
    const modelMap = {
        PROJECT: Project_1.default,
        TASK: Task_1.default,
        INTERNSHIP: Internship_1.default,
        CERTIFICATION: Certification_1.default
    };
    return modelMap[normalizeEntityType(entityType)];
};
const getEntityTitle = (entity, entityType) => {
    if (entityType === 'PROJECT' || entityType === 'TASK' || entityType === 'CERTIFICATION')
        return entity.title;
    if (entityType === 'INTERNSHIP')
        return `${entity.companyName} - ${entity.role}`;
    return 'Submission';
};
const getEntityDate = (entity, entityType) => {
    if (entityType === 'PROJECT')
        return entity.completedAt || entity.createdAt || new Date();
    if (entityType === 'TASK')
        return entity.completedAt || entity.dueDate || entity.createdAt || new Date();
    if (entityType === 'INTERNSHIP')
        return entity.from || entity.createdAt || new Date();
    if (entityType === 'CERTIFICATION')
        return entity.to || entity.createdAt || new Date();
    return entity.createdAt || new Date();
};
async function buildApprovalsFromEntities(mentorId) {
    const [projects, tasks, internships, certifications] = await Promise.all([
        Project_1.default.find({ mentorId }).populate('studentId', 'firstName lastName'),
        Task_1.default.find({ mentorId }).populate('studentId', 'firstName lastName'),
        Internship_1.default.find({ mentorId }).populate('studentId', 'firstName lastName'),
        Certification_1.default.find({ mentorId }).populate('studentId', 'firstName lastName')
    ]);
    const mapEntity = (entity, entityType, title, submittedDate) => ({
        id: entity._id.toString(),
        entityId: entity._id.toString(),
        studentId: entity.studentId?._id?.toString(),
        studentName: `${entity.studentId?.firstName || ''} ${entity.studentId?.lastName || ''}`.trim(),
        entityType,
        entityTitle: title,
        submittedDate,
        status: toUiStatus(entity.status || 'PENDING')
    });
    return [
        ...projects.map((p) => mapEntity(p, 'PROJECT', p.title, p.completedAt || p.createdAt || new Date())),
        ...tasks.map((t) => mapEntity(t, 'TASK', t.title, t.dueDate || t.createdAt || new Date())),
        ...internships.map((i) => mapEntity(i, 'INTERNSHIP', `${i.companyName} - ${i.role}`, i.from || i.createdAt || new Date())),
        ...certifications.map((c) => mapEntity(c, 'CERTIFICATION', c.title, c.to || c.createdAt || new Date()))
    ].sort((a, b) => new Date(b.submittedDate).getTime() - new Date(a.submittedDate).getTime());
}
const buildApprovalStats = async (mentorId) => {
    const [projectStats, taskStats, internshipStats, certificationStats, monthlyPoints, feedbackStats] = await Promise.all([
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
        ]),
        Point_1.default.aggregate([
            { $match: { mentorId: new mongoose_1.default.Types.ObjectId(mentorId) } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m', date: '$awardedOn' } },
                    points: { $sum: '$points' },
                    awards: { $sum: 1 }
                }
            },
            { $sort: { _id: -1 } },
            { $limit: 6 },
            { $sort: { _id: 1 } }
        ]),
        Feedback_1.default.aggregate([
            { $match: { mentorId: new mongoose_1.default.Types.ObjectId(mentorId) } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
                    total: { $sum: 1 }
                }
            },
            { $sort: { _id: -1 } },
            { $limit: 6 },
            { $sort: { _id: 1 } }
        ])
    ]);
    const summarize = (arr) => ({
        total: arr.reduce((sum, item) => sum + item.total, 0),
        approved: arr.filter((item) => isApprovedStatus(item._id)).reduce((sum, item) => sum + item.total, 0),
        rejected: arr.filter((item) => String(item._id || '').toUpperCase() === 'REJECTED').reduce((sum, item) => sum + item.total, 0),
        pending: arr.filter((item) => String(item._id || '').toUpperCase() === 'PENDING').reduce((sum, item) => sum + item.total, 0)
    });
    const feedbackMap = {};
    feedbackStats.forEach((f) => {
        feedbackMap[f._id] = f.total || 0;
    });
    return {
        modules: {
            project: summarize(projectStats),
            task: summarize(taskStats),
            internship: summarize(internshipStats),
            certification: summarize(certificationStats)
        },
        charts: {
            pointsTrend: monthlyPoints.map((row) => ({
                month: row._id,
                points: row.points || 0,
                awards: row.awards || 0,
                feedbackCount: feedbackMap[row._id] || 0
            }))
        }
    };
};
const listApprovals = async (req, res) => {
    try {
        const mentorId = req.user.mentorId || req.user.id;
        const { page = 1, limit = 20, status, entityType, search = '' } = req.query;
        const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
        const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
        const skip = (parsedPage - 1) * parsedLimit;
        let data = await buildApprovalsFromEntities(mentorId);
        if (status)
            data = data.filter((d) => d.status.toUpperCase() === String(status).toUpperCase() || d.status === status);
        if (entityType)
            data = data.filter((d) => d.entityType === entityType);
        if (search) {
            const q = String(search).toLowerCase();
            data = data.filter((d) => d.studentName.toLowerCase().includes(q) ||
                d.entityTitle.toLowerCase().includes(q) ||
                d.entityType.toLowerCase().includes(q));
        }
        const stats = {
            total: data.length,
            pending: data.filter((d) => d.status === 'Pending').length,
            approved: data.filter((d) => d.status === 'Approved').length,
            rejected: data.filter((d) => d.status === 'Rejected').length,
            byType: {
                project: data.filter((d) => d.entityType === 'PROJECT').length,
                task: data.filter((d) => d.entityType === 'TASK').length,
                internship: data.filter((d) => d.entityType === 'INTERNSHIP').length,
                certification: data.filter((d) => d.entityType === 'CERTIFICATION').length
            }
        };
        const paginated = data.slice(skip, skip + parsedLimit);
        res.json({
            success: true,
            data: paginated,
            stats,
            pagination: {
                total: data.length,
                page: parsedPage,
                limit: parsedLimit,
                totalPages: Math.ceil(data.length / parsedLimit)
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch approvals', error: error.message });
    }
};
exports.listApprovals = listApprovals;
const getApprovalStats = async (req, res) => {
    try {
        const mentorId = req.user.mentorId || req.user.id;
        const stats = await buildApprovalStats(mentorId);
        res.json({
            success: true,
            data: stats
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch approval stats', error: error.message });
    }
};
exports.getApprovalStats = getApprovalStats;
const listSubmissions = async (req, res) => {
    return (0, exports.listApprovals)(req, res);
};
exports.listSubmissions = listSubmissions;
const updateApproval = async (req, res) => {
    try {
        const mentorId = req.user.mentorId || req.user.id;
        const { id } = req.params;
        const { entityType, status, points = 0, feedback = '' } = req.body;
        if (!entityType || !status) {
            return res.status(400).json({ success: false, message: 'entityType and status are required' });
        }
        const normalizedStatus = toEntityStatus(status);
        const normalizedEntityType = normalizeEntityType(entityType);
        const targetModel = getEntityModel(normalizedEntityType);
        if (!targetModel) {
            return res.status(400).json({ success: false, message: 'Invalid entityType' });
        }
        const entity = await targetModel.findById(id);
        if (!entity) {
            return res.status(404).json({ success: false, message: 'Submission not found' });
        }
        if (entity.mentorId.toString() !== mentorId.toString()) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }
        entity.status = normalizedStatus;
        await entity.save();
        const studentId = entity.studentId?.toString();
        if (feedback && studentId) {
            await Feedback_1.default.findOneAndUpdate({ studentId, mentorId, source: normalizedEntityType, sourceId: entity._id }, { studentId, mentorId, source: normalizedEntityType, sourceId: entity._id, message: feedback, createdAt: new Date() }, { upsert: true, new: true });
        }
        let awardedPoint = null;
        if (normalizedStatus === 'APPROVED' && Number(points) > 0 && studentId) {
            awardedPoint = await Point_1.default.create({
                studentId,
                mentorId,
                source: normalizedEntityType,
                referenceId: entity._id,
                points: Number(points),
                description: feedback || `${normalizedEntityType} approved by mentor`,
                awardedOn: new Date()
            });
            await Student_1.default.findByIdAndUpdate(studentId, { $inc: { rewardPoints: Number(points) } });
        }
        const approval = await Approval_1.default.findOneAndUpdate({ entityType: normalizedEntityType, entityId: entity._id, studentId, mentorId }, {
            entityType: normalizedEntityType,
            entityId: entity._id,
            studentId,
            mentorId,
            status,
            approvedAt: new Date(),
            feedback,
            pointsAwarded: normalizedStatus === 'APPROVED' ? Number(points) : 0
        }, { upsert: true, new: true });
        res.json({
            success: true,
            message: 'Approval updated successfully',
            data: {
                approval,
                entityStatus: entity.status,
                point: awardedPoint
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to update approval', error: error.message });
    }
};
exports.updateApproval = updateApproval;
const getSubmissionDetail = async (req, res) => {
    try {
        const mentorId = req.user.mentorId || req.user.id;
        const { entityType, id } = req.params;
        const normalizedEntityType = normalizeEntityType(entityType);
        const model = getEntityModel(normalizedEntityType);
        if (!model)
            return res.status(400).json({ success: false, message: 'Invalid entityType' });
        const entity = await model.findOne({ _id: id, mentorId }).populate({
            path: 'studentId',
            populate: { path: 'userId', select: 'email' }
        });
        if (!entity)
            return res.status(404).json({ success: false, message: 'Submission not found' });
        const [feedback, points, approval] = await Promise.all([
            Feedback_1.default.findOne({
                studentId: entity.studentId?._id,
                mentorId,
                source: normalizedEntityType,
                sourceId: entity._id
            }),
            Point_1.default.find({
                studentId: entity.studentId?._id,
                mentorId,
                source: normalizedEntityType,
                referenceId: entity._id
            }).sort({ awardedOn: -1 }),
            Approval_1.default.findOne({
                entityType: normalizedEntityType,
                entityId: entity._id,
                studentId: entity.studentId?._id,
                mentorId
            }).sort({ approvedAt: -1 })
        ]);
        res.json({
            success: true,
            data: {
                entityType: normalizedEntityType,
                submission: entity,
                summary: {
                    title: getEntityTitle(entity, normalizedEntityType),
                    status: toUiStatus(entity.status || 'PENDING'),
                    submittedDate: getEntityDate(entity, normalizedEntityType)
                },
                student: {
                    id: entity.studentId?._id,
                    name: `${entity.studentId?.firstName || ''} ${entity.studentId?.lastName || ''}`.trim(),
                    email: entity.studentId?.userId?.email || '',
                    department: entity.studentId?.department,
                    year: entity.studentId?.year
                },
                feedback: feedback?.message || null,
                points,
                approval
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch submission detail', error: error.message });
    }
};
exports.getSubmissionDetail = getSubmissionDetail;
const reviewSubmission = async (req, res) => {
    req.body.entityType = normalizeEntityType(req.params.entityType);
    return (0, exports.updateApproval)(req, res);
};
exports.reviewSubmission = reviewSubmission;
