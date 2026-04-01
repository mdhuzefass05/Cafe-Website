const db = require('../config/database');

class MenuItem {
    static findAll() {
        return new Promise((resolve, reject) => {
            db.all('SELECT * FROM menu_items ORDER BY category ASC, name ASC', [], (err, rows) => {
                if (err) reject(err);
                resolve(rows);
            });
        });
    }

    static create(data) {
        return new Promise((resolve, reject) => {
            const { name, category, price, is_available = 1 } = data;
            db.run(
                'INSERT INTO menu_items (name, category, price, is_available) VALUES (?, ?, ?, ?)',
                [name, category, price, is_available ? 1 : 0],
                function (err) {
                    if (err) reject(err);
                    resolve({ id: this.lastID, ...data, is_available: is_available ? 1 : 0 });
                }
            );
        });
    }

    static update(id, data) {
        return new Promise((resolve, reject) => {
            const { name, category, price, is_available } = data;
            const fields = [];
            const values = [];

            if (name !== undefined) { fields.push('name = ?'); values.push(name); }
            if (category !== undefined) { fields.push('category = ?'); values.push(category); }
            if (price !== undefined) { fields.push('price = ?'); values.push(price); }
            if (is_available !== undefined) { fields.push('is_available = ?'); values.push(is_available ? 1 : 0); }

            if (fields.length === 0) return resolve({ id });
            values.push(id);

            db.run(
                `UPDATE menu_items SET ${fields.join(', ')} WHERE id = ?`,
                values,
                function (err) {
                    if (err) reject(err);
                    resolve({ id, ...data });
                }
            );
        });
    }

    static delete(id) {
        return new Promise((resolve, reject) => {
            db.run('DELETE FROM menu_items WHERE id = ?', [id], function (err) {
                if (err) reject(err);
                resolve({ deleted: this.changes > 0 });
            });
        });
    }
}

module.exports = MenuItem;
