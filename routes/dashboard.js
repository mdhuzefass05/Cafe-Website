const express = require('express');
const requireAuth = require('../middleware/authMiddleware');
const db = require('../config/database');
const router = express.Router();

router.use(requireAuth);

router.get('/stats', (req, res) => {
    const queries = {
        totalOrdersToday: `SELECT COUNT(*) as count FROM orders WHERE date(created_at, 'localtime') = date('now', 'localtime')`,
        activeOrders: `SELECT COUNT(*) as count FROM orders WHERE status = 'pending'`,
        revenueToday: `SELECT SUM(total_price) as total FROM orders WHERE date(created_at, 'localtime') = date('now', 'localtime')`,
        totalReservations: `SELECT COUNT(*) as count FROM reservations WHERE date(reservation_time, 'localtime') >= date('now', 'localtime')`,
        feedbackCount: `SELECT COUNT(*) as count FROM feedback`
    };

    let results = {};
    let pending = Object.keys(queries).length;

    for (const [key, query] of Object.entries(queries)) {
        db.get(query, [], (err, row) => {
            if (err) {
                console.error(err);
                results[key] = 0;
            } else {
                results[key] = row.count !== undefined ? row.count : (row.total || 0);
            }
            pending--;
            if (pending === 0) {
                res.json(results);
            }
        });
    }
});

router.get('/analytics', (req, res) => {
    const data = {
        charts: {},
        insights: {}
    };

    db.serialize(() => {
        db.all(`
            SELECT date(created_at, 'localtime') as day, COUNT(*) as orders, SUM(total_price) as revenue
            FROM orders
            WHERE created_at >= date('now', '-7 days', 'localtime')
            GROUP BY day
            ORDER BY day ASC
        `, [], (err, rows) => {
            if (err) console.error(err);
            data.charts.last7Days = rows || [];

            db.all(`
                SELECT status, COUNT(*) as count
                FROM orders
                GROUP BY status
            `, [], (err, statusRows) => {
                if (err) console.error(err);
                data.charts.statusDistribution = statusRows || [];

                const totalOrders7Days = rows ? rows.reduce((acc, r) => acc + r.orders, 0) : 0;
                data.insights.avgOrders7Days = rows && rows.length ? (totalOrders7Days / rows.length).toFixed(1) : 0;

                data.insights.predictedTomorrow = Math.round(data.insights.avgOrders7Days);

                db.get(`
                    SELECT strftime('%H', created_at, 'localtime') as hour, COUNT(*) as count
                    FROM orders
                    GROUP BY hour
                    ORDER BY count DESC
                    LIMIT 1
                `, [], (err, peakRow) => {
                    if (err) console.error(err);
                    data.insights.peakHour = peakRow && peakRow.hour ? peakRow.hour + ':00' : 'N/A';

                    db.get(`SELECT AVG(rating) as avgRating FROM feedback`, [], (err, ratingRow) => {
                        if (err) console.error(err);
                        data.insights.avgRating = ratingRow && ratingRow.avgRating ? ratingRow.avgRating.toFixed(1) : 0;

                        let todayRev = 0, ydayRev = 0;
                        db.get(`SELECT SUM(total_price) as total FROM orders WHERE date(created_at, 'localtime') = date('now', 'localtime')`, [], (err, tr) => {
                            todayRev = tr && tr.total ? tr.total : 0;
                            db.get(`SELECT SUM(total_price) as total FROM orders WHERE date(created_at, 'localtime') = date('now', '-1 day', 'localtime')`, [], (err, yr) => {
                                ydayRev = yr && yr.total ? yr.total : 0;

                                if (ydayRev === 0) {
                                    data.insights.revenueGrowth = todayRev > 0 ? 100 : 0;
                                } else {
                                    data.insights.revenueGrowth = (((todayRev - ydayRev) / ydayRev) * 100).toFixed(1);
                                }

                                res.json(data);
                            });
                        });
                    });
                });
            });
        });
    });
});

module.exports = router;
