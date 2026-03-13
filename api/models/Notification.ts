import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true },
  title: { type: String, required: false }, // Optional title for email subject or rich UI
  type: { 
    type: String, 
    enum: ['INFO', 'WARNING', 'SUCCESS', 'ERROR', 'TASK', 'PROJECT', 'SURVEY', 'POINTS'],
    default: 'INFO',
    required: true 
  },
  read: { type: Boolean, default: false },
  link: { type: String, required: false }, // URL to redirect when clicked
  sentEmail: { type: Boolean, default: false }, // Tracks if an email was sent for this
  createdAt: { type: Date, default: Date.now }
});

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
