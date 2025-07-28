const nodemailer = require('nodemailer');

// Email configuration
const createTransporter = () => {
  // For production, use a real email service like Gmail, SendGrid, etc.
  // For development, we'll use a test transporter or console logging
  
  if (process.env.NODE_ENV === 'production') {
    // Production email configuration
    return nodemailer.createTransport({
      service: 'gmail', // or your preferred email service
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  } else {
    // Development: Create a test transporter or use Ethereal Email
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: 'ethereal.user@ethereal.email',
        pass: 'ethereal.pass'
      }
    });
  }
};

// Send OTP email
const sendOTPEmail = async (email, otp, userName = 'User') => {
  try {
    // For development, we'll just log the OTP to console
    if (process.env.NODE_ENV !== 'production') {
      console.log(`
╔══════════════════════════════════════════════════════════════╗
║                    🔐 PASSWORD RESET OTP                     ║
╠══════════════════════════════════════════════════════════════╣
║ Email: ${email.padEnd(52)} ║
║ OTP:   ${otp.padEnd(52)} ║
║ Valid for: 10 minutes                                        ║
╚══════════════════════════════════════════════════════════════╝
      `);
      return { success: true, messageId: 'console-log-dev' };
    }

    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@excelanalytics.com',
      to: email,
      subject: 'Password Reset OTP - Excel Analytics Platform',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset OTP</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .otp-box { background: white; border: 2px solid #667eea; border-radius: 10px; padding: 20px; text-align: center; margin: 20px 0; }
            .otp-code { font-size: 36px; font-weight: bold; color: #667eea; letter-spacing: 5px; margin: 10px 0; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #6c757d; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Password Reset Request</h1>
              <p>Excel Analytics Platform</p>
            </div>
            <div class="content">
              <h2>Hello ${userName}!</h2>
              <p>You have requested to reset your password. Please use the following One-Time Password (OTP) to proceed:</p>
              
              <div class="otp-box">
                <p style="margin: 0; color: #6c757d;">Your OTP Code:</p>
                <div class="otp-code">${otp}</div>
                <p style="margin: 0; color: #6c757d; font-size: 14px;">Valid for 10 minutes</p>
              </div>
              
              <div class="warning">
                <strong>⚠️ Security Notice:</strong>
                <ul style="margin: 10px 0;">
                  <li>This OTP is valid for 10 minutes only</li>
                  <li>Do not share this code with anyone</li>
                  <li>If you didn't request this, please ignore this email</li>
                  <li>Your account remains secure</li>
                </ul>
              </div>
              
              <p>If you have any issues, please contact our support team.</p>
              
              <div class="footer">
                <p>Best regards,<br>Excel Analytics Platform Team</p>
                <p style="font-size: 12px; color: #adb5bd;">
                  This is an automated message. Please do not reply to this email.
                </p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Password Reset OTP - Excel Analytics Platform
        
        Hello ${userName}!
        
        You have requested to reset your password. Please use the following OTP to proceed:
        
        OTP: ${otp}
        
        This OTP is valid for 10 minutes only.
        
        Security Notice:
        - Do not share this code with anyone
        - If you didn't request this, please ignore this email
        - Your account remains secure
        
        Best regards,
        Excel Analytics Platform Team
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('OTP email sent successfully:', info.messageId);
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending OTP email:', error);
    throw new Error('Failed to send OTP email');
  }
};

// Send password reset confirmation email
const sendPasswordResetConfirmation = async (email, userName = 'User') => {
  try {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`
╔══════════════════════════════════════════════════════════════╗
║                PASSWORD RESET CONFIRMATION                   ║
╠══════════════════════════════════════════════════════════════╣
║ Email: ${email.padEnd(52)} ║
║ Status: Password successfully reset                          ║
╚══════════════════════════════════════════════════════════════╝
      `);
      return { success: true, messageId: 'console-log-dev' };
    }

    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@excelanalytics.com',
      to: email,
      subject: 'Password Successfully Reset - Excel Analytics Platform',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset Confirmation</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .success-box { background: #d4edda; border: 1px solid #c3e6cb; padding: 20px; border-radius: 10px; text-align: center; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #6c757d; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Password Reset Successful</h1>
              <p>Excel Analytics Platform</p>
            </div>
            <div class="content">
              <h2>Hello ${userName}!</h2>
              
              <div class="success-box">
                <h3 style="color: #155724; margin-top: 0;">🎉 Success!</h3>
                <p style="margin-bottom: 0; color: #155724;">Your password has been successfully reset.</p>
              </div>
              
              <p>You can now log in to your account using your new password.</p>
              
              <p>If you didn't make this change or if you suspect any unauthorized access to your account, please contact our support team immediately.</p>
              
              <div class="footer">
                <p>Best regards,<br>Excel Analytics Platform Team</p>
                <p style="font-size: 12px; color: #adb5bd;">
                  This is an automated message. Please do not reply to this email.
                </p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset confirmation email sent:', info.messageId);
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending confirmation email:', error);
    // Don't throw error for confirmation email as password reset was successful
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendOTPEmail,
  sendPasswordResetConfirmation
};
