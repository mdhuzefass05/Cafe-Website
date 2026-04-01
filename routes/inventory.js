const express = require('express');
const requireAuth = require('../middleware/authMiddleware');
const InventoryItem = require('../models/InventoryItem');
const router = express.Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
    try {
        const items = await InventoryItem.findAll();
        res.json(items);
    } catch (error) {
        res.status(500).json({ error: 'Server error fetching inventory items' });
    }
});

router.post('/', async (req, res) => {
    try {
        const newItem = await InventoryItem.create(req.body);
        res.status(201).json(newItem);
    } catch (error) {
        res.status(500).json({ error: 'Server error creating inventory item' });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const updatedItem = await InventoryItem.update(req.params.id, req.body);
        res.json(updatedItem);
    } catch (error) {
        res.status(500).json({ error: 'Server error updating inventory item' });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        await InventoryItem.delete(req.params.id);
        res.json({ message: 'Inventory item deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Server error deleting inventory item' });
    }
});

module.exports = router;
