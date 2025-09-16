const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // Clerk ID for authentication
  clerkId: {
    type: String,
    required: true,
    unique: true
  },
  
  // Common fields for all roles
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  
  phone: {
    type: String,
    trim: true
  },
  
  profileImage: {
    type: String,
    default: null
  },
  
  role: {
    type: String,
    enum: ['student', 'alumni', 'admin'],
    required: true
  },
  
  // Academic Information (for students and alumni)
  academicInfo: {
    rollNumber: {
      type: String,
      sparse: true, // allows null values but ensures uniqueness when present
      unique: true
    },
    batch: {
      type: Number,
      min: 1950,
      max: new Date().getFullYear() + 10
    },
    course: {
      type: String,
      trim: true
    },
    department: {
      type: String,
      trim: true
    },
    cgpa: {
      type: Number,
      min: 0,
      max: 10
    }
  },
  
  // Alumni-specific fields
  alumniInfo: {
    graduationYear: {
      type: Number,
      min: 1950,
      max: new Date().getFullYear()
    },
    currentCompany: {
      type: String,
      trim: true
    },
    currentPosition: {
      type: String,
      trim: true
    },
    workExperience: [{
      company: String,
      position: String,
      startDate: Date,
      endDate: Date,
      description: String
    }],
    skills: [{
      type: String,
      trim: true
    }],
    linkedinUrl: {
      type: String,
      trim: true
    },
    githubUrl: {
      type: String,
      trim: true
    },
    portfolioUrl: {
      type: String,
      trim: true
    }
  },
  
  // Student-specific fields
  studentInfo: {
    currentSemester: {
      type: Number,
      min: 1,
      max: 12
    },
    expectedGraduation: {
      type: Number,
      min: new Date().getFullYear(),
      max: new Date().getFullYear() + 10
    },
    interests: [{
      type: String,
      trim: true
    }]
  },
  
  // Admin-specific fields
  adminInfo: {
    permissions: [{
      type: String,
      enum: ['read', 'write', 'delete', 'manage_users', 'manage_events', 'system_admin']
    }],
    department: {
      type: String,
      trim: true
    }
  },
  
  // Common optional fields
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    pincode: String
  },
  
  socialLinks: {
    twitter: String,
    facebook: String,
    instagram: String
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  lastLogin: {
    type: Date,
    default: null
  }
}, {
  timestamps: true, // adds createdAt and updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Indexes for better query performance
userSchema.index({ role: 1 });
userSchema.index({ 'academicInfo.batch': 1 });
userSchema.index({ 'alumniInfo.skills': 1 });
userSchema.index({ createdAt: -1 });

// Pre-save middleware to ensure role-specific data consistency
userSchema.pre('save', function(next) {
  // Clean up irrelevant fields based on role
  if (this.role === 'admin') {
    this.academicInfo = undefined;
    this.alumniInfo = undefined;
    this.studentInfo = undefined;
  } else if (this.role === 'student') {
    this.alumniInfo = undefined;
    this.adminInfo = undefined;
  } else if (this.role === 'alumni') {
    this.studentInfo = undefined;
    this.adminInfo = undefined;
  }
  
  next();
});

// Static method to get required fields by role
userSchema.statics.getRequiredFieldsByRole = function(role) {
  const baseRequired = ['clerkId', 'email', 'firstName', 'lastName', 'role'];
  
  const roleSpecific = {
    student: ['academicInfo.rollNumber', 'academicInfo.batch', 'academicInfo.course', 'academicInfo.department'],
    alumni: ['academicInfo.rollNumber', 'academicInfo.batch', 'academicInfo.course', 'academicInfo.department', 'alumniInfo.graduationYear'],
    admin: ['adminInfo.permissions']
  };
  
  return [...baseRequired, ...(roleSpecific[role] || [])];
};

// Static method to get optional fields by role
userSchema.statics.getOptionalFieldsByRole = function(role) {
  const baseOptional = ['phone', 'profileImage', 'address', 'socialLinks'];
  
  const roleSpecific = {
    student: ['academicInfo.cgpa', 'studentInfo.currentSemester', 'studentInfo.expectedGraduation', 'studentInfo.interests'],
    alumni: ['academicInfo.cgpa', 'alumniInfo.currentCompany', 'alumniInfo.currentPosition', 'alumniInfo.workExperience', 'alumniInfo.skills', 'alumniInfo.linkedinUrl', 'alumniInfo.githubUrl', 'alumniInfo.portfolioUrl'],
    admin: ['adminInfo.department']
  };
  
  return [...baseOptional, ...(roleSpecific[role] || [])];
};

module.exports = mongoose.model('User', userSchema);