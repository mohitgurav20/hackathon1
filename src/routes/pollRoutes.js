const express = require('express');
const { body, validationResult } = require('express-validator');
const xss = require('xss');
const Poll = require('../models/Poll');
const auth = require('../middleware/auth');
const { generateShareCode } = require('../utils/hash');

const router = express.Router();

// ─── CREATE POLL ─────────────────────────────────────────
router.post('/', auth, [
  body('title').trim().notEmpty().withMessage('Poll title is required'),
  body('options').isArray({ min: 2 }).withMessage('At least 2 options are required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    let { title, description, options, expiresIn } = req.body;

    // Sanitize inputs to prevent XSS
    title = xss(title);
    description = description ? xss(description) : '';
    const sanitizedOptions = options.map(opt => ({
      text: xss(typeof opt === 'string' ? opt : opt.text)
    }));

    if (sanitizedOptions.length < 2) {
      return res.status(400).json({ error: 'At least 2 options are required.' });
    }

    // Generate unique share code
    let shareCode = generateShareCode();
    // Ensure uniqueness (extremely unlikely collision but safety first)
    while (await Poll.findOne({ shareCode })) {
      shareCode = generateShareCode();
    }

    // Calculate expiry
    let expiresAt = null;
    if (expiresIn && expiresIn > 0) {
      expiresAt = new Date(Date.now() + expiresIn * 60 * 1000); // expiresIn is in minutes
    }

    const poll = await Poll.create({
      title,
      description,
      options: sanitizedOptions,
      createdBy: req.user.id,
      shareCode,
      expiresAt,
      isActive: true
    });

    res.status(201).json({
      message: 'Poll created successfully!',
      poll: {
        id: poll._id,
        title: poll.title,
        description: poll.description,
        options: poll.options,
        shareCode: poll.shareCode,
        expiresAt: poll.expiresAt,
        isActive: poll.isActive,
        createdAt: poll.createdAt
      }
    });

  } catch (error) {
    console.error('Create poll error:', error);
    res.status(500).json({ error: 'Failed to create poll.' });
  }
});

// ─── LIST ALL ACTIVE POLLS ──────────────────────────────
router.get('/', async (req, res) => {
  try {
    const polls = await Poll.find({ isActive: true })
      .select('-createdBy')
      .sort({ createdAt: -1 });

    // Filter out expired polls
    const activePolls = polls.filter(p => {
      if (p.expiresAt && new Date() > p.expiresAt) return false;
      return true;
    });

    res.json({ polls: activePolls });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch polls.' });
  }
});

// ─── GET POLL BY SHARE CODE ─────────────────────────────
router.get('/code/:shareCode', async (req, res) => {
  try {
    const poll = await Poll.findOne({ shareCode: req.params.shareCode })
      .select('-createdBy');

    if (!poll) {
      return res.status(404).json({ error: 'Poll not found.' });
    }

    // Check if expired
    if (poll.expiresAt && new Date() > poll.expiresAt) {
      return res.status(410).json({ error: 'This poll has expired.' });
    }

    if (!poll.isActive) {
      return res.status(410).json({ error: 'This poll is no longer active.' });
    }

    res.json({ poll });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch poll.' });
  }
});

// ─── GET POLL BY ID ──────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.id).select('-createdBy');

    if (!poll) {
      return res.status(404).json({ error: 'Poll not found.' });
    }

    res.json({ poll });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch poll.' });
  }
});

// ─── GET MY POLLS (created by current user) ─────────────
router.get('/user/my-polls', auth, async (req, res) => {
  try {
    const polls = await Poll.find({ createdBy: req.user.id })
      .sort({ createdAt: -1 });

    res.json({ polls });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch your polls.' });
  }
});

module.exports = router;
