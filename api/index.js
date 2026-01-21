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
            message: err.message,
            stack: err.stack,
            type: err.name,
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
        const { id, title, description, category, completed_by } = req.body;

        // Ensure table exists on first write (lazy init)
        await db.execute(`
            CREATE TABLE IF NOT EXISTS items (
                id INTEGER PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT,
                category TEXT NOT NULL,
                service_type TEXT,
                urgency TEXT DEFAULT 'normal',
                scheduled_at TEXT,
                completed_by TEXT,
                created_at TEXT,
                completed_at TEXT
            )
        `);

        // Migration for new OS columns (Run individually)
        try { await db.execute('ALTER TABLE items ADD COLUMN completed_by TEXT'); } catch (e) { }
        try { await db.execute('ALTER TABLE items ADD COLUMN created_at TEXT'); } catch (e) { }
        try { await db.execute('ALTER TABLE items ADD COLUMN completed_at TEXT'); } catch (e) { }
        try { await db.execute('ALTER TABLE items ADD COLUMN service_type TEXT'); } catch (e) { }
        try { await db.execute('ALTER TABLE items ADD COLUMN urgency TEXT DEFAULT "normal"'); } catch (e) { }
        try { await db.execute('ALTER TABLE items ADD COLUMN scheduled_at TEXT'); } catch (e) { }

        const created_at = new Date().toISOString();

        await db.execute({
            sql: 'INSERT INTO items (id, title, description, category, service_type, urgency, scheduled_at, completed_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            args: [
                id,
                title,
                description,
                category, // Now acts as Status (pending, scheduled, etc)
                req.body.service_type || 'General',
                req.body.urgency || 'normal',
                req.body.scheduled_at || null,
                completed_by || null,
                created_at
            ],
        });
        res.json({ message: 'success', data: { ...req.body, created_at } });
    } catch (err) {
        console.error('API Error:', err);
        res.status(500).json({
            error: 'Server Error',
            message: err.message,
            stack: err.stack
        });
    }
});

app.put('/api/items/:id', async (req, res) => {
    try {
        const db = getDb();
        const { category, completed_by, completed_at, urgency, scheduled_at } = req.body;

        if (completed_by !== undefined) {
            // Conclusion logic
            const finalDate = completed_at || new Date().toISOString();
            await db.execute({
                sql: 'UPDATE items SET category = ?, completed_by = ?, completed_at = ? WHERE id = ?',
                args: [category, completed_by, finalDate, req.params.id],
            });
        }
        else if (urgency !== undefined || scheduled_at !== undefined) {
            // Update details logic
            await db.execute({
                sql: 'UPDATE items SET urgency = ?, scheduled_at = ? WHERE id = ?',
                args: [urgency, scheduled_at, req.params.id],
            });
        }
        else {
            // Move category logic
            await db.execute({
                sql: 'UPDATE items SET category = ? WHERE id = ?',
                args: [category, req.params.id],
            });
        }

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
