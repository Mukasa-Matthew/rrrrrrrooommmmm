import pool from '../config/database';

async function addSubscriptionPlansMigration() {
  try {
    console.log('Adding subscription plans system...');

    // Create subscription_plans table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS subscription_plans (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        duration_months INTEGER NOT NULL,
        price_per_month DECIMAL(10,2) NOT NULL,
        total_price DECIMAL(10,2) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create hostel_subscriptions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS hostel_subscriptions (
        id SERIAL PRIMARY KEY,
        hostel_id INTEGER REFERENCES hostels(id) ON DELETE CASCADE,
        plan_id INTEGER REFERENCES subscription_plans(id),
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        amount_paid DECIMAL(10,2) NOT NULL,
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
        payment_method VARCHAR(50),
        payment_reference VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Add subscription_id to hostels table
    await pool.query(`
      ALTER TABLE hostels 
      ADD COLUMN IF NOT EXISTS current_subscription_id INTEGER REFERENCES hostel_subscriptions(id);
    `);

    // Insert default subscription plans
    const defaultPlans = [
      {
        name: 'Semester Plan',
        description: '4 months subscription - perfect for academic semesters',
        duration_months: 4,
        price_per_month: 250000,
        total_price: 1000000
      },
      {
        name: 'Half Year Plan',
        description: '6 months subscription - great for extended periods',
        duration_months: 6,
        price_per_month: 240000,
        total_price: 1440000
      },
      {
        name: 'Full Year Plan',
        description: '12 months subscription - best value for long-term use',
        duration_months: 12,
        price_per_month: 200000,
        total_price: 2400000
      }
    ];

    for (const plan of defaultPlans) {
      await pool.query(`
        INSERT INTO subscription_plans (name, description, duration_months, price_per_month, total_price)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT DO NOTHING
      `, [plan.name, plan.description, plan.duration_months, plan.price_per_month, plan.total_price]);
    }

    // Create indexes for performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_hostel_subscriptions_hostel_id ON hostel_subscriptions(hostel_id);
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_hostel_subscriptions_status ON hostel_subscriptions(status);
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_hostel_subscriptions_end_date ON hostel_subscriptions(end_date);
    `);

    console.log('✅ Subscription plans system added successfully');
  } catch (error) {
    console.error('❌ Error adding subscription plans system:', error);
    throw error;
  }
}

// Execute the migration
addSubscriptionPlansMigration()
  .then(() => console.log('Migration completed successfully'))
  .catch((err) => console.error('Migration failed:', err));
