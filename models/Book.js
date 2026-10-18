const db = require('../config/database');

class Book {
    static findAll(filters = {}) {
        return new Promise((resolve, reject) => {
            let sql = `
                SELECT 
                    b.*, 
                    m.name as paired_menu_item_name,
                    m.price as paired_menu_item_price,
                    m.category as paired_menu_item_category
                FROM books b
                LEFT JOIN menu_items m ON b.paired_menu_item_id = m.id
                WHERE 1=1
            `;
            const params = [];

            if (filters.genre && filters.genre !== 'All') {
                sql += ' AND b.genre = ?';
                params.push(filters.genre);
            }

            if (filters.search) {
                sql += ' AND (b.title LIKE ? OR b.author LIKE ? OR b.shelf_location LIKE ?)';
                const searchPattern = `%${filters.search}%`;
                params.push(searchPattern, searchPattern, searchPattern);
            }

            if (filters.availableOnly === 'true' || filters.availableOnly === true) {
                sql += ' AND b.copies_available > 0';
            }

            sql += ' ORDER BY b.title ASC';

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
                    b.*, 
                    m.name as paired_menu_item_name,
                    m.price as paired_menu_item_price,
                    m.category as paired_menu_item_category
                FROM books b
                LEFT JOIN menu_items m ON b.paired_menu_item_id = m.id
                WHERE b.id = ?
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
                title,
                author,
                genre,
                cover_image = '',
                shelf_location,
                copies_total = 1,
                paired_menu_item_id = null,
                description = ''
            } = data;

            const copies_available = copies_total;

            const sql = `
                INSERT INTO books 
                (title, author, genre, cover_image, shelf_location, copies_total, copies_available, paired_menu_item_id, description)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            db.run(sql, [
                title,
                author,
                genre,
                cover_image,
                shelf_location,
                copies_total,
                copies_available,
                paired_menu_item_id || null,
                description
            ], function (err) {
                if (err) return reject(err);
                resolve({ id: this.lastID, ...data, copies_available });
            });
        });
    }

    static update(id, data) {
        return new Promise((resolve, reject) => {
            const fields = [];
            const values = [];

            const allowed = [
                'title', 'author', 'genre', 'cover_image',
                'shelf_location', 'copies_total', 'copies_available',
                'paired_menu_item_id', 'description'
            ];

            allowed.forEach(field => {
                if (data[field] !== undefined) {
                    fields.push(`${field} = ?`);
                    values.push(data[field]);
                }
            });

            if (fields.length === 0) return resolve({ id });

            values.push(id);
            const sql = `UPDATE books SET ${fields.join(', ')} WHERE id = ?`;

            db.run(sql, values, function (err) {
                if (err) return reject(err);
                resolve({ id, ...data });
            });
        });
    }

    static delete(id) {
        return new Promise((resolve, reject) => {
            db.run('DELETE FROM books WHERE id = ?', [id], function (err) {
                if (err) return reject(err);
                resolve({ deleted: this.changes > 0 });
            });
        });
    }

    static getStats() {
        return new Promise((resolve, reject) => {
            const queries = {
                totalBooks: 'SELECT COUNT(*) as count FROM books',
                totalCopies: 'SELECT SUM(copies_total) as sum FROM books',
                availableCopies: 'SELECT SUM(copies_available) as sum FROM books',
                activeLoans: 'SELECT COUNT(*) as count FROM book_loans WHERE status = "active"',
                genres: 'SELECT COUNT(DISTINCT genre) as count FROM books'
            };

            const stats = {};
            db.get(queries.totalBooks, [], (err, r1) => {
                if (err) return reject(err);
                stats.totalBooks = r1 ? r1.count : 0;

                db.get(queries.totalCopies, [], (err, r2) => {
                    if (err) return reject(err);
                    stats.totalCopies = r2 && r2.sum ? r2.sum : 0;

                    db.get(queries.availableCopies, [], (err, r3) => {
                        if (err) return reject(err);
                        stats.availableCopies = r3 && r3.sum ? r3.sum : 0;

                        db.get(queries.activeLoans, [], (err, r4) => {
                            if (err) return reject(err);
                            stats.activeLoans = r4 ? r4.count : 0;

                            db.get(queries.genres, [], (err, r5) => {
                                if (err) return reject(err);
                                stats.totalGenres = r5 ? r5.count : 0;
                                resolve(stats);
                            });
                        });
                    });
                });
            });
        });
    }
}

module.exports = Book;
