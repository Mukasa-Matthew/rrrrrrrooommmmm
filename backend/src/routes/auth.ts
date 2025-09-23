import express from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { UserModel } from '../models/User';
import { EmailService } from '../services/emailService';
import fetch from 'node-fetch';

const router = express.Router();

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

    const token = jwt.sign({ userId: user.id, role: user.role, hostel_id: user.hostel_id || null }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '12h' });

    res.json({ success: true, token, user: { id: user.id, email: user.email, name: user.name, role: user.role, hostel_id: user.hostel_id || null } });
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

export default router;
