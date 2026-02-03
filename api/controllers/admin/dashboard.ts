import { Request, Response } from 'express';
import Student from '../../models/Student';
import Mentor from '../../models/Mentor';
import Project from '../../models/Project';
import Internship from '../../models/Internship';
import Certification from '../../models/Certification';
import Point from '../../models/Point';

export const getAdminStats = async (req: Request, res: Response) => {
  const totalStudents = await Student.countDocuments();
  const totalMentors = await Mentor.countDocuments();
  const totalProjects = await Project.countDocuments();
  const totalInternships = await Internship.countDocuments();
  const totalCertifications = await Certification.countDocuments();

  // students above average points
  const agg = await Point.aggregate([
    { $group: { _id: '$studentId', points: { $sum: '$points' } } },
    { $group: { _id: null, avgPoints: { $avg: '$points' } } }
  ]);
  const avgPoints = agg[0]?.avgPoints || 0;
  const studentsAboveAvg = await Point.aggregate([
    { $group: { _id: '$studentId', points: { $sum: '$points' } } },
    { $match: { points: { $gt: avgPoints } } },
    { $count: 'count' }
  ]);
  const aboveAvgCount = studentsAboveAvg[0]?.count || 0;

  // active students: assume Student.status === 'Active'
  const activeStudents = await Student.countDocuments({ status: 'Active' });

  res.json({ totalStudents, totalMentors, totalProjects, totalInternships, totalCertifications, aboveAvgCount, activeStudents });
};

export const getTopStudents = async (req: Request, res: Response) => {
  const top = await Point.aggregate([
    { $group: { _id: '$studentId', points: { $sum: '$points' } } },
    { $sort: { points: -1 } },
    { $limit: 10 }
  ]);
  res.json({ top });
};
