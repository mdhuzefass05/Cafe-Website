const express = require('express');
const requireAuth = require('../middleware/authMiddleware');
const MenuItem = require('../models/MenuItem');
const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const items = await MenuItem.findAll();
        res.json(items);
    } catch (error) {
        res.status(500).json({ error: 'Server error fetching menu items' });
    }
});

router.post('/', requireAuth, async (req, res) => {
    try {
        const newItem = await MenuItem.create(req.body);
        res.status(201).json(newItem);
    } catch (error) {
        res.status(500).json({ error: 'Server error creating menu item' });
    }
});

router.put('/:id', requireAuth, async (req, res) => {
    try {
        const updatedItem = await MenuItem.update(req.params.id, req.body);
        res.json(updatedItem);
    } catch (error) {
        res.status(500).json({ error: 'Server error updating menu item' });
    }
});

router.delete('/:id', requireAuth, async (req, res) => {
    try {
        await MenuItem.delete(req.params.id);
        res.json({ message: 'Menu item deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Server error deleting menu item' });
    }
});

module.exports = router;
