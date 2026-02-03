import mongoose from 'mongoose';

const onlineProfileSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  github: { type: String },
  linkedin: { type: String },
  leetcode: { type: String },
  portfolio: { type: String }
});

const OnlineProfile = mongoose.model('OnlineProfile', onlineProfileSchema);

export default OnlineProfile;
