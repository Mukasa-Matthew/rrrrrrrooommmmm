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

// Get occupancy rates by hostel
router.get('/occupancy/rates', async (req, res) => {
  try {
    const query = `
      SELECT 
        id,
        name,
        total_rooms,
        available_rooms,
        (total_rooms - available_rooms) as occupied_rooms,
        CASE 
          WHEN total_rooms > 0 THEN 
            ROUND(((total_rooms - available_rooms)::numeric / total_rooms::numeric) * 100, 2)
          ELSE 0 
        END as occupancy_rate,
        status
      FROM hostels 
      ORDER BY occupancy_rate DESC
    `;
    const result = await pool.query(query);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get occupancy rates error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Get region-wise growth and adoption stats
router.get('/regions/stats', async (req, res) => {
  try {
    // For now, we'll extract region from address (assuming format includes city/region)
    // In a real app, you'd have a separate regions table
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
      ORDER BY hostel_count DESC
    `;
    const result = await pool.query(query);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get region stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Get overall platform statistics
router.get('/overview', async (req, res) => {
  try {
    const query = `
      SELECT 
        (SELECT COUNT(*) FROM hostels) as total_hostels,
        (SELECT COUNT(*) FROM users WHERE role = 'user') as total_students,
        (SELECT COUNT(*) FROM users WHERE role = 'hostel_admin') as total_admins,
        (SELECT SUM(total_rooms) FROM hostels) as total_rooms,
        (SELECT SUM(available_rooms) FROM hostels) as available_rooms,
        (SELECT SUM(total_rooms - available_rooms) FROM hostels) as occupied_rooms,
        CASE 
          WHEN (SELECT SUM(total_rooms) FROM hostels) > 0 THEN 
            ROUND((SUM(total_rooms - available_rooms)::numeric / SUM(total_rooms)::numeric) * 100, 2)
          ELSE 0 
        END as overall_occupancy_rate
      FROM hostels
    `;
    const result = await pool.query(query);
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Get overview stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

export default router;
