# Cafe Management System

A full-stack web application for managing cafe operations, serving both customers and cafe administrators/staff. Built with **Node.js**, **Express.js**, **SQLite**, and **Vanilla HTML/CSS/JS**.

---

## 🚀 Features

### ☕ Customer Interface (`/customer.html` / `/index.html`)
- **Interactive Menu**: View available coffee, tea, pastries, and snacks with real-time availability.
- **Order Placement**: Add items to cart, specify notes, and submit orders directly to the cafe kitchen/counter.
- **Table Reservations**: Book tables for specific dates/times with contact details and special requests.
- **Customer Feedback**: Submit ratings (1–5 stars) and reviews.

### 📊 Staff & Admin Dashboard (`/dashboard.html`)
- **Secure Authentication**: Session-based login (`admin@cafe.com`).
- **Order Management**: Real-time order monitoring, status updates (`pending`, `completed`, `cancelled`), notes, and discount applications.
- **Reservation System**: View incoming reservations, assign tables, confirm or cancel bookings.
- **Menu Management**: Add, update, or remove menu items, set prices, and toggle availability.
- **Inventory Tracking**: Track raw materials/ingredients, set low stock thresholds, and view automated inventory alerts.
- **Feedback & Analytics**: Review customer ratings and export daily sales/order data to CSV files.

---

## 🛠️ Technology Stack

| Layer | Technologies Used |
|---|---|
| **Backend** | Node.js, Express.js |
| **Database** | SQLite 3 (`sqlite3`) |
| **Authentication** | `express-session`, `bcrypt` |
| **Frontend** | HTML5, CSS3 (`style.css`), Vanilla JavaScript (`script.js`, `customer.js`) |
| **Data Export** | `csv-writer` |

---

## 📁 Project Structure

```text
Cafe Website/
├── config/
│   └── database.js          # SQLite setup & schema initialization
├── middleware/
│   └── authMiddleware.js    # Session-based authentication middleware
├── models/                  # Database data access models
│   ├── Feedback.js
│   ├── InventoryItem.js
│   ├── MenuItem.js
│   ├── Order.js
│   ├── Reservation.js
│   └── User.js
├── public/                  # Static frontend files
│   ├── customer.html        # Customer ordering & reservation portal
│   ├── customer.js          # Customer portal logic
│   ├── dashboard.html       # Staff/Admin management dashboard
│   ├── script.js            # Admin dashboard logic
│   └── style.css            # Global styling system
├── routes/                  # Express REST API endpoints
│   ├── auth.js
│   ├── dashboard.js
│   ├── feedback.js
│   ├── inventory.js
│   ├── menu.js
│   ├── orders.js
│   └── reservations.js
├── database.db              # SQLite database file (auto-generated on first run)
├── seed.js                  # Script to seed database with initial/dummy data
├── update_prices.js         # Batch price adjustment script
├── server.js                # Application entry point
└── package.json             # Node.js dependencies & scripts
```

---

## 🚦 Getting Started

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher recommended)
- npm (installed automatically with Node.js)

### 2. Installation
Clone or navigate to the project directory and install dependencies:
```bash
npm install
```

### 3. Seed Initial Data (Optional)
To populate the database with sample menu items, inventory, reservations, and orders:
```bash
node seed.js
```

### 4. Run the Server
Start the Express application:
```bash
npm start
```
The server will run at: **`http://localhost:3000`**

---

## 🔐 Default Admin Credentials

Upon starting the server, a default administrator account is automatically generated if none exists:

- **Email**: `admin@cafe.com`
- **Password**: `admin123`

---

## 📡 API Endpoints Summary

| Endpoint | Method | Description |
|---|---|---|
| `/api/auth/login` | `POST` | Authenticate user session |
| `/api/auth/logout` | `POST` | Destroy session |
| `/api/menu` | `GET` / `POST` / `PUT` / `DELETE` | Manage cafe menu items |
| `/api/orders` | `GET` / `POST` / `PUT` | Manage customer orders |
| `/api/reservations` | `GET` / `POST` / `PUT` | Manage table bookings |
| `/api/inventory` | `GET` / `POST` / `PUT` | Track ingredient stock levels |
| `/api/feedback` | `GET` / `POST` | Customer ratings & reviews |
| `/api/dashboard/summary` | `GET` | Aggregated dashboard stats & metrics |
| `/api/dashboard/export-csv`| `GET` | Export sales report to CSV |

---

## 📄 License
This project is licensed under the **ISC License**.
