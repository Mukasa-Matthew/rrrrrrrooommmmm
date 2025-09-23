import express, { Request } from 'express';
import pool from '../config/database';
import { UserModel } from '../models/User';
import { EmailService } from '../services/emailService';

const router = express.Router();

// Simple in-memory cache for payments summary by hostel
type SummaryCacheItem = { data: any; expiresAt: number };
const summaryCache: Map<number, SummaryCacheItem> = new Map();
const SUMMARY_TTL_MS = 10_000; // 10 seconds

async function resolveHostelIdForUser(userId: number, role: string): Promise<number | null> {
  if (role === 'hostel_admin') {
    const u = await UserModel.findById(userId);
    return u?.hostel_id || null;
  }
  if (role === 'custodian') {
    const r = await pool.query('SELECT hostel_id FROM custodians WHERE user_id = $1', [userId]);
    return r.rows[0]?.hostel_id || null;
  }
  return null;
}

// Record a payment for a student in current hostel and send receipt
router.post('/', async (req: Request, res) => {
  const client = await pool.connect();
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ success: false, message: 'No token provided' });
    const decoded: any = require('jsonwebtoken').verify(token, process.env.JWT_SECRET || 'fallback_secret');
    const currentUser = await UserModel.findById(decoded.userId);
    if (!currentUser) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const hostelId = await resolveHostelIdForUser(currentUser.id, currentUser.role);
    if (!hostelId) return res.status(403).json({ success: false, message: 'Forbidden' });

    const { user_id, amount, currency, purpose } = req.body as any;
    if (!user_id || !amount) return res.status(400).json({ success: false, message: 'user_id and amount are required' });

    // Validate student belongs to hostel
    const student = await pool.query('SELECT id, email, name FROM users WHERE id = $1 AND hostel_id = $2 AND role = \'user\'', [user_id, hostelId]);
    if (!student.rowCount) return res.status(404).json({ success: false, message: 'Student not found in this hostel' });

    // Compute balance (simple: sum of payments negative; could be extended with expected fees table)
    await client.query('BEGIN');
    const payRes = await client.query(
      'INSERT INTO payments (user_id, hostel_id, amount, currency, purpose) VALUES ($1, $2, $3, $4, $5) RETURNING id, created_at',
      [user_id, hostelId, parseFloat(amount), currency || 'UGX', purpose || 'booking']
    );

    // Get room assignment and expected price
    const roomRes = await client.query(
      `SELECT rm.room_number, rm.room_type, rm.price::numeric AS expected_price
       FROM student_room_assignments sra
       JOIN rooms rm ON rm.id = sra.room_id
       WHERE sra.user_id = $1 AND sra.status = 'active'
       LIMIT 1`,
      [user_id]
    );
    const room = roomRes.rows[0] || null;

    // Compute totals AFTER this payment
    const sumRes = await client.query('SELECT COALESCE(SUM(amount),0) as total_paid FROM payments WHERE user_id = $1', [user_id]);
    const totalPaidAfter = parseFloat(sumRes.rows[0]?.total_paid || '0');
    const expected = room?.expected_price != null ? parseFloat(room.expected_price) : null;
    const balanceAfter = expected != null ? (expected - totalPaidAfter) : null;

    await client.query('COMMIT');

    // Invalidate cached summary for this hostel
    if (hostelId) {
      summaryCache.delete(hostelId);
    }

    // Email receipt
    const s = student.rows[0];
    const html = EmailService.generatePaymentReceiptEmail(
      s.name,
      s.email,
      parseFloat(amount),
      currency || 'UGX',
      balanceAfter,
      room?.room_number || null,
      room?.room_type || null,
      new Date(payRes.rows[0].created_at).toLocaleString()
    );
    // Send receipt
    await EmailService.sendEmail({ to: s.email, subject: 'Payment Receipt - LTS Portal', html });

    // If fully paid now, send completion email
    if (expected != null && balanceAfter != null && balanceAfter <= 0) {
      const completionHtml = EmailService.generatePaymentReceiptEmail(
        s.name,
        s.email,
        0,
        currency || 'UGX',
        0,
        room?.room_number || null,
        room?.room_type || null,
        new Date(payRes.rows[0].created_at).toLocaleString()
      );
      await EmailService.sendEmail({ to: s.email, subject: 'Payment Completed - LTS Portal', html: completionHtml });
    }

    res.status(201).json({ success: true, message: 'Payment recorded and receipt sent', data: { total_paid: totalPaidAfter, expected, balance_after: balanceAfter } });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Record payment error:', e);
    res.status(500).json({ success: false, message: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Payments summary for current hostel (super_admin may pass ?hostel_id=...)
router.get('/summary', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ success: false, message: 'No token provided' });
    const decoded: any = require('jsonwebtoken').verify(token, process.env.JWT_SECRET || 'fallback_secret');
    const currentUser = await UserModel.findById(decoded.userId);
    if (!currentUser) return res.status(401).json({ success: false, message: 'Unauthorized' });

    let hostelId: number | null = null;
    if (currentUser.role === 'super_admin') {
      hostelId = req.query.hostel_id ? Number(req.query.hostel_id) : null;
      if (!hostelId) return res.status(400).json({ success: false, message: 'hostel_id is required for super_admin' });
    } else {
      hostelId = await resolveHostelIdForUser(currentUser.id, currentUser.role);
    }
    if (!hostelId) return res.status(403).json({ success: false, message: 'Forbidden' });

    // Serve from cache if fresh
    const now = Date.now();
    const cached = summaryCache.get(hostelId);
    if (cached && cached.expiresAt > now) {
      return res.json({ success: true, data: cached.data });
    }

    // Total collected
    const totalPaidRes = await pool.query('SELECT COALESCE(SUM(amount),0) AS total_collected FROM payments WHERE hostel_id = $1', [hostelId]);
    const total_collected = parseFloat(totalPaidRes.rows[0]?.total_collected || '0');

    // Per-student expected vs paid
    const rowsRes = await pool.query(
      `WITH active_assignment AS (
         SELECT sra.user_id, rm.price::numeric AS expected, rm.room_number, rm.room_type
         FROM student_room_assignments sra
         JOIN rooms rm ON rm.id = sra.room_id
         WHERE sra.status = 'active'
       ),
       paid AS (
         SELECT user_id, COALESCE(SUM(amount),0)::numeric AS paid
         FROM payments
         WHERE hostel_id = $1
         GROUP BY user_id
       )
       SELECT u.id AS user_id, u.name, u.email,
              sp.access_number, sp.phone, sp.whatsapp,
              aa.expected, aa.room_number, aa.room_type,
              COALESCE(p.paid, 0)::numeric AS paid,
              CASE WHEN aa.expected IS NULL THEN NULL ELSE (aa.expected - COALESCE(p.paid,0))::numeric END AS balance
       FROM users u
       LEFT JOIN student_profiles sp ON sp.user_id = u.id
       LEFT JOIN active_assignment aa ON aa.user_id = u.id
       LEFT JOIN paid p ON p.user_id = u.id
       WHERE u.role = 'user' AND u.hostel_id = $1
       ORDER BY u.name ASC`,
      [hostelId]
    );

    const students = rowsRes.rows.map(r => ({
      user_id: r.user_id,
      name: r.name,
      email: r.email,
      access_number: r.access_number || null,
      phone: r.phone || null,
      whatsapp: r.whatsapp || null,
      room_number: r.room_number || null,
      room_type: r.room_type || null,
      expected: r.expected !== null ? parseFloat(r.expected) : null,
      paid: parseFloat(r.paid || 0),
      balance: r.balance !== null ? parseFloat(r.balance) : null,
      status: r.expected === null ? 'unassigned' : (parseFloat(r.paid || 0) >= parseFloat(r.expected || 0) ? 'paid' : (parseFloat(r.paid || 0) > 0 ? 'partial' : 'unpaid'))
    }));

    const total_outstanding = students.reduce((sum, s) => sum + (s.balance && s.balance > 0 ? s.balance : 0), 0);

    const payload = { total_collected, total_outstanding, students };
    summaryCache.set(hostelId, { data: payload, expiresAt: now + SUMMARY_TTL_MS });
    res.json({ success: true, data: payload });
  } catch (e) {
    console.error('Payments summary error:', e);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// List payments (super_admin may pass ?hostel_id=...)
router.get('/', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ success: false, message: 'No token provided' });
    const decoded: any = require('jsonwebtoken').verify(token, process.env.JWT_SECRET || 'fallback_secret');
    const currentUser = await UserModel.findById(decoded.userId);
    if (!currentUser) return res.status(401).json({ success: false, message: 'Unauthorized' });

    let hostelId: number | null = null;
    if (currentUser.role === 'super_admin') {
      hostelId = req.query.hostel_id ? Number(req.query.hostel_id) : null;
      if (!hostelId) return res.status(400).json({ success: false, message: 'hostel_id is required for super_admin' });
    } else {
      hostelId = await resolveHostelIdForUser(currentUser.id, currentUser.role);
    }
    if (!hostelId) return res.status(403).json({ success: false, message: 'Forbidden' });

    const search = (req.query.search as string | undefined)?.trim().toLowerCase();
    const userIdFilter = req.query.user_id ? Number(req.query.user_id) : undefined;

    // Pagination with sane defaults/caps
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
    const limitRaw = Math.max(1, parseInt((req.query.limit as string) || '20', 10));
    const limit = Math.min(100, limitRaw);
    const offset = (page - 1) * limit;

    const params: any[] = [hostelId];
    let paramIndex = 2;
    const where: string[] = ['p.hostel_id = $1'];
    if (typeof userIdFilter === 'number' && !Number.isNaN(userIdFilter)) {
      where.push(`p.user_id = $${paramIndex}`);
      params.push(userIdFilter);
      paramIndex++;
    }
    if (search) {
      where.push(`(LOWER(u.name) LIKE $${paramIndex} OR LOWER(u.email) LIKE $${paramIndex} OR LOWER(p.purpose) LIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const query = `
      SELECT p.id, p.user_id, p.amount, p.currency, p.purpose, p.created_at,
             u.name as student_name, u.email as student_email
      FROM payments p
      JOIN users u ON u.id = p.user_id
      WHERE ${where.join(' AND ')}
      ORDER BY p.created_at DESC
      LIMIT ${limit} OFFSET ${offset}`;

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows, page, limit });
  } catch (e) {
    console.error('List payments error:', e);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;











