import { Request, Response } from 'express';
import MentorStudentMapping from '../../models/MentorStudentMapping';
import Project from '../../models/Project';
import Task from '../../models/Task';
import Internship from '../../models/Internship';
import Certification from '../../models/Certification';
import Point from '../../models/Point';
import Student from '../../models/Student';
import Approval from '../../models/Approval';
import mongoose from 'mongoose';

export const getMentorStats = async (req: Request, res: Response) => {
  try {
    const mentorId = (req as any).user.mentorId || (req as any).user.id;

    const mappings = await MentorStudentMapping.find({ mentorId, isActive: true }).select('studentId');
    const studentIds = mappings.map(m => m.studentId);

    const totalAssignedStudents = studentIds.length;
    const [
      totalProjects,
      totalTasks,
      totalInternships,
      totalCertifications,
      pendingApprovals,
      completedProjects,
      activeStudents,
      projectStatusAgg,
      taskStatusAgg,
      internshipStatusAgg,
      certificationStatusAgg
    ] = await Promise.all([
      Project.countDocuments({ mentorId }),
      Task.countDocuments({ mentorId }),
      Internship.countDocuments({ mentorId }),
      Certification.countDocuments({ mentorId }),
      Promise.all([
        Project.countDocuments({ mentorId, status: 'PENDING' }),
        Task.countDocuments({ mentorId, status: 'PENDING' }),
        Internship.countDocuments({ mentorId, status: 'PENDING' }),
        Certification.countDocuments({ mentorId, status: 'PENDING' })
      ]).then(vals => vals.reduce((a, b) => a + b, 0)),
      Project.countDocuments({ mentorId, status: 'APPROVED' }),
      Student.countDocuments({ _id: { $in: studentIds }, status: 'Active' }),
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
      ])
    ]);

    // Top students under mentor based on points
    const top = await Point.aggregate([
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

    const approvalTrend = await Approval.aggregate([
      {
        $match: {
          mentorId: new mongoose.Types.ObjectId(mentorId),
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

    const pointsTrend = await Point.aggregate([
      {
        $match: {
          mentorId: new mongoose.Types.ObjectId(mentorId),
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

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const monthlyApprovalRows = await Approval.aggregate([
      {
        $match: {
          mentorId: new mongoose.Types.ObjectId(mentorId),
          approvedAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            month: { $dateToString: { format: '%Y-%m', date: '$approvedAt' } },
            entityType: '$entityType',
            status: { $toUpper: { $ifNull: ['$status', 'PENDING'] } }
          },
          total: { $sum: 1 }
        }
      }
    ]);

    const monthKeys: string[] = [];
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      monthKeys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    const monthlyMap: Record<string, any> = {};
    monthKeys.forEach((month) => {
      monthlyMap[month] = {
        month,
        project: 0,
        task: 0,
        internship: 0,
        certification: 0,
        approved: 0,
        rejected: 0,
        pending: 0,
        total: 0
      };
    });

    monthlyApprovalRows.forEach((row: any) => {
      const month = row._id.month;
      const entityType = String(row._id.entityType || '').toUpperCase();
      const status = String(row._id.status || '').toUpperCase();
      const total = row.total || 0;
      if (!monthlyMap[month]) return;

      if (entityType === 'PROJECT') monthlyMap[month].project += total;
      if (entityType === 'TASK') monthlyMap[month].task += total;
      if (entityType === 'INTERNSHIP') monthlyMap[month].internship += total;
      if (entityType === 'CERTIFICATION') monthlyMap[month].certification += total;

      if (status === 'REJECTED') monthlyMap[month].rejected += total;
      else if (status === 'PENDING') monthlyMap[month].pending += total;
      else monthlyMap[month].approved += total;

      monthlyMap[month].total += total;
    });

    const workProgressMonthly = monthKeys.map((month) => monthlyMap[month]);

    const projectRows = await Project.find({ mentorId })
      .populate('studentId', 'firstName lastName')
      .sort({ completedAt: -1, _id: -1 })
      .limit(10);
    const taskRows = await Task.find({ mentorId })
      .populate('studentId', 'firstName lastName')
      .sort({ dueDate: -1, _id: -1 })
      .limit(10);
    const internshipRows = await Internship.find({ mentorId })
      .populate('studentId', 'firstName lastName')
      .sort({ from: -1, _id: -1 })
      .limit(10);
    const certificationRows = await Certification.find({ mentorId })
      .populate('studentId', 'firstName lastName')
      .sort({ to: -1, _id: -1 })
      .limit(10);

    const statusCount = (rows: any[]) => ({
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
          pointsTrend,
          workProgressMonthly
        },
        approvals: {
          projects: statusCount(projectStatusAgg),
          tasks: statusCount(taskStatusAgg),
          internships: statusCount(internshipStatusAgg),
          certifications: statusCount(certificationStatusAgg)
        },
        tables: {
          recentProjects: projectRows.map((p: any) => ({
            id: p._id,
            title: p.title,
            status: p.status,
            studentName: `${p.studentId?.firstName || ''} ${p.studentId?.lastName || ''}`.trim(),
            submittedAt: p.completedAt || p.createdAt || p._id.getTimestamp()
          })),
          recentTasks: taskRows.map((t: any) => ({
            id: t._id,
            title: t.title,
            status: t.status,
            studentName: `${t.studentId?.firstName || ''} ${t.studentId?.lastName || ''}`.trim(),
            submittedAt: t.completedAt || t.dueDate || t.createdAt || t._id.getTimestamp()
          })),
          recentInternships: internshipRows.map((i: any) => ({
            id: i._id,
            title: `${i.companyName} - ${i.role}`,
            status: i.status,
            studentName: `${i.studentId?.firstName || ''} ${i.studentId?.lastName || ''}`.trim(),
            submittedAt: i.from || i.createdAt || i._id.getTimestamp()
          })),
          recentCertifications: certificationRows.map((c: any) => ({
            id: c._id,
            title: c.title,
            status: c.status,
            studentName: `${c.studentId?.firstName || ''} ${c.studentId?.lastName || ''}`.trim(),
            submittedAt: c.to || c.createdAt || c._id.getTimestamp()
          }))
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch mentor stats', error: error.message });
  }
};
