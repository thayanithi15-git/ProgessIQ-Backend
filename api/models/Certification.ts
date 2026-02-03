import mongoose from 'mongoose';

const certificationSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  mentorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Mentor', required: true },
  title: { type: String, required: true },
  platform: { type: String, required: true },
  platformLink: { type: String, required: true },
  from: { type: Date, required: true },
  to: { type: Date, required: true },
  status: { type: String, required: true }
});

const Certification = mongoose.model('Certification', certificationSchema);

export default Certification;
