import { Request, Response } from 'express';
import MentorStudentMapping from '../../models/MentorStudentMapping';
import Project from '../../models/Project';
import Internship from '../../models/Internship';
import Certification from '../../models/Certification';
import Point from '../../models/Point';

export const getMentorStats = async (req: Request, res: Response) => {
  const mentorId = (req as any).user.id;
  const mappings = await MentorStudentMapping.find({ mentorId });
  const studentIds = mappings.map(m => m.studentId);
  const totalStudents = studentIds.length;
  const totalProjects = await Project.countDocuments({ mentorId });
  const totalInternships = await Internship.countDocuments({ mentorId });
  const totalCertifications = await Certification.countDocuments({ mentorId });

  // top students under mentor
  const top = await Point.aggregate([
    { $match: { studentId: { $in: studentIds } } },
    { $group: { _id: '$studentId', points: { $sum: '$points' } } },
    { $sort: { points: -1 } },
    { $limit: 10 }
  ]);

  res.json({ totalStudents, totalProjects, totalInternships, totalCertifications, top });
};
