import { NextRequest, NextResponse } from 'next/server';
import { notificationService, testResendConnection } from '@/lib/email';
import { supabase } from '@/lib/supabase';

export async function GET() {
  // Simple health check endpoint
  return NextResponse.json({
    status: 'Email API is accessible',
    message: 'Use POST method to send test emails',
    availableTypes: ['welcome', 'poll-created', 'vote-received', 'admin-alert', 'weekly-digest']
  });
}

export async function POST(request: NextRequest) {
  try {
    const { emailType, userId } = await request.json();

    if (!emailType) {
      return NextResponse.json({ error: 'Email type is required' }, { status: 400 });
    }

    // Test Resend API connection first (optional - skip if connection test fails)
    try {
      const connectionTest = await testResendConnection();
      if (!connectionTest.success) {
        console.warn('Resend API connection test failed, but continuing anyway:', connectionTest.error);
      }
    } catch (error) {
      console.warn('Resend API connection test failed, but continuing anyway:', error);
    }

    // Verify notificationService is available
    if (!notificationService || typeof notificationService.sendWelcomeEmail !== 'function') {
      console.error('notificationService not properly loaded:', typeof notificationService);
      return NextResponse.json({
        error: 'Email service not configured properly',
        details: 'The notification service is not available'
      }, { status: 500 });
    }

    // Get user info for testing
    let userEmail = 'jonicasenbeto@gmail.com'; // 👈 MUST be the same email you used to sign up with Resend
    let userName = 'Yohanes Senbeto Kan';

    if (userId) {
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('id', userId)
        .single();

      if (userProfile) {
        userName = userProfile.full_name || userName;
      }

      // Get auth user email - use this for testing
      const { data: authUser } = await supabase.auth.admin.getUserById(userId);
      if (authUser.user?.email) {
        userEmail = authUser.user.email; // Use the authenticated user's email
      }
    } else {
      // If no userId provided, try to get current session user
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        userEmail = user.email;
        userName = 'Test User';
      }
    }

    // For testing, use the same email as recipient to avoid domain verification issues
    // This is a limitation of Resend's free tier during development
    console.log('Test email will be sent to:', userEmail);

    let success = false;

    switch (emailType) {
      case 'welcome':
        success = await notificationService.sendWelcomeEmail(userEmail, userName);
        break;

      case 'poll-created':
        success = await notificationService.sendPollCreatedEmail(
          userEmail,
          userName,
          'Test Poll Title',
          'test-poll-id-123'
        );
        break;

      case 'vote-received':
        success = await notificationService.sendVoteReceivedEmail(
          userEmail,
          userName,
          'Test Poll Title',
          'test-poll-id-123',
          'Test Voter'
        );
        break;

      case 'admin-alert':
        success = await notificationService.sendAdminAlert(
          userEmail,
          userName,
          'Test Alert',
          'This is a test admin alert for email system testing.'
        );
        break;

      case 'weekly-digest':
        success = await notificationService.sendWeeklyDigest(
          userEmail,
          userName,
          {
            pollsCreated: 3,
            votesCast: 12,
            popularPolls: [
              { title: 'Popular Poll 1', vote_count: 25 },
              { title: 'Popular Poll 2', vote_count: 18 },
              { title: 'Popular Poll 3', vote_count: 15 }
            ]
          }
        );
        break;

      default:
        return NextResponse.json({ error: 'Invalid email type' }, { status: 400 });
    }

    return NextResponse.json({
      success,
      message: success ? 'Email sent successfully' : 'Failed to send email',
      emailType,
      recipient: userEmail
    });

  } catch (error) {
    console.error('Email test error:', error);
    console.error('Full error details:', JSON.stringify(error, null, 2));
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      fullError: JSON.stringify(error, null, 2)
    }, { status: 500 });
  }
}
