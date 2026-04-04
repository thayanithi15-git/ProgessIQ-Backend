import nodemailer from 'nodemailer';
import Notification from '../models/Notification';
import User from '../models/User';
import Student from '../models/Student';
import Mentor from '../models/Mentor';
import MentorStudentMapping from '../models/MentorStudentMapping';
import dotenv from 'dotenv';

dotenv.config();

console.log("EMAIL_USER:", process.env.EMAIL_USER);
console.log("EMAIL_PASS:", process.env.EMAIL_PASS ? "Loaded" : "Missing");

// Create reusable transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
  // service: 'gmail', 
  // You can change this to any SMTP provider
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
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
        console.log(`[NotificationService] Attempting to send email for notification '${params.title}' to userId: ${params.userId}`);
        const user = await User.findById(params.userId);

        if (!user || !user.email) {
          console.warn(`[NotificationService] Emal send skipped: User not found or has no email for userId: ${params.userId}`);
        } else {
          const student = await Student.findOne({ userId: params.userId });
          const studentName = student ? `${student.firstName} ${student.lastName}` : ((user as any).name || 'Student');
          const studentPhone = student?.phone || 'Not provided';
          
          // Fetch mentor mapping
          let mentorName = 'Not assigned';
          let mentorEmail = 'N/A';
          let mentorPhone = 'N/A';
          
          if (student) {
            const mapping = await MentorStudentMapping.findOne({ studentId: student._id, isActive: true }).populate('mentorId');
            if (mapping && mapping.mentorId) {
              const mentor = mapping.mentorId as any; 
              mentorName = mentor.name || 'Unknown Mentor';
              mentorEmail = mentor.email || 'N/A';
              mentorPhone = mentor.contactNo || 'N/A';
            }
          }

          if (!process.env.EMAIL_PASS || process.env.EMAIL_PASS === 'password_here') {
            console.warn(`[NotificationService] WARNING: Using default/missing EMAIL_PASS in .env. Email to ${user.email} will likely fail auth.`);
          }

          // Determine the final link to use in the email
          let finalLink = params.link;
          if (!finalLink) {
            const baseUrl = 'https://progress-iq.vercel.app/student/dashboard';
            switch (params.type) {
              case 'PROJECT':
                finalLink = `${baseUrl}/projects`;
                break;
              case 'TASK':
                finalLink = `${baseUrl}/tasks`;
                break;
              case 'SURVEY':
                finalLink = `${baseUrl}/surveys`;
                break;
              case 'INFO':
              case 'SUCCESS':
              case 'WARNING':
              case 'ERROR':
              case 'POINTS':
              default:
                finalLink = baseUrl;
                break;
            }
            // Check for internships/certifications specifically if type is somehow mapped or we use default
            if (params.title.toLowerCase().includes('internship')) finalLink = `${baseUrl}/internships`;
            if (params.title.toLowerCase().includes('certificat')) finalLink = `${baseUrl}/certifications`;
          } else if (finalLink.startsWith('/')) {
            // If internal route is passed like '/student/dashboard/...', prepend the domain
            finalLink = `https://progress-iq.vercel.app${finalLink}`;
          }

          const mailOptions = {
            from: `"ProgressIQ Reminders" <${process.env.EMAIL_USER || 'noreply@progressiq.com'}>`,
            to: user.email,
            subject: `[Reminder] ${params.title}`,
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <style>
                  body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb; margin: 0; padding: 0; }
                  .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }
                  .header { padding: 32px; text-align: center; border-bottom: 1px solid #f3f4f6; }
                  .logo { font-size: 24px; font-weight: 800; color: #111827; letter-spacing: -0.025em; display: flex; align-items: center; justify-content: center; }
                  .logo span { color: #4f46e5; margin-left: 4px; }
                  .content { padding: 40px; }
                  .greeting { font-size: 18px; font-weight: 600; color: #111827; margin-bottom: 16px; }
                  .message { font-size: 16px; color: #4b5563; line-height: 1.6; margin-bottom: 32px; }
                  .details-card { background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 32px; overflow: hidden; }
                  .details-header { background-color: #f9fafb; padding: 12px 20px; border-bottom: 1px solid #e5e7eb; font-size: 14px; font-weight: 700; color: #374151; text-transform: uppercase; letter-spacing: 0.05em; }
                  .details-row { display: flex; border-bottom: 1px solid #f3f4f6; padding: 14px 20px; }
                  .details-row:last-child { border-bottom: none; }
                  .details-label { width: 140px; font-size: 14px; color: #6b7280; flex-shrink: 0; }
                  .details-value { font-size: 14px; color: #111827; font-weight: 600; }
                  .btn-container { text-align: center; margin-top: 8px; }
                  .btn { display: inline-block; background-color: #111827; color: #ffffff !important; padding: 14px 32px; border-radius: 8px; font-size: 15px; font-weight: 600; text-decoration: none; transition: all 0.2s; }
                  .footer { background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #f3f4f6; }
                  .footer-text { font-size: 13px; color: #9ca3af; margin-bottom: 8px; }
                  .mentor-info { font-size: 14px; color: #4b5563; margin-top: 24px; padding-top: 24px; border-top: 1px dotted #e5e7eb; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <div class="logo">Progress<span>IQ</span></div>
                  </div>
                  <div class="content">
                    <div class="greeting">Dear ${studentName},</div>
                    <p class="message">
                      This is a reminder regarding your upcoming deadline. Please ensure you complete and submit your work through the portal before the deadline to maintain your progress.
                    </p>
                    
                    <div class="details-card">
                      <div class="details-header">Deadline Details</div>
                      <div class="details-row">
                        <div class="details-label">Position/Item</div>
                        <div class="details-value">${params.title.replace('Deadline:', '').trim()}</div>
                      </div>
                      <div class="details-row">
                        <div class="details-label">Type</div>
                        <div class="details-value">${params.type}</div>
                      </div>
                      <div class="details-row">
                        <div class="details-label">Deadline</div>
                        <div class="details-value">${params.message.includes('tomorrow') ? 'Tomorrow' : 'In 2 days'} (${new Date(new Date().setDate(new Date().getDate() + (params.message.includes('tomorrow') ? 1 : 2))).toLocaleDateString('en-GB')})</div>
                      </div>
                    </div>

                    <div class="btn-container">
                      <a href="${finalLink}" class="btn">View Assignment</a>
                    </div>

                    <div class="mentor-info">
                      <strong>Mentor Contact:</strong><br/>
                      ${mentorName} (${mentorEmail})<br/>
                      Phone: ${mentorPhone}
                    </div>
                  </div>
                  <div class="footer">
                    <div class="footer-text">ProgressIQ • Advanced Intern Management System</div>
                    <div class="footer-text">This is an automated message, please do not reply.</div>
                  </div>
                </div>
              </body>
              </html>
            `
          };

          // Send mail and log response
          console.log(`[NotificationService] Dispatching email to: ${user.email}...`);
          transporter.sendMail(mailOptions)
            .then((info) => {
              console.log(`[NotificationService] SUCCESS: Email sent to ${user.email}. Message ID: ${info.messageId}`);
            })
            .catch(err => {
              console.error(`[NotificationService] ERROR: Failed to send email to ${user.email}. Reason:`, err.message || err);
            });
        }
      }

      return notification;
    } catch (error: any) {
      console.error('[NotificationService] Fatal error sending notification:', error.message || error);
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
