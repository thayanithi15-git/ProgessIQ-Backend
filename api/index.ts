import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import mongoSanitize from 'express-mongo-sanitize';
import mongoose from 'mongoose';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ================= MIDDLEWARE =================

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));

app.use(helmet());
app.use(express.json({ limit: '10mb' }));
app.use(mongoSanitize());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use(limiter);

// ================= ROUTES =================

app.get('/', (req, res) => res.send('API is running'));

import authRoutes from './routes/authRoutes';
import adminRoutes from './routes/adminRoutes';
import mentorRoutes from './routes/mentorRoutes';
import studentRoutes from './routes/studentRoutes';
import notificationsRoutes from './routes/notificationsRoutes';

import { securityLogger } from './middleware/security';
app.use(securityLogger);

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/mentors', mentorRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/notifications', notificationsRoutes);

// Error handler
import { errorHandler } from './middleware/errorHandler';
import { connectDB } from './config/connectDB';
app.use(errorHandler);


// ================= START SERVER =================

const startServer = async () => {
  await connectDB();   // ✅ CALLING YOUR TS FUNCTION

  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
};

startServer();

export default app;
