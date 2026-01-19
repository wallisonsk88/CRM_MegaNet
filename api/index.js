const express = require('express');
const { createClient } = require('@libsql/client');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// Defensive Database Client Creation
let db;
try {
    if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
        console.error('CRITICAL: Missing Turso Environment Variables');
    }
    db = createClient({
        url: process.env.TURSO_DATABASE_URL || '',
        authToken: process.env.TURSO_AUTH_TOKEN || '',
    });
} catch (e) {
    console.error('Failed to initialize Turso client:', e);
}

let isDbInitialized = false;

async function ensureDb() {
    if (!db) {
        throw new Error('Database client not initialized. Check your environment variables (TURSO_DATABASE_URL and TURSO_AUTH_TOKEN) in Vercel settings.');
    }
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
        throw new Error('Failed to initialize database schema: ' + err.message);
    }
}

// ENDPOINTS
const getItems = async (req, res) => {
    try {
        await ensureDb();
        const rs = await db.execute('SELECT * FROM items');
        res.json(rs.rows || []);
    } catch (err) {
        console.error('GET /items error:', err);
        res.status(500).json({
            error: 'Internal Server Error',
            details: err.message,
            tip: 'Certifique-se de que as variáveis TURSO_DATABASE_URL e TURSO_AUTH_TOKEN estão configuradas na Vercel.'
        });
    }
};

const addItem = async (req, res) => {
    try {
        await ensureDb();
        const { id, title, description, category } = req.body;
        await db.execute({
            sql: 'INSERT INTO items (id, title, description, category) VALUES (?, ?, ?, ?)',
            args: [id, title, description, category],
        });
        res.json({ message: 'success', data: req.body });
    } catch (err) {
        console.error('POST /items error:', err);
        res.status(500).json({ error: err.message });
    }
};

const updateItem = async (req, res) => {
    try {
        await ensureDb();
        const { category } = req.body;
        await db.execute({
            sql: 'UPDATE items SET category = ? WHERE id = ?',
            args: [category, req.params.id],
        });
        res.json({ status: 'updated' });
    } catch (err) {
        console.error('PUT /items error:', err);
        res.status(500).json({ error: err.message });
    }
};

const deleteItem = async (req, res) => {
    try {
        await ensureDb();
        await db.execute({
            sql: 'DELETE FROM items WHERE id = ?',
            args: [req.params.id],
        });
        res.json({ message: 'deleted' });
    } catch (err) {
        console.error('DELETE /items error:', err);
        res.status(500).json({ error: err.message });
    }
};

// MULTI-PREFIX ROUTING
const router = express.Router();

router.get('/items', getItems);
router.post('/items', addItem);
router.put('/items/:id', updateItem);
router.delete('/items/:id', deleteItem);
router.get('/health', (req, res) => res.json({ status: 'ok', time: new Date(), env: !!process.env.TURSO_DATABASE_URL }));

app.use('/api', router);
app.use('/', router);

app.use((req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        path: req.path,
        suggestion: 'Try /api/items'
    });
});

module.exports = app;
