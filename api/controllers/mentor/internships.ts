import { Request, Response } from 'express';
import Internship from '../../models/Internship';
import Feedback from '../../models/Feedback';

export const listMentorInternships = async (req: Request, res: Response) => {
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
      type,
      paid,
      fromDate,
      toDate,
      sortBy = 'from',
      sortOrder = 'desc'
    } = req.query as any;

    const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const skip = (parsedPage - 1) * parsedLimit;

    const internships = await Internship.find({ mentorId }).populate({
      path: 'studentId',
      populate: { path: 'userId', select: 'email' }
    });

    let data = await Promise.all(internships.map(async (i: any) => {
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

    if (status) data = data.filter((i: any) => i.status.toUpperCase() === String(status).toUpperCase() || i.status === status);
    if (type) data = data.filter((i: any) => i.type === type);
    if (paid === 'true' || paid === 'false') data = data.filter((i: any) => i.paid === (paid === 'true'));
    if (studentId) data = data.filter((i: any) => i.student?.id?.toString() === String(studentId));
    if (department) data = data.filter((i: any) => i.student?.department === department);
    if (year) data = data.filter((i: any) => i.student?.year === year);
    if (fromDate) {
      const from = new Date(String(fromDate));
      if (!Number.isNaN(from.getTime())) data = data.filter((i: any) => new Date(i.from).getTime() >= from.getTime());
    }
    if (toDate) {
      const to = new Date(String(toDate));
      if (!Number.isNaN(to.getTime())) data = data.filter((i: any) => new Date(i.to).getTime() <= to.getTime());
    }
    if (search) {
      const q = String(search).toLowerCase();
      data = data.filter((i: any) =>
        i.companyName.toLowerCase().includes(q) ||
        i.role.toLowerCase().includes(q) ||
        i.student?.name?.toLowerCase().includes(q)
      );
    }

    data.sort((a: any, b: any) => {
      const dir = sortOrder === 'asc' ? 1 : -1;
      if (sortBy === 'company') return a.companyName.localeCompare(b.companyName) * dir;
      if (sortBy === 'student') return (a.student?.name || '').localeCompare(b.student?.name || '') * dir;
      if (sortBy === 'status') return (a.status || '').localeCompare(b.status || '') * dir;
      return (new Date(a.from).getTime() - new Date(b.from).getTime()) * dir;
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
    res.status(500).json({ success: false, message: 'Failed to fetch internships', error: error.message });
  }
};

export const getMentorInternshipById = async (req: Request, res: Response) => {
  try {
    const mentorId = (req as any).user.mentorId || (req as any).user.id;
    const { id } = req.params;
    const i = await Internship.findOne({ _id: id, mentorId }).populate({
      path: 'studentId',
      populate: { path: 'userId', select: 'email' }
    });
    if (!i) return res.status(404).json({ success: false, message: 'Internship not found' });

    const feedback = await Feedback.findOne({
      studentId: (i as any).studentId?._id,
      mentorId,
      source: 'INTERNSHIP',
      sourceId: i._id
    });

    res.json({
      success: true,
      data: {
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
          id: (i as any).studentId?._id,
          name: `${(i as any).studentId?.firstName || ''} ${(i as any).studentId?.lastName || ''}`.trim(),
          email: (i as any).studentId?.userId?.email || '',
          department: (i as any).studentId?.department,
          year: (i as any).studentId?.year
        },
        feedback: feedback?.message || null
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch internship details', error: error.message });
  }
};
