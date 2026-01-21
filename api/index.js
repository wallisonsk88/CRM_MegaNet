const express = require('express');
const { createClient } = require('@libsql/client');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Lazy Database Connection
let dbInstance = null;

function getDb() {
    if (dbInstance) return dbInstance;

    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;

    if (!url || !authToken) {
        throw new Error('Environment variables TURSO_DATABASE_URL or TURSO_AUTH_TOKEN are missing.');
    }

    try {
        dbInstance = createClient({ url, authToken });
        return dbInstance;
    } catch (err) {
        console.error('Failed to create DB client:', err);
        throw err;
    }
}

// ENDPOINTS
app.get('/api/items', async (req, res) => {
    try {
        const db = getDb();
        const rs = await db.execute('SELECT * FROM items');
        res.json(rs.rows || []);
    } catch (err) {
        console.error('API Error:', err);
        res.status(500).json({
            error: 'Server Error',
            details: err.message,
            env_status: {
                url_set: !!process.env.TURSO_DATABASE_URL,
                token_set: !!process.env.TURSO_AUTH_TOKEN
            }
        });
    }
});

app.post('/api/items', async (req, res) => {
    try {
        const db = getDb();
        const { id, title, description, category } = req.body;

        // Ensure table exists on first write (lazy init)
        await db.execute(`
            CREATE TABLE IF NOT EXISTS items (
                id INTEGER PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT,
                category TEXT NOT NULL
            )
        `);

        await db.execute({
            sql: 'INSERT INTO items (id, title, description, category) VALUES (?, ?, ?, ?)',
            args: [id, title, description, category],
        });
        res.json({ message: 'success', data: req.body });
    } catch (err) {
        console.error('API Error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/items/:id', async (req, res) => {
    try {
        const db = getDb();
        const { category } = req.body;
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
    try {
        const db = getDb();
        await db.execute({
            sql: 'DELETE FROM items WHERE id = ?',
            args: [req.params.id],
        });
        res.json({ message: 'deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Fallback for Vercel
app.get('/', (req, res) => {
    res.json({ status: 'API Online', endpoints: ['/api/items', '/api/status'] });
});

module.exports = app;
