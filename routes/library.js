const express = require('express');
const requireAuth = require('../middleware/authMiddleware');
const Book = require('../models/Book');
const BookLoan = require('../models/BookLoan');
const router = express.Router();

// --- BOOKS ROUTES ---

// GET /api/library/books (Public: Browse books with filters)
router.get('/books', async (req, res) => {
    try {
        const { genre, search, availableOnly } = req.query;
        const books = await Book.findAll({ genre, search, availableOnly });
        res.json(books);
    } catch (error) {
        console.error('Error fetching books:', error);
        res.status(500).json({ error: 'Server error fetching library books' });
    }
});

// GET /api/library/stats (Library summary statistics)
router.get('/stats', async (req, res) => {
    try {
        const stats = await Book.getStats();
        res.json(stats);
    } catch (error) {
        console.error('Error fetching library stats:', error);
        res.status(500).json({ error: 'Server error fetching library stats' });
    }
});

// GET /api/library/books/:id (Public: Get single book details)
router.get('/books/:id', async (req, res) => {
    try {
        const book = await Book.findById(req.params.id);
        if (!book) {
            return res.status(404).json({ error: 'Book not found' });
        }
        res.json(book);
    } catch (error) {
        console.error('Error fetching book details:', error);
        res.status(500).json({ error: 'Server error fetching book' });
    }
});

// POST /api/library/books (Admin: Add new book)
router.post('/books', requireAuth, async (req, res) => {
    try {
        const { title, author, genre, shelf_location } = req.body;
        if (!title || !author || !genre || !shelf_location) {
            return res.status(400).json({ error: 'Title, Author, Genre, and Shelf Location are required.' });
        }
        const newBook = await Book.create(req.body);
        res.status(201).json(newBook);
    } catch (error) {
        console.error('Error creating book:', error);
        res.status(500).json({ error: 'Server error creating book' });
    }
});

// PUT /api/library/books/:id (Admin: Edit book)
router.put('/books/:id', requireAuth, async (req, res) => {
    try {
        const updated = await Book.update(req.params.id, req.body);
        res.json(updated);
    } catch (error) {
        console.error('Error updating book:', error);
        res.status(500).json({ error: 'Server error updating book' });
    }
});

// DELETE /api/library/books/:id (Admin: Delete book)
router.delete('/books/:id', requireAuth, async (req, res) => {
    try {
        await Book.delete(req.params.id);
        res.json({ message: 'Book removed from library successfully' });
    } catch (error) {
        console.error('Error deleting book:', error);
        res.status(500).json({ error: 'Server error deleting book' });
    }
});

// --- CIRCULATION & LOAN ROUTES ---

// GET /api/library/loans (Admin: List loans with optional status filter)
router.get('/loans', requireAuth, async (req, res) => {
    try {
        const { status, book_id } = req.query;
        const loans = await BookLoan.findAll({ status, book_id });
        res.json(loans);
    } catch (error) {
        console.error('Error fetching book loans:', error);
        res.status(500).json({ error: 'Server error fetching book loans' });
    }
});

// POST /api/library/loans (Public & Admin: Borrow book / Request to Table)
router.post('/loans', async (req, res) => {
    try {
        const { book_id, customer_name } = req.body;
        if (!book_id || !customer_name) {
            return res.status(400).json({ error: 'Book ID and Customer Name are required.' });
        }
        const loan = await BookLoan.create(req.body);
        res.status(201).json({ message: 'Book requested successfully!', loan });
    } catch (error) {
        console.error('Error issuing book loan:', error);
        res.status(400).json({ error: error.message || 'Server error creating loan' });
    }
});

// PUT /api/library/loans/:id/return (Admin: Return book to shelf)
router.put('/loans/:id/return', requireAuth, async (req, res) => {
    try {
        const result = await BookLoan.markReturned(req.params.id);
        res.json(result);
    } catch (error) {
        console.error('Error returning book:', error);
        res.status(500).json({ error: error.message || 'Server error marking book returned' });
    }
});

// DELETE /api/library/loans/:id (Admin: Delete loan record)
router.delete('/loans/:id', requireAuth, async (req, res) => {
    try {
        await BookLoan.delete(req.params.id);
        res.json({ message: 'Loan record deleted successfully' });
    } catch (error) {
        console.error('Error deleting loan:', error);
        res.status(500).json({ error: 'Server error deleting loan' });
    }
});

module.exports = router;
