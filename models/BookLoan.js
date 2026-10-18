const db = require('../config/database');

class BookLoan {
    static findAll(filters = {}) {
        return new Promise((resolve, reject) => {
            let sql = `
                SELECT 
                    l.*,
                    b.title as book_title,
                    b.author as book_author,
                    b.genre as book_genre,
                    b.shelf_location as book_shelf_location,
                    b.cover_image as book_cover_image
                FROM book_loans l
                JOIN books b ON l.book_id = b.id
                WHERE 1=1
            `;
            const params = [];

            if (filters.status) {
                sql += ' AND l.status = ?';
                params.push(filters.status);
            }

            if (filters.book_id) {
                sql += ' AND l.book_id = ?';
                params.push(filters.book_id);
            }

            sql += ' ORDER BY l.borrowed_at DESC';

            db.all(sql, params, (err, rows) => {
                if (err) return reject(err);
                resolve(rows);
            });
        });
    }

    static findById(id) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    l.*,
                    b.title as book_title,
                    b.author as book_author,
                    b.genre as book_genre,
                    b.shelf_location as book_shelf_location,
                    b.cover_image as book_cover_image
                FROM book_loans l
                JOIN books b ON l.book_id = b.id
                WHERE l.id = ?
            `;
            db.get(sql, [id], (err, row) => {
                if (err) return reject(err);
                resolve(row);
            });
        });
    }

    static create(data) {
        return new Promise((resolve, reject) => {
            const {
                book_id,
                customer_name,
                customer_phone = '',
                table_number = null,
                loan_type = 'in_cafe',
                due_date = null,
                notes = ''
            } = data;

            // Check if book has available copies
            db.get('SELECT copies_available, title FROM books WHERE id = ?', [book_id], (err, book) => {
                if (err) return reject(err);
                if (!book) return reject(new Error('Book not found.'));
                if (book.copies_available <= 0) {
                    return reject(new Error(`"${book.title}" is currently all checked out or being read.`));
                }

                // Insert loan
                const sql = `
                    INSERT INTO book_loans 
                    (book_id, customer_name, customer_phone, table_number, loan_type, status, due_date, notes)
                    VALUES (?, ?, ?, ?, ?, 'active', ?, ?)
                `;

                db.run(sql, [
                    book_id,
                    customer_name,
                    customer_phone,
                    table_number ? parseInt(table_number) : null,
                    loan_type,
                    due_date,
                    notes
                ], function (err) {
                    if (err) return reject(err);
                    const loanId = this.lastID;

                    // Decrement copies_available in books
                    db.run('UPDATE books SET copies_available = MAX(0, copies_available - 1) WHERE id = ?', [book_id], (uErr) => {
                        if (uErr) console.error('Error updating copies_available:', uErr);
                        resolve({ id: loanId, ...data, status: 'active' });
                    });
                });
            });
        });
    }

    static markReturned(id) {
        return new Promise((resolve, reject) => {
            // First find the loan to know book_id and if it was active
            db.get('SELECT * FROM book_loans WHERE id = ?', [id], (err, loan) => {
                if (err) return reject(err);
                if (!loan) return reject(new Error('Loan record not found.'));
                if (loan.status === 'returned') return resolve({ message: 'Already marked as returned', loan });

                const now = new Date().toISOString();
                db.run(
                    'UPDATE book_loans SET status = "returned", returned_at = ? WHERE id = ?',
                    [now, id],
                    function (err) {
                        if (err) return reject(err);

                        // Increment available copies in books
                        db.run(
                            'UPDATE books SET copies_available = MIN(copies_total, copies_available + 1) WHERE id = ?',
                            [loan.book_id],
                            (uErr) => {
                                if (uErr) console.error('Error restoring copies_available:', uErr);
                                resolve({ id, status: 'returned', returned_at: now });
                            }
                        );
                    }
                );
            });
        });
    }

    static delete(id) {
        return new Promise((resolve, reject) => {
            db.run('DELETE FROM book_loans WHERE id = ?', [id], function (err) {
                if (err) return reject(err);
                resolve({ deleted: this.changes > 0 });
            });
        });
    }
}

module.exports = BookLoan;
