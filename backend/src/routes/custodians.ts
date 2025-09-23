import express, { Request } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { UserModel } from '../models/User';
import pool from '../config/database';
import { EmailService } from '../services/emailService';
import { CredentialGenerator } from '../utils/credentialGenerator';

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'backend', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req: Request, _file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => cb(null, uploadsDir),
  filename: (_req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ storage });

// List custodians for a hostel
router.get('/', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }
    // Simple decode: we trust auth middleware in real apps; here we query via join on current user
    // Get user via token
    const decoded: any = require('jsonwebtoken').verify(token, process.env.JWT_SECRET || 'fallback_secret');
    const currentUser = await UserModel.findById(decoded.userId);
    if (!currentUser) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Determine target hostel id
    let targetHostelId: number | null = null;
    if (currentUser.role === 'hostel_admin' && currentUser.hostel_id) {
      targetHostelId = currentUser.hostel_id;
    } else if (currentUser.role === 'super_admin') {
      const q = req.query.hostel_id as string | undefined;
      targetHostelId = q ? parseInt(q) : null;
    }

    if (!targetHostelId) {
      return res.status(403).json({ success: false, message: 'Forbidden: missing hostel context' });
    }

    const result = await pool.query(
      `SELECT c.id, u.name, u.email, c.phone, c.location, c.national_id_image_path, c.status, c.created_at
       FROM custodians c
       JOIN users u ON u.id = c.user_id
       WHERE c.hostel_id = $1
       ORDER BY c.created_at DESC`,
      [targetHostelId]
    );
    res.json({ success: true, data: result.rows });
  } catch (e) {
    console.error('List custodians error:', e);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Create custodian with optional national ID image upload
router.post('/', upload.single('national_id_image'), async (req: Request, res) => {
  const client = await pool.connect();
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }
    const decoded: any = require('jsonwebtoken').verify(token, process.env.JWT_SECRET || 'fallback_secret');
    const currentUser = await UserModel.findById(decoded.userId);
    if (!currentUser) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Determine target hostel id
    let targetHostelId: number | null = null;
    if (currentUser.role === 'hostel_admin' && currentUser.hostel_id) {
      targetHostelId = currentUser.hostel_id;
    } else if (currentUser.role === 'super_admin') {
      const q = (req.body as any).hostel_id || (req.query.hostel_id as string | undefined);
      targetHostelId = q ? parseInt(q) : null;
    }
    if (!targetHostelId) {
      return res.status(403).json({ success: false, message: 'Forbidden: missing hostel context' });
    }

    const { name, email, phone, location } = req.body;
    if (!name || !email || !phone || !location) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const nationalIdPath = (req as any).file ? `/uploads/${(req as any).file.filename}` : null;

    await client.query('BEGIN');

    // Create user with role custodian
    const tempPassword = CredentialGenerator.generatePatternPassword();
    const hashed = await bcrypt.hash(tempPassword, 10);
    const user = await UserModel.create({ email, name, password: hashed, role: 'user' as any });

    // Force role to custodian via direct update to avoid TypeScript union change
    await client.query('UPDATE users SET role = $1 WHERE id = $2', ['custodian', user.id]);

    // Insert custodian profile
    await client.query(
      `INSERT INTO custodians (user_id, hostel_id, phone, location, national_id_image_path)
       VALUES ($1, $2, $3, $4, $5)`,
      [user.id, targetHostelId, phone, location, nationalIdPath]
    );

    await client.query('COMMIT');

    // Send welcome email
    try {
      const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`;
      const html = EmailService.generateHostelAdminWelcomeEmail(
        name,
        email,
        email,
        tempPassword,
        'Your Hostel',
        loginUrl
      );
      await EmailService.sendEmail({ to: email, subject: 'Your Custodian Account - LTS Portal', html });
    } catch (e) {
      console.warn('Custodian welcome email failed:', e);
    }

    res.status(201).json({ success: true, message: 'Custodian created successfully' });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Create custodian error:', e);
    res.status(500).json({ success: false, message: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Update custodian (name, phone, location, status)
router.put('/:id', async (req: Request, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ success: false, message: 'No token provided' });
    const decoded: any = require('jsonwebtoken').verify(token, process.env.JWT_SECRET || 'fallback_secret');
    const currentUser = await UserModel.findById(decoded.userId);
    if (!currentUser) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { id } = req.params;
    const { name, phone, location, status } = req.body as any;

    // Ensure the custodian belongs to this hostel
    const check = await pool.query(
      `SELECT c.id FROM custodians c
       JOIN users u ON u.id = c.user_id
       WHERE c.id = $1 AND c.hostel_id = COALESCE($2, c.hostel_id)`,
      [parseInt(id), currentUser.hostel_id || null]
    );
    if (!check.rowCount && currentUser.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    if (name) await pool.query('UPDATE users SET name = $1 WHERE id = (SELECT user_id FROM custodians WHERE id = $2)', [name, id]);
    await pool.query(
      'UPDATE custodians SET phone = COALESCE($1, phone), location = COALESCE($2, location), status = COALESCE($3, status) WHERE id = $4',
      [phone || null, location || null, status || null, id]
    );

    res.json({ success: true, message: 'Custodian updated successfully' });
  } catch (e) {
    console.error('Update custodian error:', e);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Delete custodian
router.delete('/:id', async (req: Request, res) => {
  const client = await pool.connect();
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ success: false, message: 'No token provided' });
    const decoded: any = require('jsonwebtoken').verify(token, process.env.JWT_SECRET || 'fallback_secret');
    const currentUser = await UserModel.findById(decoded.userId);
    if (!currentUser) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { id } = req.params;

    // Ensure the custodian belongs to this hostel
    const check = await pool.query(
      `SELECT c.user_id FROM custodians c
       WHERE c.id = $1 AND c.hostel_id = COALESCE($2, c.hostel_id)`,
      [parseInt(id), currentUser.hostel_id || null]
    );
    if (!check.rowCount && currentUser.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const userId = check.rows[0]?.user_id;
    await client.query('BEGIN');
    await client.query('DELETE FROM custodians WHERE id = $1', [id]);
    if (userId) {
      await client.query('DELETE FROM users WHERE id = $1', [userId]);
    }
    await client.query('COMMIT');
    res.json({ success: true, message: 'Custodian deleted successfully' });
  } catch (e) {
    await pool.query('ROLLBACK');
    console.error('Delete custodian error:', e);
    res.status(500).json({ success: false, message: 'Internal server error' });
  } finally {
    client.release();
  }
});

export default router;




















