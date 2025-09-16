const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Event title is required'],
    trim: true,
    maxLength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Event description is required'],
    trim: true,
    maxLength: [1000, 'Description cannot exceed 1000 characters']
  },
  eventType: {
    type: String,
    enum: ['conference', 'workshop', 'networking', 'reunion', 'seminar', 'webinar', 'social', 'career', 'other'],
    required: [true, 'Event type is required']
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required'],
    validate: {
      validator: function(value) {
        return value > new Date();
      },
      message: 'Start date must be in the future'
    }
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required'],
    validate: {
      validator: function(value) {
        return value > this.startDate;
      },
      message: 'End date must be after start date'
    }
  },
  location: {
    type: {
      type: String,
      enum: ['online', 'physical', 'hybrid'],
      required: true
    },
    venue: {
      type: String,
      required: function() {
        return this.location.type === 'physical' || this.location.type === 'hybrid';
      }
    },
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      zipCode: String
    },
    onlineLink: {
      type: String,
      required: function() {
        return this.location.type === 'online' || this.location.type === 'hybrid';
      },
      validate: {
        validator: function(v) {
          if (!v) return true; // Let required validation handle empty values
          return /^https?:\/\/.+/.test(v);
        },
        message: 'Online link must be a valid URL'
      }
    }
  },
  capacity: {
    type: Number,
    min: [1, 'Capacity must be at least 1'],
    max: [10000, 'Capacity cannot exceed 10,000']
  },
  registrationDeadline: {
    type: Date,
    validate: {
      validator: function(value) {
        if (!value) return true; // Optional field
        return value <= this.startDate;
      },
      message: 'Registration deadline must be before or on the start date'
    }
  },
  price: {
    amount: {
      type: Number,
      min: [0, 'Price cannot be negative'],
      default: 0
    },
    currency: {
      type: String,
      default: 'USD',
      enum: ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD']
    }
  },
  tags: [{
    type: String,
    trim: true,
    maxLength: [30, 'Each tag cannot exceed 30 characters']
  }],
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Event organizer is required']
  },
  institution: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institution',
    required: [true, 'Institution is required']
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'cancelled', 'completed'],
    default: 'draft'
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  registrations: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    registeredAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['registered', 'attended', 'cancelled'],
      default: 'registered'
    }
  }],
  images: [{
    url: String,
    alt: String
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for registered count
eventSchema.virtual('registeredCount').get(function() {
  return this.registrations ? this.registrations.filter(reg => reg.status === 'registered').length : 0;
});

// Virtual for available spots
eventSchema.virtual('availableSpots').get(function() {
  if (!this.capacity) return null;
  return this.capacity - this.registeredCount;
});

// Virtual to check if registration is open
eventSchema.virtual('isRegistrationOpen').get(function() {
  const now = new Date();
  const registrationOpen = !this.registrationDeadline || now < this.registrationDeadline;
  const eventNotStarted = now < this.dateTime;
  const hasSpots = !this.maxAttendees || this.attendeeCount < this.maxAttendees;
  
  return registrationOpen && eventNotStarted && hasSpots && this.status === 'published';
});

// Index for better query performance
eventSchema.index({ institution: 1, startDate: 1 });
eventSchema.index({ eventType: 1, status: 1 });
eventSchema.index({ startDate: 1, endDate: 1 });
eventSchema.index({ organizer: 1 });
eventSchema.index({ tags: 1 });

eventSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.updatedBy = this.createdBy; // You might want to get this from context
  }
  next();
});

module.exports = mongoose.model('Event', eventSchema);