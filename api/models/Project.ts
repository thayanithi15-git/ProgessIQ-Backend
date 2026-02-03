import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  mentorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Mentor', required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  githubLink: { type: String, required: true },
  websiteLink: { type: String, required: true },
  completedAt: { type: Date, required: true },
  status: { type: String, required: true }
});

const Project = mongoose.model('Project', projectSchema);

export default Project;
