import Task from '../../models/Task';
import { Request, Response } from 'express';
import Feedback from '../../models/Feedback';

export const listMentorTasks = async (req: Request, res: Response) => {
  try {
    const mentorId = (req as any).user.mentorId || (req as any).user.id;
    const tasks = await Task.find({ mentorId }).populate({
      path: 'studentId',
      populate: { path: 'userId', select: 'email' }
    });

    const data = await Promise.all(tasks.map(async (t: any) => {
      const feedback = await Feedback.findOne({
        studentId: t.studentId?._id,
        mentorId,
        source: 'TASK',
        sourceId: t._id
      });

      const status = t.status === 'COMPLETED'
        ? 'Done'
        : t.status === 'APPROVED'
          ? 'Done'
          : t.status === 'PENDING'
            ? 'To Do'
            : 'In Progress';

      const due = t.dueDate ? new Date(t.dueDate) : new Date();
      const priority = due.getTime() < Date.now() ? 'High' : 'Medium';

      return {
        id: t._id,
        title: t.title,
        description: t.description,
        assignedTo: `${t.studentId?.firstName || ''} ${t.studentId?.lastName || ''}`.trim(),
        student: {
          id: t.studentId?._id,
          email: t.studentId?.userId?.email || '',
          department: t.studentId?.department,
          year: t.studentId?.year
        },
        status,
        dueDate: t.dueDate,
        priority,
        feedback: feedback?.message || null
      };
    }));

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch mentor tasks', error: error.message });
  }
};
