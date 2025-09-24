import express from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { UserModel } from '../models/User';
import { EmailService } from '../services/emailService';
import fetch from 'node-fetch';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import pool from '../config/database';

const router = express.Router();

// Configure multer for profile picture uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/profile-pictures');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `profile-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed!'));
    }
  }
});

// Helper function to get user from token
function getToken(req: express.Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

function verifyToken(token: string): any {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
  } catch {
    return null;
  }
}

async function verifyTurnstile(token: string, remoteip?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (process.env.DISABLE_TURNSTILE === 'true') return true; // Explicitly disabled
  if (!secret) return true; // Skip if not configured
  try {
    const form = new URLSearchParams();
    form.append('secret', secret);
    form.append('response', token);
    if (remoteip) form.append('remoteip', remoteip);
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString()
    });
    const data: any = await res.json();
    return !!data.success;
  } catch {
    return false;
  }
}

// Login endpoint (accepts email or username as identifier)
router.post('/login', async (req, res) => {
  try {
    const { identifier, password, cf_turnstile_token } = req.body as any;
    if (!identifier || !password) return res.status(400).json({ success: false, message: 'Missing credentials' });

    // Turnstile check (if configured)
    const ok = await verifyTurnstile(cf_turnstile_token, req.ip);
    if (!ok) return res.status(400).json({ success: false, message: 'Captcha verification failed' });

    const userByEmail = await UserModel.findByEmail(identifier);
    const user = userByEmail || await UserModel.findByUsername(identifier);
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    // Enforce subscription status for hostel_admin and custodian
    let subscriptionWarningDays: number | null = null;
    if ((user.role === 'hostel_admin' || user.role === 'custodian') && user.hostel_id) {
      // Fetch current or latest subscription for the user's hostel
      const subResult = await pool.query(
        `SELECT hs.id, hs.status, hs.end_date
         FROM hostels h
         LEFT JOIN hostel_subscriptions hs ON h.current_subscription_id = hs.id
         WHERE h.id = $1`,
        [user.hostel_id]
      );

      let sub = subResult.rows[0];
      if (!sub) {
        // Fallback: latest subscription by end_date
        const fallback = await pool.query(
          `SELECT id, status, end_date
           FROM hostel_subscriptions
           WHERE hostel_id = $1
           ORDER BY end_date DESC
           LIMIT 1`,
          [user.hostel_id]
        );
        sub = fallback.rows[0];
      }

      if (sub) {
        const endDate = sub.end_date ? new Date(sub.end_date) : null;
        const now = new Date();
        const msPerDay = 1000 * 60 * 60 * 24;
        const daysLeft = endDate ? Math.ceil((endDate.getTime() - now.getTime()) / msPerDay) : -1;

        // Block login if expired or status not active
        if (sub.status !== 'active' || !endDate || endDate < now) {
          return res.status(403).json({
            success: false,
            message: 'This hostel\'s subscription has expired. Please contact the Super Admin to renew your subscription.',
            code: 'SUBSCRIPTION_EXPIRED'
          });
        }

        // Warn if <= 30 days remain
        if (daysLeft <= 30) {
          subscriptionWarningDays = daysLeft;
        }
      } else {
        // No subscription found at all -> block login
        return res.status(403).json({
          success: false,
          message: 'This hostel has no active subscription. Please contact the Super Admin to subscribe.',
          code: 'SUBSCRIPTION_MISSING'
        });
      }
    }

    const token = jwt.sign({ userId: user.id, role: user.role, hostel_id: user.hostel_id || null }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '12h' });

    res.json({ success: true, token, user: { id: user.id, email: user.email, name: user.name, role: user.role, hostel_id: user.hostel_id || null },
      warning: subscriptionWarningDays !== null ? { type: 'subscription_expiring', daysLeft: subscriptionWarningDays } : undefined
    });
  } catch (e) {
    console.error('Login error:', e);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});
// Change username
router.post('/change-username', async (req, res) => {
  try {
    const { newUsername } = req.body;
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    if (!newUsername || newUsername.length < 3 || newUsername.length > 30) {
      return res.status(400).json({ success: false, message: 'Username must be 3-30 characters' });
    }

    // Verify token and get user
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as any;

    // Check uniqueness (case-insensitive)
    const existing = await UserModel.findByUsername(newUsername);
    if (existing && existing.id !== decoded.userId) {
      return res.status(400).json({ success: false, message: 'Username already taken' });
    }

    const updated = await UserModel.update(decoded.userId, { username: newUsername });
    if (!updated) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, message: 'Username changed successfully', data: { username: updated.username } });
  } catch (error) {
    console.error('Change username error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Get current user endpoint
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'No token provided' 
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as any;
    
    // Get user data
    const user = await UserModel.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          hostel_id: user.hostel_id || null
        }
      }
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(401).json({ 
      success: false, 
      message: 'Invalid token' 
    });
  }
});

// Logout endpoint (client-side token removal)
router.post('/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Logout successful'
  });
});

// Change password
router.post('/change-password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    // Verify token and get user
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const user = await UserModel.findByIdWithPassword(decoded.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    const updateData = { password: hashedNewPassword };
    await UserModel.update(decoded.userId, updateData);

    // Send confirmation email
    try {
      const emailHtml = EmailService.generatePasswordChangeConfirmationEmail(
        user.name,
        user.email,
        new Date().toLocaleString()
      );

      await EmailService.sendEmail({
        to: user.email,
        subject: 'Password Changed - LTS Portal',
        html: emailHtml
      });
    } catch (emailError) {
      console.error('Error sending password change confirmation email:', emailError);
      // Don't fail the request if email fails
    }

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Upload profile picture endpoint
router.post('/upload-profile-picture', upload.single('profilePicture'), async (req, res) => {
  try {
    const token = getToken(req);
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // Update user profile picture path in database
    const profilePicturePath = `/uploads/profile-pictures/${req.file.filename}`;
    await UserModel.update(decoded.userId, { profile_picture: profilePicturePath });

    res.json({
      success: true,
      message: 'Profile picture uploaded successfully',
      profilePicture: profilePicturePath
    });
  } catch (error) {
    console.error('Profile picture upload error:', error);
    res.status(500).json({ success: false, message: 'Failed to upload profile picture' });
  }
});

// Get user profile endpoint
router.get('/profile', async (req, res) => {
  try {
    const token = getToken(req);
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    const user = await UserModel.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        hostel_id: user.hostel_id,
        profile_picture: user.profile_picture
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, message: 'Failed to get profile' });
  }
});

// Update user profile endpoint
router.put('/profile', async (req, res) => {
  try {
    const token = getToken(req);
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    const { name, username } = req.body;
    
    // Only super admin can change email
    const updateData: any = { name };
    if (username !== undefined) {
      updateData.username = username;
    }

    // If user is not super admin, don't allow email changes
    if (decoded.role !== 'super_admin' && req.body.email) {
      return res.status(403).json({ 
        success: false, 
        message: 'Only super admin can change email address' 
      });
    }

    // If user is super admin and email is provided, allow it
    if (decoded.role === 'super_admin' && req.body.email) {
      updateData.email = req.body.email;
    }

    const updatedUser = await UserModel.update(decoded.userId, updateData);
    
    if (!updatedUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        hostel_id: updatedUser.hostel_id,
        profile_picture: updatedUser.profile_picture
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
});

// Delete profile picture endpoint
router.delete('/profile-picture', async (req, res) => {
  try {
    const token = getToken(req);
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    const user = await UserModel.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Delete the file if it exists
    if (user.profile_picture) {
      const filePath = path.join(__dirname, '../../', user.profile_picture);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Update database to remove profile picture
    await UserModel.update(decoded.userId, { profile_picture: null });

    res.json({
      success: true,
      message: 'Profile picture deleted successfully'
    });
  } catch (error) {
    console.error('Delete profile picture error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete profile picture' });
  }
});

export default router;
