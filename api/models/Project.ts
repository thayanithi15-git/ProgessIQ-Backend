import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  mentorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Mentor', required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  githubLink: { type: String },
  websiteLink: { type: String },
  dueDate: { type: Date }, // Added for cron reminders
  completedAt: { type: Date },
  status: {
    type: String,
    required: true,
    enum: ['PENDING', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'REJECTED'],
    default: 'PENDING'
  },
  // Mentor-created vs student-uploaded
  createdByMentor: { type: Boolean, default: false },
  // Student's submission note when reporting completion
  submissionNote: { type: String },
  // Mentor verification
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Mentor' },
  verificationNote: { type: String },
  pointsAwarded: { type: Number, default: 0 },
  verifiedAt: { type: Date },
}, { timestamps: true });

const Project = mongoose.model('Project', projectSchema);

export default Project;
