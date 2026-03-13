import nodemailer from 'nodemailer';
import Notification from '../models/Notification';
import User from '../models/User';
import Student from '../models/Student';
import dotenv from 'dotenv';

dotenv.config();

// Create reusable transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
  service: 'gmail', // You can change this to any SMTP provider
  auth: {
    user: process.env.EMAIL_USER || 'progressiq.noreply@gmail.com', // Replace with real credentials in .env
    pass: process.env.EMAIL_PASS || 'password_here'
  }
});

interface SendNotificationParams {
  userId: string;
  title: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR' | 'TASK' | 'PROJECT' | 'SURVEY' | 'POINTS';
  link?: string;
  sendEmail?: boolean;
}

/**
 * Service to handle in-app notifications and emails
 */
export const NotificationService = {
  /**
   * Send a notification to a user (in-app + optional email)
   */
  async send(params: SendNotificationParams) {
    try {
      // 1. Save in-app notification
      const notification = new Notification({
        userId: params.userId,
        title: params.title,
        message: params.message,
        type: params.type,
        link: params.link,
        read: false,
        sentEmail: params.sendEmail || false
      });
      await notification.save();

      // 2. Send email if requested
      if (params.sendEmail) {
        const user = await User.findById(params.userId);
        if (user && user.email) {
          const student = await Student.findOne({ userId: params.userId });
          const name = student ? `${student.firstName} ${student.lastName}` : 'Student';

          const mailOptions = {
            from: `"ProgressIQ" <${process.env.EMAIL_USER || 'noreply@progressiq.com'}>`,
            to: user.email,
            subject: params.title,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #E8EDF4; border-radius: 8px; overflow: hidden;">
                <div style="background-color: #6366F1; padding: 20px; text-align: center; color: white;">
                  <h2 style="margin: 0;">ProgressIQ</h2>
                </div>
                <div style="padding: 24px;">
                  <p style="font-size: 16px; color: #1E293B; font-weight: 600;">Hello ${name},</p>
                  <p style="font-size: 15px; color: #64748B; line-height: 1.6;">${params.message}</p>
                  ${params.link ? `
                    <div style="margin-top: 24px; text-align: center;">
                      <a href="${params.link}" style="display: inline-block; background-color: #6366F1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
                        View Details
                      </a>
                    </div>
                  ` : ''}
                </div>
                <div style="background-color: #F8FAFC; padding: 16px; text-align: center; font-size: 12px; color: #94A3B8; border-top: 1px solid #E8EDF4;">
                  <p style="margin: 0;">This is an automated message from ProgressIQ. Please do not reply.</p>
                </div>
              </div>
            `
          };

          // Send mail (we log error but don't fail the request if email fails)
          transporter.sendMail(mailOptions).catch(err => {
            console.error('Email send error:', err);
          });
        }
      }

      return notification;
    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  },

  /**
   * Send notification to multiple users
   */
  async sendBulk(users: string[], params: Omit<SendNotificationParams, 'userId'>) {
    const promises = users.map(userId => this.send({ ...params, userId }));
    return Promise.all(promises);
  }
};
