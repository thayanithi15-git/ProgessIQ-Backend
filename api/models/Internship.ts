import mongoose from 'mongoose';

const internshipSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  mentorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Mentor', required: true },
  companyName: { type: String, required: true },
  companyUrl: { type: String, required: true },
  role: { type: String, required: true },
  type: { type: String, required: true },
  paid: { type: Boolean, required: true },
  from: { type: Date, required: true },
  to: { type: Date, required: true },
  description: { type: String, required: true },
  status: { type: String, required: true }
});

const Internship = mongoose.model('Internship', internshipSchema);

export default Internship;
