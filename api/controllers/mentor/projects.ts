import Project from '../../models/Project';
import { Request, Response } from 'express';
import Feedback from '../../models/Feedback';

export const listMentorProjects = async (req: Request, res: Response) => {
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
      sortBy = 'completedAt',
      sortOrder = 'desc'
    } = req.query as any;

    const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const skip = (parsedPage - 1) * parsedLimit;

    const projects = await Project.find({ mentorId }).populate({
      path: 'studentId',
      populate: { path: 'userId', select: 'email' }
    });

    let data = await Promise.all(projects.map(async (p: any) => {
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
        status: p.status === 'APPROVED'
          ? 'Completed'
          : p.status === 'PENDING'
            ? 'Pending'
            : p.status === 'REJECTED'
              ? 'Rejected'
              : 'In Progress',
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

    if (status) {
      const normalized = String(status).toLowerCase();
      data = data.filter((p: any) => {
        const row = String(p.status || '').toLowerCase();
        if (normalized === 'approved' || normalized === 'completed') return row === 'completed';
        if (normalized === 'pending') return row === 'pending';
        if (normalized === 'rejected') return row === 'rejected';
        return row === normalized;
      });
    }
    if (studentId) data = data.filter((p: any) => p.student?.id?.toString() === String(studentId));
    if (department) data = data.filter((p: any) => p.student?.department === department);
    if (year) data = data.filter((p: any) => p.student?.year === year);
    if (fromDate) {
      const from = new Date(String(fromDate));
      if (!Number.isNaN(from.getTime())) data = data.filter((p: any) => new Date(p.createdDate).getTime() >= from.getTime());
    }
    if (toDate) {
      const to = new Date(String(toDate));
      if (!Number.isNaN(to.getTime())) data = data.filter((p: any) => new Date(p.createdDate).getTime() <= to.getTime());
    }
    if (search) {
      const q = String(search).toLowerCase();
      data = data.filter((p: any) =>
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.student?.name?.toLowerCase().includes(q)
      );
    }

    data.sort((a: any, b: any) => {
      const dir = sortOrder === 'asc' ? 1 : -1;
      if (sortBy === 'title') return a.title.localeCompare(b.title) * dir;
      if (sortBy === 'student') return (a.student?.name || '').localeCompare(b.student?.name || '') * dir;
      if (sortBy === 'status') return (a.status || '').localeCompare(b.status || '') * dir;
      return (new Date(a.createdDate).getTime() - new Date(b.createdDate).getTime()) * dir;
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
    res.status(500).json({ success: false, message: 'Failed to fetch mentor projects', error: error.message });
  }
};

export const getMentorProjectById = async (req: Request, res: Response) => {
  try {
    const mentorId = (req as any).user.mentorId || (req as any).user.id;
    const { id } = req.params;

    const project = await Project.findOne({ _id: id, mentorId }).populate({
      path: 'studentId',
      populate: { path: 'userId', select: 'email' }
    });
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const feedback = await Feedback.findOne({
      studentId: (project as any).studentId?._id,
      mentorId,
      source: 'PROJECT',
      sourceId: project._id
    });

    res.json({
      success: true,
      data: {
        id: project._id,
        title: project.title,
        description: project.description,
        githubLink: project.githubLink,
        websiteLink: project.websiteLink,
        completedAt: project.completedAt,
        status: project.status,
        student: {
          id: (project as any).studentId?._id,
          name: `${(project as any).studentId?.firstName || ''} ${(project as any).studentId?.lastName || ''}`.trim(),
          email: (project as any).studentId?.userId?.email || '',
          department: (project as any).studentId?.department,
          year: (project as any).studentId?.year
        },
        feedback: feedback?.message || null
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch project details', error: error.message });
  }
};
