import cron from 'node-cron';
import Task from '../models/Task';
import Project from '../models/Project';
import Student from '../models/Student';
import { NotificationService } from './notificationService';

// Function to find tasks/projects that are due in exactly `daysOffset` days
async function checkEntitiesDueIn(daysOffset: number) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + daysOffset);

    const nextDay = new Date(targetDate);
    nextDay.setDate(targetDate.getDate() + 1);

    const matchCondition = {
      status: { $in: ['PENDING', 'IN_PROGRESS'] },
      $or: [
        { dueDate: { $gte: targetDate, $lt: nextDay } },
        { completedAt: { $gte: targetDate, $lt: nextDay } } // completedAt is used as dueDate in Projects sometimes
      ]
    };

    const upcomingTasks = await Task.find({
      status: { $in: ['PENDING', 'IN_PROGRESS'] },
      dueDate: { $gte: targetDate, $lt: nextDay }
    });

    const upcomingProjects = await Project.find({
      status: { $in: ['PENDING', 'IN_PROGRESS'] },
      completedAt: { $gte: targetDate, $lt: nextDay }
    });

    const items = [...upcomingTasks.map(t => ({ ...t.toObject(), type: 'TASK' })), ...upcomingProjects.map(p => ({ ...p.toObject(), type: 'PROJECT' }))];

    const studentIds = [...new Set(items.map(i => i.studentId.toString()))];
    const students = await Student.find({ _id: { $in: studentIds } });

    for (const st of students) {
      if (!st.userId) continue;

      const userItems = items.filter(i => i.studentId.toString() === st._id.toString());
      for (const item of userItems) {
        const title = item.title;
        const msg = `Reminder: Your ${item.type.toLowerCase()} "${title}" is due in ${daysOffset} day(s). Make sure to submit it on time!`;
        
        await NotificationService.send({
          userId: st.userId.toString(),
          title: `Upcoming Deadline: ${title}`,
          message: msg,
          type: 'WARNING',
          sendEmail: true
        });
      }
    }

  } catch (error) {
    console.error(`Cron Service: Failed to process due in ${daysOffset} days.`, error);
  }
}

export const startCronJobs = () => {
  // Run every morning at 8:00 AM
  cron.schedule('0 8 * * *', async () => {
    console.log('Running daily deadline checks...');
    await checkEntitiesDueIn(2); // 2 days before
    await checkEntitiesDueIn(1); // 1 day before
    console.log('Daily deadline checks completed.');
  });
  
  console.log('Cron jobs scheduled.');
};
