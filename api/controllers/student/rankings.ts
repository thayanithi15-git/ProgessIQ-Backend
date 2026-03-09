import Student from '../../models/Student';
import Point from '../../models/Point';
import mongoose from 'mongoose';
import { Request, Response } from 'express';

/**
 * GET ALL RANKINGS (Leaderboard)
 * GET /api/student/rankings
 * Query: department, limit, skip
 */
export const getAllRankings = async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).user.studentId;
    const { department, limit = 50, skip = 0 } = req.query;
    const parsedLimit = parseInt(limit as string);
    const parsedSkip = parseInt(skip as string);

    const currentStudent = await Student.findById(studentId).select('department');
    if (!currentStudent) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    let departmentFilter: string | null = null;
    if (typeof department === 'string' && department.trim()) {
      departmentFilter = department === 'true' ? currentStudent.department : department.trim();
    }

    const pipeline: any[] = [
      {
        $group: {
          _id: '$studentId',
          points: { $sum: '$points' }
        }
      },
      {
        $lookup: {
          from: 'students',
          localField: '_id',
          foreignField: '_id',
          as: 'student'
        }
      },
      { $unwind: '$student' }
    ];

    if (departmentFilter) {
      pipeline.push({ $match: { 'student.department': departmentFilter } });
    }

    pipeline.push(
      { $sort: { points: -1, _id: 1 } },
      {
        $facet: {
          rankings: [
            { $skip: parsedSkip },
            { $limit: parsedLimit },
            {
              $lookup: {
                from: 'users',
                localField: 'student.userId',
                foreignField: '_id',
                as: 'user'
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
                _id: 0,
                studentId: '$_id',
                name: { $concat: ['$student.firstName', ' ', '$student.lastName'] },
                email: { $arrayElemAt: ['$user.email', 0] },
                department: '$student.department',
                year: '$student.year',
                points: '$points',
                overallRank: { $arrayElemAt: ['$ranking.overallRank', 0] },
                departmentRank: { $arrayElemAt: ['$ranking.departmentRank', 0] }
              }
            }
          ],
          totalCount: [{ $count: 'total' }]
        }
      }
    );

    const [result] = await Point.aggregate(pipeline);
    const rankings = result?.rankings || [];
    const total = result?.totalCount?.[0]?.total || 0;

    const formattedRankings = rankings.map((ranking: any, index: number) => ({
      rank: parsedSkip + index + 1,
      studentId: ranking.studentId,
      name: ranking.name,
      email: ranking.email,
      department: ranking.department,
      year: ranking.year,
      points: ranking.points || 0,
      overallRank: ranking.overallRank,
      departmentRank: ranking.departmentRank,
      isCurrentStudent: ranking.studentId?.toString() === studentId
    }));

    const currentPointsAgg = await Point.aggregate([
      {
        $match: {
          studentId: new mongoose.Types.ObjectId(studentId)
        }
      },
      {
        $group: {
          _id: '$studentId',
          points: { $sum: '$points' }
        }
      }
    ]);
    const currentPoints = currentPointsAgg[0]?.points || 0;

    const overallAheadAgg = await Point.aggregate([
      { $group: { _id: '$studentId', points: { $sum: '$points' } } },
      { $match: { points: { $gt: currentPoints } } },
      { $count: 'count' }
    ]);
    const overallRank = (overallAheadAgg[0]?.count || 0) + 1;

    const departmentAheadAgg = await Point.aggregate([
      { $group: { _id: '$studentId', points: { $sum: '$points' } } },
      {
        $lookup: {
          from: 'students',
          localField: '_id',
          foreignField: '_id',
          as: 'student'
        }
      },
      { $unwind: '$student' },
      { $match: { 'student.department': currentStudent.department, points: { $gt: currentPoints } } },
      { $count: 'count' }
    ]);
    const departmentRank = (departmentAheadAgg[0]?.count || 0) + 1;

    res.json({
      success: true,
      data: {
        rankings: formattedRankings,
        currentStudentRanking: {
          overallRank,
          departmentRank
        },
        pagination: {
          total,
          limit: parsedLimit,
          skip: parsedSkip
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching rankings', error });
  }
};

/**
 * GET STUDENT's RANKING POSITION
 * GET /api/student/rankings/position
 */
export const getStudentRanking = async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).user.studentId;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Get total students
    const totalStudents = await Student.countDocuments();

    // Get students in department
    const departmentStudents = await Student.countDocuments({ department: student.department });

    // Get points from Point model
    const pointsData = await Point.aggregate([
      {
        $match: {
          studentId: new mongoose.Types.ObjectId(studentId)
        }
      },
      {
        $group: {
          _id: '$studentId',
          totalPoints: { $sum: '$points' }
        }
      }
    ]);
    const totalPoints = pointsData[0]?.totalPoints || 0;

    // Get students ahead based on points
    const overallAheadData = await Point.aggregate([
      { $group: { _id: '$studentId', points: { $sum: '$points' } } },
      { $match: { points: { $gt: totalPoints } } },
      { $count: 'count' }
    ]);
    const aheadOverall = overallAheadData[0]?.count || 0;

    const departmentAheadData = await Point.aggregate([
      { $group: { _id: '$studentId', points: { $sum: '$points' } } },
      {
        $lookup: {
          from: 'students',
          localField: '_id',
          foreignField: '_id',
          as: 'student'
        }
      },
      { $unwind: '$student' },
      { $match: { 'student.department': student.department, points: { $gt: totalPoints } } },
      { $count: 'count' }
    ]);
    const aheadDepartment = departmentAheadData[0]?.count || 0;
    const overallRank = aheadOverall + 1;
    const departmentRank = aheadDepartment + 1;

    res.json({
      success: true,
      data: {
        studentInfo: {
          id: student._id,
          name: `${student.firstName} ${student.lastName}`,
          department: student.department,
          year: student.year,
          totalPoints
        },
        ranking: {
          overallRank,
          departmentRank,
          studentsAheadOverall: aheadOverall,
          studentsAheadDepartment: aheadDepartment
        },
        stats: {
          totalStudents,
          departmentStudents,
          percentile: totalStudents > 0 ? Math.round(((totalStudents - overallRank) / totalStudents) * 100) : 0
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching ranking', error });
  }
};

/**
 * GET DEPARTMENT LEADERBOARD
 * GET /api/student/rankings/department
 */
export const getDepartmentRankings = async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).user.studentId;
    const { limit = 50, skip = 0 } = req.query;
    const parsedLimit = parseInt(limit as string);
    const parsedSkip = parseInt(skip as string);

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const [result] = await Point.aggregate([
      { $group: { _id: '$studentId', points: { $sum: '$points' } } },
      {
        $lookup: {
          from: 'students',
          localField: '_id',
          foreignField: '_id',
          as: 'student'
        }
      },
      { $unwind: '$student' },
      { $match: { 'student.department': student.department } },
      { $sort: { points: -1, _id: 1 } },
      {
        $facet: {
          rankings: [
            { $skip: parsedSkip },
            { $limit: parsedLimit },
            {
              $lookup: {
                from: 'users',
                localField: 'student.userId',
                foreignField: '_id',
                as: 'user'
              }
            },
            {
              $project: {
                _id: 0,
                studentId: '$_id',
                name: { $concat: ['$student.firstName', ' ', '$student.lastName'] },
                email: { $arrayElemAt: ['$user.email', 0] },
                year: '$student.year',
                points: '$points'
              }
            }
          ],
          totalCount: [{ $count: 'total' }]
        }
      }
    ]);

    const rankings = result?.rankings || [];
    const total = result?.totalCount?.[0]?.total || 0;

    const formattedRankings = rankings.map((ranking: any, index: number) => ({
      rank: parsedSkip + index + 1,
      studentId: ranking.studentId,
      name: ranking.name,
      email: ranking.email,
      year: ranking.year,
      points: ranking.points || 0,
      isCurrentStudent: ranking.studentId?.toString() === studentId
    }));

    res.json({
      success: true,
      data: {
        department: student.department,
        rankings: formattedRankings,
        pagination: {
          total,
          limit: parsedLimit,
          skip: parsedSkip
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching department rankings', error });
  }
};

