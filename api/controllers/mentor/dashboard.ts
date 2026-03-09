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
    const totalProjects = await Project.countDocuments({ mentorId });
    const totalTasks = await Task.countDocuments({ mentorId });
    const pendingApprovals = await Promise.all([
      Project.countDocuments({ mentorId, status: 'PENDING' }),
      Task.countDocuments({ mentorId, status: 'PENDING' }),
      Internship.countDocuments({ mentorId, status: 'PENDING' }),
      Certification.countDocuments({ mentorId, status: 'PENDING' })
    ]).then(vals => vals.reduce((a, b) => a + b, 0));
    const completedProjects = await Project.countDocuments({ mentorId, status: 'APPROVED' });
    const activeStudents = await Student.countDocuments({ _id: { $in: studentIds }, status: 'Active' });

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

    // Approval trend for dashboard chart (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    const approvalTrend = await Approval.aggregate([
      {
        $match: {
          mentorId: new mongoose.Types.ObjectId(mentorId),
          approvedAt: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%a', date: '$approvedAt' }
          },
          approvals: { $sum: 1 },
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
          feedback: 1
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        totalAssignedStudents,
        totalProjects,
        totalTasks,
        pendingApprovals,
        completedProjects,
        activeStudents,
        topStudents: top,
        activityData: approvalTrend
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch mentor stats', error: error.message });
  }
};
