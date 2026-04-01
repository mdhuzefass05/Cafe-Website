const db = require('../config/database');

class Order {
    static findAll() {
        return new Promise((resolve, reject) => {
            db.all('SELECT * FROM orders ORDER BY created_at DESC', [], (err, rows) => {
                if (err) reject(err);
                resolve(rows);
            });
        });
    }

    static create(data) {
        return new Promise((resolve, reject) => {
            const { items, total_price, status, notes, discount, customer_name } = data;
            db.run(
                'INSERT INTO orders (customer_name, items, total_price, status, notes, discount) VALUES (?, ?, ?, ?, ?, ?)',
                [customer_name || 'Guest', items, total_price, status || 'pending', notes || '', discount || 0],
                function (err) {
                    if (err) reject(err);
                    resolve({ id: this.lastID, ...data, status: status || 'pending', notes: notes || '', discount: discount || 0, customer_name: customer_name || 'Guest' });
                }
            );
        });
    }

    static update(id, data) {
        return new Promise((resolve, reject) => {
            const { status, items, total_price, notes, discount, customer_name } = data;

            // First get the current order to check if status is changing TO completed
            db.get('SELECT * FROM orders WHERE id = ?', [id], (err, currentOrder) => {
                if (err) return reject(err);
                if (!currentOrder) return reject(new Error('Order not found'));

                const fields = [];
                const values = [];
                if (status) { fields.push('status = ?'); values.push(status); }
                if (items) { fields.push('items = ?'); values.push(items); }
                if (total_price !== undefined) { fields.push('total_price = ?'); values.push(total_price); }
                if (notes !== undefined) { fields.push('notes = ?'); values.push(notes); }
                if (discount !== undefined) { fields.push('discount = ?'); values.push(discount); }
                if (customer_name !== undefined) { fields.push('customer_name = ?'); values.push(customer_name); }

                if (fields.length === 0) return resolve({ id });
                values.push(id);

                db.run(
                    `UPDATE orders SET ${fields.join(', ')} WHERE id = ?`,
                    values,
                    async function (updateErr) {
                        if (updateErr) return reject(updateErr);

                        // Deduct inventory if status changed to completed
                        if (status === 'completed' && currentOrder.status !== 'completed') {
                            try {
                                const finalItems = items || currentOrder.items;
                                await Order.deductInventoryForOrder(finalItems);
                            } catch (e) {
                                console.error('Error deducting inventory:', e);
                            }
                        }

                        resolve({ id, ...data });
                    }
                );
            });
        });
    }

    static deductInventoryForOrder(itemsString) {
        return new Promise((resolve, reject) => {
            if (!itemsString) return resolve();

            // Expected format: "1x Latte, 2x Muffin"
            const parts = itemsString.split(', ');
            const orderedItems = parts.map(part => {
                const match = part.match(/^(\d+)x\s+(.+)$/);
                if (match) return { qty: parseInt(match[1]), name: match[2].trim() };
                return null;
            }).filter(Boolean);

            let promises = [];

            orderedItems.forEach(item => {
                const p = new Promise((res, rej) => {
                    db.all('SELECT inventory_id, quantity_required FROM menu_ingredients WHERE menu_item_name = ?', [item.name], (err, ingredients) => {
                        if (err) return rej(err);
                        if (!ingredients || ingredients.length === 0) return res(); // No ingredients linked

                        let updatePromises = ingredients.map(ing => {
                            return new Promise((uRes, uRej) => {
                                const totalToDeduct = ing.quantity_required * item.qty;
                                db.run('UPDATE inventory SET quantity = quantity - ? WHERE id = ?', [totalToDeduct, ing.inventory_id], (uErr) => {
                                    if (uErr) return uRej(uErr);
                                    uRes();
                                });
                            });
                        });

                        Promise.all(updatePromises).then(res).catch(rej);
                    });
                });
                promises.push(p);
            });

            Promise.all(promises).then(() => resolve()).catch(reject);
        });
    }

    static delete(id) {
        return new Promise((resolve, reject) => {
            db.run('DELETE FROM orders WHERE id = ?', [id], function (err) {
                if (err) reject(err);
                resolve({ deleted: this.changes > 0 });
            });
        });
    }
}

module.exports = Order;
