const Institution = require('../models/Institution');
const { validationResult } = require('express-validator');

// @desc    Create new institution
// @route   POST /api/institutions
// @access  Super Admin
const createInstitution = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      name,
      code,
      email,
      phone,
      address,
      website,
      establishedYear,
      type,
      description,
      logo,
      settings
    } = req.body;

    // Check if institution with same name or email already exists
    const existingInstitution = await Institution.findOne({
      $or: [
        { email: email.toLowerCase() },
        { name: { $regex: new RegExp(`^${name}$`, 'i') } }
      ]
    });

    if (existingInstitution) {
      return res.status(400).json({
        success: false,
        message: 'Institution with this name or email already exists'
      });
    }

    // Check if code is provided and unique
    if (code) {
      const existingCode = await Institution.findOne({ code: code.toUpperCase() });
      if (existingCode) {
        return res.status(400).json({
          success: false,
          message: 'Institution code already exists'
        });
      }
    }

    // Create institution
    const institution = new Institution({
      name: name.trim(),
      code: code ? code.toUpperCase().trim() : undefined,
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      address: {
        street: address.street.trim(),
        city: address.city.trim(),
        state: address.state.trim(),
        country: address.country.trim(),
        zipCode: address.zipCode.trim()
      },
      website: website ? website.trim() : undefined,
      establishedYear,
      type,
      description: description ? description.trim() : undefined,
      logo: logo ? logo.trim() : undefined,
      settings: {
        allowPublicRegistration: settings?.allowPublicRegistration ?? true,
        requireEmailVerification: settings?.requireEmailVerification ?? true,
        autoApproveAlumni: settings?.autoApproveAlumni ?? false
      }
    });

    const savedInstitution = await institution.save();

    res.status(201).json({
      success: true,
      message: 'Institution created successfully',
      data: {
        institution: {
          id: savedInstitution._id,
          name: savedInstitution.name,
          code: savedInstitution.code,
          email: savedInstitution.email,
          phone: savedInstitution.phone,
          address: savedInstitution.address,
          website: savedInstitution.website,
          establishedYear: savedInstitution.establishedYear,
          type: savedInstitution.type,
          status: savedInstitution.status,
          description: savedInstitution.description,
          logo: savedInstitution.logo,
          settings: savedInstitution.settings,
          statistics: savedInstitution.statistics,
          createdAt: savedInstitution.createdAt,
          updatedAt: savedInstitution.updatedAt
        }
      }
    });

  } catch (error) {
    console.error('Create institution error:', error);

    // Handle mongoose validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `Institution with this ${duplicateField} already exists`
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while creating institution'
    });
  }
};

// @desc    Get all institutions
// @route   GET /api/institutions
// @access  Super Admin
const getAllInstitutions = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, type, search } = req.query;
    
    // Build filter object
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const institutions = await Institution.find(filter)
      .select('-__v')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Institution.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        institutions,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });

  } catch (error) {
    console.error('Get institutions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching institutions'
    });
  }
};

// @desc    Get institution by ID
// @route   GET /api/institutions/:id
// @access  Super Admin
const getInstitutionById = async (req, res) => {
  try {
    const institution = await Institution.findById(req.params.id)
      .populate('adminUsers', 'name email role')
      .select('-__v');

    if (!institution) {
      return res.status(404).json({
        success: false,
        message: 'Institution not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { institution }
    });

  } catch (error) {
    console.error('Get institution error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid institution ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while fetching institution'
    });
  }
};


const getInstitution = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Find institution by ID and populate related fields if needed
    const institution = await Institution.findById(id)
      .select('-__v') // Exclude version field
      .lean(); // Return plain JavaScript object for better performance
    
    if (!institution) {
      return res.status(404).json({
        success: false,
        message: 'Institution not found'
      });
    }

    // Optionally, you can add additional data like user count
    // const userCount = await User.countDocuments({ institution: id });

    res.status(200).json({
      success: true,
      data: {
        institution,
        // userCount // Include if you want to show total users in this institution
      }
    });

  } catch (error) {
    next(error);
  }
}; 

const updateInstitutionBranding = async (req, res) => {
  try {
    const { id } = req.params;
    const { logo, theme } = req.body;

    // Find the institution
    const institution = await Institution.findById(id);
    if (!institution) {
      return res.status(404).json({
        success: false,
        message: 'Institution not found'
      });
    }

    // Prepare update object
    const updateData = {};

    // Update logo if provided
    if (logo !== undefined) {
      updateData['branding.logo'] = logo;
    }

    // Update theme colors if provided
    if (theme) {
      if (theme.primaryColor) updateData['branding.theme.primaryColor'] = theme.primaryColor;
      if (theme.secondaryColor) updateData['branding.theme.secondaryColor'] = theme.secondaryColor;
      if (theme.backgroundColor) updateData['branding.theme.backgroundColor'] = theme.backgroundColor;
      if (theme.textColor) updateData['branding.theme.textColor'] = theme.textColor;
    }

    // Validate color format (optional but recommended)
    const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    
    if (theme) {
      const colors = ['primaryColor', 'secondaryColor', 'backgroundColor', 'textColor'];
      for (const colorKey of colors) {
        if (theme[colorKey] && !colorRegex.test(theme[colorKey])) {
          return res.status(400).json({
            success: false,
            message: `Invalid color format for ${colorKey}. Use hex format like #FF5733`
          });
        }
      }
    }

    // Update the institution
    const updatedInstitution = await Institution.findByIdAndUpdate(
      id,
      { $set: updateData },
      { 
        new: true, 
        runValidators: true 
      }
    );

    res.status(200).json({
      success: true,
      message: 'Institution branding updated successfully',
      data: {
        id: updatedInstitution._id,
        name: updatedInstitution.name,
        branding: updatedInstitution.branding
      }
    });

  } catch (error) {
    console.error('Update institution branding error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  createInstitution,
  getInstitution,    
  getAllInstitutions,
  updateInstitutionBranding,
  getInstitutionById
};