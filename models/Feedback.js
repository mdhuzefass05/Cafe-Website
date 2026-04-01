const db = require('../config/database');

class Feedback {
    static findAll() {
        return new Promise((resolve, reject) => {
            db.all('SELECT * FROM feedback ORDER BY created_at DESC', [], (err, rows) => {
                if (err) reject(err);
                resolve(rows);
            });
        });
    }

    static create(data) {
        return new Promise((resolve, reject) => {
            const { customer_name, message, rating } = data;
            db.run(
                'INSERT INTO feedback (customer_name, message, rating) VALUES (?, ?, ?)',
                [customer_name, message, rating],
                function (err) {
                    if (err) reject(err);
                    resolve({ id: this.lastID, ...data });
                }
            );
        });
    }
}
module.exports = Feedback;
