const { clerkClient } = require('@clerk/clerk-sdk-node');
const User = require('../models/User');

// Verify JWT token from Clerk
const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    // Verify token with Clerk
    const payload = await clerkClient.verifyJwt(token);
    
    // Find user in our database
    const user = await User.findOne({ clerkId: payload.sub });
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Add user info to request object
    req.user = user;
    req.clerkUser = payload;
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

// Role-based access control
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required roles: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
};

// Check if user can access/modify specific resource
const requireOwnershipOrRole = (...allowedRoles) => {
  return (req, res, next) => {
    const targetUserId = req.params.id;
    const currentUser = req.user;

    // Allow if user is accessing their own resource
    if (currentUser._id.toString() === targetUserId) {
      return next();
    }

    // Allow if user has required role
    if (allowedRoles.includes(currentUser.role)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Access denied. You can only access your own resources.'
    });
  };
};

// Admin permission check
const requireAdminPermission = (permission) => {
  return (req, res, next) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    if (!req.user.adminInfo.permissions.includes(permission) && 
        !req.user.adminInfo.permissions.includes('system_admin')) {
      return res.status(403).json({
        success: false,
        message: `Required permission: ${permission}`
      });
    }

    next();
  };
};

module.exports = {
  verifyToken,
  requireRole,
  requireOwnershipOrRole,
  requireAdminPermission,
};