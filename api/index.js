const express = require('express');
const { createClient } = require('@libsql/client');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// Defensive database setup
let db = null;
try {
    if (process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN) {
        db = createClient({
            url: process.env.TURSO_DATABASE_URL,
            authToken: process.env.TURSO_AUTH_TOKEN,
        });
    }
} catch (e) {
    console.error('Failed to create Turso client:', e);
}

let isDbInitialized = false;

async function ensureDb() {
    if (!db) throw new Error('Database environment variables are missing (TURSO_DATABASE_URL or TURSO_AUTH_TOKEN)');
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
        throw err;
    }
}

// TEST ENDPOINT (No database needed)
app.get('/api/test', (req, res) => {
    res.json({
        message: 'API is working!',
        env_vars_detected: !!db,
        time: new Date().toISOString()
    });
});

// MAIN API ENDPOINTS
app.get('/api/items', async (req, res) => {
    try {
        await ensureDb();
        const rs = await db.execute('SELECT * FROM items');
        res.json(rs.rows || []);
    } catch (err) {
        res.status(500).json({ error: 'Database Error', details: err.message });
    }
});

app.post('/api/items', async (req, res) => {
    try {
        await ensureDb();
        const { id, title, description, category } = req.body;
        await db.execute({
            sql: 'INSERT INTO items (id, title, description, category) VALUES (?, ?, ?, ?)',
            args: [id, title, description, category],
        });
        res.json({ message: 'success', data: req.body });
    } catch (err) {
        res.status(500).json({ error: 'Database Error', details: err.message });
    }
});

app.put('/api/items/:id', async (req, res) => {
    try {
        await ensureDb();
        const { category } = req.body;
        await db.execute({
            sql: 'UPDATE items SET category = ? WHERE id = ?',
            args: [category, req.params.id],
        });
        res.json({ status: 'updated' });
    } catch (err) {
        res.status(500).json({ error: 'Database Error', details: err.message });
    }
});

app.delete('/api/items/:id', async (req, res) => {
    try {
        await ensureDb();
        await db.execute({
            sql: 'DELETE FROM items WHERE id = ?',
            args: [req.params.id],
        });
        res.json({ message: 'deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Database Error', details: err.message });
    }
});

// Root catch-all
app.get('*', (req, res) => {
    res.status(404).json({
        error: 'Not Found',
        path: req.path,
        message: 'Use /api/items to access data or /api/test to verify API status.'
    });
});

module.exports = app;
