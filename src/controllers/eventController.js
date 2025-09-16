const Event = require('../models/event');
const User = require('../models/User');
const Institution = require('../models/Institution');

// @desc    Create new event
// @route   POST /api/events
// @access  Admin only

const createEvent = async (req, res) => {
  try {
    const {
      title,
      description,
      eventType,
      startDate,
      endDate,
      location,
      capacity,
      registrationDeadline,
      price,
      tags,
      institution,
      isPublic,
      images
    } = req.body;

    // Validate required fields
    if (!title || !description || !eventType || !startDate || !endDate || !location || !institution) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: title, description, eventType, startDate, endDate, location, institution'
      });
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();

    if (start <= now) {
      return res.status(400).json({
        success: false,
        message: 'Start date must be in the future'
      });
    }

    if (end <= start) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after start date'
      });
    }

    if (registrationDeadline) {
      const regDeadline = new Date(registrationDeadline);
      if (regDeadline > start) {
        return res.status(400).json({
          success: false,
          message: 'Registration deadline must be before or on the start date'
        });
      }
    }

    // Validate institution exists and user has access to it
    const institutionDoc = await Institution.findById(institution);
    if (!institutionDoc) {
      return res.status(404).json({
        success: false,
        message: 'Institution not found'
      });
    }

    // Check if user is admin of this institution (assuming you have this logic)
    // You might need to adjust this based on your User/Institution relationship
    const currentUser = await User.findById(req.user.id);
    if (currentUser.role !== 'admin' && currentUser.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can create events'
      });
    }

    // For regular admins, check if they belong to this institution
    if (currentUser.role === 'admin' && currentUser.institution.toString() !== institution) {
      return res.status(403).json({
        success: false,
        message: 'You can only create events for your institution'
      });
    }

    // Validate location data
    if (location.type === 'physical' || location.type === 'hybrid') {
      if (!location.venue) {
        return res.status(400).json({
          success: false,
          message: 'Venue is required for physical and hybrid events'
        });
      }
    }

    if (location.type === 'online' || location.type === 'hybrid') {
      if (!location.onlineLink) {
        return res.status(400).json({
          success: false,
          message: 'Online link is required for online and hybrid events'
        });
      }
      // Validate URL format
      const urlPattern = /^https?:\/\/.+/;
      if (!urlPattern.test(location.onlineLink)) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid URL for online link'
        });
      }
    }

    // Validate capacity if provided
    if (capacity && (capacity < 1 || capacity > 10000)) {
      return res.status(400).json({
        success: false,
        message: 'Capacity must be between 1 and 10,000'
      });
    }

    // Validate price if provided
    if (price && price.amount < 0) {
      return res.status(400).json({
        success: false,
        message: 'Price cannot be negative'
      });
    }

    // Create event object
    const eventData = {
      title: title.trim(),
      description: description.trim(),
      eventType,
      startDate: start,
      endDate: end,
      location: {
        type: location.type,
        venue: location.venue?.trim(),
        address: location.address,
        onlineLink: location.onlineLink
      },
      organizer: req.user.id,
      institution,
      createdBy: req.user.id,
      status: 'published' // You can change this to 'draft' if you want events to be draft by default
    };

    // Add optional fields if provided
    if (capacity) eventData.capacity = capacity;
    if (registrationDeadline) eventData.registrationDeadline = new Date(registrationDeadline);
    if (price) eventData.price = price;
    if (tags && Array.isArray(tags)) {
      eventData.tags = tags.map(tag => tag.trim()).filter(tag => tag.length > 0);
    }
    if (typeof isPublic === 'boolean') eventData.isPublic = isPublic;
    if (images && Array.isArray(images)) eventData.images = images;

    // Create the event
    const event = await Event.create(eventData);

    // Populate the response
    const populatedEvent = await Event.findById(event._id)
      .populate('organizer', 'firstName lastName email')
      .populate('institution', 'name logo')
      .populate('createdBy', 'firstName lastName email');

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      data: populatedEvent
    });

  } catch (error) {
    console.error('Error creating event:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }

    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Event with this title already exists for this institution'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while creating event',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

const getAllEvents = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = { isActive: true };

    // If user is not admin, only show events from their institution
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      filter.institution = req.user.institution;
    }

    // Optional filters
    if (req.query.eventType) {
      filter.eventType = req.query.eventType;
    }

    if (req.query.upcoming === 'true') {
      filter.date = { $gte: new Date() };
    }

    if (req.query.past === 'true') {
      filter.date = { $lt: new Date() };
    }

    // Date range filter
    if (req.query.startDate && req.query.endDate) {
      filter.date = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    }

    const events = await Event.find(filter)
      .populate('institution', 'name logo')
      .populate('createdBy', 'name email')
      .populate('attendees.user', 'name email')
      .sort({ date: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const total = await Event.countDocuments(filter);

    // Format events for response
    const formattedEvents = events.map(event => ({
      _id: event._id,
      title: event.title,
      description: event.description,
      date: event.date,
      location: event.location,
      eventType: event.eventType,
      institution: event.institution,
      createdBy: {
        _id: event.createdBy._id,
        name: event.createdBy.name,
        email: event.createdBy.email
      },
      attendeesCount: event.attendees.length,
      maxAttendees: event.maxAttendees,
      isUserRegistered: event.attendees.some(
        attendee => attendee.user._id.toString() === req.user._id.toString()
      ),
      createdAt: event.createdAt,
      updatedAt: event.updatedAt
    }));

    res.status(200).json({
      success: true,
      count: formattedEvents.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: formattedEvents
    });

  } catch (error) {
    console.error('Error in getAllEvents:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching events',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

const getEventById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event ID format'
      });
    }

    const event = await Event.findById(id)
      .populate('organizer', 'firstName lastName email phone')
      .populate('institution', 'name logo description contactInfo')
      .populate('attendees.user', 'firstName lastName email batch')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check if user can view this event
    const canView = 
      event.isPublic || 
      req.user.role === 'admin' || 
      req.user.role === 'superadmin' ||
      event.organizer._id.toString() === req.user.id ||
      event.createdBy._id.toString() === req.user.id;

    if (!canView) {
      // Check if user is from same institution
      const user = await User.findById(req.user.id);
      if (!user.institution || user.institution.toString() !== event.institution._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to view this event'
        });
      }
    }

    // Check if current user is registered
    const isUserRegistered = event.attendees.some(
      attendee => attendee.user._id.toString() === req.user.id
    );

    // Get user's registration details if registered
    const userRegistration = event.attendees.find(
      attendee => attendee.user._id.toString() === req.user.id
    );

    res.status(200).json({
      success: true,
      message: 'Event details retrieved successfully',
      data: {
        ...event.toObject(),
        isUserRegistered,
        userRegistration: userRegistration || null,
        attendeeCount: event.attendees.length,
        spotsRemaining: event.maxAttendees ? event.maxAttendees - event.attendees.length : null,
        isRegistrationOpen: (() => {
          const now = new Date();
          const registrationOpen = !event.registrationDeadline || now < event.registrationDeadline;
          const eventNotStarted = now < event.dateTime;
          const hasSpots = !event.maxAttendees || event.attendees.length < event.maxAttendees;
          return registrationOpen && eventNotStarted && hasSpots && event.status === 'published';
        })()
      }
    });
  } catch (error) {
    console.error('Get event by ID error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve event details'
    });
  }
};

// Update event (admin or organizer only)
const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event ID format'
      });
    }

    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check permissions
    const canUpdate = 
      req.user.role === 'admin' || 
      req.user.role === 'superadmin' ||
      event.organizer.toString() === req.user.id ||
      event.createdBy.toString() === req.user.id;

    if (!canUpdate) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this event'
      });
    }

    // Update fields
    const updateFields = { ...req.body };
    delete updateFields.organizer; // Prevent changing organizer
    delete updateFields.institution; // Prevent changing institution
    delete updateFields.createdBy; // Prevent changing creator
    
    updateFields.updatedBy = req.user.id;

    // Validate dates if being updated
    if (updateFields.dateTime) {
      const eventDate = new Date(updateFields.dateTime);
      if (eventDate <= new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Event date must be in the future'
        });
      }
    }

    const updatedEvent = await Event.findByIdAndUpdate(
      id,
      updateFields,
      { new: true, runValidators: true }
    ).populate([
      { path: 'organizer', select: 'firstName lastName email' },
      { path: 'institution', select: 'name logo' },
      { path: 'updatedBy', select: 'firstName lastName' }
    ]);

    res.status(200).json({
      success: true,
      message: 'Event updated successfully',
      data: updatedEvent
    });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update event'
    });
  }
};

// Delete event (admin or organizer only)
const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event ID format'
      });
    }

    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check permissions
    const canDelete = 
      req.user.role === 'admin' || 
      req.user.role === 'superadmin' ||
      event.organizer.toString() === req.user.id ||
      event.createdBy.toString() === req.user.id;

    if (!canDelete) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this event'
      });
    }

    await Event.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete event'
    });
  }
};

const rsvpEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event || !event.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check if event is from user's institution (alumni/students can only RSVP to their institution's events)
    if (!event.institution.equals(req.user.institution)) {
      return res.status(403).json({
        success: false,
        message: 'You can only RSVP to events from your institution'
      });
    }

    // Check if event date has passed
    if (new Date(event.date) < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot RSVP to past events'
      });
    }

    // Check if already RSVP'd
    if (event.attendees.includes(req.user._id)) {
      return res.status(400).json({
        success: false,
        message: 'You have already RSVP\'d to this event'
      });
    }

    // Check capacity
    if (event.maxAttendees && event.attendees.length >= event.maxAttendees) {
      return res.status(400).json({
        success: false,
        message: 'Event has reached maximum capacity'
      });
    }

    // Add user to attendees
    event.attendees.push(req.user._id);
    await event.save();

    // Populate the event with updated attendee information
    await event.populate('attendees', 'firstName lastName email batch');

    res.json({
      success: true,
      message: 'Successfully RSVP\'d to the event',
      data: {
        eventId: event._id,
        eventTitle: event.title,
        eventDate: event.date,
        totalAttendees: event.attendees.length,
        maxAttendees: event.maxAttendees
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error processing RSVP',
      error: error.message
    });
  }
};

const cancelRsvp = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event || !event.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check if user has RSVP'd
    if (!event.attendees.includes(req.user._id)) {
      return res.status(400).json({
        success: false,
        message: 'You have not RSVP\'d to this event'
      });
    }

    // Check if event date has passed
    if (new Date(event.date) < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel RSVP for past events'
      });
    }

    // Remove user from attendees
    event.attendees = event.attendees.filter(
      attendee => !attendee.equals(req.user._id)
    );
    await event.save();

    res.json({
      success: true,
      message: 'Successfully cancelled RSVP',
      data: {
        eventId: event._id,
        eventTitle: event.title,
        totalAttendees: event.attendees.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error cancelling RSVP',
      error: error.message
    });
  }
};
module.exports = {
  createEvent,
  getAllEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  rsvpEvent,
  cancelRsvp
};