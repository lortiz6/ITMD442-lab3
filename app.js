const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');
const methodOverride = require('method-override');
const path = require('path');

const app = express();
const dbPath = path.join(__dirname, 'data', 'contacts.db');

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

//SQLite database connection
const db = new sqlite3.Database(dbPath);

// Initialize SQLite database and table
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS contacts (
            id TEXT PRIMARY KEY,
            firstName TEXT,
            lastName TEXT,
            email TEXT,
            notes TEXT,
            created TEXT,
            lastEdited TEXT
        )
    `);
});

// Routes...

// GET route for searching contacts
app.get('/search', (req, res) => {
    const { query } = req.query;
    const sql = `
        SELECT * FROM contacts
        WHERE firstName LIKE '%${query}%' OR lastName LIKE '%${query}%' OR email LIKE '%${query}%'
    `;
    db.all(sql, (err, rows) => {
        if (err) {
            console.error(err);
            res.status(500).send('Internal Server Error');
            return;
        }
        res.render('contacts', { contacts: rows });
    });
});

// GET route for homepage
app.get('/', (req, res) => {
    res.render('index');
});

app.get('/contacts/:id', (req, res) => {
    const id = req.params.id;
    db.get('SELECT * FROM contacts WHERE id = ?', [id], (err, row) => {
        if (err) {
            console.error(err);
            res.status(500).send('Internal Server Error');
            return;
        }
        if (!row) {
            res.status(404).send('Contact not found');
            return;
        }
        res.render('contact', { contact: row });
    });
});

app.post('/contacts', (req, res) => {
    const { firstName, lastName, email, notes } = req.body;
    const id = uuidv4();
    const created = new Date().toISOString();
    const lastEdited = created;
    const sql = 'INSERT INTO contacts (id, firstName, lastName, email, notes, created, lastEdited) VALUES (?, ?, ?, ?, ?, ?, ?)';
    const values = [id, firstName, lastName, email, notes, created, lastEdited];
    db.run(sql, values, (err) => {
        if (err) {
            console.error(err);
            res.status(500).send('Internal Server Error');
            return;
        }
        res.redirect(`/contacts/${id}`);
    });
});

app.get('/contacts/:id/edit', (req, res) => {
    const id = req.params.id;
    db.get('SELECT * FROM contacts WHERE id = ?', [id], (err, row) => {
        if (err) {
            console.error(err);
            res.status(500).send('Internal Server Error');
            return;
        }
        if (!row) {
            res.status(404).send('Contact not found');
            return;
        }
        res.render('editContact', { contact: row });
    });
});

app.put('/contacts/:id', (req, res) => {
    const { firstName, lastName, email, notes } = req.body;
    const lastEdited = new Date().toISOString();
    const id = req.params.id;
    const sql = 'UPDATE contacts SET firstName = ?, lastName = ?, email = ?, notes = ?, lastEdited = ? WHERE id = ?';
    const values = [firstName, lastName, email, notes, lastEdited, id];
    db.run(sql, values, (err) => {
        if (err) {
            console.error(err);
            res.status(500).send('Internal Server Error');
            return;
        }
        res.redirect(`/contacts/${id}`);
    });
});

app.delete('/contacts/:id', (req, res) => {
    const id = req.params.id;
    const sql = 'DELETE FROM contacts WHERE id = ?';
    db.run(sql, [id], (err) => {
        if (err) {
            console.error(err);
            res.status(500).send('Internal Server Error');
            return;
        }
        res.redirect('/contacts');
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send(`Something broke! Error: ${err.message}`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
