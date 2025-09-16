const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const config = require('../config/config');
const { connectDB } = require('./utils/database');
const { errorResponse } = require('./utils/helpers');
const routes = require('./routes');
// Import routes
const apiRoutes = require('./routes/index');

const app = express();

// Connect to database
connectDB();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors(config.cors));

// Logging middleware (only in development)
if (config.server.environment === 'development') {
  app.use(morgan('combined'));
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API routes
app.use('/api', apiRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Alumni Management System API',
    version: '1.0.0',
    environment: config.server.environment,
    documentation: '/api'
  });
});

// 404 handler for undefined routes
app.use((req, res, next) => {
  res.status(404).json(errorResponse(`Route ${req.originalUrl} not found`));
});



// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  
  // Mongoose validation error
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map(e => e.message);
    return res.status(400).json(errorResponse('Validation Error', errors));
  }
  
  // Mongoose duplicate key error
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    return res.status(409).json(errorResponse(`${field} already exists`));
  }
  
  // Mongoose cast error (invalid ObjectId)
  if (error.name === 'CastError') {
    return res.status(400).json(errorResponse('Invalid ID format'));
  }
  
  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json(errorResponse('Invalid token'));
  }
  
  if (error.name === 'TokenExpiredError') {
    return res.status(401).json(errorResponse('Token expired'));
  }

  // Clerk errors
  if (error.name === 'ClerkError') {
    return res.status(401).json(errorResponse('Authentication failed'));
  }
  
  // Default server error
  res.status(error.status || 500).json(
    errorResponse(
      config.server.environment === 'production' 
        ? 'Internal server error' 
        : error.message || 'Internal server error'
    )
  );
});

module.exports = app;
