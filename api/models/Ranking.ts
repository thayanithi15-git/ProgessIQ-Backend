import mongoose from 'mongoose';

const rankingSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  departmentRank: { type: Number, required: true },
  overallRank: { type: Number, required: true },
  calculatedOn: { type: Date, default: Date.now }
});

const Ranking = mongoose.model('Ranking', rankingSchema);

export default Ranking;
