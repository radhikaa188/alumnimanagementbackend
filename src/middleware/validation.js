const validateObjectId = (req, res, next) => {
  const { id } = req.params;
  const mongoose = require('mongoose');

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json(errorResponse('Invalid user ID format'));
  }

  next();
};

// Validate required fields for role change
const validateRoleChange = (req, res, next) => {
  const { role } = req.body;
  
  if (!role) {
    return next(); // No role change, proceed
  }

  // Only admins can change roles
  if (req.user.role !== 'admin') {
    return res.status(403).json(errorResponse('Only admins can change user roles'));
  }

  const validRoles = ['student', 'alumni', 'admin'];
  if (!validRoles.includes(role)) {
    return res.status(400).json(errorResponse('Invalid role'));
  }

  next();
};

module.exports = {
  validateUserRegistration,
  validateUserUpdate,
  validateSearchParams,
  validateObjectId,
  validateRoleChange
};