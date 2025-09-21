# Quick Email Setup Guide

## 🚀 Get Email Working in 5 Minutes

### Step 1: Gmail Setup (Recommended)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password**:
   - Go to [Google Account Settings](https://myaccount.google.com/)
   - Security → 2-Step Verification → App passwords
   - Select "Mail" and generate password
   - Copy the 16-character password (e.g., `abcd efgh ijkl mnop`)

### Step 2: Create .env File

Create a `.env` file in your `backend` folder with:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=lts_portal
DB_USER=postgres
DB_PASSWORD=your_password_here

# JWT Configuration
JWT_SECRET=your_jwt_secret_here

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-character-app-password
SMTP_FROM=noreply@ltsportal.com

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Server Configuration
PORT=5000
```

### Step 3: Restart Server

```bash
# Stop the current server (Ctrl+C)
# Then restart
npm run dev
```

### Step 4: Test Email

1. Create a new hostel with an admin
2. Check if email is received
3. If not, check server console for any errors

## 🔧 Troubleshooting

### Gmail Authentication Error
- Make sure you're using **App Password**, not regular password
- Ensure 2FA is enabled
- Check that "Less secure app access" is **disabled**

### Email Not Received
- Check spam/junk folder
- Verify the recipient email address
- Check server console for errors

### Connection Issues
- Check firewall settings
- Try different ports (465 for SSL, 587 for TLS)
- Verify SMTP settings

## 📧 Alternative Email Providers

### Outlook/Hotmail
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
```

### Yahoo
```env
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_USER=your-email@yahoo.com
SMTP_PASS=your-app-password
```

## 🎯 What Happens After Setup

- ✅ Hostel creation sends welcome emails
- ✅ Resend credentials button works
- ✅ Password change confirmations sent
- ✅ Professional email templates
- ✅ No more console logging fallback

## 🆘 Still Having Issues?

1. Check server console for error messages
2. Verify .env file is in the correct location
3. Make sure server was restarted after .env changes
4. Test with a simple email first
