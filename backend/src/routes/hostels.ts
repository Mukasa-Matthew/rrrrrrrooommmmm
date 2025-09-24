import express from 'express';
import bcrypt from 'bcryptjs';
import { HostelModel, CreateHostelWithAdminData } from '../models/Hostel';
import { UserModel } from '../models/User';
import { HostelSubscriptionModel } from '../models/SubscriptionPlan';
import { EmailService } from '../services/emailService';
import { CredentialGenerator } from '../utils/credentialGenerator';
import pool from '../config/database';

const router = express.Router();

// Get all hostels
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
    const limitRaw = Math.max(1, parseInt((req.query.limit as string) || '20', 10));
    const limit = Math.min(100, limitRaw);
    const offset = (page - 1) * limit;
    const sort = (req.query.sort as string) || 'name';
    const order = ((req.query.order as string) || 'asc').toLowerCase() === 'desc' ? 'DESC' : 'ASC';
    const search = (req.query.search as string) || '';
    const statusFilter = (req.query.status as string) || '';
    const sortable = new Set(['name','created_at','total_rooms']);
    const sortCol = sortable.has(sort) ? sort : 'name';

    // Build WHERE clause
    let whereClause = '';
    const params: any[] = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      whereClause += ` WHERE (h.name ILIKE $${paramCount} OR h.address ILIKE $${paramCount} OR u.name ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    if (statusFilter) {
      paramCount++;
      if (whereClause) {
        whereClause += ` AND hs.status = $${paramCount}`;
      } else {
        whereClause += ` WHERE hs.status = $${paramCount}`;
      }
      params.push(statusFilter);
    }

    const query = `
      SELECT 
        h.id, h.name, h.address, h.status, h.created_at, h.total_rooms, h.available_rooms,
        h.contact_phone, h.contact_email,
        u.name as admin_name, u.email as admin_email,
        hs.id as subscription_id, hs.status as subscription_status, hs.start_date, hs.end_date,
        hs.amount_paid, sp.name as plan_name, sp.total_price,
        (SELECT COUNT(*) FROM student_room_assignments sra JOIN rooms r ON sra.room_id = r.id WHERE r.hostel_id = h.id AND sra.status = 'active') as students_count
      FROM hostels h
      LEFT JOIN users u ON h.id = u.hostel_id AND u.role = 'hostel_admin'
      LEFT JOIN hostel_subscriptions hs ON h.current_subscription_id = hs.id
      LEFT JOIN subscription_plans sp ON hs.plan_id = sp.id
      ${whereClause}
      ORDER BY h.${sortCol} ${order}
      LIMIT ${limit} OFFSET ${offset}
    `;

    const countQuery = `
      SELECT COUNT(*)::int AS total
      FROM hostels h
      LEFT JOIN users u ON h.id = u.hostel_id AND u.role = 'hostel_admin'
      LEFT JOIN hostel_subscriptions hs ON h.current_subscription_id = hs.id
      ${whereClause}
    `;

    const [list, totalRes] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, params)
    ]);

    // Transform the data
    const transformedData = list.rows.map(row => ({
      id: row.id,
      name: row.name,
      address: row.address,
      status: row.status,
      created_at: row.created_at,
      total_rooms: row.total_rooms,
      available_rooms: row.available_rooms,
      contact_phone: row.contact_phone,
      contact_email: row.contact_email,
      admin: row.admin_name ? {
        name: row.admin_name,
        email: row.admin_email
      } : null,
      subscription: row.subscription_id ? {
        id: row.subscription_id,
        plan_name: row.plan_name,
        status: row.subscription_status,
        start_date: row.start_date,
        end_date: row.end_date,
        amount_paid: row.amount_paid,
        total_price: row.total_price
      } : null,
      students_count: row.students_count
    }));

    res.json({ 
      success: true, 
      data: transformedData, 
      page, 
      limit, 
      total: totalRes.rows[0].total 
    });
  } catch (error) {
    console.error('Get hostels error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Get hostel by ID
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const hostel = await HostelModel.findById(id);
    
    if (!hostel) {
      return res.status(404).json({ 
        success: false, 
        message: 'Hostel not found' 
      });
    }

    res.json({
      success: true,
      data: hostel
    });
  } catch (error) {
    console.error('Get hostel error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Create new hostel with admin
router.post('/', async (req, res) => {
  try {
    const {
      name,
      address,
      description,
      total_rooms,
      available_rooms,
      contact_phone,
      contact_email,
      status,
      university_id,
      region_id,
      subscription_plan_id,
      admin_name,
      admin_email,
      admin_phone,
      admin_address
    }: CreateHostelWithAdminData = req.body;

    // Validate required fields
    if (!name || !address || !total_rooms || !admin_name || !admin_email || !admin_phone || !admin_address || !subscription_plan_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields including subscription plan' 
      });
    }

    // Generate temporary credentials
    const temporaryUsername = admin_email; // Use email as username
    const temporaryPassword = CredentialGenerator.generatePatternPassword(); // Generate memorable password

    // Check if admin email already exists for this specific hostel
    // (Now allowed to have same email across different hostels)
    const existingUser = await UserModel.findByEmail(admin_email);
    if (existingUser && existingUser.role === 'hostel_admin' && existingUser.hostel_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'This email is already assigned as admin to another hostel' 
      });
    }

    // Start transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create hostel
      const hostelData = {
        name,
        address,
        description,
        total_rooms,
        available_rooms: available_rooms || total_rooms,
        contact_phone,
        contact_email,
        status: status || 'active'
      };

      const hostel = await HostelModel.create(hostelData);

      // Hash temporary password
      const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

      // Create hostel admin user
      const adminData = {
        email: admin_email,
        name: admin_name,
        password: hashedPassword,
        role: 'hostel_admin' as const
      };

      const admin = await UserModel.create(adminData);

      // Update admin's hostel_id
      await client.query('UPDATE users SET hostel_id = $1 WHERE id = $2', [hostel.id, admin.id]);

      // Create subscription for the hostel
      const subscription = await HostelSubscriptionModel.create({
        hostel_id: hostel.id,
        plan_id: parseInt(subscription_plan_id),
        start_date: new Date(),
        end_date: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)), // Default 30 days, will be updated based on plan
        amount_paid: 0, // Will be updated when payment is recorded
        status: 'active',
        payment_method: 'pending',
        payment_reference: `PENDING-${hostel.id}-${Date.now()}`
      });

      // Update subscription end date based on plan duration
      const planResult = await client.query('SELECT duration_months FROM subscription_plans WHERE id = $1', [subscription_plan_id]);
      if (planResult.rows.length > 0) {
        const durationMonths = planResult.rows[0].duration_months;
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + durationMonths);
        
        await client.query('UPDATE hostel_subscriptions SET end_date = $1 WHERE id = $2', [endDate, subscription.id]);
      }

      // Update hostel with current subscription
      await client.query('UPDATE hostels SET current_subscription_id = $1 WHERE id = $2', [subscription.id, hostel.id]);

      await client.query('COMMIT');

      // Send welcome email with temporary credentials
      try {
        const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`;
        const emailHtml = EmailService.generateHostelAdminWelcomeEmail(
          admin_name,
          admin_email,
          temporaryUsername,
          temporaryPassword,
          hostel.name,
          loginUrl
        );

        const emailSent = await EmailService.sendEmail({
          to: admin_email,
          subject: `Welcome to LTS Portal - Hostel Admin for ${hostel.name}`,
          html: emailHtml
        });

        if (!emailSent) {
          console.warn('Failed to send welcome email to hostel admin');
        }
      } catch (emailError) {
        console.error('Error sending welcome email:', emailError);
        // Don't fail the request if email fails
      }

      res.status(201).json({
        success: true,
        message: 'Hostel and admin created successfully. Welcome email sent to admin.',
        data: {
          hostel,
          admin: {
            id: admin.id,
            email: admin.email,
            name: admin.name,
            role: admin.role,
            hostel_id: hostel.id
          }
        }
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Create hostel error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Update hostel
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const updateData = req.body;

    const hostel = await HostelModel.update(id, updateData);
    
    if (!hostel) {
      return res.status(404).json({ 
        success: false, 
        message: 'Hostel not found' 
      });
    }

    res.json({
      success: true,
      message: 'Hostel updated successfully',
      data: hostel
    });
  } catch (error) {
    console.error('Update hostel error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Delete hostel
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const deleted = await HostelModel.delete(id);
    
    if (!deleted) {
      return res.status(404).json({ 
        success: false, 
        message: 'Hostel not found' 
      });
    }

    res.json({
      success: true,
      message: 'Hostel and associated admin deleted successfully'
    });
  } catch (error) {
    console.error('Delete hostel error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Get hostel statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const stats = await HostelModel.getHostelStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get hostel stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Resend credentials to hostel admin
router.post('/:id/resend-credentials', async (req, res) => {
  try {
    const hostelId = parseInt(req.params.id);
    
    // Get hostel details
    const hostel = await HostelModel.findById(hostelId);
    if (!hostel) {
      return res.status(404).json({
        success: false,
        message: 'Hostel not found'
      });
    }

    // Get the hostel admin by hostel_id
    const adminQuery = 'SELECT * FROM users WHERE hostel_id = $1 AND role = $2';
    const adminResult = await pool.query(adminQuery, [hostelId, 'hostel_admin']);
    const admin = adminResult.rows[0];
    
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Hostel admin not found'
      });
    }

    // Generate new temporary password
    const newTemporaryPassword = CredentialGenerator.generatePatternPassword();
    
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newTemporaryPassword, 10);
    
    // Update the admin's password
    await UserModel.update(admin.id, { password: hashedPassword });

    // Send new credentials via email
    try {
      const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`;
      const emailHtml = EmailService.generateHostelAdminWelcomeEmail(
        admin.name,
        admin.email,
        admin.email, // Username is the email
        newTemporaryPassword,
        hostel.name,
        loginUrl
      );

      const emailSent = await EmailService.sendEmail({
        to: admin.email,
        subject: `New Login Credentials - LTS Portal (${hostel.name})`,
        html: emailHtml
      });

      if (!emailSent) {
        console.warn('Failed to send new credentials email to hostel admin');
      }
    } catch (emailError) {
      console.error('Error sending new credentials email:', emailError);
      // Don't fail the request if email fails
    }

    res.json({
      success: true,
      message: 'New credentials sent successfully',
      data: {
        admin_email: admin.email,
        new_password: newTemporaryPassword // Only for development - remove in production
      }
    });

  } catch (error) {
    console.error('Resend credentials error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;

// Admin summary for a hostel: primary admin and custodian count
router.get('/:id/admin-summary', async (req, res) => {
  try {
    const hostelId = Number(req.params.id);
    if (!Number.isFinite(hostelId)) return res.status(400).json({ success: false, message: 'Invalid hostel id' });

    const adminRes = await pool.query(
      `SELECT id, name, email, username, created_at FROM users WHERE hostel_id = $1 AND role = 'hostel_admin' ORDER BY created_at ASC LIMIT 1`,
      [hostelId]
    );
    const hostelRes = await pool.query(
      `SELECT name, address, contact_phone, contact_email FROM hostels WHERE id = $1`,
      [hostelId]
    );
    const custodianRes = await pool.query(
      `SELECT COUNT(*)::int AS cnt FROM custodians WHERE hostel_id = $1`,
      [hostelId]
    );

    const admin = adminRes.rows[0] || null;
    const hostel = hostelRes.rows[0] || null;
    return res.json({
      success: true,
      data: admin ? {
        admin_id: admin.id,
        admin_name: admin.name,
        admin_email: admin.email,
        admin_username: admin.username || null,
        admin_created_at: admin.created_at,
        custodian_count: custodianRes.rows[0]?.cnt || 0,
        contact_phone: hostel?.contact_phone || null,
        contact_email: hostel?.contact_email || null,
        address: hostel?.address || null
      } : {
        admin_id: null,
        admin_name: 'Unknown',
        admin_email: '-',
        admin_username: null,
        admin_created_at: null,
        custodian_count: custodianRes.rows[0]?.cnt || 0,
        contact_phone: hostel?.contact_phone || null,
        contact_email: hostel?.contact_email || null,
        address: hostel?.address || null
      }
    });
  } catch (e) {
    console.error('Admin summary error:', e);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});