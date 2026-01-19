const express = require('express');
const { createClient } = require('@libsql/client');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
});

const router = express.Router();

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

// API Endpoints using the router
router.get('/items', async (req, res) => {
    try {
        const rs = await db.execute('SELECT * FROM items');
        res.json(rs.rows);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.post('/items', async (req, res) => {
    const { id, title, description, category } = req.body;
    try {
        await db.execute({
            sql: 'INSERT INTO items (id, title, description, category) VALUES (?, ?, ?, ?)',
            args: [id, title, description, category],
        });
        res.json({ message: 'success', data: req.body });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.put('/items/:id', async (req, res) => {
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

router.delete('/items/:id', async (req, res) => {
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

// Mount the router on /api
app.use('/api', router);

// Health check and root paths
app.get('/api', (req, res) => {
    res.send('CRM MegaNet API is running...');
});

app.get('/', (req, res) => {
    res.send('Server is active');
});

// Basic error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// For local development
if (process.env.NODE_ENV !== 'production') {
    app.listen(port, () => {
        console.log(`Server running local on port ${port}`);
    });
}

module.exports = app;
