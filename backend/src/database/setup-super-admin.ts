import bcrypt from 'bcryptjs';
import pool from '../config/database';

async function setupSuperAdmin() {
  try {
    console.log('🔧 Setting up Super Admin...');

    // Check if super admin already exists
    const existingAdmin = await pool.query(
      'SELECT id FROM users WHERE role = $1',
      ['super_admin']
    );

    if (existingAdmin.rows.length > 0) {
      console.log('✅ Super Admin already exists');
      return;
    }

    // Generate secure default credentials
    const defaultEmail = process.env.SUPER_ADMIN_EMAIL || 'matthewmukasa0@gmail.com';
    const defaultUsername = process.env.SUPER_ADMIN_USERNAME || 'matthewmukasa0';
    const defaultPassword = process.env.SUPER_ADMIN_PASSWORD || '1100211Matt.';
    const defaultName = process.env.SUPER_ADMIN_NAME || 'Matthew Mukasa';

    // Hash password
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    // Create super admin
    const result = await pool.query(
      `INSERT INTO users (name, email, username, password, role, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING id, name, email, username, role`,
      [defaultName, defaultEmail, defaultUsername, hashedPassword, 'super_admin']
    );

    const admin = result.rows[0];

    console.log('🎉 Super Admin created successfully!');
    console.log('📧 Email:', admin.email);
    console.log('👤 Username:', admin.username);
    console.log('🔑 Password:', defaultPassword);
    console.log('⚠️  IMPORTANT: Change these credentials after first login!');

  } catch (error) {
    console.error('❌ Error setting up Super Admin:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  setupSuperAdmin()
    .then(() => {
      console.log('✅ Setup completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Setup failed:', error);
      process.exit(1);
    });
}

export default setupSuperAdmin;
