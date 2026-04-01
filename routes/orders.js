const express = require('express');
const requireAuth = require('../middleware/authMiddleware');
const Order = require('../models/Order');
const { createObjectCsvWriter } = require('csv-writer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
    try {
        const orders = await Order.findAll();
        let result = orders;

        const { search, status, page = 1, limit = 10 } = req.query;

        if (status) {
            result = result.filter(o => o.status === status);
        }

        if (search) {
            const lowerSearch = search.toLowerCase();
            result = result.filter(o =>
                o.items.toLowerCase().includes(lowerSearch) ||
                o.id.toString().includes(lowerSearch)
            );
        }

        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;
        const paginatedResult = result.slice(startIndex, endIndex);

        res.json({
            total: result.length,
            page: Number(page),
            limit: Number(limit),
            data: paginatedResult
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/', async (req, res) => {
    try {
        const newOrder = await Order.create(req.body);
        res.status(201).json(newOrder);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.put('/:id', requireAuth, async (req, res) => {
    try {
        const updated = await Order.update(req.params.id, req.body);
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.patch('/:id/status', requireAuth, async (req, res) => {
    try {
        const { status } = req.body;
        if (!status) return res.status(400).json({ error: 'Status is required' });

        const updated = await Order.update(req.params.id, { status });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.delete('/:id', requireAuth, async (req, res) => {
    try {
        await Order.delete(req.params.id);
        res.json({ message: 'Order deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/export/csv', requireAuth, async (req, res) => {
    try {
        const orders = await Order.findAll();
        const exportPath = path.join(__dirname, '../public/exports');
        if (!fs.existsSync(exportPath)) {
            fs.mkdirSync(exportPath);
        }

        const filePath = path.join(exportPath, `orders_${Date.now()}.csv`);
        const csvWriter = createObjectCsvWriter({
            path: filePath,
            header: [
                { id: 'id', title: 'Order ID' },
                { id: 'items', title: 'Items' },
                { id: 'total_price', title: 'Total Price' },
                { id: 'status', title: 'Status' },
                { id: 'created_at', title: 'Date' }
            ]
        });

        await csvWriter.writeRecords(orders);
        res.download(filePath);
    } catch (error) {
        res.status(500).json({ error: 'Export failed' });
    }
});

module.exports = router;
