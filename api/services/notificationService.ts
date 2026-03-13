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
            from: `"College Work - ProgressIQ" <${process.env.EMAIL_USER || 'noreply@progressiq.com'}>`,
            to: user.email,
            subject: `[College Work] ${params.title}`,
            html: `
              <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 650px; margin: 0 auto; border: 1px solid #E5E7EB; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                
                <!-- HEADER -->
                <div style="background-color: #4F46E5; padding: 24px; text-align: center; color: white;">
                  <h1 style="margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 0.5px;">College Work <span style="font-weight: 300;">| ProgressIQ</span></h1>
                  <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">System Notification</p>
                </div>
                
                <div style="padding: 32px 24px;">
                  <p style="font-size: 18px; color: #111827; font-weight: 600; margin-top: 0;">Hello ${studentName},</p>
                  
                  <!-- NOTIFICATION BOX -->
                  <div style="background-color: #F8FAFC; border-left: 4px solid #4F46E5; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
                    <h3 style="margin: 0 0 8px 0; color: #1F2937; font-size: 16px;">${params.title}</h3>
                    <p style="font-size: 15px; color: #4B5563; line-height: 1.6; margin: 0;">${params.message}</p>
                  </div>

                  <!-- CONTACT INFO GRIDS -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 32px;">
                    <tr>
                      <!-- STUDENT INFO -->
                      <td width="50%" valign="top" style="padding-right: 12px;">
                        <h4 style="margin: 0 0 12px 0; color: #374151; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #E5E7EB; padding-bottom: 4px;">Student Details</h4>
                        <p style="margin: 0 0 6px 0; font-size: 14px; color: #4B5563;"><strong>Name:</strong> ${studentName}</p>
                        <p style="margin: 0 0 6px 0; font-size: 14px; color: #4B5563;"><strong>Email:</strong> ${user.email}</p>
                        <p style="margin: 0 0 6px 0; font-size: 14px; color: #4B5563;"><strong>Phone:</strong> ${studentPhone}</p>
                      </td>
                      
                      <!-- MENTOR INFO -->
                      <td width="50%" valign="top" style="padding-left: 12px;">
                        <h4 style="margin: 0 0 12px 0; color: #374151; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #E5E7EB; padding-bottom: 4px;">Mentor Details</h4>
                        <p style="margin: 0 0 6px 0; font-size: 14px; color: #4B5563;"><strong>Name:</strong> ${mentorName}</p>
                        <p style="margin: 0 0 6px 0; font-size: 14px; color: #4B5563;"><strong>Email:</strong> ${mentorEmail}</p>
                        <p style="margin: 0 0 6px 0; font-size: 14px; color: #4B5563;"><strong>Phone:</strong> ${mentorPhone}</p>
                      </td>
                    </tr>
                  </table>

                  ${finalLink ? `
                    <div style="margin-top: 32px; text-align: center;">
                      <p style="margin: 0 0 12px 0; font-size: 14px; color: #4B5563;">See here to get detailed view on our ProgressIQ dashboard:</p>
                      <a href="${finalLink}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; transition: background-color 0.2s;">
                        Go to Dashboard
                      </a>
                    </div>
                  ` : ''}
                  
                  <div style="margin-top: 32px; padding: 16px; background-color: #FEF3C7; border-radius: 8px; border: 1px solid #FDE68A;">
                    <p style="margin: 0; color: #92400E; font-size: 14px; text-align: center; font-weight: 500;">
                      If you have any doubts or questions regarding this update, please contact your mentor using the details provided above.
                    </p>
                  </div>
                </div>
                
                <!-- FOOTER -->
                <div style="background-color: #F8FAFC; padding: 20px; text-align: center; font-size: 12px; color: #64748B; border-top: 1px solid #E5E7EB;">
                  <p style="margin: 0;">This is an automated message regarding your College Work from ProgressIQ. Please do not reply directly to this email.</p>
                </div>
              </div>
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
