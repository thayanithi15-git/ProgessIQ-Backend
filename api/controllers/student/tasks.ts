import Task from '../../models/Task';
import Feedback from '../../models/Feedback';
import { Request, Response } from 'express';

/**
 * CREATE TASK
 * POST /api/student/tasks
 */
export const createTask = async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).user.studentId;
    const { mentorId, title, description, dueDate } = req.body;

    if (!mentorId || !title || !description || !dueDate) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const task = new Task({
      studentId,
      mentorId,
      title,
      description,
      dueDate: new Date(dueDate),
      status: 'PENDING'
    });

    await task.save();

    res.status(201).json({
      success: true,
      message: 'Task created',
      data: task
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error creating task', error });
  }
};

/**
 * GET ALL TASKS
 * GET /api/student/tasks
 */
export const listStudentTasks = async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).user.studentId;
    const { status, limit = 20, skip = 0 } = req.query;

    const filter: any = { studentId };
    if (status) filter.status = status;

    const tasks = await Task.find(filter)
      .populate('mentorId', 'firstName lastName')
      .sort({ dueDate: 1 })
      .skip(parseInt(skip as string))
      .limit(parseInt(limit as string));

    const total = await Task.countDocuments(filter);

    // Get feedback for each task
    const tasksWithFeedback = await Promise.all(
      tasks.map(async (task) => {
        const feedback = await Feedback.findOne({
          studentId,
          source: 'TASK',
          sourceId: task._id
        });
        const isOverdue = task.dueDate < new Date() && task.status !== 'COMPLETED';
        return {
          ...task.toObject(),
          feedback: feedback?.message || null,
          isOverdue
        };
      })
    );

    res.json({
      success: true,
      data: {
        tasks: tasksWithFeedback,
        pagination: {
          total,
          limit: parseInt(limit as string),
          skip: parseInt(skip as string)
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching tasks', error });
  }
};

/**
 * GET SINGLE TASK
 * GET /api/student/tasks/:id
 */
export const getTaskById = async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).user.studentId;
    const { id } = req.params;

    const task = await Task.findOne({ _id: id, studentId }).populate('mentorId', 'firstName lastName');

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const feedback = await Feedback.findOne({
      studentId,
      source: 'TASK',
      sourceId: id
    }).populate('mentorId', 'firstName lastName email');

    const isOverdue = task.dueDate < new Date() && task.status !== 'COMPLETED';

    const mentorId = feedback?.mentorId as any;
    res.json({
      success: true,
      data: {
        ...task.toObject(),
        isOverdue,
        feedback: feedback ? {
          id: feedback._id,
          mentorName: `${mentorId?.firstName} ${mentorId?.lastName}`,
          message: feedback.message,
          createdAt: feedback.createdAt
        } : null
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching task', error });
  }
};

/**
 * UPDATE TASK
 * PUT /api/student/tasks/:id
 */
export const updateTask = async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).user.studentId;
    const { id } = req.params;

    const task = await Task.findOne({ _id: id, studentId });

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    // Allow update only if not completed
    if (task.status === 'COMPLETED') {
      return res.status(400).json({ success: false, message: 'Cannot update completed task' });
    }

    const updated = await Task.findByIdAndUpdate(id, req.body, { new: true });

    res.json({
      success: true,
      message: 'Task updated',
      data: updated
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating task', error });
  }
};

/**
 * DELETE TASK
 * DELETE /api/student/tasks/:id
 */
export const deleteTask = async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).user.studentId;
    const { id } = req.params;

    const task = await Task.findOne({ _id: id, studentId });

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    // Allow delete only if pending
    if (task.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: 'Cannot delete task with this status' });
    }

    await Task.findByIdAndDelete(id);
    await Feedback.deleteOne({ sourceId: id, source: 'TASK' });

    res.json({
      success: true,
      message: 'Task deleted'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting task', error });
  }
};

/**
 * SUBMIT/COMPLETE TASK
 * PUT /api/student/tasks/:id/complete
 */
export const submitTaskUpdate = async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).user.studentId;
    const { id } = req.params;
    const { completedAt } = req.body;

    const task = await Task.findOne({ _id: id, studentId });

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const updated = await Task.findByIdAndUpdate(
      id,
      {
        status: 'SUBMITTED',
        completedAt: completedAt || new Date()
      },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Task submitted for review',
      data: updated
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error submitting task', error });
  }
};

/**
 * GET TASK FEEDBACK
 * GET /api/student/tasks/:id/feedback
 */
export const getTaskFeedback = async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).user.studentId;
    const { id } = req.params;

    const feedback = await Feedback.findOne({
      studentId,
      source: 'TASK',
      sourceId: id
    }).populate('mentorId', 'firstName lastName email');

    if (!feedback) {
      return res.status(404).json({ success: false, message: 'No feedback found' });
    }

    const mentor = feedback.mentorId as any;
    res.json({
      success: true,
      data: {
        id: feedback._id,
        mentor: `${mentor?.firstName} ${mentor?.lastName}`,
        mentorEmail: mentor?.email,
        message: feedback.message,
        createdAt: feedback.createdAt,
        type: 'FEEDBACK'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching feedback', error });
  }
};
