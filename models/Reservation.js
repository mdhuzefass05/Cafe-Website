const db = require('../config/database');

class Reservation {
    static findAll() {
        return new Promise((resolve, reject) => {
            db.all('SELECT * FROM reservations ORDER BY reservation_time ASC', [], (err, rows) => {
                if (err) reject(err);
                resolve(rows);
            });
        });
    }

    static create(data) {
        return new Promise((resolve, reject) => {
            const { table_number, customer_name, guests, reservation_time } = data;
            db.run(
                'INSERT INTO reservations (table_number, customer_name, guests, reservation_time) VALUES (?, ?, ?, ?)',
                [table_number, customer_name, guests, reservation_time],
                function (err) {
                    if (err) reject(err);
                    resolve({ id: this.lastID, ...data });
                }
            );
        });
    }

    static update(id, data) {
        return new Promise((resolve, reject) => {
            const { table_number, customer_name, guests, reservation_time } = data;
            const fields = [];
            const values = [];
            if (table_number) { fields.push('table_number = ?'); values.push(table_number); }
            if (customer_name) { fields.push('customer_name = ?'); values.push(customer_name); }
            if (guests) { fields.push('guests = ?'); values.push(guests); }
            if (reservation_time) { fields.push('reservation_time = ?'); values.push(reservation_time); }

            if (fields.length === 0) return resolve({ id });
            values.push(id);

            db.run(
                `UPDATE reservations SET ${fields.join(', ')} WHERE id = ?`,
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
            db.run('DELETE FROM reservations WHERE id = ?', [id], function (err) {
                if (err) reject(err);
                resolve({ deleted: this.changes > 0 });
            });
        });
    }
}
module.exports = Reservation;
