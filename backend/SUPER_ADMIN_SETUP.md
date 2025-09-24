# Super Admin Setup Guide

## 🚀 **Default Credentials**

When you deploy your backend, the system will create a default Super Admin with these credentials:

### **Default Login**
- **Email**: `matthewmukasa0@gmail.com`
- **Username**: `matthewmukasa0`
- **Password**: `1100211Matt.`
- **Name**: `Matthew Mukasa`

## ⚙️ **Setup Process**

### **1. Environment Variables (Optional)**
You can customize the default credentials by setting these environment variables:

```bash
# Custom Super Admin Credentials (Optional - defaults are already set)
SUPER_ADMIN_EMAIL=matthewmukasa0@gmail.com
SUPER_ADMIN_USERNAME=matthewmukasa0
SUPER_ADMIN_PASSWORD=1100211Matt.
SUPER_ADMIN_NAME=Matthew Mukasa
```

### **2. Run Setup Script**
After deployment, run the setup script:

```bash
npm run setup:super-admin
```

### **3. First Login**
1. Go to your deployed frontend
2. Login with the default credentials
3. **IMMEDIATELY** change the password, email, and username

## 🔐 **Super Admin Privileges**

### **What Super Admin Can Do:**
- ✅ **Change Email** - Only role that can modify email
- ✅ **Change Username** - Update username anytime
- ✅ **Change Password** - Update password anytime
- ✅ **Create Hostels** - Add new hostels to the platform
- ✅ **View All Hostels** - Access all hostel data
- ✅ **Platform Analytics** - View system-wide statistics
- ✅ **Manage Universities** - Add/edit universities

### **Security Features:**
- 🔒 **Strong Password Requirements**
- 🔒 **JWT Token Authentication**
- 🔒 **Rate Limiting Protection**
- 🔒 **Input Validation**

## 🚨 **Security Best Practices**

### **After First Login:**
1. **Change Default Password** - Use a strong, unique password
2. **Update Email** - Use your actual email address
3. **Change Username** - Use a professional username
4. **Enable 2FA** - If available in future updates

### **Password Requirements:**
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character

## 📋 **Deployment Checklist**

- [ ] Deploy backend
- [ ] Set environment variables (optional)
- [ ] Run `npm run setup:super-admin`
- [ ] Test login with default credentials
- [ ] Change all default credentials
- [ ] Verify email change functionality
- [ ] Test username change functionality
- [ ] Test password change functionality

## 🔄 **Reset Super Admin (If Needed)**

If you need to reset the Super Admin:

```bash
# Delete existing super admin
npm run purge

# Create new super admin
npm run setup:super-admin
```

## ⚠️ **Important Notes**

1. **Default credentials are temporary** - Change them immediately
2. **Only Super Admin can change email** - This is by design
3. **Keep credentials secure** - Don't share default login info
4. **Backup your database** - Before making changes

## 🎯 **Ready for Production**

Your Super Admin setup is production-ready with:
- ✅ Secure default credentials
- ✅ Easy customization via environment variables
- ✅ Full profile management capabilities
- ✅ Security best practices
- ✅ Reset functionality

**Next Step**: Deploy and run the setup script! 🚀
