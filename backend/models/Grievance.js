const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Create Schema
const GrievanceSchema = new Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  aiPriority: {
    type: String,
    required: true
  },
  summary: {
    type: String
  },
  status: {
    type: String,
    enum: ['Submitted', 'In Progress', 'Resolved'],
    default: 'Submitted'
  },
  resolutionPhoto: {
    url: String,
    name: String,
    uploadedBy: String,
    uploadedAt: Date
  },
  citizenPhoto: {
    url: String,
    uploadedAt: Date
  },
  submitterUserId: {
    type: String,
    required: true
  },
  submitterName: {
    type: String,
    default: 'Anonymous'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  upvotes: {
    type: Number,
    default: 0
  },
  upvotedBy: {
    type: [String]
  },
  location: {
    address: String,
    latitude: Number,
    longitude: Number
  }
});

module.exports = mongoose.model('grievance', GrievanceSchema);
