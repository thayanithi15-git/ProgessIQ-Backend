import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
  generatedBy: { type: String, required: true },
  reportType: { type: String, required: true },
  generatedAt: { type: Date, default: Date.now },
  fileUrl: { type: String, required: true }
});

const Report = mongoose.model('Report', reportSchema);

export default Report;
