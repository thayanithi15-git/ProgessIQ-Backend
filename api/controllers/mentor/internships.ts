import { Request, Response } from 'express';
import Internship from '../../models/Internship';
import Feedback from '../../models/Feedback';

export const listMentorInternships = async (req: Request, res: Response) => {
  try {
    const mentorId = (req as any).user.mentorId || (req as any).user.id;
    const internships = await Internship.find({ mentorId }).populate({
      path: 'studentId',
      populate: { path: 'userId', select: 'email' }
    });

    const data = await Promise.all(internships.map(async (i: any) => {
      const feedback = await Feedback.findOne({
        studentId: i.studentId?._id,
        mentorId,
        source: 'INTERNSHIP',
        sourceId: i._id
      });

      return {
        id: i._id,
        companyName: i.companyName,
        companyUrl: i.companyUrl,
        role: i.role,
        type: i.type,
        paid: i.paid,
        from: i.from,
        to: i.to,
        description: i.description,
        status: i.status,
        student: {
          id: i.studentId?._id,
          name: `${i.studentId?.firstName || ''} ${i.studentId?.lastName || ''}`.trim(),
          email: i.studentId?.userId?.email || '',
          department: i.studentId?.department,
          year: i.studentId?.year
        },
        feedback: feedback?.message || null
      };
    }));

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch internships', error: error.message });
  }
};
