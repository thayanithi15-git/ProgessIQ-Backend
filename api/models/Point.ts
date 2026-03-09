import mongoose from 'mongoose';

const pointSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  mentorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Mentor' },
  source: { type: String, required: true },
  referenceId: { type: mongoose.Schema.Types.ObjectId },
  points: { type: Number, required: true },
  description: { type: String },
  awardedOn: { type: Date, default: Date.now }
});

const Point = mongoose.model('Point', pointSchema);

export default Point;
