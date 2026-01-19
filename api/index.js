const express = require('express');
const { createClient } = require('@libsql/client');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

// Database setup for Turso
const db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
});

// Initialize database schema (runs on every cold start)
async function initDb() {
    try {
        await db.execute(`
            CREATE TABLE IF NOT EXISTS items (
                id INTEGER PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT,
                category TEXT NOT NULL
            )
        `);
    } catch (err) {
        console.error('Error initializing database:', err);
    }
}

initDb();

// ENDPOINTS LOGIC
const getItems = async (req, res) => {
    try {
        const rs = await db.execute('SELECT * FROM items');
        res.json(rs.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const addItem = async (req, res) => {
    const { id, title, description, category } = req.body;
    try {
        await db.execute({
            sql: 'INSERT INTO items (id, title, description, category) VALUES (?, ?, ?, ?)',
            args: [id, title, description, category],
        });
        res.json({ message: 'success', data: req.body });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const updateItem = async (req, res) => {
    const { category } = req.body;
    try {
        await db.execute({
            sql: 'UPDATE items SET category = ? WHERE id = ?',
            args: [category, req.params.id],
        });
        res.json({ status: 'updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const deleteItem = async (req, res) => {
    try {
        await db.execute({
            sql: 'DELETE FROM items WHERE id = ?',
            args: [req.params.id],
        });
        res.json({ message: 'deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// MULTI-PATH ROUTING (Resilient to Vercel path variations)
const router = express.Router();

router.get('/items', getItems);
router.post('/items', addItem);
router.put('/items/:id', updateItem);
router.delete('/items/:id', deleteItem);
router.get('/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// Mount router on multiple paths to be safe
app.use('/api', router);
app.use('/', router);

// Final catch-all for 404s WITHIN Express
app.use((req, res) => {
    res.status(404).json({
        error: 'API Route not found',
        path: req.path,
        method: req.method,
        help: 'Try /api/items or /items'
    });
});

module.exports = app;
