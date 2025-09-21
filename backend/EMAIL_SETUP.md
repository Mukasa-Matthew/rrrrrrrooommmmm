# Email Configuration Guide

## Development Mode (Default)
If email credentials are not configured, the system will automatically log temporary credentials to the console instead of sending emails. This is perfect for development and testing.

## Production Email Setup

### Gmail Setup (Recommended)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate an App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
   - Copy the 16-character password

3. **Add to your `.env` file**:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-character-app-password
SMTP_FROM=noreply@ltsportal.com
```

### Other Email Providers

#### Outlook/Hotmail
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
```

#### Yahoo
```env
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_USER=your-email@yahoo.com
SMTP_PASS=your-app-password
```

#### Custom SMTP
```env
SMTP_HOST=your-smtp-server.com
SMTP_PORT=587
SMTP_USER=your-username
SMTP_PASS=your-password
```

## Development Mode Benefits

- **No email setup required** - perfect for development
- **Credentials logged to console** - easy to copy and test
- **No external dependencies** - works offline
- **Safe for testing** - no risk of sending real emails

## Console Output Example

When email is not configured, you'll see output like this:

```
============================================================
📧 EMAIL NOTIFICATION (Development Mode)
============================================================
To: admin@example.com
Subject: Welcome to LTS Portal - Hostel Admin for Example Hostel
============================================================
🔐 TEMPORARY CREDENTIALS:
   Username/Email: admin@example.com
   Password: QuickTiger123
============================================================
📧 In production, this would be sent via email
============================================================
```

## Troubleshooting

### Gmail Authentication Error
- Make sure you're using an **App Password**, not your regular Gmail password
- Ensure 2-Factor Authentication is enabled
- Check that "Less secure app access" is disabled (use App Passwords instead)

### Connection Timeout
- Check your firewall settings
- Verify SMTP host and port are correct
- Try different ports (465 for SSL, 587 for TLS)

### Email Not Received
- Check spam/junk folder
- Verify the recipient email address
- Check SMTP server logs for errors
