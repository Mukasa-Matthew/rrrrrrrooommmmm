# 📧 Email Configuration Setup

To enable real email sending (instead of console logging), you need to create a `.env` file in the backend directory with the following configuration:

## Step 1: Create .env file

Create a file named `.env` in the `backend` directory with this content:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=lts_portal
DB_USER=postgres
DB_PASSWORD=your_postgres_password_here

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_random

# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password_here
SMTP_FROM=LTS Portal <your_email@gmail.com>

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Server Configuration
PORT=5000
NODE_ENV=development
```

## Step 2: Gmail Setup (Recommended)

### Option A: Gmail with App Password (Recommended)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate an App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
   - Use this 16-character password in `SMTP_PASS`

3. **Update your .env file**:
   ```env
   SMTP_USER=your_gmail@gmail.com
   SMTP_PASS=your_16_character_app_password
   SMTP_FROM=LTS Portal <your_gmail@gmail.com>
   ```

### Option B: Other Email Providers

#### Outlook/Hotmail
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your_email@outlook.com
SMTP_PASS=your_password
```

#### Yahoo
```env
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_USER=your_email@yahoo.com
SMTP_PASS=your_app_password
```

## Step 3: Test Email Configuration

After setting up your `.env` file, restart the backend server:

```bash
cd backend
npm run dev
```

## Step 4: Test Email Sending

1. **Create a new hostel** - This will send a welcome email to the hostel admin
2. **Change password** - This will send a confirmation email
3. **Resend credentials** - This will send new credentials via email

## Email Types Sent

### 1. Hostel Admin Welcome Email
- **When**: When super admin creates a new hostel and admin
- **Contains**: Temporary login credentials
- **Recipient**: Hostel admin email

### 2. Password Change Confirmation
- **When**: When any user changes their password
- **Contains**: Confirmation of password change
- **Recipient**: User's email

### 3. Credentials Resend
- **When**: When super admin clicks "Resend Credentials"
- **Contains**: New temporary credentials
- **Recipient**: Hostel admin email

## Troubleshooting

### Common Issues:

1. **"Invalid login" error**:
   - Make sure 2FA is enabled on Gmail
   - Use App Password, not your regular password
   - Check that SMTP_USER is your full email address

2. **"Connection timeout"**:
   - Check your internet connection
   - Verify SMTP_HOST and SMTP_PORT are correct
   - Some networks block SMTP ports

3. **Emails not received**:
   - Check spam/junk folder
   - Verify the recipient email address is correct
   - Check server logs for error messages

### Development Mode

If email configuration fails, the system will automatically fall back to console logging. You'll see messages like:

```
📧 EMAIL NOTIFICATION (Development Mode)
============================================================
To: admin@example.com
Subject: Welcome to LTS Portal - Hostel Admin
🔐 TEMPORARY CREDENTIALS:
   Username/Email: admin@example.com
   Password: QuickTiger123
============================================================
```

## Security Notes

- Never commit your `.env` file to version control
- Use App Passwords instead of your main email password
- Consider using a dedicated email account for the application
- Regularly rotate your email credentials
