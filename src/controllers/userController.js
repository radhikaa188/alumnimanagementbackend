const User = require('../models/User');
const { clerkClient } = require('@clerk/clerk-sdk-node');
// Get all users (admin only)
const getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.role) {
      filter.role = req.query.role;
    }
    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === 'true';
    }

    const users = await User.find(filter)
      .select('-__v')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalUsers: total,
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
};

// Get single user profile
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-__v');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user'
    });
  }
};

// Update user profile
const updateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const updates = req.body;

    // Remove fields that shouldn't be updated directly
    delete updates.clerkId;
    delete updates.email;
    delete updates._id;
    delete updates.createdAt;
    delete updates.updatedAt;

    // Role changes should be handled carefully (admin only)
    if (updates.role && req.user.role !== 'admin') {
      delete updates.role;
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { 
        new: true, 
        runValidators: true,
        select: '-__v'
      }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: user
    });
  } catch (error) {
    console.error('Update user error:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: Object.values(error.errors).map(e => e.message)
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
};

// Delete user (admin only)
const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    // Prevent admin from deleting themselves
    if (userId === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Delete from Clerk as well
    try {
      await clerkClient.users.deleteUser(user.clerkId);
    } catch (clerkError) {
      console.error('Clerk deletion error:', clerkError);
      // Continue with local deletion even if Clerk fails
    }

    // Delete from our database
    await User.findByIdAndDelete(userId);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user'
    });
  }
};

// Search alumni
const searchAlumni = async (req, res) => {
  try {
    const { batch, skills, company, course, department, page = 1, limit = 10 } = req.query;
    
    const filter = { role: 'alumni' };
    
    if (batch) {
      filter['academicInfo.batch'] = parseInt(batch);
    }
    
    if (skills) {
      const skillsArray = skills.split(',').map(skill => skill.trim());
      filter['alumniInfo.skills'] = { $in: skillsArray };
    }
    
    if (company) {
      filter['alumniInfo.currentCompany'] = new RegExp(company, 'i');
    }
    
    if (course) {
      filter['academicInfo.course'] = new RegExp(course, 'i');
    }
    
    if (department) {
      filter['academicInfo.department'] = new RegExp(department, 'i');
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const alumni = await User.find(filter)
      .select('firstName lastName email academicInfo alumniInfo profileImage')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ 'academicInfo.batch': -1, firstName: 1 });

    const total = await User.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        alumni,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalAlumni: total,
          hasNextPage: parseInt(page) < Math.ceil(total / parseInt(limit)),
          hasPrevPage: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Search alumni error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search alumni'
    });
  }
};

// Get current user profile
const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-__v');
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile'
    });
  }
};

// Create or sync user from Clerk webhook
const syncUserFromClerk = async (req, res) => {
  try {
    const { data } = req.body;
    
    // Extract user data from Clerk webhook
    const userData = {
      clerkId: data.id,
      email: data.email_addresses[0].email_address,
      firstName: data.first_name,
      lastName: data.last_name,
      profileImage: data.profile_image_url
    };

    // Check if user already exists
    let user = await User.findOne({ clerkId: userData.clerkId });
    
    if (user) {
      // Update existing user
      user = await User.findOneAndUpdate(
        { clerkId: userData.clerkId },
        { $set: userData },
        { new: true }
      );
    } else {
      // This would typically be handled by a registration flow
      // For webhook, we might just store basic info
      user = new User({
        ...userData,
        role: 'student' // Default role, should be updated during registration
      });
      await user.save();
    }

    res.status(200).json({
      success: true,
      message: 'User synced successfully',
      data: user
    });
  } catch (error) {
    console.error('Sync user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync user'
    });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  searchAlumni,
  getCurrentUser,
  syncUserFromClerk
};