import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  mentorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Mentor', required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  githubLink: { type: String },
  websiteLink: { type: String },
  dueDate: { type: Date },
  completedAt: { type: Date },
  status: {
    type: String,
    required: true,
    enum: ['PENDING', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'REJECTED'],
    default: 'PENDING'
  },

  createdByMentor: { type: Boolean, default: false },

  submissionNote: { type: String },

  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Mentor' },
  verificationNote: { type: String },
  pointsAwarded: { type: Number, default: 0 },
  verifiedAt: { type: Date },
}, { timestamps: true });

const Project = mongoose.model('Project', projectSchema);

export default Project;
