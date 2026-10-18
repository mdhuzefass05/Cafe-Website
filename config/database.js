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

        // Books Table (Cafe Library)
        db.run(`
            CREATE TABLE IF NOT EXISTS books (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                author TEXT NOT NULL,
                genre TEXT NOT NULL,
                cover_image TEXT,
                shelf_location TEXT NOT NULL,
                copies_total INTEGER DEFAULT 1,
                copies_available INTEGER DEFAULT 1,
                paired_menu_item_id INTEGER,
                description TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (paired_menu_item_id) REFERENCES menu_items(id)
            )
        `, (err) => {
            if (!err) {
                // Seed initial curated books if empty
                db.get('SELECT COUNT(*) as count FROM books', [], (err, row) => {
                    if (!err && row && row.count === 0) {
                        const seedBooks = [
                            {
                                title: 'The World Atlas of Coffee',
                                author: 'James Hoffmann',
                                genre: 'Coffee Lore',
                                cover_image: 'https://covers.openlibrary.org/b/isbn/9781784724290-M.jpg',
                                shelf_location: 'Shelf A1 - Brew Bar Nook',
                                copies_total: 2,
                                copies_available: 2,
                                paired_menu_item_id: 1, // Vanilla Latte
                                description: 'An illustrated tour of the greatest coffee-producing regions on Earth, bean processing methods, and barista secrets from World Barista Champion James Hoffmann.'
                            },
                            {
                                title: 'Kafka on the Shore',
                                author: 'Haruki Murakami',
                                genre: 'Fiction',
                                cover_image: 'https://covers.openlibrary.org/b/isbn/9781400079278-M.jpg',
                                shelf_location: 'Shelf B2 - Fireside Reading Corner',
                                copies_total: 2,
                                copies_available: 1,
                                paired_menu_item_id: 3, // Matcha Green Tea
                                description: 'A magical realism masterpiece woven with talking cats, raining fish, and deep metaphysical journeys of self-discovery.'
                            },
                            {
                                title: 'Before the Coffee Gets Cold',
                                author: 'Toshikazu Kawaguchi',
                                genre: 'Cozy Reads',
                                cover_image: 'https://covers.openlibrary.org/b/isbn/9781335430991-M.jpg',
                                shelf_location: 'Shelf B1 - Window Bench',
                                copies_total: 3,
                                copies_available: 3,
                                paired_menu_item_id: 2, // Cold Brew
                                description: 'In a small Tokyo back alley cafe, customers are offered the rare chance to travel back in time, provided they return before their cup of coffee turns cold.'
                            },
                            {
                                title: 'Meditations',
                                author: 'Marcus Aurelius',
                                genre: 'Philosophy',
                                cover_image: 'https://covers.openlibrary.org/b/isbn/9780140449334-M.jpg',
                                shelf_location: 'Shelf C1 - Quiet Study Loft',
                                copies_total: 2,
                                copies_available: 2,
                                paired_menu_item_id: 2, // Cold Brew
                                description: 'Timeless stoic reflections on wisdom, discipline, inner tranquility, and navigating life with clarity and purpose.'
                            },
                            {
                                title: 'Atomic Habits',
                                author: 'James Clear',
                                genre: 'Personal Growth',
                                cover_image: 'https://covers.openlibrary.org/b/isbn/9780735211292-M.jpg',
                                shelf_location: 'Shelf C2 - Quiet Study Loft',
                                copies_total: 3,
                                copies_available: 2,
                                paired_menu_item_id: 5, // Chocolate Croissant
                                description: 'A transformative framework for improving every single day. Practical strategies to build good habits, break bad ones, and master tiny behaviors.'
                            },
                            {
                                title: 'The Design of Everyday Things',
                                author: 'Don Norman',
                                genre: 'Art & Design',
                                cover_image: 'https://covers.openlibrary.org/b/isbn/9780465050659-M.jpg',
                                shelf_location: 'Shelf A2 - Creative Lounge',
                                copies_total: 2,
                                copies_available: 2,
                                paired_menu_item_id: 4, // Blueberry Muffin
                                description: 'The legendary guide on cognitive design, usability, ergonomics, and how simple objects can either delight or frustrate human beings.'
                            }
                        ];

                        const stmt = db.prepare(`
                            INSERT INTO books (title, author, genre, cover_image, shelf_location, copies_total, copies_available, paired_menu_item_id, description)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `);
                        seedBooks.forEach(b => {
                            stmt.run(b.title, b.author, b.genre, b.cover_image, b.shelf_location, b.copies_total, b.copies_available, b.paired_menu_item_id, b.description);
                        });
                        stmt.finalize();
                        console.log('Seeded initial curated cafe library books.');
                    }
                });
            }
        });

        // Book Loans & Table Reading Requests
        db.run(`
            CREATE TABLE IF NOT EXISTS book_loans (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                book_id INTEGER NOT NULL,
                customer_name TEXT NOT NULL,
                customer_phone TEXT,
                table_number INTEGER,
                loan_type TEXT CHECK(loan_type IN ('in_cafe', 'take_home')) DEFAULT 'in_cafe',
                status TEXT CHECK(status IN ('active', 'returned', 'overdue')) DEFAULT 'active',
                borrowed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                due_date DATETIME,
                returned_at DATETIME,
                notes TEXT,
                FOREIGN KEY (book_id) REFERENCES books(id)
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
