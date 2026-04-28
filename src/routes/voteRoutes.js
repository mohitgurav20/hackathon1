const express = require('express');
const mongoose = require('mongoose');
const Poll = require('../models/Poll');
const Vote = require('../models/Vote');
const VotedUser = require('../models/VotedUser');
const auth = require('../middleware/auth');
const { generateVoterHash } = require('../utils/hash');

const router = express.Router();

// ─── SUBMIT ANONYMOUS VOTE ──────────────────────────────
router.post('/:pollId', auth, async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { pollId } = req.params;
    const { optionId } = req.body;

    if (!optionId) {
      return res.status(400).json({ error: 'Please select an option.' });
    }

    // Find the poll
    const poll = await Poll.findById(pollId);
    if (!poll) {
      return res.status(404).json({ error: 'Poll not found.' });
    }

    // Check if poll is active
    if (!poll.isActive) {
      return res.status(410).json({ error: 'This poll is no longer active.' });
    }

    // Check if poll has expired
    if (poll.expiresAt && new Date() > poll.expiresAt) {
      return res.status(410).json({ error: 'This poll has expired.' });
    }

    // Validate that optionId exists in the poll
    const validOption = poll.options.find(opt => opt._id.toString() === optionId);
    if (!validOption) {
      return res.status(400).json({ error: 'Invalid option selected.' });
    }

    // Generate anonymous voter hash
    const userHash = generateVoterHash(req.user.id, pollId);

    // Check if user already voted
    const alreadyVoted = await VotedUser.findOne({ pollId, userHash });
    if (alreadyVoted) {
      return res.status(409).json({ error: 'You have already voted on this poll.' });
    }

    // ─── TRANSACTION: Ensure atomicity ──────────────────
    session.startTransaction();

    // Step 1: Record that this user has voted (hashed identity only)
    await VotedUser.create([{ pollId, userHash }], { session });

    // Step 2: Record the anonymous vote (NO user reference)
    await Vote.create([{ pollId, optionId }], { session });

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    // ─── REAL-TIME UPDATE via Socket.io ─────────────────
    const io = req.app.get('io');
    if (io) {
      // Get updated results and broadcast
      const results = await Vote.aggregate([
        { $match: { pollId: new mongoose.Types.ObjectId(pollId) } },
        { $group: { _id: '$optionId', count: { $sum: 1 } } }
      ]);

      const totalVotes = results.reduce((sum, r) => sum + r.count, 0);

      io.to(`poll-${pollId}`).emit('vote-update', {
        pollId,
        results,
        totalVotes
      });
    }

    res.json({ message: 'Vote submitted successfully!' });

  } catch (error) {
    // Rollback on error
    await session.abortTransaction();
    session.endSession();

    if (error.code === 11000) {
      return res.status(409).json({ error: 'You have already voted on this poll.' });
    }

    console.error('Vote error:', error);
    res.status(500).json({ error: 'Failed to submit vote. Please try again.' });
  }
});

// ─── GET POLL RESULTS ───────────────────────────────────
router.get('/results/:pollId', async (req, res) => {
  try {
    const { pollId } = req.params;

    const poll = await Poll.findById(pollId).select('-createdBy');
    if (!poll) {
      return res.status(404).json({ error: 'Poll not found.' });
    }

    // Aggregate votes per option
    const results = await Vote.aggregate([
      { $match: { pollId: new mongoose.Types.ObjectId(pollId) } },
      { $group: { _id: '$optionId', count: { $sum: 1 } } }
    ]);

    const totalVotes = results.reduce((sum, r) => sum + r.count, 0);

    // Map results to options
    const optionsWithVotes = poll.options.map(opt => {
      const voteData = results.find(r => r._id.toString() === opt._id.toString());
      const count = voteData ? voteData.count : 0;
      return {
        id: opt._id,
        text: opt.text,
        votes: count,
        percentage: totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0
      };
    });

    res.json({
      poll: {
        id: poll._id,
        title: poll.title,
        description: poll.description,
        expiresAt: poll.expiresAt,
        isActive: poll.isActive
      },
      results: optionsWithVotes,
      totalVotes
    });

  } catch (error) {
    console.error('Results error:', error);
    res.status(500).json({ error: 'Failed to fetch results.' });
  }
});

// ─── CHECK IF USER HAS VOTED ───────────────────────────
router.get('/check/:pollId', auth, async (req, res) => {
  try {
    const userHash = generateVoterHash(req.user.id, req.params.pollId);
    const voted = await VotedUser.findOne({
      pollId: req.params.pollId,
      userHash
    });
    res.json({ hasVoted: !!voted });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check vote status.' });
  }
});

module.exports = router;
