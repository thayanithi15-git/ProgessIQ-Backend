import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  role: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String },
  googleId: { type: String },
  picture: { type: String },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

export default User;
