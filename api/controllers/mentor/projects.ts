import Project from '../../models/Project';
import { Request, Response } from 'express';
import Student from '../../models/Student';
import Feedback from '../../models/Feedback';

export const listMentorProjects = async (req: Request, res: Response) => {
  try {
    const mentorId = (req as any).user.mentorId || (req as any).user.id;
    const projects = await Project.find({ mentorId }).populate({
      path: 'studentId',
      populate: { path: 'userId', select: 'email' }
    });

    const data = await Promise.all(projects.map(async (p: any) => {
      const feedback = await Feedback.findOne({
        studentId: p.studentId?._id,
        mentorId,
        source: 'PROJECT',
        sourceId: p._id
      });

      return {
        id: p._id,
        title: p.title,
        description: p.description,
        status: p.status === 'APPROVED' ? 'Completed' : p.status === 'PENDING' ? 'Pending' : 'In Progress',
        studentsCount: 1,
        completionRate: p.status === 'APPROVED' ? 100 : p.status === 'PENDING' ? 30 : 0,
        createdDate: p.completedAt || new Date(),
        student: {
          id: p.studentId?._id,
          name: `${p.studentId?.firstName || ''} ${p.studentId?.lastName || ''}`.trim(),
          email: p.studentId?.userId?.email || '',
          department: p.studentId?.department,
          year: p.studentId?.year
        },
        links: {
          github: p.githubLink,
          website: p.websiteLink
        },
        feedback: feedback?.message || null
      };
    }));

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch mentor projects', error: error.message });
  }
};
