const express = require('express');
const { createClient } = require('@libsql/client');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Database setup for Turso
const db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
});

// Initialize database schema
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
        console.log('Database initialized successfully.');
    } catch (err) {
        console.error('Error initializing database:', err);
    }
}

initDb();

// API Endpoints

// Get all items
app.get('/api/items', async (req, res) => {
    try {
        const rs = await db.execute('SELECT * FROM items');
        res.json(rs.rows);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Add new item
app.post('/api/items', async (req, res) => {
    const { id, title, description, category } = req.body;
    try {
        await db.execute({
            sql: 'INSERT INTO items (id, title, description, category) VALUES (?, ?, ?, ?)',
            args: [id, title, description, category],
        });
        res.json({
            message: 'success',
            data: req.body
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Update item (for category change)
app.put('/api/items/:id', async (req, res) => {
    const { category } = req.body;
    try {
        await db.execute({
            sql: 'UPDATE items SET category = ? WHERE id = ?',
            args: [category, req.params.id],
        });
        res.json({ status: 'updated' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Delete item
app.delete('/api/items/:id', async (req, res) => {
    try {
        await db.execute({
            sql: 'DELETE FROM items WHERE id = ?',
            args: [req.params.id],
        });
        res.json({ message: 'deleted' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Health check
app.get('/', (req, res) => {
    res.send('CRM MegaNet API is running...');
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
