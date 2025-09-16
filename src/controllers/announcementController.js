const Announcement = require('../models/Announcement');

// Create announcement (admin only)
exports.createAnnouncement = async (req, res) => {
  try {
    const {
      title,
      content,
      type,
      priority,
      targetAudience,
      attachments,
      publishDate,
      expiryDate
    } = req.body;

    // Validate required fields
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Title and content are required'
      });
    }

    const announcement = new Announcement({
      title,
      content,
      type: type || 'general',
      priority: priority || 'medium',
      institution: req.user.institution,
      author: req.user._id,
      targetAudience: targetAudience || { roles: ['all'] },
      attachments: attachments || [],
      publishDate: publishDate || Date.now(),
      expiryDate: expiryDate || null
    });

    await announcement.save();
    await announcement.populate([
      { path: 'author', select: 'firstName lastName email' },
      { path: 'institution', select: 'name' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Announcement created successfully',
      data: announcement
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating announcement',
      error: error.message
    });
  }
};

// Get all announcements
exports.getAllAnnouncements = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      type, 
      priority,
      batch,
      department,
      active = true 
    } = req.query;
    
    const skip = (page - 1) * limit;
    
    let filter = { 
      isActive: active === 'true',
      isPublished: true
    };
    
    // Filter by user's institution
    if (req.user.role !== 'superadmin') {
      filter.institution = req.user.institution;
    }

    // Check if announcement is still valid (not expired)
    filter.$or = [
      { expiryDate: null },
      { expiryDate: { $gte: new Date() } }
    ];

    // Filter by type
    if (type) {
      filter.type = type;
    }

    // Filter by priority
    if (priority) {
      filter.priority = priority;
    }

    // Filter by target audience
    let audienceFilter = {};
    
    // Check if user's batch matches
    if (req.user.batch && batch) {
      audienceFilter['targetAudience.batches'] = { $in: [req.user.batch, batch] };
    } else if (req.user.batch) {
      audienceFilter.$or = [
        { 'targetAudience.batches': { $size: 0 } }, // No specific batches targeted
        { 'targetAudience.batches': { $in: [req.user.batch] } }
      ];
    }

    // Check if user's department matches
    if (req.user.department && department) {
      audienceFilter['targetAudience.departments'] = { $in: [req.user.department, department] };
    } else if (req.user.department) {
      audienceFilter.$or = [
        ...(audienceFilter.$or || []),
        { 'targetAudience.departments': { $size: 0 } }, // No specific departments targeted
        { 'targetAudience.departments': { $in: [req.user.department] } }
      ];
    }

    // Check if user's role matches
    audienceFilter.$or = [
      ...(audienceFilter.$or || []),
      { 'targetAudience.roles': { $in: ['all', req.user.role] } }
    ];

    // Combine filters
    const finalFilter = { ...filter, ...audienceFilter };

    const announcements = await Announcement.find(finalFilter)
      .populate('author', 'firstName lastName email')
      .populate('institution', 'name')
      .sort({ priority: -1, publishDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Announcement.countDocuments(finalFilter);

    res.json({
      success: true,
      data: announcements,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: announcements.length,
        totalAnnouncements: total
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching announcements',
      error: error.message
    });
  }
};

// Get single announcement
exports.getAnnouncementById = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id)
      .populate('author', 'firstName lastName email')
      .populate('institution', 'name')
      .populate('viewedBy.user', 'firstName lastName');

    if (!announcement || !announcement.isActive || !announcement.isPublished) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    // Check if user has access to this announcement
    if (req.user.role !== 'superadmin' && 
        !announcement.institution.equals(req.user.institution)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Check if announcement has expired
    if (announcement.expiryDate && new Date(announcement.expiryDate) < new Date()) {
      return res.status(410).json({
        success: false,
        message: 'This announcement has expired'
      });
    }

    // Track view if not already viewed by this user
    const hasViewed = announcement.viewedBy.some(
      view => view.user.equals(req.user._id)
    );

    if (!hasViewed) {
      announcement.views += 1;
      announcement.viewedBy.push({
        user: req.user._id,
        viewedAt: new Date()
      });
      await announcement.save();
    }

    res.json({
      success: true,
      data: announcement
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching announcement',
      error: error.message
    });
  }
};

// Update announcement (admin only)
exports.updateAnnouncement = async (req, res) => {
  try {
    const {
      title,
      content,
      type,
      priority,
      targetAudience,
      attachments,
      isPublished,
      expiryDate
    } = req.body;

    const announcement = await Announcement.findById(req.params.id);

    if (!announcement || !announcement.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    // Check if user has permission to update this announcement
    if (req.user.role !== 'superadmin' && 
        !announcement.institution.equals(req.user.institution)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Update fields
    if (title) announcement.title = title;
    if (content) announcement.content = content;
    if (type) announcement.type = type;
    if (priority) announcement.priority = priority;
    if (targetAudience) announcement.targetAudience = targetAudience;
    if (attachments) announcement.attachments = attachments;
    if (isPublished !== undefined) announcement.isPublished = isPublished;
    if (expiryDate) announcement.expiryDate = expiryDate;

    await announcement.save();
    await announcement.populate([
      { path: 'author', select: 'firstName lastName email' },
      { path: 'institution', select: 'name' }
    ]);

    res.json({
      success: true,
      message: 'Announcement updated successfully',
      data: announcement
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating announcement',
      error: error.message
    });
  }
};

// Delete announcement (admin only)
exports.deleteAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);

    if (!announcement || !announcement.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    // Check if user has permission to delete this announcement
    if (req.user.role !== 'superadmin' && 
        !announcement.institution.equals(req.user.institution)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Soft delete
    announcement.isActive = false;
    await announcement.save();

    res.json({
      success: true,
      message: 'Announcement deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting announcement',
      error: error.message
    });
  }
};