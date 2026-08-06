const express = require('express');
const requireAuth = require('../middleware/authMiddleware');
const Reservation = require('../models/Reservation');
const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
    try {
        const data = await Reservation.findAll();
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/', async (req, res) => {
    try {
        const resv = await Reservation.create(req.body);
        res.status(201).json(resv);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.put('/:id', requireAuth, async (req, res) => {
    try {
        const updated = await Reservation.update(req.params.id, req.body);
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.put('/:id/status', requireAuth, async (req, res) => {
    try {
        const { status } = req.body;
        if (!['pending', 'confirmed', 'cancelled'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }
        const updated = await Reservation.update(req.params.id, { status });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.delete('/:id', requireAuth, async (req, res) => {
    try {
        await Reservation.delete(req.params.id);
        res.json({ message: 'Reservation deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
