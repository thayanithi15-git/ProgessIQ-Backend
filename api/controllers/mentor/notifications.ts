import { Request, Response } from 'express';
import Task from '../../models/Task';
import Project from '../../models/Project';
import Student from '../../models/Student';
import User from '../../models/User';
import { NotificationService } from '../../services/notificationService';

const getMentorId = (req: Request) => (req as any).user.mentorId || (req as any).user.id;

export const notifyStudents = async (req: Request, res: Response) => {
  try {
    const mentorId = getMentorId(req);
    const { type, entityId, message } = req.body;

    if (!['TASK', 'PROJECT'].includes(type) || !entityId || !message) {
      return res.status(400).json({ success: false, message: 'Invalid payload' });
    }

    let entities: any[] = [];
    let titlePrefix = '';

    if (type === 'TASK') {

      const refTask = await Task.findOne({ _id: entityId, mentorId });
      if (!refTask) return res.status(404).json({ success: false, message: 'Task not found' });

      entities = await Task.find({
        mentorId,
        title: refTask.title,
        dueDate: refTask.dueDate,
        status: { $in: ['PENDING', 'IN_PROGRESS', 'REJECTED'] }
      });
      titlePrefix = `Reminder: Task "${refTask.title}"`;

    } else {
      const refProj = await Project.findOne({ _id: entityId, mentorId });
      if (!refProj) return res.status(404).json({ success: false, message: 'Project not found' });

      entities = await Project.find({
        mentorId,
        title: refProj.title,
        status: { $in: ['PENDING', 'IN_PROGRESS', 'REJECTED'] }
      });
      titlePrefix = `Reminder: Project "${refProj.title}"`;
    }

    if (entities.length === 0) {
      return res.status(400).json({ success: false, message: 'No active students found to notify for this entity' });
    }

    const studentIds = entities.map(e => e.studentId);
    const students = await Student.find({ _id: { $in: studentIds } });

    let sentCount = 0;
    for (const st of students) {
      if (st.userId) {
        await NotificationService.send({
          userId: st.userId.toString(),
          title: titlePrefix,
          message: message,
          type: type === 'TASK' ? 'TASK' : 'PROJECT',
          sendEmail: true
        });
        sentCount++;
      }
    }

    res.json({ success: true, message: `Notification sent to ${sentCount} student(s)` });

  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to notify students', error: error.message });
  }
};
