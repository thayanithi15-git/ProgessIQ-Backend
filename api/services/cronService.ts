import cron from 'node-cron';
import Task from '../models/Task';
import Project from '../models/Project';
import Student from '../models/Student';
import { NotificationService } from './notificationService';

/**
 * Core logic to check for tasks/projects due in a specific number of days
 * and send notifications.
 */
export async function processCronReminders() {
  const daysToCheck = [1, 2]; // Check for 1 day and 2 days before
  console.log(`[CronService] Starting reminder process for: ${daysToCheck.join(', ')} day(s) out.`);

  for (const daysOffset of daysToCheck) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + daysOffset);

      const nextDay = new Date(targetDate);
      nextDay.setDate(targetDate.getDate() + 1);

      // Find Pending Tasks due on the target date
      const upcomingTasks = await Task.find({
        status: { $in: ['PENDING', 'IN_PROGRESS'] },
        dueDate: { $gte: targetDate, $lt: nextDay }
      });

      // Find Pending Projects due on the target date
      const upcomingProjects = await Project.find({
        status: { $in: ['PENDING', 'IN_PROGRESS'] },
        dueDate: { $gte: targetDate, $lt: nextDay }
      });

      const items = [
        ...upcomingTasks.map(t => ({ ...t.toObject(), type: 'TASK' })), 
        ...upcomingProjects.map(p => ({ ...p.toObject(), type: 'PROJECT' }))
      ];

      if (items.length === 0) {
        console.log(`[CronService] No items due in ${daysOffset} day(s).`);
        continue;
      }

      console.log(`[CronService] Found ${items.length} items due in ${daysOffset} day(s). Sending reminders...`);

      const studentIds = [...new Set(items.map(i => i.studentId.toString()))];
      const students = await Student.find({ _id: { $in: studentIds } });

      for (const st of students) {
        if (!st.userId) continue;

        const userItems = items.filter(i => i.studentId.toString() === st._id.toString());
        for (const item of userItems) {
          const title = item.title;
          const msg = `Urgent Reminder: Your ${item.type.toLowerCase()} "${title}" is due ${daysOffset === 1 ? 'tomorrow' : 'in 2 days'}. Please complete it to stay on track!`;
          
          await NotificationService.send({
            userId: st.userId.toString(),
            title: `${item.type === 'PROJECT' ? 'Project' : 'Task'} Deadline: ${title}`,
            message: msg,
            type: 'WARNING',
            sendEmail: true,
            link: item.type === 'PROJECT' ? '/student/dashboard/projects' : '/student/dashboard/tasks'
          });
        }
      }
    } catch (error) {
      console.error(`[CronService] Failed to process ${daysOffset} day reminders:`, error);
    }
  }
  
  console.log('[CronService] Reminder process completed.');
}

export const startCronJobs = () => {
  // Local/Dev environment: Run every morning at 8:00 AM
  cron.schedule('0 8 * * *', async () => {
    await processCronReminders();
  });
  
  console.log('Cron jobs scheduled (Local only).');
};
