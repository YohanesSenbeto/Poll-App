import { Resend } from 'resend';

// Initialize Resend with API key (with fallback handling)
const resendApiKey = process.env.RESEND_API_KEY;

if (!resendApiKey) {
  console.warn('RESEND_API_KEY not found. Email notifications will be disabled.');
}

const resend = resendApiKey ? new Resend(resendApiKey) : null;

/**
 * Test Resend API connection
 */
export async function testResendConnection(): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    return { success: false, error: 'Resend not configured' };
  }

  try {
    // Simple test to verify API key is valid
    const result = await resend.domains.list();
    return { success: true };
  } catch (error) {
    console.error('Resend API test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export interface EmailData {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export interface NotificationPreferences {
  pollCreated: boolean;
  pollVoteReceived: boolean;
  adminAlerts: boolean;
  weeklyDigest: boolean;
}

/**
 * Send email using Resend
 */
export async function sendEmail(emailData: EmailData): Promise<boolean> {
  // Check if Resend is properly configured
  if (!resend) {
    console.warn('Email service not configured. Skipping email send.');
    console.log('Would send email:', {
      to: emailData.to,
      subject: emailData.subject,
      from: emailData.from || 'Poll App <noreply@pollapp.com>'
    });
    return false;
  }

  try {
    const from = emailData.from || 'onboarding@resend.dev'; // Use Resend's default domain

    const result = await resend.emails.send({
      from,
      to: emailData.to,
      subject: emailData.subject,
      html: emailData.html,
    });

    if (result.error) {
      console.error('Email sending failed:', result.error);
      console.error('Full error details:', JSON.stringify(result.error, null, 2));
      return false;
    }

    console.log('Email sent successfully:', result.data);
    return true;
  } catch (error) {
    console.error('Email sending error:', error);
    console.error('Error details:', error instanceof Error ? error.message : String(error));
    return false;
  }
}

/**
 * Email templates for different notification types
 */
export const emailTemplates = {
  /**
   * Welcome email for new users
   */
  welcome: (userEmail: string, userName: string) => ({
    to: userEmail,
    subject: 'Welcome to Poll App!',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Poll App</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin-bottom: 20px;">Welcome to Poll App!</h1>
          <p>Hi ${userName},</p>
          <p>Thank you for joining Poll App! You're now part of a community where you can create polls, vote on interesting topics, and discover what others think.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/polls/create"
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Create Your First Poll
            </a>
          </div>
          <p>Happy polling!</p>
          <p>The Poll App Team</p>
        </div>
        <div style="font-size: 12px; color: #666; text-align: center;">
          <p>You received this email because you signed up for Poll App.</p>
          <p><a href="#">Unsubscribe</a> | <a href="#">Privacy Policy</a></p>
        </div>
      </body>
      </html>
    `,
  }),

  /**
   * Poll creation notification
   */
  pollCreated: (userEmail: string, userName: string, pollTitle: string, pollId: string) => ({
    to: userEmail,
    subject: `Your poll "${pollTitle}" has been created!`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Poll Created Successfully</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 30px;">
          <h1 style="color: #16a34a; margin-bottom: 20px;">Poll Created Successfully!</h1>
          <p>Hi ${userName},</p>
          <p>Your poll <strong>"${pollTitle}"</strong> has been created and is now live!</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/polls/${pollId}"
               style="background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              View Your Poll
            </a>
          </div>
          <p>Share this poll with others and start collecting votes!</p>
          <p>Best regards,<br>The Poll App Team</p>
        </div>
        <div style="font-size: 12px; color: #666; text-align: center;">
          <p><a href="#">Manage Notifications</a> | <a href="#">Privacy Policy</a></p>
        </div>
      </body>
      </html>
    `,
  }),

  /**
   * Vote received notification
   */
  voteReceived: (userEmail: string, userName: string, pollTitle: string, pollId: string, voterName: string) => ({
    to: userEmail,
    subject: `New vote on your poll "${pollTitle}"`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Vote Received</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 30px;">
          <h1 style="color: #dc2626; margin-bottom: 20px;">New Vote Received!</h1>
          <p>Hi ${userName},</p>
          <p>Great news! Your poll <strong>"${pollTitle}"</strong> just received a new vote.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/polls/${pollId}"
               style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              View Results
            </a>
          </div>
          <p>Keep sharing your poll to get more votes!</p>
          <p>Best regards,<br>The Poll App Team</p>
        </div>
        <div style="font-size: 12px; color: #666; text-align: center;">
          <p><a href="#">Manage Notifications</a> | <a href="#">Privacy Policy</a></p>
        </div>
      </body>
      </html>
    `,
  }),

  /**
   * Admin alert for suspicious activity
   */
  adminAlert: (adminEmail: string, adminName: string, alertType: string, details: string) => ({
    to: adminEmail,
    subject: `Admin Alert: ${alertType}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Admin Alert</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #fef2f2; padding: 30px; border-radius: 10px; margin-bottom: 30px; border-left: 4px solid #dc2626;">
          <h1 style="color: #dc2626; margin-bottom: 20px;">⚠️ Admin Alert</h1>
          <p>Dear ${adminName},</p>
          <p><strong>Alert Type:</strong> ${alertType}</p>
          <p><strong>Details:</strong></p>
          <div style="background-color: #f9fafb; padding: 15px; border-radius: 5px; margin: 15px 0;">
            ${details}
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin"
               style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              View Admin Panel
            </a>
          </div>
          <p>Best regards,<br>Poll App System</p>
        </div>
        <div style="font-size: 12px; color: #666; text-align: center;">
          <p>This is an automated admin alert from Poll App.</p>
        </div>
      </body>
      </html>
    `,
  }),

  /**
   * Weekly digest for active users
   */
  weeklyDigest: (userEmail: string, userName: string, stats: { pollsCreated: number, votesCast: number, popularPolls: any[] }) => ({
    to: userEmail,
    subject: 'Your Weekly Poll App Activity Summary',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Weekly Activity Summary</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 30px;">
          <h1 style="color: #7c3aed; margin-bottom: 20px;">📊 Your Weekly Summary</h1>
          <p>Hi ${userName},</p>
          <p>Here's your activity summary for this week:</p>

          <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #7c3aed;">
            <h3 style="margin-top: 0; color: #7c3aed;">Your Stats</h3>
            <ul>
              <li>Polls created: <strong>${stats.pollsCreated}</strong></li>
              <li>Votes cast: <strong>${stats.votesCast}</strong></li>
            </ul>
          </div>

          ${stats.popularPolls && stats.popularPolls.length > 0 ? `
          <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #2563eb;">🔥 Popular Polls This Week</h3>
            ${stats.popularPolls.map(poll => `
              <div style="margin-bottom: 10px; padding: 10px; background-color: #f9fafb; border-radius: 5px;">
                <strong>${poll.title}</strong><br>
                <small style="color: #666;">${poll.vote_count} votes</small>
              </div>
            `).join('')}
          </div>
          ` : ''}

          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/polls/create"
               style="background-color: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin-right: 10px;">
              Create New Poll
            </a>
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/polls"
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Browse Polls
            </a>
          </div>

          <p>Keep engaging with the community!</p>
          <p>Best regards,<br>The Poll App Team</p>
        </div>
        <div style="font-size: 12px; color: #666; text-align: center;">
          <p><a href="#">Manage Notifications</a> | <a href="#">Privacy Policy</a></p>
        </div>
      </body>
      </html>
    `,
  }),
};

/**
 * Notification service functions
 */
export const notificationService = {
  /**
   * Send welcome email to new user
   */
  async sendWelcomeEmail(userEmail: string, userName: string): Promise<boolean> {
    const emailData = emailTemplates.welcome(userEmail, userName);
    return await sendEmail(emailData);
  },

  /**
   * Send poll created notification
   */
  async sendPollCreatedEmail(userEmail: string, userName: string, pollTitle: string, pollId: string): Promise<boolean> {
    const emailData = emailTemplates.pollCreated(userEmail, userName, pollTitle, pollId);
    return await sendEmail(emailData);
  },

  /**
   * Send vote received notification
   */
  async sendVoteReceivedEmail(userEmail: string, userName: string, pollTitle: string, pollId: string, voterName: string): Promise<boolean> {
    const emailData = emailTemplates.voteReceived(userEmail, userName, pollTitle, pollId, voterName);
    return await sendEmail(emailData);
  },

  /**
   * Send admin alert
   */
  async sendAdminAlert(adminEmail: string, adminName: string, alertType: string, details: string): Promise<boolean> {
    const emailData = emailTemplates.adminAlert(adminEmail, adminName, alertType, details);
    return await sendEmail(emailData);
  },

  /**
   * Send weekly digest
   */
  async sendWeeklyDigest(userEmail: string, userName: string, stats: { pollsCreated: number, votesCast: number, popularPolls: any[] }): Promise<boolean> {
    const emailData = emailTemplates.weeklyDigest(userEmail, userName, stats);
    return await sendEmail(emailData);
  },
};
