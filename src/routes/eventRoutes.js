const express = require('express');
const { getEventById, updateEvent, deleteEvent, getAllEvents, createEvent, rsvpEvent, cancelRsvp} = require('../controllers/eventController');
const { verifyToken, requireRole } = require('../middleware/auth');
const router = express.Router();

// All routes require authentication

router.use(verifyToken);


// @route   POST /api/events
// @desc    Create event
// @access  Admin only
router.post('/',verifyToken, requireRole('admin'), createEvent);
// GET /api/events - List all events (for logged-in users)

router.get('/',verifyToken, getAllEvents);

// GET /api/events/:id - Get event details
router.get('/:id', verifyToken,getEventById);

// PUT /api/events/:id - Update event (admin or organizer only)
router.put('/:id',verifyToken, updateEvent);

// DELETE /api/events/:id - Delete event (admin or organizer only)
router.delete('/:id', verifyToken, deleteEvent);

// POST /api/events/:id/rsvp - RSVP to an event (authenticated users)
router.post('/:id/rsvp', verifyToken, rsvpEvent);

// POST /api/events/:id/cancel - Cancel RSVP (authenticated users)
router.post('/:id/cancel', verifyToken, cancelRsvp);    

module.exports = router;