import { Request, Response } from 'express';
import Approval from '../../models/Approval';
import Project from '../../models/Project';
import Task from '../../models/Task';
import Internship from '../../models/Internship';
import Certification from '../../models/Certification';
import Student from '../../models/Student';
import Feedback from '../../models/Feedback';
import Point from '../../models/Point';
import mongoose from 'mongoose';

const toUiStatus = (status: string) => {
  if (status === 'APPROVED') return 'Approved';
  if (status === 'REJECTED') return 'Rejected';
  return 'Pending';
};

const toEntityStatus = (status: string) => (status === 'Approved' ? 'APPROVED' : status === 'Rejected' ? 'REJECTED' : 'PENDING');

const normalizeEntityType = (value?: string) => String(value || '').toUpperCase();
const isApprovedStatus = (status?: string) => {
  const s = String(status || '').toUpperCase();
  return s === 'APPROVED';
};

const getEntityModel = (entityType: string): any => {
  const modelMap: Record<string, any> = {
    PROJECT: Project,
    TASK: Task,
    INTERNSHIP: Internship,
    CERTIFICATION: Certification
  };
  return modelMap[normalizeEntityType(entityType)];
};

const getEntityTitle = (entity: any, entityType: string) => {
  if (entityType === 'PROJECT' || entityType === 'TASK' || entityType === 'CERTIFICATION') return entity.title;
  if (entityType === 'INTERNSHIP') return `${entity.companyName} - ${entity.role}`;
  return 'Submission';
};

const getEntityDate = (entity: any, entityType: string) => {
  if (entityType === 'PROJECT') return entity.completedAt || entity.createdAt || new Date();
  if (entityType === 'TASK') return entity.completedAt || entity.dueDate || entity.createdAt || new Date();
  if (entityType === 'INTERNSHIP') return entity.from || entity.createdAt || new Date();
  if (entityType === 'CERTIFICATION') return entity.to || entity.createdAt || new Date();
  return entity.createdAt || new Date();
};

async function buildApprovalsFromEntities(mentorId: string) {
  const [projects, tasks, internships, certifications] = await Promise.all([
    Project.find({ mentorId }).populate('studentId', 'firstName lastName'),
    Task.find({ mentorId }).populate('studentId', 'firstName lastName'),
    Internship.find({ mentorId }).populate('studentId', 'firstName lastName'),
    Certification.find({ mentorId }).populate('studentId', 'firstName lastName')
  ]);

  const mapEntity = (entity: any, entityType: 'PROJECT' | 'TASK' | 'INTERNSHIP' | 'CERTIFICATION', title: string, submittedDate: Date) => ({
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
    ...projects.map((p: any) => mapEntity(p, 'PROJECT', p.title, p.completedAt || p.createdAt || new Date())),
    ...tasks.map((t: any) => mapEntity(t, 'TASK', t.title, t.dueDate || t.createdAt || new Date())),
    ...internships.map((i: any) => mapEntity(i, 'INTERNSHIP', `${i.companyName} - ${i.role}`, i.from || i.createdAt || new Date())),
    ...certifications.map((c: any) => mapEntity(c, 'CERTIFICATION', c.title, c.to || c.createdAt || new Date()))
  ].sort((a, b) => new Date(b.submittedDate).getTime() - new Date(a.submittedDate).getTime());
}

const buildApprovalStats = async (mentorId: string) => {
  const [projectStats, taskStats, internshipStats, certificationStats, monthlyPoints, feedbackStats] = await Promise.all([
    Project.aggregate([
      { $match: { mentorId: new mongoose.Types.ObjectId(mentorId) } },
      { $group: { _id: '$status', total: { $sum: 1 } } }
    ]),
    Task.aggregate([
      { $match: { mentorId: new mongoose.Types.ObjectId(mentorId) } },
      { $group: { _id: '$status', total: { $sum: 1 } } }
    ]),
    Internship.aggregate([
      { $match: { mentorId: new mongoose.Types.ObjectId(mentorId) } },
      { $group: { _id: '$status', total: { $sum: 1 } } }
    ]),
    Certification.aggregate([
      { $match: { mentorId: new mongoose.Types.ObjectId(mentorId) } },
      { $group: { _id: '$status', total: { $sum: 1 } } }
    ]),
    Point.aggregate([
      { $match: { mentorId: new mongoose.Types.ObjectId(mentorId) } },
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
    Feedback.aggregate([
      { $match: { mentorId: new mongoose.Types.ObjectId(mentorId) } },
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

  const summarize = (arr: any[]) => ({
    total: arr.reduce((sum, item) => sum + item.total, 0),
    approved: arr.filter((item) => isApprovedStatus(item._id)).reduce((sum, item) => sum + item.total, 0),
    rejected: arr.filter((item) => String(item._id || '').toUpperCase() === 'REJECTED').reduce((sum, item) => sum + item.total, 0),
    pending: arr.filter((item) => String(item._id || '').toUpperCase() === 'PENDING').reduce((sum, item) => sum + item.total, 0)
  });

  const feedbackMap: Record<string, number> = {};
  feedbackStats.forEach((f: any) => {
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
      pointsTrend: monthlyPoints.map((row: any) => ({
        month: row._id,
        points: row.points || 0,
        awards: row.awards || 0,
        feedbackCount: feedbackMap[row._id] || 0
      }))
    }
  };
};

export const listApprovals = async (req: Request, res: Response) => {
  try {
    const mentorId = (req as any).user.mentorId || (req as any).user.id;
    const {
      page = 1,
      limit = 20,
      status,
      entityType,
      search = ''
    } = req.query as any;

    const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const skip = (parsedPage - 1) * parsedLimit;

    let data = await buildApprovalsFromEntities(mentorId);

    if (status) data = data.filter((d) => d.status.toUpperCase() === String(status).toUpperCase() || d.status === status);
    if (entityType) data = data.filter((d) => d.entityType === entityType);
    if (search) {
      const q = String(search).toLowerCase();
      data = data.filter((d) =>
        d.studentName.toLowerCase().includes(q) ||
        d.entityTitle.toLowerCase().includes(q) ||
        d.entityType.toLowerCase().includes(q)
      );
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
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch approvals', error: error.message });
  }
};

export const getApprovalStats = async (req: Request, res: Response) => {
  try {
    const mentorId = (req as any).user.mentorId || (req as any).user.id;
    const stats = await buildApprovalStats(mentorId);

    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch approval stats', error: error.message });
  }
};

export const listSubmissions = async (req: Request, res: Response) => {
  return listApprovals(req, res);
};

export const updateApproval = async (req: Request, res: Response) => {
  try {
    const mentorId = (req as any).user.mentorId || (req as any).user.id;
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
    if (feedback) {
      entity.verificationNote = feedback;
    }
    await entity.save();

    const studentId = entity.studentId?.toString();

    if (feedback && studentId) {
      await Feedback.findOneAndUpdate(
        { studentId, mentorId, source: normalizedEntityType, sourceId: entity._id },
        { studentId, mentorId, source: normalizedEntityType, sourceId: entity._id, message: feedback, createdAt: new Date() },
        { upsert: true, new: true }
      );
    }

    let awardedPoint = null;
    if (normalizedStatus === 'APPROVED' && Number(points) > 0 && studentId) {
      awardedPoint = await Point.create({
        studentId,
        mentorId,
        source: normalizedEntityType,
        referenceId: entity._id,
        points: Number(points),
        description: feedback || `${normalizedEntityType} approved by mentor`,
        awardedOn: new Date()
      });

      await Student.findByIdAndUpdate(studentId, { $inc: { rewardPoints: Number(points) } });
    }

    const approval = await Approval.findOneAndUpdate(
      { entityType: normalizedEntityType, entityId: entity._id, studentId, mentorId },
      {
        entityType: normalizedEntityType,
        entityId: entity._id,
        studentId,
        mentorId,
        status,
        approvedAt: new Date(),
        feedback,
        pointsAwarded: normalizedStatus === 'APPROVED' ? Number(points) : 0
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      message: 'Approval updated successfully',
      data: {
        approval,
        entityStatus: entity.status,
        point: awardedPoint
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to update approval', error: error.message });
  }
};

export const getSubmissionDetail = async (req: Request, res: Response) => {
  try {
    const mentorId = (req as any).user.mentorId || (req as any).user.id;
    const { entityType, id } = req.params;
    const normalizedEntityType = normalizeEntityType(entityType);
    const model = getEntityModel(normalizedEntityType);
    if (!model) return res.status(400).json({ success: false, message: 'Invalid entityType' });

    const entity = await model.findOne({ _id: id, mentorId }).populate({
      path: 'studentId',
      populate: { path: 'userId', select: 'email' }
    });
    if (!entity) return res.status(404).json({ success: false, message: 'Submission not found' });

    const [feedback, points, approval] = await Promise.all([
      Feedback.findOne({
        studentId: (entity as any).studentId?._id,
        mentorId,
        source: normalizedEntityType,
        sourceId: entity._id
      }),
      Point.find({
        studentId: (entity as any).studentId?._id,
        mentorId,
        source: normalizedEntityType,
        referenceId: entity._id
      }).sort({ awardedOn: -1 }),
      Approval.findOne({
        entityType: normalizedEntityType,
        entityId: entity._id,
        studentId: (entity as any).studentId?._id,
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
          status: toUiStatus((entity as any).status || 'PENDING'),
          submittedDate: getEntityDate(entity, normalizedEntityType)
        },
        student: {
          id: (entity as any).studentId?._id,
          name: `${(entity as any).studentId?.firstName || ''} ${(entity as any).studentId?.lastName || ''}`.trim(),
          email: (entity as any).studentId?.userId?.email || '',
          department: (entity as any).studentId?.department,
          year: (entity as any).studentId?.year
        },
        feedback: feedback?.message || null,
        points,
        approval
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch submission detail', error: error.message });
  }
};

export const reviewSubmission = async (req: Request, res: Response) => {
  req.body.entityType = normalizeEntityType(req.params.entityType);
  return updateApproval(req, res);
};
