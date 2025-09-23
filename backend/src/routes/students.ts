import express, { Request } from 'express';
import pool from '../config/database';
import { UserModel } from '../models/User';
import bcrypt from 'bcryptjs';
import { CredentialGenerator } from '../utils/credentialGenerator';
import { EmailService } from '../services/emailService';

const router = express.Router();

async function getHostelIdForUser(userId: number, role: string): Promise<number | null> {
  if (role === 'hostel_admin') {
    const u = await UserModel.findById(userId);
    return u?.hostel_id || null;
  }
  if (role === 'custodian') {
    const res = await pool.query('SELECT hostel_id FROM custodians WHERE user_id = $1', [userId]);
    return res.rows[0]?.hostel_id || null;
  }
  return null;
}

// List students for current hostel (custodian or hostel_admin)
router.get('/', async (req, res) => {
  try {
    const rawAuth = req.headers.authorization || '';
    const token = rawAuth.startsWith('Bearer ') ? rawAuth.replace('Bearer ', '') : '';
    if (!token) return res.status(401).json({ success: false, message: 'No token provided' });
    let decoded: any;
    try {
      decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET || 'fallback_secret');
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }
    const currentUser = await UserModel.findById(decoded.userId);
    if (!currentUser) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const hostelId = await getHostelIdForUser(currentUser.id, currentUser.role);
    if (!hostelId) return res.status(403).json({ success: false, message: 'Forbidden' });

    // Pagination
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
    const limitRaw = Math.max(1, parseInt((req.query.limit as string) || '20', 10));
    const limit = Math.min(100, limitRaw);
    const offset = (page - 1) * limit;

    const result = await pool.query(
      `SELECT id, email, name, role, created_at FROM users 
       WHERE hostel_id = $1 AND role = 'user' ORDER BY created_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      [hostelId]
    );
    res.json({ success: true, data: result.rows, page, limit });
  } catch (e) {
    console.error('List students error:', e);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Create student for current hostel
router.post('/', async (req: Request, res) => {
  const client = await pool.connect();
  try {
    const rawAuth = req.headers.authorization || '';
    const token = rawAuth.startsWith('Bearer ') ? rawAuth.replace('Bearer ', '') : '';
    if (!token) return res.status(401).json({ success: false, message: 'No token provided' });
    let decoded: any;
    try {
      decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET || 'fallback_secret');
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }
    const currentUser = await UserModel.findById(decoded.userId);
    if (!currentUser) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const hostelId = await getHostelIdForUser(currentUser.id, currentUser.role);
    if (!hostelId) return res.status(403).json({ success: false, message: 'Forbidden' });

    const { 
      name, email,
      gender, date_of_birth, access_number,
      phone, whatsapp, emergency_contact,
      room_id, initial_payment_amount, currency
    } = req.body as any;
    if (!name || !email) return res.status(400).json({ success: false, message: 'Name and email are required' });

    // Check if user already exists by email
    await client.query('BEGIN');
    const existingRes = await client.query('SELECT * FROM users WHERE email = $1', [email]);
    let createdUser = existingRes.rows[0];
    if (!createdUser) {
      // Create new internal student user with random password (no credentials emailed)
      const randomPassword = CredentialGenerator.generatePatternPassword();
      const hashed = await bcrypt.hash(randomPassword, 10);
      const userRes = await client.query(
        `INSERT INTO users (email, name, password, role, hostel_id, created_at, updated_at)
         VALUES ($1, $2, $3, 'user', $4, NOW(), NOW()) RETURNING id, email, name` ,
        [email, name, hashed, hostelId]
      );
      createdUser = userRes.rows[0];
    } else {
      // If existing user is a student, ensure they belong to this hostel; otherwise reject
      if (createdUser.role !== 'user') {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: 'Email already exists for another account type' });
      }
      if (!createdUser.hostel_id) {
        await client.query('UPDATE users SET hostel_id = $1 WHERE id = $2', [hostelId, createdUser.id]);
      } else if (createdUser.hostel_id !== hostelId) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: 'Email already registered under a different hostel' });
      }
      // Optionally update name
      if (name && name !== createdUser.name) {
        await client.query('UPDATE users SET name = $1 WHERE id = $2', [name, createdUser.id]);
      }
    }

    // Create profile
    await client.query(
      `INSERT INTO student_profiles (user_id, gender, date_of_birth, access_number, phone, whatsapp, emergency_contact)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [createdUser.id, gender || null, date_of_birth || null, access_number || null, phone || null, whatsapp || null, emergency_contact || null]
    );

    // Assign room if provided
    if (room_id) {
      const roomCheck = await client.query("SELECT id, price, room_number, room_type FROM rooms WHERE id = $1 AND hostel_id = $2 AND status = 'available'", [room_id, hostelId]);
      if (!roomCheck.rowCount) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: 'Invalid or unavailable room' });
      }
      await client.query("UPDATE rooms SET status = 'occupied', updated_at = NOW() WHERE id = $1", [room_id]);
      await client.query(
        `INSERT INTO student_room_assignments (user_id, room_id, status) VALUES ($1, $2, 'active')`,
        [createdUser.id, room_id]
      );
    }

    // Record initial payment if provided
    let roomMeta: { room_number: string | null; room_type: string | null; price: number | null } = { room_number: null, room_type: null, price: null };
    if (initial_payment_amount) {
      const amt = parseFloat(initial_payment_amount);
      await client.query(
        `INSERT INTO payments (user_id, hostel_id, amount, currency, purpose) VALUES ($1, $2, $3, $4, 'booking')`,
        [createdUser.id, hostelId, amt, currency || 'UGX']
      );
      // Fetch room info if assigned
      const rm = await client.query(
        `SELECT rm.room_number, rm.room_type, rm.price FROM student_room_assignments sra
         JOIN rooms rm ON rm.id = sra.room_id WHERE sra.user_id = $1 AND sra.status = 'active' LIMIT 1`,
        [createdUser.id]
      );
      if (rm.rowCount) {
        roomMeta = { room_number: rm.rows[0].room_number, room_type: rm.rows[0].room_type, price: parseFloat(rm.rows[0].price) };
      }
    }

    await client.query('COMMIT');

    // If an initial payment was recorded, send a receipt email instead of credentials
    if (initial_payment_amount) {
      try {
        const sumRes = await pool.query('SELECT SUM(amount) as total_paid FROM payments WHERE user_id = $1', [createdUser.id]);
        const totalPaid = parseFloat(sumRes.rows[0]?.total_paid || '0');
        const balanceAfter = roomMeta.price != null ? Math.max(0, roomMeta.price - totalPaid) : null;
        const html = EmailService.generatePaymentReceiptEmail(
          name,
          email,
          parseFloat(initial_payment_amount),
          currency || 'UGX',
          balanceAfter,
          roomMeta.room_number,
          roomMeta.room_type,
          new Date().toLocaleString()
        );
        await EmailService.sendEmail({ to: email, subject: 'Payment Receipt - LTS Portal', html });
      } catch (e) {
        console.warn('Payment receipt email failed:', e);
      }
    }

    res.status(201).json({ success: true, message: 'Student registered successfully' });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Create student error:', e);
    res.status(500).json({ success: false, message: 'Internal server error' });
  } finally {
    client.release();
  }
});

export default router;

// Delete student (custodian/hostel_admin) from their hostel
router.delete('/:id', async (req: Request, res) => {
  const client = await pool.connect();
  try {
    const rawAuth = req.headers.authorization || '';
    const token = rawAuth.startsWith('Bearer ') ? rawAuth.replace('Bearer ', '') : '';
    if (!token) return res.status(401).json({ success: false, message: 'No token provided' });
    let decoded: any;
    try {
      decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET || 'fallback_secret');
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }
    const currentUser = await UserModel.findById(decoded.userId);
    if (!currentUser) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const hostelId = await (async () => {
      if (currentUser.role === 'hostel_admin') return currentUser.hostel_id || null;
      if (currentUser.role === 'custodian') {
        const r = await pool.query('SELECT hostel_id FROM custodians WHERE user_id = $1', [currentUser.id]);
        return r.rows[0]?.hostel_id || null;
      }
      return null;
    })();

    if (!hostelId) return res.status(403).json({ success: false, message: 'Forbidden' });

    const { id } = req.params;

    // Verify the student belongs to this hostel
    const s = await pool.query("SELECT id FROM users WHERE id = $1 AND hostel_id = $2 AND role = 'user'", [id, hostelId]);
    if (!s.rowCount) return res.status(404).json({ success: false, message: 'Student not found' });

    await client.query('BEGIN');
    // End any active room assignment
    await client.query("UPDATE student_room_assignments SET status = 'ended', ended_at = NOW() WHERE user_id = $1 AND status = 'active'", [id]);
    // Delete payments (optional): keep for audit; so we won't delete
    // Finally delete user
    await client.query('DELETE FROM users WHERE id = $1', [id]);
    await client.query('COMMIT');

    res.json({ success: true, message: 'Student deleted' });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Delete student error:', e);
    res.status(500).json({ success: false, message: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Send notification email to one student or all students in current hostel
router.post('/notify', async (req, res) => {
  try {
    const rawAuth = req.headers.authorization || '';
    const token = rawAuth.startsWith('Bearer ') ? rawAuth.replace('Bearer ', '') : '';
    if (!token) return res.status(401).json({ success: false, message: 'No token provided' });
    let decoded: any;
    try { decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET || 'fallback_secret'); } catch { return res.status(401).json({ success: false, message: 'Invalid token' }); }
    const currentUser = await UserModel.findById(decoded.userId);
    if (!currentUser || (currentUser.role !== 'hostel_admin' && currentUser.role !== 'custodian')) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    const hostelId = await getHostelIdForUser(currentUser.id, currentUser.role);
    if (!hostelId) return res.status(403).json({ success: false, message: 'Forbidden' });

    const { user_id, subject, message } = req.body as any;
    if (!subject || !message) return res.status(400).json({ success: false, message: 'subject and message are required' });

    let recipients: Array<{ id: number; name: string; email: string }>; 
    if (user_id) {
      const r = await pool.query("SELECT id, name, email FROM users WHERE id = $1 AND hostel_id = $2 AND role = 'user'", [user_id, hostelId]);
      recipients = r.rows;
    } else {
      const r = await pool.query("SELECT id, name, email FROM users WHERE hostel_id = $1 AND role = 'user'", [hostelId]);
      recipients = r.rows;
    }

    let sent = 0;
    for (const rec of recipients) {
      try {
        await EmailService.sendEmail({ to: rec.email, subject, html: `<p>Dear ${rec.name || 'Student'},</p><p>${message}</p><p>— LTS Portal</p>` });
        sent++;
      } catch (e) {
        // log and continue
        console.error('Notify email failed for', rec.email, e);
      }
    }

    return res.json({ success: true, data: { requested: recipients.length, sent } });
  } catch (e) {
    console.error('Notify students error:', e);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});



















