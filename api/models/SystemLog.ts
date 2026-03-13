import mongoose from 'mongoose';

const systemLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  role: { type: String, required: true },
  action: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  ipAddress: { type: String }
});

const SystemLog = mongoose.model('SystemLog', systemLogSchema);

export default SystemLog;
