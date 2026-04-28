const mongoose = require('mongoose');

/**
 * VotedUser Model — Stores ONLY a hash of the voter's identity.
 * The hash is generated from: SHA-256(userId + pollId + SECRET_SALT)
 * This prevents double-voting without linking votes to users.
 */
const votedUserSchema = new mongoose.Schema({
  pollId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Poll',
    required: true
  },
  userHash: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

// Compound unique index: one hash per poll (prevents double voting)
votedUserSchema.index({ pollId: 1, userHash: 1 }, { unique: true });

module.exports = mongoose.model('VotedUser', votedUserSchema);
