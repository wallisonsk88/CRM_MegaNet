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
    } catch (err) {
        console.error('Error initializing database:', err);
    }
}

initDb();

// Helper to handle async routes
const asyncHandler = fn => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// ENDPOINTS
// We handle both /api/items and /items to be safe with Vercel routing
const getItems = asyncHandler(async (req, res) => {
    const rs = await db.execute('SELECT * FROM items');
    res.json(rs.rows);
});

const addItem = asyncHandler(async (req, res) => {
    const { id, title, description, category } = req.body;
    await db.execute({
        sql: 'INSERT INTO items (id, title, description, category) VALUES (?, ?, ?, ?)',
        args: [id, title, description, category],
    });
    res.json({ message: 'success', data: req.body });
});

const updateItem = asyncHandler(async (req, res) => {
    const { category } = req.body;
    await db.execute({
        sql: 'UPDATE items SET category = ? WHERE id = ?',
        args: [category, req.params.id],
    });
    res.json({ status: 'updated' });
});

const deleteItem = asyncHandler(async (req, res) => {
    await db.execute({
        sql: 'DELETE FROM items WHERE id = ?',
        args: [req.params.id],
    });
    res.json({ message: 'deleted' });
});

// Routes with /api prefix
app.get('/api/items', getItems);
app.post('/api/items', addItem);
app.put('/api/items/:id', updateItem);
app.delete('/api/items/:id', deleteItem);

// Routes without /api prefix (for some Vercel configurations)
app.get('/items', getItems);
app.post('/items', addItem);
app.put('/items/:id', updateItem);
app.delete('/items/:id', deleteItem);

// Health check
app.get('/api/health', (req, res) => res.send('API is healthy'));
app.get('/health', (req, res) => res.send('API is healthy'));

// Root
app.get('/', (req, res) => {
    res.send('CRM MegaNet API is active. Use /api/items to access data.');
});

// Error handling
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: err.message });
});

module.exports = app;
