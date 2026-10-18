const db = require('./config/database');

db.serialize(() => {
    // Insert dummy orders for today and previous days
    for (let i = 0; i < 20; i++) {
        const daysAgo = Math.floor(Math.random() * 7); // 0 to 6 days ago
        let dateModifier = `-${daysAgo} days`;
        if (daysAgo === 0) dateModifier = 'now';

        db.run(`
            INSERT INTO orders (items, total_price, status, created_at)
            VALUES (
                'Dummy Item ' || ?, 
                ROUND(RANDOM() / 1000000000000000.0 * 500 + 200, 2), 
                CASE ROUND(RANDOM() / 1000000000000000.0 * 2) WHEN 0 THEN 'pending' WHEN 1 THEN 'completed' ELSE 'cancelled' END,
                datetime('now', 'localtime', ?)
            )
        `, [i, dateModifier]);
    }

    // Insert dummy feedback
    for (let i = 0; i < 5; i++) {
        db.run("INSERT INTO feedback (customer_name, message, rating) VALUES ('Cust ' || ?, 'Great!', 5)", [i]);
    }

    // Insert dummy reservations
    for (let i = 0; i < 5; i++) {
        db.run("INSERT INTO reservations (table_number, customer_name, guests, reservation_time) VALUES (?, 'Guest ' || ?, 2, datetime('now', '+1 days', 'localtime'))", [i, i]);
    }

    // Insert dummy menu items if not already present
    const menuItems = [
        { name: 'Vanilla Latte', cat: 'Coffee', price: 250.00 },
        { name: 'Cold Brew', cat: 'Coffee', price: 220.00 },
        { name: 'Matcha Green Tea', cat: 'Tea', price: 200.00 },
        { name: 'Blueberry Muffin', cat: 'Pastry', price: 150.00 },
        { name: 'Chocolate Croissant', cat: 'Pastry', price: 180.00 }
    ];
    menuItems.forEach(item => {
        db.get('SELECT id FROM menu_items WHERE name = ?', [item.name], (err, row) => {
            if (!err && !row) {
                db.run('INSERT INTO menu_items (name, category, price, is_available) VALUES (?, ?, ?, 1)', [item.name, item.cat, item.price]);
            }
        });
    });

    // Insert dummy inventory items if not already present
    const invItems = [
        { name: 'Espresso Beans', qty: 15.5, unit: 'lbs', thresh: 5.0 },
        { name: 'Whole Milk', qty: 3.0, unit: 'Gallons', thresh: 4.0 }, // Low stock!
        { name: 'Oat Milk', qty: 10.0, unit: 'Cartons', thresh: 2.0 },
        { name: 'Vanilla Syrup', qty: 5.0, unit: 'Bottles', thresh: 1.5 },
        { name: 'Pastry Flour', qty: 20.0, unit: 'lbs', thresh: 10.0 }
    ];
    invItems.forEach(item => {
        db.get('SELECT id FROM inventory WHERE item_name = ?', [item.name], (err, row) => {
            if (!err && !row) {
                db.run('INSERT INTO inventory (item_name, quantity, unit, low_stock_threshold) VALUES (?, ?, ?, ?)', [item.name, item.qty, item.unit, item.thresh]);
            }
        });
    });

    console.log('Seeding complete including Menu and Inventory.');
});
