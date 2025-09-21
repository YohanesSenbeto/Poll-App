const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

async function testResend() {
  try {
    console.log('Testing Resend API connection...');

    const result = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: 'jonicasenbet@gmail.com',
      subject: 'Test Email from Poll App',
      html: `
        <h1>Test Email</h1>
        <p>This is a test email to verify the Resend API is working correctly.</p>
        <p>If you receive this email, the API key is valid and the service is working!</p>
      `,
    });

    if (result.error) {
      console.error('Resend API Error:', result.error);
      return;
    }

    console.log('✅ Email sent successfully!');
    console.log('Email ID:', result.data.id);
  } catch (error) {
    console.error('❌ Error sending email:', error);
  }
}

testResend();
