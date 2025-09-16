const express = require('express');
const config = require('../../config/config');
const router = express.Router();

// Import route modules
const userRoutes = require('./userRoutes');
const institutionRoutes = require('./institutionRoutes'); // New addition
const eventRoutes = require('./eventRoutes');
const announcementRoutes = require('./announcementRoutes');


// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Alumni Management System API is running',
    timestamp: new Date().toISOString(),
    environment: config.server.environment
  });
});

// Mount route modules
router.use('/users', userRoutes);
router.use('/institutions', institutionRoutes); // New addition
router.use('/events', eventRoutes); 
router.use('/announcements', announcementRoutes);


router.use('/api/events', require('./eventRoutes'));
// API info endpoint
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Alumni Management System API',
    version: '1.0.0',
    endpoints: {
      users: '/api/users',
      institutions: '/api/institutions', // New addition
      health: '/api/health'
    }
  });
});

module.exports = router;