import mongoose from 'mongoose';

const pointSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  source: { type: String, required: true },
  points: { type: Number, required: true },
  awardedOn: { type: Date, default: Date.now }
});

const Point = mongoose.model('Point', pointSchema);

export default Point;
