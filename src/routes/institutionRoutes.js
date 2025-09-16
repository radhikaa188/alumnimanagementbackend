const express = require('express');
const router = express.Router();
const {
  createInstitution,
  getAllInstitutions,
  updateInstitutionBranding,
  getInstitutionById
} = require('../controllers/institutionController');
const superAdminAuth = require('../middleware/superAdminAuth');
const { createInstitutionValidation } = require('../middleware/institutionValidation');
const { validateBrandingUpdate } = require('../middleware/institutionValidation');

// @route   POST /api/institutions
// @desc    Create new institution
// @access  Super Admin
router.post('/',superAdminAuth, createInstitutionValidation, createInstitution);

// @route   GET /api/institutions
// @desc    Get all institutions
// @access  Super Admin
router.get('/',superAdminAuth, getAllInstitutions);

// @route   GET /api/institutions/:id
// @desc    Get institution by ID
// @access  Super Admin
router.get('/:id', superAdminAuth, getInstitutionById);
router.put('/:id', superAdminAuth, validateBrandingUpdate, updateInstitutionBranding);

module.exports = router;