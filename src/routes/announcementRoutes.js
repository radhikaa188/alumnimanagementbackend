const express = require('express');
const router = express.Router();
const {
  createAnnouncement,
  getAllAnnouncements,
  getAnnouncementById,
  updateAnnouncement,
  deleteAnnouncement
} = require('../controllers/announcementController');

const { verifyToken } = require('../middleware/auth');
const { adminAuth } = require('../middleware/adminAuth');

// Public routes (require authentication)
router.get('/', verifyToken, getAllAnnouncements);
router.get('/:id',verifyToken, getAnnouncementById);

// Admin only routes
router.post('/', verifyToken,  createAnnouncement);
router.put('/:id', verifyToken, updateAnnouncement);
router.delete('/:id',verifyToken, deleteAnnouncement);

module.exports = router;