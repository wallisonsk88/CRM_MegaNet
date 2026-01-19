const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Database setup
const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        db.run(`CREATE TABLE IF NOT EXISTS items (
            id INTEGER PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            category TEXT NOT NULL
        )`, (err) => {
            if (err) {
                console.error('Error creating table', err.message);
            }
        });
    }
});

// API Endpoints

// Get all items
app.get('/api/items', (req, res) => {
    db.all('SELECT * FROM items', [], (err, rows) => {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Add new item
app.post('/api/items', (req, res) => {
    const { id, title, description, category } = req.body;
    const sql = 'INSERT INTO items (id, title, description, category) VALUES (?, ?, ?, ?)';
    const params = [id, title, description, category];
    db.run(sql, params, function (err) {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.json({
            message: 'success',
            data: req.body,
            id: this.lastID
        });
    });
});

// Update item (for category change)
app.put('/api/items/:id', (req, res) => {
    const { category } = req.body;
    db.run(
        `UPDATE items SET category = ? WHERE id = ?`,
        [category, req.params.id],
        function (err) {
            if (err) {
                res.status(400).json({ error: res.message });
                return;
            }
            res.json({ updated: this.changes });
        }
    );
});

// Delete item
app.delete('/api/items/:id', (req, res) => {
    db.run(
        'DELETE FROM items WHERE id = ?',
        req.params.id,
        function (err) {
            if (err) {
                res.status(400).json({ error: res.message });
                return;
            }
            res.json({ message: 'deleted', changes: this.changes });
        }
    );
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
