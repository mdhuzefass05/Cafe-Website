const db = require('../config/database');

class InventoryItem {
    static findAll() {
        return new Promise((resolve, reject) => {
            db.all('SELECT * FROM inventory ORDER BY item_name ASC', [], (err, rows) => {
                if (err) reject(err);
                resolve(rows);
            });
        });
    }

    static create(data) {
        return new Promise((resolve, reject) => {
            const { item_name, quantity, unit, low_stock_threshold } = data;
            db.run(
                'INSERT INTO inventory (item_name, quantity, unit, low_stock_threshold) VALUES (?, ?, ?, ?)',
                [item_name, quantity, unit, low_stock_threshold],
                function (err) {
                    if (err) reject(err);
                    resolve({ id: this.lastID, ...data });
                }
            );
        });
    }

    static update(id, data) {
        return new Promise((resolve, reject) => {
            const { item_name, quantity, unit, low_stock_threshold } = data;
            const fields = [];
            const values = [];

            if (item_name !== undefined) { fields.push('item_name = ?'); values.push(item_name); }
            if (quantity !== undefined) { fields.push('quantity = ?'); values.push(quantity); }
            if (unit !== undefined) { fields.push('unit = ?'); values.push(unit); }
            if (low_stock_threshold !== undefined) { fields.push('low_stock_threshold = ?'); values.push(low_stock_threshold); }

            if (fields.length === 0) return resolve({ id });
            values.push(id);

            db.run(
                `UPDATE inventory SET ${fields.join(', ')} WHERE id = ?`,
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
            db.run('DELETE FROM inventory WHERE id = ?', [id], function (err) {
                if (err) reject(err);
                resolve({ deleted: this.changes > 0 });
            });
        });
    }
}

module.exports = InventoryItem;
