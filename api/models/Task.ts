import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  mentorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Mentor', required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  dueDate: { type: Date, required: true },
  completedAt: { type: Date },
  status: {
    type: String,
    required: true,
    enum: ['PENDING', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'REJECTED'],
    default: 'PENDING'
  },

  submissionNote: { type: String },

  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Mentor' },
  verificationNote: { type: String },
  pointsAwarded: { type: Number, default: 0 },
  verifiedAt: { type: Date },
}, { timestamps: true });

const Task = mongoose.model('Task', taskSchema);

export default Task;
