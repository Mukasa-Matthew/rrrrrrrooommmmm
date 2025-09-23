import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import morgan from 'morgan';
import authRoutes from './routes/auth';
import hostelRoutes from './routes/hostels';
import analyticsRoutes from './routes/analytics';
import multiTenantAnalyticsRoutes from './routes/multi-tenant-analytics';
import roomsRoutes from './routes/rooms';
import studentsRoutes from './routes/students';
import paymentsRoutes from './routes/payments';
import inventoryRoutes from './routes/inventory';
import expensesRoutes from './routes/expenses';
import universityRoutes from './routes/universities';
import authSettingsRoutes from './routes/auth-settings';
import custodiansRoutes from './routes/custodians';
import path from 'path';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security: Helmet
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS: allowlist via env CSV
const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000').split(',').map(s => s.trim());
app.use(cors({ origin: corsOrigins, credentials: true }));

// Body parsers with sane limits
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Compression
app.use(compression());

// Request logging (skip tests/production if disabled)
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.MORGAN_FORMAT || 'combined'));
}

// Rate limits: general and sensitive endpoints
const generalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 1000 });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 50 });
const writeLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 300 });
app.use(generalLimiter);

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/hostels', writeLimiter, hostelRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/multi-tenant', analyticsRoutes);
app.use('/api/universities', writeLimiter, universityRoutes);
app.use('/api/auth-settings', writeLimiter, authSettingsRoutes);
app.use('/api/custodians', writeLimiter, custodiansRoutes);
app.use('/api/rooms', writeLimiter, roomsRoutes);
app.use('/api/students', writeLimiter, studentsRoutes);
app.use('/api/payments', writeLimiter, paymentsRoutes);
app.use('/api/inventory', writeLimiter, inventoryRoutes);
app.use('/api/expenses', writeLimiter, expensesRoutes);

// Static uploads
app.use('/uploads', express.static(path.join(process.cwd(), 'backend', 'uploads')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'LTS Portal API is running',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found' 
  });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ 
    success: false, 
    message: 'Internal server error' 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔐 Auth endpoints: http://localhost:${PORT}/api/auth`);
});

export default app;
