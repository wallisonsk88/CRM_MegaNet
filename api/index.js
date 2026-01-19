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

// ENDPOINTS
const getItems = async (req, res) => {
    await ensureDb();
    try {
        const rs = await db.execute('SELECT * FROM items');
        res.json(rs.rows || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const addItem = async (req, res) => {
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
};

const updateItem = async (req, res) => {
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
};

const deleteItem = async (req, res) => {
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
};

// MULTI-PREFIX ROUTING for Vercel stability
const router = express.Router();

router.get('/items', getItems);
router.post('/items', addItem);
router.put('/items/:id', updateItem);
router.delete('/items/:id', deleteItem);
router.get('/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// Register routes both with and without the /api prefix
app.use('/api', router);
app.use('/', router);

// Final catch-all for 404s
app.use((req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        path: req.path,
        suggestion: 'Try /api/items'
    });
});

module.exports = app;
