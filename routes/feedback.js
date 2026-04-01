const express = require('express');
const requireAuth = require('../middleware/authMiddleware');
const Feedback = require('../models/Feedback');
const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
    try {
        const feedback = await Feedback.findAll();
        res.json(feedback);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Feedback creation can be public
router.post('/', async (req, res) => {
    try {
        const fb = await Feedback.create(req.body);
        res.status(201).json(fb);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
