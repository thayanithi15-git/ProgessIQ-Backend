import mongoose from 'mongoose';

const dailyActivityLogSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  date: { type: Date, required: true },
  activity: { type: String, required: true },
  hoursSpent: { type: Number, required: true }
});

const DailyActivityLog = mongoose.model('DailyActivityLog', dailyActivityLogSchema);

export default DailyActivityLog;
