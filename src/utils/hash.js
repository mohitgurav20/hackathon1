const crypto = require('crypto');

/**
 * Generate a SHA-256 hash of a voter's identity for a specific poll.
 * This ensures one-person-one-vote without storing WHO voted for WHAT.
 *
 * @param {string} userId - The user's MongoDB ObjectId
 * @param {string} pollId - The poll's MongoDB ObjectId
 * @returns {string} A hex-encoded SHA-256 hash
 */
function generateVoterHash(userId, pollId) {
  const salt = process.env.VOTER_SALT || 'default-salt';
  const data = `${userId}:${pollId}:${salt}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Generate a random share code for polls (8 characters, alphanumeric)
 * @returns {string} Random 8-character code
 */
function generateShareCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

module.exports = { generateVoterHash, generateShareCode };
