import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  gender: { type: String, required: true },
  dob: { type: Date, required: true },
  phone: { type: String, required: true },
  parentName: { type: String, required: true },
  parentPhone: { type: String, required: true },
  place: { type: String, required: true },
  department: { type: String, required: true },
  year: { type: String, required: true },
  academicYear: { type: String, required: true },
  rollNo: { type: String, required: true },
  cgpa: { type: Number, default: 0 },
  arrearCount: { type: Number, default: 0 },
  familyIncome: { type: String },
  goodAt: { type: [String], default: [] },
  rewardPoints: { type: Number, default: 0 },
  status: { type: String, default: 'Active' },
  createdAt: { type: Date, default: Date.now }
});

const Student = mongoose.model('Student', studentSchema);

export default Student;
