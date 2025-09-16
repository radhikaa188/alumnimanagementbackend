const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['general', 'urgent', 'event', 'academic', 'job', 'reunion'],
    default: 'general'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  institution: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institution',
    required: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  targetAudience: {
    batches: [{
      type: String  // e.g., ['2020', '2021', '2022']
    }],
    departments: [{
      type: String  // e.g., ['CSE', 'ECE', 'ME']
    }],
    roles: [{
      type: String,
      enum: ['alumni', 'admin', 'all'],
      default: 'all'
    }]
  },
  attachments: [{
    filename: String,
    url: String,
    fileType: String
  }],
  isPublished: {
    type: Boolean,
    default: true
  },
  publishDate: {
    type: Date,
    default: Date.now
  },
  expiryDate: {
    type: Date,
    default: null
  },
  views: {
    type: Number,
    default: 0
  },
  viewedBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    viewedAt: {
      type: Date,
      default: Date.now
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

announcementSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for better query performance
announcementSchema.index({ institution: 1, isPublished: 1, isActive: 1 });
announcementSchema.index({ publishDate: -1 });
announcementSchema.index({ 'targetAudience.batches': 1 });

module.exports = mongoose.model('Announcement', announcementSchema);