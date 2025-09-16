const mongoose = require('mongoose');

const institutionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    maxlength: 10
  },
    // Branding fields
  branding: {
    logo: {
      type: String, // URL to logo image
      default: null
    },
    theme: {
      primaryColor: {
        type: String,
        default: '#007bff'
      },
      secondaryColor: {
        type: String,
        default: '#6c757d'
      },
      backgroundColor: {
        type: String,
        default: '#ffffff'
      },
      textColor: {
        type: String,
        default: '#333333'
      }
    }
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    required: true,
    trim: true,
    match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number']
  },
  address: {
    street: {
      type: String,
      required: true,
      trim: true
    },
    city: {
      type: String,
      required: true,
      trim: true
    },
    state: {
      type: String,
      required: true,
      trim: true
    },
    country: {
      type: String,
      required: true,
      trim: true
    },
    zipCode: {
      type: String,
      required: true,
      trim: true
    }
  },
  website: {
    type: String,
    trim: true,
    match: [/^https?:\/\/.+/, 'Please enter a valid website URL']
  },
  establishedYear: {
    type: Number,
    min: 1800,
    max: new Date().getFullYear()
  },
  type: {
    type: String,
    enum: ['University', 'College', 'Institute', 'School'],
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending'],
    default: 'active'
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  logo: {
    type: String, // URL to logo image
    trim: true
  },
  adminUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  settings: {
    allowPublicRegistration: {
      type: Boolean,
      default: true
    },
    requireEmailVerification: {
      type: Boolean,
      default: true
    },
    autoApproveAlumni: {
      type: Boolean,
      default: false
    }
  },
  statistics: {
    totalAlumni: {
      type: Number,
      default: 0
    },
    totalEvents: {
      type: Number,
      default: 0
    },
    totalJobs: {
      type: Number,
      default: 0
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for faster queries
institutionSchema.index({ name: 1 });
institutionSchema.index({ code: 1 });
institutionSchema.index({ status: 1 });

// Pre-save middleware to generate code if not provided
institutionSchema.pre('save', function(next) {
  if (!this.code && this.name) {
    // Generate code from institution name (first 3 letters + random numbers)
    const nameCode = this.name.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase();
    const randomNum = Math.floor(Math.random() * 9000) + 1000;
    this.code = nameCode + randomNum;
  }
  next();
});

// Instance method to get full address
institutionSchema.methods.getFullAddress = function() {
  const { street, city, state, country, zipCode } = this.address;
  return `${street}, ${city}, ${state}, ${country} - ${zipCode}`;
};

// Static method to find by code
institutionSchema.statics.findByCode = function(code) {
  return this.findOne({ code: code.toUpperCase() });
};

module.exports = mongoose.model('Institution', institutionSchema);