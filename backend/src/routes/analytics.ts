import express from 'express';
import pool from '../config/database';

const router = express.Router();

// Get total hostels onboarded
router.get('/hostels/total', async (req, res) => {
  try {
    const query = 'SELECT COUNT(*) as total_hostels FROM hostels';
    const result = await pool.query(query);
    
    res.json({
      success: true,
      data: {
        total_hostels: parseInt(result.rows[0].total_hostels)
      }
    });
  } catch (error) {
    console.error('Get total hostels error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Get total students across platform
router.get('/students/total', async (req, res) => {
  try {
    const query = `
      SELECT COUNT(*) as total_students 
      FROM users 
      WHERE role = 'user'
    `;
    const result = await pool.query(query);
    
    res.json({
      success: true,
      data: {
        total_students: parseInt(result.rows[0].total_students)
      }
    });
  } catch (error) {
    console.error('Get total students error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Get occupancy rates by hostel (prefer rooms table; fallback to hostels)
router.get('/occupancy/rates', async (req, res) => {
  try {
    const query = `
      WITH room_counts AS (
        SELECT h.id AS hostel_id,
               h.name,
               h.status,
               COUNT(r.*) FILTER (WHERE r.id IS NOT NULL) AS total_rooms_from_rooms,
               COUNT(r.*) FILTER (WHERE r.status = 'available') AS available_from_rooms,
               COUNT(r.*) FILTER (WHERE r.status = 'occupied') AS occupied_from_rooms
        FROM hostels h
        LEFT JOIN rooms r ON r.hostel_id = h.id
        GROUP BY h.id, h.name, h.status
      )
      SELECT 
        h.id,
        h.name,
        h.status,
        CASE WHEN rc.total_rooms_from_rooms > 0 THEN rc.total_rooms_from_rooms ELSE h.total_rooms END AS total_rooms,
        CASE WHEN rc.total_rooms_from_rooms > 0 THEN rc.available_from_rooms ELSE h.available_rooms END AS available_rooms,
        CASE WHEN rc.total_rooms_from_rooms > 0 THEN rc.occupied_from_rooms ELSE (h.total_rooms - h.available_rooms) END AS occupied_rooms,
        CASE 
          WHEN (CASE WHEN rc.total_rooms_from_rooms > 0 THEN rc.total_rooms_from_rooms ELSE h.total_rooms END) > 0 THEN 
            ROUND(((CASE WHEN rc.total_rooms_from_rooms > 0 THEN rc.occupied_from_rooms ELSE (h.total_rooms - h.available_rooms) END)::numeric
                   /
                   (CASE WHEN rc.total_rooms_from_rooms > 0 THEN rc.total_rooms_from_rooms ELSE h.total_rooms END)::numeric) * 100, 2)
          ELSE 0 
        END AS occupancy_rate
      FROM hostels h
      LEFT JOIN room_counts rc ON rc.hostel_id = h.id
      ORDER BY occupancy_rate DESC`;

    const result = await pool.query(query);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get occupancy rates error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Get region-wise growth and adoption stats
router.get('/regions/stats', async (req, res) => {
  try {
    const query = `
      SELECT 
        CASE 
          WHEN address ILIKE '%kampala%' THEN 'Kampala'
          WHEN address ILIKE '%jinja%' THEN 'Jinja'
          WHEN address ILIKE '%mbarara%' THEN 'Mbarara'
          WHEN address ILIKE '%gulu%' THEN 'Gulu'
          WHEN address ILIKE '%masaka%' THEN 'Masaka'
          ELSE 'Other'
        END as region,
        COUNT(*) as hostel_count,
        SUM(total_rooms) as total_rooms,
        SUM(available_rooms) as available_rooms,
        SUM(total_rooms - available_rooms) as occupied_rooms,
        CASE 
          WHEN SUM(total_rooms) > 0 THEN 
            ROUND((SUM(total_rooms - available_rooms)::numeric / SUM(total_rooms)::numeric) * 100, 2)
          ELSE 0 
        END as avg_occupancy_rate
      FROM hostels 
      GROUP BY 
        CASE 
          WHEN address ILIKE '%kampala%' THEN 'Kampala'
          WHEN address ILIKE '%jinja%' THEN 'Jinja'
          WHEN address ILIKE '%mbarara%' THEN 'Mbarara'
          WHEN address ILIKE '%gulu%' THEN 'Gulu'
          WHEN address ILIKE '%masaka%' THEN 'Masaka'
          ELSE 'Other'
        END
      ORDER BY hostel_count DESC`;
    const result = await pool.query(query);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get region stats error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Get overall platform statistics (prefer rooms table aggregate)
router.get('/overview', async (req, res) => {
  try {
    const query = `
      WITH rooms_agg AS (
        SELECT COUNT(*) AS total_rooms_from_rooms,
               COUNT(*) FILTER (WHERE status = 'available') AS available_from_rooms,
               COUNT(*) FILTER (WHERE status = 'occupied') AS occupied_from_rooms
        FROM rooms
      )
      SELECT 
        (SELECT COUNT(*) FROM hostels) as total_hostels,
        (SELECT COUNT(*) FROM users WHERE role = 'user') as total_students,
        (SELECT COUNT(*) FROM users WHERE role = 'hostel_admin') as total_admins,
        CASE WHEN (SELECT total_rooms_from_rooms FROM rooms_agg) > 0 THEN (SELECT total_rooms_from_rooms FROM rooms_agg) ELSE (SELECT COALESCE(SUM(total_rooms),0) FROM hostels) END as total_rooms,
        CASE WHEN (SELECT total_rooms_from_rooms FROM rooms_agg) > 0 THEN (SELECT available_from_rooms FROM rooms_agg) ELSE (SELECT COALESCE(SUM(available_rooms),0) FROM hostels) END as available_rooms,
        CASE WHEN (SELECT total_rooms_from_rooms FROM rooms_agg) > 0 THEN (SELECT occupied_from_rooms FROM rooms_agg) ELSE (SELECT COALESCE(SUM(total_rooms - available_rooms),0) FROM hostels) END as occupied_rooms,
        CASE 
          WHEN (CASE WHEN (SELECT total_rooms_from_rooms FROM rooms_agg) > 0 THEN (SELECT total_rooms_from_rooms FROM rooms_agg) ELSE (SELECT COALESCE(SUM(total_rooms),0) FROM hostels) END) > 0 THEN 
            ROUND(((CASE WHEN (SELECT total_rooms_from_rooms FROM rooms_agg) > 0 THEN (SELECT occupied_from_rooms FROM rooms_agg) ELSE (SELECT COALESCE(SUM(total_rooms - available_rooms),0) FROM hostels) END)::numeric
                   /
                   (CASE WHEN (SELECT total_rooms_from_rooms FROM rooms_agg) > 0 THEN (SELECT total_rooms_from_rooms FROM rooms_agg) ELSE (SELECT COALESCE(SUM(total_rooms),0) FROM hostels) END)::numeric) * 100, 2)
          ELSE 0 
        END as overall_occupancy_rate`;

    const result = await pool.query(query);
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Get overview stats error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Hostel-specific overview: prefers rooms table; falls back to hostels row
router.get('/hostel/:id/overview', async (req, res) => {
  try {
    const hostelId = Number(req.params.id);
    if (!Number.isFinite(hostelId)) {
      return res.status(400).json({ success: false, message: 'Invalid hostel id' });
    }

    const query = `
      WITH rooms_agg AS (
        SELECT COUNT(*) AS total_rooms_from_rooms,
               COUNT(*) FILTER (WHERE status = 'available') AS available_from_rooms,
               COUNT(*) FILTER (WHERE status = 'occupied') AS occupied_from_rooms
        FROM rooms
        WHERE hostel_id = $1
      )
      SELECT 
        h.name as hostel_name,
        CASE WHEN (SELECT total_rooms_from_rooms FROM rooms_agg) > 0 THEN (SELECT total_rooms_from_rooms FROM rooms_agg) ELSE COALESCE(h.total_rooms,0) END AS total_rooms,
        CASE WHEN (SELECT total_rooms_from_rooms FROM rooms_agg) > 0 THEN (SELECT available_from_rooms FROM rooms_agg) ELSE COALESCE(h.available_rooms,0) END AS available_rooms,
        CASE WHEN (SELECT total_rooms_from_rooms FROM rooms_agg) > 0 THEN (SELECT occupied_from_rooms FROM rooms_agg) ELSE COALESCE(h.total_rooms - h.available_rooms,0) END AS occupied_rooms
      FROM hostels h
      WHERE h.id = $1
      LIMIT 1`;

    const result = await pool.query(query, [hostelId]);
    if (!result.rowCount) {
      return res.status(404).json({ success: false, message: 'Hostel not found' });
    }
    const row = result.rows[0];
    const total = Number(row.total_rooms || 0);
    const occupied = Number(row.occupied_rooms || 0);
    const rate = total > 0 ? Math.round((occupied / total) * 10000) / 100 : 0;
    res.json({ success: true, data: { 
      hostel_name: row.hostel_name,
      total_rooms: total,
      available_rooms: Number(row.available_rooms || Math.max(total - occupied, 0)),
      occupied_rooms: occupied,
      occupancy_rate: rate
    }});
  } catch (error) {
    console.error('Get hostel overview error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;
