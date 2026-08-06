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
            const { table_number, customer_name, guests, reservation_time, status, contact_info, special_requests } = data;
            db.run(
                'INSERT INTO reservations (table_number, customer_name, guests, reservation_time, status, contact_info, special_requests) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [table_number || null, customer_name, guests, reservation_time, status || 'pending', contact_info || '', special_requests || ''],
                function (err) {
                    if (err) reject(err);
                    resolve({ id: this.lastID, ...data, status: status || 'pending' });
                }
            );
        });
    }

    static update(id, data) {
        return new Promise((resolve, reject) => {
            const { table_number, customer_name, guests, reservation_time, status, contact_info, special_requests } = data;
            const fields = [];
            const values = [];
            if (table_number !== undefined) { fields.push('table_number = ?'); values.push(table_number); }
            if (customer_name !== undefined) { fields.push('customer_name = ?'); values.push(customer_name); }
            if (guests !== undefined) { fields.push('guests = ?'); values.push(guests); }
            if (reservation_time !== undefined) { fields.push('reservation_time = ?'); values.push(reservation_time); }
            if (status !== undefined) { fields.push('status = ?'); values.push(status); }
            if (contact_info !== undefined) { fields.push('contact_info = ?'); values.push(contact_info); }
            if (special_requests !== undefined) { fields.push('special_requests = ?'); values.push(special_requests); }

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
