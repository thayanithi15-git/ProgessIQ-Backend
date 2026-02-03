import mongoose from 'mongoose';

const approvalSchema = new mongoose.Schema({
  entityType: { type: String, required: true },
  entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  mentorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Mentor', required: true },
  status: { type: String, required: true },
  approvedAt: { type: Date, default: Date.now },
  feedback: { type: String },
  pointsAwarded: { type: Number, default: 0 }
});

const Approval = mongoose.model('Approval', approvalSchema);

export default Approval;
