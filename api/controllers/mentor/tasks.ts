import Task from '../../models/Task';
import { Request, Response } from 'express';
import Feedback from '../../models/Feedback';
import MentorStudentMapping from '../../models/MentorStudentMapping';
import Point from '../../models/Point';
import Student from '../../models/Student';
import { NotificationService } from '../../services/notificationService';

const getMentorId = (req: Request) => (req as any).user.mentorId || (req as any).user.id;

// ========================
// LIST TASKS
// ========================
export const listMentorTasks = async (req: Request, res: Response) => {
  try {
    const mentorId = getMentorId(req);
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
      sortBy = 'dueDate',
      sortOrder = 'asc'
    } = req.query as any;

    const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const skip = (parsedPage - 1) * parsedLimit;

    const tasks = await Task.find({ mentorId }).populate({
      path: 'studentId',
      populate: { path: 'userId', select: 'email' }
    });

    let data = await Promise.all(tasks.map(async (t: any) => {
      const feedback = await Feedback.findOne({
        studentId: t.studentId?._id,
        mentorId,
        source: 'TASK',
        sourceId: t._id
      });

      const displayStatus =
        t.status === 'APPROVED' ? 'Done'
        : t.status === 'SUBMITTED' ? 'Submitted'
        : t.status === 'IN_PROGRESS' ? 'In Progress'
        : t.status === 'REJECTED' ? 'Rejected'
        : 'To Do';

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
        status: displayStatus,
        rawStatus: t.status,
        dueDate: t.dueDate,
        priority,
        submissionNote: t.submissionNote || null,
        completedAt: t.completedAt || null,
        verificationNote: t.verificationNote || null,
        pointsAwarded: t.pointsAwarded || 0,
        verifiedAt: t.verifiedAt || null,
        feedback: feedback?.message || null
      };
    }));

    if (status) {
      const normalized = String(status).toLowerCase();
      data = data.filter((t: any) => {
        const row = String(t.rawStatus || '').toLowerCase();
        if (normalized === 'approved' || normalized === 'completed' || normalized === 'done') return row === 'approved';
        if (normalized === 'pending' || normalized === 'to do') return row === 'pending';
        if (normalized === 'in_progress' || normalized === 'in progress') return row === 'in_progress';
        if (normalized === 'submitted') return row === 'submitted';
        if (normalized === 'rejected') return row === 'rejected';
        return row === normalized;
      });
    }
    if (studentId) data = data.filter((t: any) => t.student?.id?.toString() === String(studentId));
    if (department) data = data.filter((t: any) => t.student?.department === department);
    if (year) data = data.filter((t: any) => t.student?.year === year);
    if (fromDate) {
      const from = new Date(String(fromDate));
      if (!Number.isNaN(from.getTime())) data = data.filter((t: any) => new Date(t.dueDate).getTime() >= from.getTime());
    }
    if (toDate) {
      const to = new Date(String(toDate));
      if (!Number.isNaN(to.getTime())) data = data.filter((t: any) => new Date(t.dueDate).getTime() <= to.getTime());
    }
    if (search) {
      const q = String(search).toLowerCase();
      data = data.filter((t: any) =>
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.assignedTo.toLowerCase().includes(q)
      );
    }

    data.sort((a: any, b: any) => {
      const dir = sortOrder === 'desc' ? -1 : 1;
      if (sortBy === 'title') return a.title.localeCompare(b.title) * dir;
      if (sortBy === 'student') return (a.assignedTo || '').localeCompare(b.assignedTo || '') * dir;
      if (sortBy === 'status') return (a.rawStatus || '').localeCompare(b.rawStatus || '') * dir;
      return (new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()) * dir;
    });

    const total = data.length;
    const paginated = data.slice(skip, skip + parsedLimit);

    res.json({
      success: true,
      data: paginated,
      pagination: { total, page: parsedPage, limit: parsedLimit, totalPages: Math.ceil(total / parsedLimit) }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch mentor tasks', error: error.message });
  }
};

// ========================
// GET TASK BY ID
// ========================
export const getMentorTaskById = async (req: Request, res: Response) => {
  try {
    const mentorId = getMentorId(req);
    const { id } = req.params;
    const task = await Task.findOne({ _id: id, mentorId }).populate({
      path: 'studentId',
      populate: { path: 'userId', select: 'email' }
    });
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const feedback = await Feedback.findOne({ studentId: (task as any).studentId?._id, mentorId, source: 'TASK', sourceId: task._id });

    res.json({
      success: true,
      data: {
        id: task._id,
        title: task.title,
        description: task.description,
        dueDate: task.dueDate,
        completedAt: task.completedAt,
        status: task.status,
        submissionNote: task.submissionNote,
        verificationNote: task.verificationNote,
        pointsAwarded: task.pointsAwarded,
        verifiedAt: task.verifiedAt,
        student: {
          id: (task as any).studentId?._id,
          name: `${(task as any).studentId?.firstName || ''} ${(task as any).studentId?.lastName || ''}`.trim(),
          email: (task as any).studentId?.userId?.email || '',
          department: (task as any).studentId?.department,
          year: (task as any).studentId?.year
        },
        feedback: feedback?.message || null
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch task details', error: error.message });
  }
};

// ========================
// CREATE TASK (assign to students)
// ========================
export const createMentorTask = async (req: Request, res: Response) => {
  try {
    const mentorId = getMentorId(req);
    const { title, description, dueDate, studentId, studentIds } = req.body;

    if (!title || !description || !dueDate) {
      return res.status(400).json({ success: false, message: 'title, description and dueDate are required' });
    }

    let targets: string[] = [];
    if (Array.isArray(studentIds) && studentIds.length > 0) targets = studentIds;
    else if (studentId) targets = [studentId];

    if (targets.length === 0) {
      return res.status(400).json({ success: false, message: 'studentId or studentIds is required' });
    }

    const mapped = await MentorStudentMapping.find({ mentorId, studentId: { $in: targets }, isActive: true }).select('studentId');
    const mappedIds = new Set(mapped.map((m: any) => m.studentId.toString()));
    const validTargets = targets.filter((id) => mappedIds.has(String(id)));

    if (validTargets.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid mapped students found for task assignment' });
    }

    const docs = validTargets.map((sid) => ({
      studentId: sid,
      mentorId,
      title,
      description,
      dueDate: new Date(dueDate),
      status: 'PENDING'
    }));

    const created = await Task.insertMany(docs);

    // Notify students
    const studentsToNotify = await Student.find({ _id: { $in: validTargets } });
    for (const st of studentsToNotify) {
      if (st.userId) {
        await NotificationService.send({
          userId: st.userId.toString(),
          title: 'New Task Assigned',
          message: `You have been assigned a new task: "${title}". Due date: ${new Date(dueDate).toLocaleDateString()}.`,
          type: 'TASK',
          sendEmail: true
        });
      }
    }

    res.status(201).json({ success: true, message: 'Task assigned successfully', data: created });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to create task', error: error.message });
  }
};

// ========================
// UPDATE TASK
// ========================
export const updateMentorTask = async (req: Request, res: Response) => {
  try {
    const mentorId = getMentorId(req);
    const { id } = req.params;
    const { title, description, dueDate } = req.body;

    const task = await Task.findOne({ _id: id, mentorId });
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    if (!['PENDING', 'IN_PROGRESS'].includes(task.status)) {
      return res.status(400).json({ success: false, message: 'Cannot edit a submitted or approved task' });
    }

    const updated = await Task.findByIdAndUpdate(
      id,
      { ...(title && { title }), ...(description && { description }), ...(dueDate && { dueDate: new Date(dueDate) }) },
      { new: true }
    );

    res.json({ success: true, message: 'Task updated', data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to update task', error: error.message });
  }
};

// ========================
// DELETE TASK
// ========================
export const deleteMentorTask = async (req: Request, res: Response) => {
  try {
    const mentorId = getMentorId(req);
    const { id } = req.params;

    const task = await Task.findOne({ _id: id, mentorId });
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    if (['SUBMITTED', 'APPROVED'].includes(task.status)) {
      return res.status(400).json({ success: false, message: 'Cannot delete a submitted or approved task' });
    }

    await Task.findByIdAndDelete(id);
    await Feedback.deleteMany({ sourceId: id, source: 'TASK' });

    res.json({ success: true, message: 'Task deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to delete task', error: error.message });
  }
};

// ========================
// VERIFY TASK (approve/reject + award points)
// ========================
export const verifyMentorTask = async (req: Request, res: Response) => {
  try {
    const mentorId = getMentorId(req);
    const { id } = req.params;
    const { status, verificationNote, points } = req.body;

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'status must be APPROVED or REJECTED' });
    }

    const task = await Task.findOne({ _id: id, mentorId });
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    if (task.status !== 'SUBMITTED') {
      return res.status(400).json({ success: false, message: 'Only SUBMITTED tasks can be verified' });
    }

    const pointsToAward = status === 'APPROVED' && typeof points === 'number' && points > 0 ? points : 0;

    const updated = await Task.findByIdAndUpdate(
      id,
      {
        status,
        verifiedBy: mentorId,
        verificationNote: verificationNote || '',
        pointsAwarded: pointsToAward,
        verifiedAt: new Date()
      },
      { new: true }
    );

    // Award points if approved
    if (pointsToAward > 0) {
      await Point.create({
        studentId: task.studentId,
        mentorId,
        source: 'TASK',
        referenceId: task._id,
        points: pointsToAward,
        description: `Task: ${task.title}`
      });
      await Student.findByIdAndUpdate(task.studentId, { $inc: { rewardPoints: pointsToAward } });
    }

    // Notify student
    const st = await Student.findById(task.studentId);
    if (st && st.userId) {
      await NotificationService.send({
        userId: st.userId.toString(),
        title: `Task ${status === 'APPROVED' ? 'Approved' : 'Rejected'}`,
        message: `Your task "${task.title}" has been ${status.toLowerCase()}.${pointsToAward > 0 ? ` You earned ${pointsToAward} points!` : ''}`,
        type: status === 'APPROVED' ? 'SUCCESS' : 'ERROR',
        sendEmail: true
      });
    }

    res.json({ success: true, message: `Task ${status.toLowerCase()}`, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to verify task', error: error.message });
  }
};
