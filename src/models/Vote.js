const mongoose = require('mongoose');

/**
 * ANONYMOUS Vote Model
 * CRUCIAL: There is NO user_id or user reference in this schema.
 * Votes can never be traced back to a specific user.
 */
const voteSchema = new mongoose.Schema({
  pollId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Poll',
    required: true
  },
  optionId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  }
}, {
  timestamps: true
});

// Index for efficient aggregation queries
voteSchema.index({ pollId: 1, optionId: 1 });

module.exports = mongoose.model('Vote', voteSchema);
