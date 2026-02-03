import mongoose from 'mongoose';

const systemLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, required: true },
  action: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  ipAddress: { type: String, required: true }
});

const SystemLog = mongoose.model('SystemLog', systemLogSchema);

export default SystemLog;
