const express = require('express');
const { createClient } = require('@libsql/client');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

const db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
});

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

// NOTE: Vercel routes /api/items to this file.
// So internal routes should be relative to that.

app.get('/api/items', async (req, res) => {
    await ensureDb();
    try {
        const rs = await db.execute('SELECT * FROM items');
        res.json(rs.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Also handle the base path '/' just in case
app.get('/', async (req, res) => {
    await ensureDb();
    try {
        const rs = await db.execute('SELECT * FROM items');
        res.json(rs.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/', async (req, res) => {
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

app.put('/:id', async (req, res) => {
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

app.delete('/:id', async (req, res) => {
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

module.exports = app;
