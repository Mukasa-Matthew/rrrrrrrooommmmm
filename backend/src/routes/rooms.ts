import express, { Request } from 'express';
import pool from '../config/database';
import { UserModel } from '../models/User';

const router = express.Router();

async function resolveHostelIdForUser(userId: number, role: string): Promise<number | null> {
  if (role === 'hostel_admin') {
    const u = await UserModel.findById(userId);
    return u?.hostel_id || null;
  }
  if (role === 'custodian') {
    const r = await pool.query('SELECT hostel_id FROM custodians WHERE user_id = $1', [userId]);
    const fromCustodians = r.rows[0]?.hostel_id || null;
    if (fromCustodians) return fromCustodians;
    const u = await UserModel.findById(userId);
    return u?.hostel_id || null;
  }
  return null;
}

// List rooms for current user's hostel (hostel_admin or custodian)
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
    if (!currentUser || (currentUser.role !== 'hostel_admin' && currentUser.role !== 'custodian')) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    const hostelId = await resolveHostelIdForUser(currentUser.id, currentUser.role);
    if (!hostelId) return res.status(403).json({ success: false, message: 'Forbidden' });
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
    const limitRaw = Math.max(1, parseInt((req.query.limit as string) || '20', 10));
    const limit = Math.min(100, limitRaw);
    const offset = (page - 1) * limit;
    const result = await pool.query(
      `SELECT * FROM rooms WHERE hostel_id = $1 ORDER BY created_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      [hostelId]
    );
    res.json({ success: true, data: result.rows, page, limit });
  } catch (e) {
    console.error('List rooms error:', e);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// List available rooms only
router.get('/available', async (req, res) => {
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
    if (!currentUser || (currentUser.role !== 'hostel_admin' && currentUser.role !== 'custodian')) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    const hostelId = await resolveHostelIdForUser(currentUser.id, currentUser.role);
    if (!hostelId) return res.status(403).json({ success: false, message: 'Forbidden' });
    const result = await pool.query("SELECT * FROM rooms WHERE hostel_id = $1 AND status = 'available' ORDER BY room_number", [hostelId]);
    res.json({ success: true, data: result.rows });
  } catch (e) {
    console.error('List available rooms error:', e);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Create room
router.post('/', async (req: Request, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ success: false, message: 'No token provided' });
    const decoded: any = require('jsonwebtoken').verify(token, process.env.JWT_SECRET || 'fallback_secret');
    const currentUser = await UserModel.findById(decoded.userId);
    if (!currentUser || currentUser.role !== 'hostel_admin' || !currentUser.hostel_id) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const { room_number, price, description, self_contained } = req.body as any;
    if (!room_number || price === undefined) {
      return res.status(400).json({ success: false, message: 'room_number and price are required' });
    }
    const result = await pool.query(
      `INSERT INTO rooms (hostel_id, room_number, price, description, self_contained, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, COALESCE($5,false), 'available', NOW(), NOW()) RETURNING *`,
      [currentUser.hostel_id, room_number, price, description || null, !!self_contained]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (e) {
    console.error('Create room error:', e);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Update room
router.put('/:id', async (req: Request, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ success: false, message: 'No token provided' });
    const decoded: any = require('jsonwebtoken').verify(token, process.env.JWT_SECRET || 'fallback_secret');
    const currentUser = await UserModel.findById(decoded.userId);
    if (!currentUser || currentUser.role !== 'hostel_admin' || !currentUser.hostel_id) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    const { id } = req.params;
    const { room_number, price, description, status, self_contained } = req.body as any;
    // Ensure ownership
    const check = await pool.query('SELECT id FROM rooms WHERE id = $1 AND hostel_id = $2', [id, currentUser.hostel_id]);
    if (!check.rowCount) return res.status(404).json({ success: false, message: 'Room not found' });

    // Prevent marking as available if there is an active assignment
    if (status === 'available') {
      const active = await pool.query(
        `SELECT 1 FROM student_room_assignments WHERE room_id = $1 AND status = 'active' LIMIT 1`,
        [id]
      );
      if (active.rowCount) {
        return res.status(400).json({ success: false, message: 'Cannot mark room as available while it has an active student assignment' });
      }
    }

    const result = await pool.query(
      `UPDATE rooms SET 
        room_number = COALESCE($1, room_number),
        price = COALESCE($2, price),
        description = COALESCE($3, description),
        self_contained = COALESCE($4, self_contained),
        status = COALESCE($5, status),
        updated_at = NOW()
       WHERE id = $6 RETURNING *`,
      [room_number || null, price ?? null, description || null, (self_contained === undefined ? null : !!self_contained), status || null, id]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (e) {
    console.error('Update room error:', e);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Delete room
router.delete('/:id', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ success: false, message: 'No token provided' });
    const decoded: any = require('jsonwebtoken').verify(token, process.env.JWT_SECRET || 'fallback_secret');
    const currentUser = await UserModel.findById(decoded.userId);
    if (!currentUser || currentUser.role !== 'hostel_admin' || !currentUser.hostel_id) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    const { id } = req.params;

    // Prevent deleting a room that has an active assignment
    const active = await pool.query(`SELECT 1 FROM student_room_assignments WHERE room_id = $1 AND status = 'active' LIMIT 1`, [id]);
    if (active.rowCount) {
      return res.status(400).json({ success: false, message: 'Cannot delete room with an active student assignment' });
    }

    const result = await pool.query('DELETE FROM rooms WHERE id = $1 AND hostel_id = $2', [id, currentUser.hostel_id]);
    if (!result.rowCount) return res.status(404).json({ success: false, message: 'Room not found' });
    res.json({ success: true, message: 'Room deleted' });
  } catch (e) {
    console.error('Delete room error:', e);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;



















