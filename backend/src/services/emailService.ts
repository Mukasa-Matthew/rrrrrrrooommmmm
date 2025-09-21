import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private static transporter: nodemailer.Transporter;

  static initialize() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  static async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      // Check if email is configured
      if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.log('📧 Email not configured - credentials will be logged instead');
        this.logCredentialsToConsole(options);
        return true; // Return true to not break the flow
      }

      if (!this.transporter) {
        this.initialize();
      }

      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('📧 Email sent successfully:', result.messageId);
      return true;
    } catch (error) {
      console.error('📧 Email sending failed:', error);
      console.log('📧 Falling back to console logging...');
      this.logCredentialsToConsole(options);
      return true; // Return true to not break the flow
    }
  }

  static logCredentialsToConsole(options: EmailOptions) {
    console.log('\n' + '='.repeat(60));
    console.log('📧 EMAIL NOTIFICATION (Development Mode)');
    console.log('='.repeat(60));
    console.log(`To: ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    console.log('='.repeat(60));
    
    // Extract credentials from HTML if it's a welcome email
    if (options.html.includes('Temporary Login Credentials')) {
      const usernameMatch = options.html.match(/Username\/Email:<\/span>\s*<span[^>]*>([^<]+)<\/span>/);
      const passwordMatch = options.html.match(/Temporary Password:<\/span>\s*<span[^>]*>([^<]+)<\/span>/);
      
      if (usernameMatch && passwordMatch) {
        console.log('🔐 TEMPORARY CREDENTIALS:');
        console.log(`   Username/Email: ${usernameMatch[1]}`);
        console.log(`   Password: ${passwordMatch[1]}`);
        console.log('='.repeat(60));
      }
    }
    
    console.log('📧 In production, this would be sent via email');
    console.log('='.repeat(60) + '\n');
  }

  static generateHostelAdminWelcomeEmail(
    adminName: string,
    adminEmail: string,
    temporaryUsername: string,
    temporaryPassword: string,
    hostelName: string,
    loginUrl: string
  ): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to LTS Portal - Hostel Admin</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
          }
          .content {
            background: #f9f9f9;
            padding: 30px;
            border-radius: 0 0 10px 10px;
          }
          .credentials-box {
            background: #fff;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
          }
          .credential-item {
            display: flex;
            justify-content: space-between;
            margin: 10px 0;
            padding: 10px;
            background: #f5f5f5;
            border-radius: 5px;
          }
          .credential-label {
            font-weight: bold;
            color: #555;
          }
          .credential-value {
            font-family: monospace;
            background: #e8f4f8;
            padding: 5px 10px;
            border-radius: 3px;
            color: #2c5aa0;
          }
          .button {
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
            font-weight: bold;
          }
          .warning {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            color: #856404;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            color: #666;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🏠 Welcome to LTS Portal</h1>
          <p>Your Hostel Admin Account is Ready!</p>
        </div>
        
        <div class="content">
          <h2>Hello ${adminName}!</h2>
          
          <p>Congratulations! You have been appointed as the Hostel Administrator for <strong>${hostelName}</strong> on the LTS Portal.</p>
          
          <p>Your account has been created and you can now access your admin dashboard using the temporary credentials below:</p>
          
          <div class="credentials-box">
            <h3>🔐 Your Temporary Login Credentials</h3>
            <div class="credential-item">
              <span class="credential-label">Username/Email:</span>
              <span class="credential-value">${temporaryUsername}</span>
            </div>
            <div class="credential-item">
              <span class="credential-label">Temporary Password:</span>
              <span class="credential-value">${temporaryPassword}</span>
            </div>
          </div>
          
          <div class="warning">
            <strong>⚠️ Important Security Notice:</strong>
            <ul>
              <li>This is a temporary password that you must change immediately after your first login</li>
              <li>Do not share these credentials with anyone</li>
              <li>For security reasons, please change your password as soon as possible</li>
            </ul>
          </div>
          
          <p>Click the button below to access your admin dashboard:</p>
          <a href="${loginUrl}" class="button">Access Admin Dashboard</a>
          
          <h3>What's Next?</h3>
          <ol>
            <li>Log in using your temporary credentials</li>
            <li>Change your password to something secure and memorable</li>
            <li>Explore your admin dashboard and configure your hostel settings</li>
            <li>Start managing your hostel operations</li>
          </ol>
          
          <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
          
          <p>Welcome aboard!</p>
          <p><strong>The LTS Portal Team</strong></p>
        </div>
        
        <div class="footer">
          <p>This email was sent automatically. Please do not reply to this email.</p>
          <p>© 2024 LTS Portal. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;
  }

  static generatePasswordChangeConfirmationEmail(
    adminName: string,
    adminEmail: string,
    changeTime: string
  ): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Changed - LTS Portal</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
          }
          .content {
            background: #f9f9f9;
            padding: 30px;
            border-radius: 0 0 10px 10px;
          }
          .success-box {
            background: #d4edda;
            border: 1px solid #c3e6cb;
            color: #155724;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            color: #666;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🔒 Password Changed Successfully</h1>
        </div>
        
        <div class="content">
          <h2>Hello ${adminName}!</h2>
          
          <div class="success-box">
            <strong>✅ Your password has been successfully changed!</strong>
          </div>
          
          <p>This is to confirm that your password was changed on <strong>${changeTime}</strong>.</p>
          
          <p>If you did not make this change, please contact our support team immediately.</p>
          
          <p>Thank you for keeping your account secure!</p>
          
          <p><strong>The LTS Portal Team</strong></p>
        </div>
        
        <div class="footer">
          <p>This email was sent automatically. Please do not reply to this email.</p>
          <p>© 2024 LTS Portal. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;
  }
}
