import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import User from '../models/User';

dotenv.config();

const seed = async () => {
  await mongoose.connect(process.env.MONGODB_URI!);

  const existing = await User.findOne({ email: process.env.ADMIN_EMAIL });
  if (existing) {
    console.log('Admin already exists');
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'ChangeMe123!', 10);
  const admin = new User({ role: 'ADMIN', email: process.env.ADMIN_EMAIL, passwordHash });
  await admin.save();
  console.log('Admin seeded', admin.email);
  process.exit(0);
};

seed().catch(err => {
  console.error(err);
  process.exit(1);
});