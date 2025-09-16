// Generate pagination metadata
const generatePagination = (page, limit, total) => {
  const totalPages = Math.ceil(total / limit);
  
  return {
    currentPage: page,
    totalPages,
    totalItems: total,
    itemsPerPage: limit,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
    nextPage: page < totalPages ? page + 1 : null,
    prevPage: page > 1 ? page - 1 : null
  };
};

// Sanitize user input by removing undefined and null values
const sanitizeObject = (obj) => {
  const sanitized = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null && value !== '') {
      if (typeof value === 'object' && !Array.isArray(value)) {
        const nestedSanitized = sanitizeObject(value);
        if (Object.keys(nestedSanitized).length > 0) {
          sanitized[key] = nestedSanitized;
        }
      } else {
        sanitized[key] = value;
      }
    }
  }
  
  return sanitized;
};

// Generate search filters for alumni
const buildAlumniSearchFilter = (queryParams) => {
  const filter = { role: 'alumni' };
  
  if (queryParams.batch) {
    filter['academicInfo.batch'] = parseInt(queryParams.batch);
  }
  
  if (queryParams.skills) {
    const skillsArray = queryParams.skills.split(',').map(skill => skill.trim());
    filter['alumniInfo.skills'] = { $in: skillsArray };
  }
  
  if (queryParams.company) {
    filter['alumniInfo.currentCompany'] = new RegExp(queryParams.company, 'i');
  }
  
  if (queryParams.course) {
    filter['academicInfo.course'] = new RegExp(queryParams.course, 'i');
  }
  
  if (queryParams.department) {
    filter['academicInfo.department'] = new RegExp(queryParams.department, 'i');
  }

  if (queryParams.graduationYear) {
    filter['alumniInfo.graduationYear'] = parseInt(queryParams.graduationYear);
  }

  if (queryParams.name) {
    filter.$or = [
      { firstName: new RegExp(queryParams.name, 'i') },
      { lastName: new RegExp(queryParams.name, 'i') }
    ];
  }
  
  return filter;
};

// Format user data for public display (remove sensitive info)
const formatUserForPublic = (user) => {
  const userObj = user.toObject ? user.toObject() : user;
  
  // Remove sensitive fields
  delete userObj.clerkId;
  delete userObj.__v;
  delete userObj.adminInfo; // Don't expose admin permissions publicly
  
  return userObj;
};

// Validate email format
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate phone number (basic validation)
const isValidPhone = (phone) => {
  const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
  return phoneRegex.test(phone);
};

// Generate error response
const errorResponse = (message, errors = null) => {
  const response = {
    success: false,
    message
  };
  
  if (errors) {
    response.errors = errors;
  }
  
  return response;
};

// Generate success response
const successResponse = (data = null, message = 'Success') => {
  const response = {
    success: true,
    message
  };
  
  if (data !== null) {
    response.data = data;
  }
  
  return response;
};

// Calculate age from date of birth
const calculateAge = (dateOfBirth) => {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

// Get academic year from batch
const getAcademicYear = (batch) => {
  const currentYear = new Date().getFullYear();
  const yearDiff = currentYear - batch;
  
  if (yearDiff < 0) return 'Future batch';
  if (yearDiff === 0) return 'Current batch';
  if (yearDiff === 1) return 'Recent graduate';
  return `${yearDiff} years ago`;
};

module.exports = {
  generatePagination,
  sanitizeObject,
  buildAlumniSearchFilter,
  formatUserForPublic,
  isValidEmail,
  isValidPhone,
  errorResponse,
  successResponse,
  calculateAge,
  getAcademicYear
};