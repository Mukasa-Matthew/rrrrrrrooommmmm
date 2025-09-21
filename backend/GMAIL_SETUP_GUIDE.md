# 🔐 Gmail App Password Setup Guide

Your email configuration is set up, but Gmail is rejecting the login because you need to use an **App Password** instead of your regular password.

## 🚨 Current Issue
```
Error: Invalid login: 535-5.7.8 Username and Password not accepted
```

This happens because Gmail requires App Passwords for third-party applications.

## ✅ Quick Fix (5 minutes)

### Step 1: Enable 2-Factor Authentication
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Click **"2-Step Verification"**
3. Follow the setup process (you'll need your phone)

### Step 2: Generate App Password
1. In the same Security page, scroll down to **"App passwords"**
2. Click **"App passwords"**
3. Select **"Mail"** as the app
4. Select **"Other"** as the device and name it "LTS Portal"
5. Click **"Generate"**
6. **Copy the 16-character password** (it looks like: `abcd efgh ijkl mnop`)

### Step 3: Update Your .env File
Open your `backend/.env` file and update the password:

```env
SMTP_PASS=abcd efgh ijkl mnop
```

**Important**: Use the App Password, NOT your regular Gmail password!

### Step 4: Test Again
Run the email test:
```bash
npm run test-email
```

## 🎯 What This Will Enable

Once configured, you'll receive **real emails** for:

### 1. **Hostel Admin Welcome Emails**
- When you create a new hostel
- Contains temporary login credentials
- Sent to the hostel admin's email

### 2. **Password Change Confirmations**
- When anyone changes their password
- Confirmation of successful change
- Security notification

### 3. **Credential Resend**
- When you click "Resend Credentials"
- New temporary password
- Sent to hostel admin

## 📧 Email Examples

### Welcome Email
```
Subject: Welcome to LTS Portal - Hostel Admin for [Hostel Name]

Hello [Admin Name]!

Your hostel, [Hostel Name], has been successfully registered.

🔐 Your Temporary Login Credentials:
Username/Email: admin@example.com
Temporary Password: QuickTiger123

⚠️ Important: Change this password immediately after first login.
```

### Password Change Email
```
Subject: Password Changed - LTS Portal

Hello [Name]!

Your password was successfully changed on [Date/Time].

If you did not make this change, contact support immediately.
```

## 🔧 Alternative: Use a Different Email Provider

If you prefer not to use Gmail, you can use:

### Outlook/Hotmail
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your_email@outlook.com
SMTP_PASS=your_outlook_password
```

### Yahoo
```env
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_USER=your_email@yahoo.com
SMTP_PASS=your_yahoo_app_password
```

## 🚀 After Setup

Once email is working:

1. **Create a new hostel** → Hostel admin gets welcome email
2. **Change password** → You get confirmation email  
3. **Resend credentials** → Hostel admin gets new credentials

## 🆘 Still Having Issues?

1. **Check spam folder** - Emails might be filtered
2. **Verify email address** - Make sure it's correct
3. **Wait a few minutes** - Gmail can be slow
4. **Try a different email** - Test with another provider

The system will continue to work with console logging if email fails, but real emails provide a much better user experience!
