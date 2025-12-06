require('dotenv').config();
require('express-async-errors');
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const cron = require('node-cron');

const authRoutes = require('./routes/auth');
const tenantRoutes = require('./routes/tenants');
const shopifyRoutes = require('./routes/shopify');
const dashboardRoutes = require('./routes/dashboard');
const syncRoutes = require('./routes/sync');
const webhookRoutes = require('./routes/webhooks');

const errorHandler = require('./middleware/errorHandler');
const { scheduledSync } = require('./services/scheduler');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['set-cookie']
}));
app.use(express.json());
app.use(cookieParser());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/shopify', shopifyRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/webhooks', webhookRoutes);

// Error handling
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);

  // Schedule sync every 15 minutes
  if (process.env.NODE_ENV !== 'test') {
    cron.schedule('*/15 * * * *', async () => {
      console.log('⏰ Running scheduled Shopify sync...');
      await scheduledSync();
    });
    console.log('⏲️  Scheduler initialized (runs every 15 minutes)');
  }
});

module.exports = app;
