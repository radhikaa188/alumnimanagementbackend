const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  searchAlumni,
  getCurrentUser,
  syncUserFromClerk
} = require('../controllers/userController');

const {
  verifyToken,
  requireRole,
  requireOwnershipOrRole,
  requireAdminPermission
} = require('../middleware/auth');

// Public routes (no authentication required)
// Clerk webhook for user sync
router.post('/webhook/clerk', syncUserFromClerk);

// Protected routes (authentication required)
router.use(verifyToken);

// Get current user profile
router.get('/me', getCurrentUser);

// Get all users (admin only)
router.get('/', requireRole('admin'),getAllUsers);


// Search alumni (accessible to all authenticated users)
router.get('/search', searchAlumni);

// Get single user profile (self or admin)
router.get('/:id', requireOwnershipOrRole('admin'), getUserById);

// Update user profile (self or admin)
router.put('/:id', requireOwnershipOrRole('admin'), updateUser);

// Delete user (admin only with manage_users permission)
router.delete('/:id', 
  requireRole('admin'),
  requireAdminPermission('manage_users'),
  deleteUser
);

module.exports = router;