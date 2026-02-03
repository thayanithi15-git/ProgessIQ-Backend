import mongoose from 'mongoose';

const surveyResponseSchema = new mongoose.Schema({
  surveyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Survey', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  answers: { type: [String], required: true },
  submittedAt: { type: Date, default: Date.now }
});

const SurveyResponse = mongoose.model('SurveyResponse', surveyResponseSchema);

export default SurveyResponse;
