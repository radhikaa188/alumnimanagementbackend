const { body } = require('express-validator');

const createInstitutionValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Institution name is required')
    .isLength({ min: 2, max: 200 })
    .withMessage('Institution name must be between 2 and 200 characters'),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Please provide a valid phone number'),

  body('address.street')
    .trim()
    .notEmpty()
    .withMessage('Street address is required')
    .isLength({ max: 200 })
    .withMessage('Street address cannot exceed 200 characters'),

  body('address.city')
    .trim()
    .notEmpty()
    .withMessage('City is required')
    .isLength({ max: 100 })
    .withMessage('City name cannot exceed 100 characters'),

  body('address.state')
    .trim()
    .notEmpty()
    .withMessage('State is required')
    .isLength({ max: 100 })
    .withMessage('State name cannot exceed 100 characters'),

  body('address.country')
    .trim()
    .notEmpty()
    .withMessage('Country is required')
    .isLength({ max: 100 })
    .withMessage('Country name cannot exceed 100 characters'),

  body('address.zipCode')
    .trim()
    .notEmpty()
    .withMessage('ZIP code is required')
    .isLength({ max: 20 })
    .withMessage('ZIP code cannot exceed 20 characters'),

  body('code')
    .optional()
    .trim()
    .isLength({ max: 10 })
    .withMessage('Institution code cannot exceed 10 characters')
    .matches(/^[A-Z0-9]+$/)
    .withMessage('Institution code can only contain uppercase letters and numbers'),

  body('website')
    .optional()
    .trim()
    .isURL()
    .withMessage('Please provide a valid website URL'),

  body('establishedYear')
    .optional()
    .isInt({ min: 1800, max: new Date().getFullYear() })
    .withMessage(`Established year must be between 1800 and ${new Date().getFullYear()}`),

  body('type')
    .notEmpty()
    .withMessage('Institution type is required')
    .isIn(['University', 'College', 'Institute', 'School'])
    .withMessage('Invalid institution type. Must be University, College, Institute, or School'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),

  body('logo')
    .optional()
    .trim()
    .isURL()
    .withMessage('Logo must be a valid URL'),

  body('settings.allowPublicRegistration')
    .optional()
    .isBoolean()
    .withMessage('Allow public registration must be a boolean value'),

  body('settings.requireEmailVerification')
    .optional()
    .isBoolean()
    .withMessage('Require email verification must be a boolean value'),

  body('settings.autoApproveAlumni')
    .optional()
    .isBoolean()
    .withMessage('Auto approve alumni must be a boolean value')
];


const validateBrandingUpdate = (req, res, next) => {
  const { logo, theme } = req.body;
  const errors = [];

  // Validate logo URL format
  if (logo !== undefined && logo !== null) {
    if (typeof logo !== 'string') {
      errors.push('Logo must be a string (URL)');
    } else if (logo.length > 0) {
      const urlRegex = /^https?:\/\/.+\.(jpg|jpeg|png|gif|svg|webp)$/i;
      if (!urlRegex.test(logo)) {
        errors.push('Logo must be a valid image URL (jpg, jpeg, png, gif, svg, webp)');
      }
    }
  }

  // Validate theme colors
  if (theme && typeof theme === 'object') {
    const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    const colorFields = ['primaryColor', 'secondaryColor', 'backgroundColor', 'textColor'];
    
    colorFields.forEach(field => {
      if (theme[field] && !colorRegex.test(theme[field])) {
        errors.push(`${field} must be a valid hex color (e.g., #FF5733 or #F53)`);
      }
    });
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
};

module.exports = {
  createInstitutionValidation, validateBrandingUpdate
};