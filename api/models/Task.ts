import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  mentorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Mentor', required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  dueDate: { type: Date, required: true },
  completedAt: { type: Date },
  status: { type: String, required: true }
});

const Task = mongoose.model('Task', taskSchema);

export default Task;
