const express = require('express');
const { createClient } = require('@libsql/client');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// Database setup for Turso
const db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
});

// Cache for schema initialization
let isDbInitialized = false;

async function ensureDb() {
    if (isDbInitialized) return;
    try {
        await db.execute(`
            CREATE TABLE IF NOT EXISTS items (
                id INTEGER PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT,
                category TEXT NOT NULL
            )
        `);
        isDbInitialized = true;
    } catch (err) {
        console.error('DB Init Error:', err);
    }
}

// API Routes
app.get('/api/items', async (req, res) => {
    await ensureDb();
    try {
        const rs = await db.execute('SELECT * FROM items');
        res.json(rs.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/items', async (req, res) => {
    await ensureDb();
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
});

app.put('/api/items/:id', async (req, res) => {
    await ensureDb();
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
});

app.delete('/api/items/:id', async (req, res) => {
    await ensureDb();
    try {
        await db.execute({
            sql: 'DELETE FROM items WHERE id = ?',
            args: [req.params.id],
        });
        res.json({ message: 'deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Fallback for /api root
app.get('/api', (req, res) => {
    res.json({ message: 'CRM MegaNet API is active', help: 'Use /api/items' });
});

// Error handling
app.use((err, req, res, next) => {
    res.status(500).json({ error: 'Internal Server Error', detail: err.message });
});

module.exports = app;
