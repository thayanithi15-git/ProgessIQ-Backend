import mongoose from 'mongoose';

const surveySchema = new mongoose.Schema({
  mentorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Mentor', required: true },
  title: { type: String, required: true },
  questions: { type: [String], required: true },
  createdAt: { type: Date, default: Date.now }
});

const Survey = mongoose.model('Survey', surveySchema);

export default Survey;
