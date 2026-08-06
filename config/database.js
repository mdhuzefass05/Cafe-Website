const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

const dbPath = path.resolve(__dirname, '../database.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        initializeDatabase();
    }
});

function initializeDatabase() {
    db.serialize(() => {
        // Users Table
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE,
                password TEXT,
                role TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Orders Table - Base Schema
        db.run(`
            CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                items TEXT,
                total_price REAL,
                status TEXT CHECK(status IN ('pending', 'completed', 'cancelled')) DEFAULT 'pending',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (!err) {
                // Safely attempt to add new columns if they don't exist
                db.run(`ALTER TABLE orders ADD COLUMN notes TEXT`, (e) => { /* ignore if already exists */ });
                db.run(`ALTER TABLE orders ADD COLUMN discount REAL DEFAULT 0`, (e) => { /* ignore */ });
                db.run(`ALTER TABLE orders ADD COLUMN customer_name TEXT`, (e) => { /* ignore */ });
            }
        });

        // Reservations Table
        db.run(`
            CREATE TABLE IF NOT EXISTS reservations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                table_number INTEGER,
                customer_name TEXT,
                guests INTEGER,
                reservation_time DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (!err) {
                db.run(`ALTER TABLE reservations ADD COLUMN status TEXT CHECK(status IN ('pending', 'confirmed', 'cancelled')) DEFAULT 'pending'`, (e) => {});
                db.run(`ALTER TABLE reservations ADD COLUMN contact_info TEXT`, (e) => {});
                db.run(`ALTER TABLE reservations ADD COLUMN special_requests TEXT`, (e) => {});
            }
        });

        // Feedback Table
        db.run(`
            CREATE TABLE IF NOT EXISTS feedback (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_name TEXT,
                message TEXT,
                rating INTEGER CHECK(rating >= 1 AND rating <= 5),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Menu Items Table
        db.run(`
            CREATE TABLE IF NOT EXISTS menu_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                price REAL NOT NULL,
                is_available BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Inventory Table
        db.run(`
            CREATE TABLE IF NOT EXISTS inventory (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                item_name TEXT NOT NULL,
                quantity REAL NOT NULL,
                unit TEXT NOT NULL,
                low_stock_threshold REAL NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Menu Ingredients Linking Table
        db.run(`
            CREATE TABLE IF NOT EXISTS menu_ingredients (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                menu_item_name TEXT NOT NULL,
                inventory_id INTEGER NOT NULL,
                quantity_required REAL NOT NULL,
                FOREIGN KEY (inventory_id) REFERENCES inventory(id)
            )
        `);

        // Insert Default Admin User
        db.get('SELECT * FROM users WHERE email = ?', ['admin@cafe.com'], async (err, row) => {
            if (err) {
                console.error(err.message);
                return;
            }
            if (!row) {
                const hashedPassword = await bcrypt.hash('admin123', 10);
                db.run('INSERT INTO users (email, password, role) VALUES (?, ?, ?)', ['admin@cafe.com', hashedPassword, 'admin'], (err) => {
                    if (err) {
                        console.error('Error creating default admin:', err.message);
                    } else {
                        console.log('Default admin user created.');
                    }
                });
            }
        });
    });
}

module.exports = db;
