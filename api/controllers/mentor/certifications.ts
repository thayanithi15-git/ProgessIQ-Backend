import { Request, Response } from 'express';
import Certification from '../../models/Certification';
import Feedback from '../../models/Feedback';

export const listMentorCertifications = async (req: Request, res: Response) => {
  try {
    const mentorId = (req as any).user.mentorId || (req as any).user.id;
    const certifications = await Certification.find({ mentorId }).populate({
      path: 'studentId',
      populate: { path: 'userId', select: 'email' }
    });

    const data = await Promise.all(certifications.map(async (c: any) => {
      const feedback = await Feedback.findOne({
        studentId: c.studentId?._id,
        mentorId,
        source: 'CERTIFICATION',
        sourceId: c._id
      });

      return {
        id: c._id,
        title: c.title,
        platform: c.platform,
        platformLink: c.platformLink,
        from: c.from,
        to: c.to,
        status: c.status,
        student: {
          id: c.studentId?._id,
          name: `${c.studentId?.firstName || ''} ${c.studentId?.lastName || ''}`.trim(),
          email: c.studentId?.userId?.email || '',
          department: c.studentId?.department,
          year: c.studentId?.year
        },
        feedback: feedback?.message || null
      };
    }));

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch certifications', error: error.message });
  }
};
