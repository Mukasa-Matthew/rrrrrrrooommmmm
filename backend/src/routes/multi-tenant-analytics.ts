import express from 'express';
import pool from '../config/database';

const router = express.Router();

// Middleware to extract user context (you'd implement proper JWT verification)
const getUserContext = (req: any) => {
  // This would be extracted from JWT token in a real implementation
  return {
    userId: req.user?.id,
    role: req.user?.role,
    universityId: req.user?.university_id,
    hostelId: req.user?.hostel_id
  };
};

// Super Admin Analytics - Platform-wide statistics
router.get('/platform/overview', async (req, res) => {
  try {
    const query = `
      SELECT 
        (SELECT COUNT(*) FROM universities WHERE status = 'active') as total_universities,
        (SELECT COUNT(*) FROM hostels) as total_hostels,
        (SELECT COUNT(*) FROM users WHERE role = 'user') as total_students,
        (SELECT COUNT(*) FROM users WHERE role = 'hostel_admin') as total_hostel_admins,
        (SELECT COUNT(*) FROM users WHERE role = 'university_admin') as total_university_admins,
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
    console.error('Get platform overview error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// University-wise analytics
router.get('/universities/stats', async (req, res) => {
  try {
    const query = `
      SELECT 
        u.id,
        u.name as university_name,
        u.code,
        r.name as region_name,
        COUNT(DISTINCT h.id) as hostel_count,
        COUNT(DISTINCT CASE WHEN us.role = 'user' THEN us.id END) as student_count,
        SUM(h.total_rooms) as total_rooms,
        SUM(h.available_rooms) as available_rooms,
        SUM(h.total_rooms - h.available_rooms) as occupied_rooms,
        CASE 
          WHEN SUM(h.total_rooms) > 0 THEN 
            ROUND((SUM(h.total_rooms - h.available_rooms)::numeric / SUM(h.total_rooms)::numeric) * 100, 2)
          ELSE 0 
        END as occupancy_rate,
        u.status
      FROM universities u
      LEFT JOIN regions r ON u.region_id = r.id
      LEFT JOIN hostels h ON h.university_id = u.id
      LEFT JOIN users us ON us.hostel_id = h.id
      GROUP BY u.id, u.name, u.code, r.name, u.status
      ORDER BY hostel_count DESC
    `;
    const result = await pool.query(query);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get university stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Region-wise analytics (works across all universities)
router.get('/regions/stats', async (req, res) => {
  try {
    const query = `
      SELECT 
        r.id,
        r.name as region_name,
        r.country,
        COUNT(DISTINCT u.id) as university_count,
        COUNT(DISTINCT h.id) as hostel_count,
        COUNT(DISTINCT CASE WHEN us.role = 'user' THEN us.id END) as student_count,
        SUM(h.total_rooms) as total_rooms,
        SUM(h.available_rooms) as available_rooms,
        SUM(h.total_rooms - h.available_rooms) as occupied_rooms,
        CASE 
          WHEN SUM(h.total_rooms) > 0 THEN 
            ROUND((SUM(h.total_rooms - h.available_rooms)::numeric / SUM(h.total_rooms)::numeric) * 100, 2)
          ELSE 0 
        END as avg_occupancy_rate
      FROM regions r
      LEFT JOIN universities u ON u.region_id = r.id AND u.status = 'active'
      LEFT JOIN hostels h ON h.region_id = r.id
      LEFT JOIN users us ON us.hostel_id = h.id
      GROUP BY r.id, r.name, r.country
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

// University Admin Analytics - University-specific statistics
router.get('/university/:universityId/overview', async (req, res) => {
  try {
    const { universityId } = req.params;
    const userContext = getUserContext(req);
    
    // Verify user has access to this university
    if (userContext.role === 'university_admin' && userContext.universityId !== parseInt(universityId)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied to this university' 
      });
    }

    const query = `
      SELECT 
        u.name as university_name,
        u.code,
        r.name as region_name,
        COUNT(DISTINCT h.id) as total_hostels,
        COUNT(DISTINCT CASE WHEN us.role = 'user' THEN us.id END) as total_students,
        COUNT(DISTINCT CASE WHEN us.role = 'hostel_admin' THEN us.id END) as total_hostel_admins,
        SUM(h.total_rooms) as total_rooms,
        SUM(h.available_rooms) as available_rooms,
        SUM(h.total_rooms - h.available_rooms) as occupied_rooms,
        CASE 
          WHEN SUM(h.total_rooms) > 0 THEN 
            ROUND((SUM(h.total_rooms - h.available_rooms)::numeric / SUM(h.total_rooms)::numeric) * 100, 2)
          ELSE 0 
        END as occupancy_rate
      FROM universities u
      LEFT JOIN regions r ON u.region_id = r.id
      LEFT JOIN hostels h ON h.university_id = u.id
      LEFT JOIN users us ON us.hostel_id = h.id
      WHERE u.id = $1
      GROUP BY u.id, u.name, u.code, r.name
    `;
    const result = await pool.query(query, [universityId]);
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Get university overview error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Hostel Admin Analytics - Hostel-specific statistics
router.get('/hostel/:hostelId/overview', async (req, res) => {
  try {
    const { hostelId } = req.params;
    const userContext = getUserContext(req);
    
    // Verify user has access to this hostel
    if (userContext.role === 'hostel_admin' && userContext.hostelId !== parseInt(hostelId)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied to this hostel' 
      });
    }

    const query = `
      WITH room_counts AS (
        SELECT 
          h.id as hostel_id,
          COUNT(*) FILTER (WHERE rm.status = 'occupied') as occupied_from_rooms,
          COUNT(*) FILTER (WHERE rm.status = 'available') as available_from_rooms
        FROM hostels h
        LEFT JOIN rooms rm ON rm.hostel_id = h.id
        WHERE h.id = $1
        GROUP BY h.id
      )
      SELECT 
        h.name as hostel_name,
        h.address,
        u.name as university_name,
        r.name as region_name,
        COUNT(CASE WHEN us.role = 'user' THEN us.id END) as total_students,
        COALESCE((SELECT occupied_from_rooms + available_from_rooms FROM room_counts), h.total_rooms) as total_rooms,
        COALESCE((SELECT available_from_rooms FROM room_counts), h.available_rooms) as available_rooms,
        COALESCE((SELECT occupied_from_rooms FROM room_counts), (h.total_rooms - h.available_rooms)) as occupied_rooms,
        CASE 
          WHEN COALESCE((SELECT occupied_from_rooms + available_from_rooms FROM room_counts), h.total_rooms) > 0 THEN 
            ROUND((COALESCE((SELECT occupied_from_rooms FROM room_counts), (h.total_rooms - h.available_rooms))::numeric 
              / COALESCE((SELECT occupied_from_rooms + available_from_rooms FROM room_counts), h.total_rooms)::numeric) * 100, 2)
          ELSE 0 
        END as occupancy_rate,
        h.status
      FROM hostels h
      LEFT JOIN universities u ON h.university_id = u.id
      LEFT JOIN regions r ON h.region_id = r.id
      LEFT JOIN users us ON us.hostel_id = h.id
      WHERE h.id = $1
      GROUP BY h.id, h.name, h.address, u.name, r.name, h.total_rooms, h.available_rooms, h.status
    `;
    const result = await pool.query(query, [hostelId]);
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Get hostel overview error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Get all regions for dropdowns
router.get('/regions', async (req, res) => {
  try {
    const query = 'SELECT * FROM regions ORDER BY name';
    const result = await pool.query(query);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get regions error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

export default router;
