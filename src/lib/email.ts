import { Resend } from 'resend';

// Lazy-load Resend client to avoid build errors when API key is not available
let resend: Resend | null = null;

function getResend(): Resend {
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

export async function sendPasswordResetEmail(email: string, code: string) {
  try {
    const { data, error } = await getResend().emails.send({
      from: 'WallStreetStocks <noreply@wallstreetstocks.ai>',
      to: email,
      subject: 'Reset Your Password - WallStreetStocks',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            
            <!-- Header -->
            <div style="background-color: #0dd977; padding: 32px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">WallStreetStocks</h1>
            </div>
            
            <!-- Content -->
            <div style="padding: 40px 32px;">
              <h2 style="color: #333333; margin: 0 0 16px 0; font-size: 24px;">Reset Your Password</h2>
              
              <p style="color: #666666; font-size: 16px; line-height: 24px; margin: 0 0 24px 0;">
                We received a request to reset your password. Use the code below to reset it. This code will expire in 15 minutes.
              </p>
              
              <!-- Code Box -->
              <div style="background-color: #f8f9fa; border: 2px dashed #0dd977; border-radius: 8px; padding: 24px; text-align: center; margin: 0 0 24px 0;">
                <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #333333;">${code}</span>
              </div>
              
              <p style="color: #666666; font-size: 14px; line-height: 22px; margin: 0 0 24px 0;">
                If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
              </p>
              
              <p style="color: #999999; font-size: 12px; margin: 0;">
                This code expires in 15 minutes.
              </p>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f8f9fa; padding: 24px 32px; text-align: center; border-top: 1px solid #eeeeee;">
              <p style="color: #999999; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} WallStreetStocks. All rights reserved.
              </p>
            </div>
            
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('Resend error:', error);
      throw new Error('Failed to send email');
    }

    console.log('Email sent:', data);
    return data;
  } catch (error) {
    console.error('Email error:', error);
    throw error;
  }
}

export async function sendWelcomeEmail(email: string, name: string) {
  try {
    const { data, error } = await getResend().emails.send({
      from: 'WallStreetStocks <noreply@wallstreetstocks.ai>',
      to: email,
      subject: 'Welcome to WallStreetStocks! 🚀',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            
            <!-- Header -->
            <div style="background-color: #0dd977; padding: 32px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🎉 Welcome!</h1>
            </div>
            
            <!-- Content -->
            <div style="padding: 40px 32px;">
              <h2 style="color: #333333; margin: 0 0 16px 0; font-size: 24px;">Hey ${name}!</h2>
              
              <p style="color: #666666; font-size: 16px; line-height: 24px; margin: 0 0 24px 0;">
                Welcome to WallStreetStocks! We're excited to have you on board.
              </p>
              
              <p style="color: #666666; font-size: 16px; line-height: 24px; margin: 0 0 24px 0;">
                With WallStreetStocks, you can:
              </p>
              
              <ul style="color: #666666; font-size: 16px; line-height: 28px; margin: 0 0 24px 0; padding-left: 20px;">
                <li>Track your favorite stocks in real-time</li>
                <li>Get AI-powered market insights</li>
                <li>Join our community of investors</li>
                <li>Stay updated with the latest market news</li>
              </ul>
              
              <p style="color: #666666; font-size: 16px; line-height: 24px; margin: 0;">
                Happy investing!<br>
                <strong>The WallStreetStocks Team</strong>
              </p>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f8f9fa; padding: 24px 32px; text-align: center; border-top: 1px solid #eeeeee;">
              <p style="color: #999999; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} WallStreetStocks. All rights reserved.
              </p>
            </div>
            
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('Resend error:', error);
      return null;
    }

    console.log('Welcome email sent:', data);
    return data;
  } catch (error) {
    console.error('Welcome email error:', error);
    return null;
  }
}
