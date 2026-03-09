import { Request, Response } from 'express';
import Certification from '../../models/Certification';
import Feedback from '../../models/Feedback';

export const listMentorCertifications = async (req: Request, res: Response) => {
  try {
    const mentorId = (req as any).user.mentorId || (req as any).user.id;
    const {
      page = 1,
      limit = 20,
      search = '',
      status,
      studentId,
      department,
      year,
      fromDate,
      toDate,
      sortBy = 'to',
      sortOrder = 'desc'
    } = req.query as any;

    const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const skip = (parsedPage - 1) * parsedLimit;

    const certifications = await Certification.find({ mentorId }).populate({
      path: 'studentId',
      populate: { path: 'userId', select: 'email' }
    });

    let data = await Promise.all(certifications.map(async (c: any) => {
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

    if (status) data = data.filter((c: any) => c.status.toUpperCase() === String(status).toUpperCase() || c.status === status);
    if (studentId) data = data.filter((c: any) => c.student?.id?.toString() === String(studentId));
    if (department) data = data.filter((c: any) => c.student?.department === department);
    if (year) data = data.filter((c: any) => c.student?.year === year);
    if (fromDate) {
      const from = new Date(String(fromDate));
      if (!Number.isNaN(from.getTime())) data = data.filter((c: any) => new Date(c.from).getTime() >= from.getTime());
    }
    if (toDate) {
      const to = new Date(String(toDate));
      if (!Number.isNaN(to.getTime())) data = data.filter((c: any) => new Date(c.to).getTime() <= to.getTime());
    }
    if (search) {
      const q = String(search).toLowerCase();
      data = data.filter((c: any) =>
        c.title.toLowerCase().includes(q) ||
        c.platform.toLowerCase().includes(q) ||
        c.student?.name?.toLowerCase().includes(q)
      );
    }

    data.sort((a: any, b: any) => {
      const dir = sortOrder === 'asc' ? 1 : -1;
      if (sortBy === 'title') return a.title.localeCompare(b.title) * dir;
      if (sortBy === 'student') return (a.student?.name || '').localeCompare(b.student?.name || '') * dir;
      if (sortBy === 'status') return (a.status || '').localeCompare(b.status || '') * dir;
      return (new Date(a.to).getTime() - new Date(b.to).getTime()) * dir;
    });

    const total = data.length;
    const paginated = data.slice(skip, skip + parsedLimit);

    res.json({
      success: true,
      data: paginated,
      pagination: {
        total,
        page: parsedPage,
        limit: parsedLimit,
        totalPages: Math.ceil(total / parsedLimit)
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch certifications', error: error.message });
  }
};

export const getMentorCertificationById = async (req: Request, res: Response) => {
  try {
    const mentorId = (req as any).user.mentorId || (req as any).user.id;
    const { id } = req.params;
    const c = await Certification.findOne({ _id: id, mentorId }).populate({
      path: 'studentId',
      populate: { path: 'userId', select: 'email' }
    });
    if (!c) return res.status(404).json({ success: false, message: 'Certification not found' });

    const feedback = await Feedback.findOne({
      studentId: (c as any).studentId?._id,
      mentorId,
      source: 'CERTIFICATION',
      sourceId: c._id
    });

    res.json({
      success: true,
      data: {
        id: c._id,
        title: c.title,
        platform: c.platform,
        platformLink: c.platformLink,
        from: c.from,
        to: c.to,
        status: c.status,
        student: {
          id: (c as any).studentId?._id,
          name: `${(c as any).studentId?.firstName || ''} ${(c as any).studentId?.lastName || ''}`.trim(),
          email: (c as any).studentId?.userId?.email || '',
          department: (c as any).studentId?.department,
          year: (c as any).studentId?.year
        },
        feedback: feedback?.message || null
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch certification details', error: error.message });
  }
};
