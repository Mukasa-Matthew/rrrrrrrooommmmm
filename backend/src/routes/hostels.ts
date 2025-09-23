import express from 'express';
import bcrypt from 'bcryptjs';
import { HostelModel, CreateHostelWithAdminData } from '../models/Hostel';
import { UserModel } from '../models/User';
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
    const sortable = new Set(['name','created_at','total_rooms']);
    const sortCol = sortable.has(sort) ? sort : 'name';

    const list = await pool.query(`SELECT id, name, address, status, created_at FROM hostels ORDER BY ${sortCol} ${order} LIMIT ${limit} OFFSET ${offset}`);
    const totalRes = await pool.query('SELECT COUNT(*)::int AS total FROM hostels');
    res.json({ success: true, data: list.rows, page, limit, total: totalRes.rows[0].total });
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
      admin_name,
      admin_email,
      admin_phone,
      admin_address
    }: CreateHostelWithAdminData = req.body;

    // Validate required fields
    if (!name || !address || !total_rooms || !admin_name || !admin_email || !admin_phone || !admin_address) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
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