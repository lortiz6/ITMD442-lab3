const fs = require('fs');
const path = require('path');
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const methodOverride = require('method-override');

const app = express();
const contactsFilePath = path.join(__dirname, 'contacts.json');

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// Functions for reading and writing contacts
function writeContactsToFile(contacts) {
  fs.writeFileSync(contactsFilePath, JSON.stringify(contacts, null, 2));
}

function readContactsFromFile() {
  let contacts = [];
  try {
    const data = fs.readFileSync(contactsFilePath, 'utf8');
    contacts = JSON.parse(data);
  } catch (err) {
    if (err.code === 'ENOENT' || err.message.includes('Unexpected end of JSON input')) {
      console.log('Contacts file is empty or does not exist, initializing with an empty array.');
    } else {
      throw err;
    }
  }
  return contacts;
}

// Routes
app.get('/', (req, res) => {
  res.render('index');
});

app.get('/contacts', (req, res) => {
  const contacts = readContactsFromFile();
  res.render('contacts', { contacts });
});

app.get('/contacts/new', (req, res) => {
  res.render('new');
});

app.get('/contacts/:id', (req, res) => {
  const contacts = readContactsFromFile();
  const requestedContact = contacts.find(contact => contact.id === req.params.id);
  if (!requestedContact) {
    res.status(404).send('Contact not found');
  } else {
    requestedContact.createdFormatted = new Date(requestedContact.created).toLocaleString();
    requestedContact.lastEditedFormatted = new Date(requestedContact.lastEdited).toLocaleString();
    res.render('contact', { contact: requestedContact });
  }
});

app.post('/contacts', (req, res) => {
  const contacts = readContactsFromFile();
  const newContact = {
    id: uuidv4(),
    ...req.body,
    created: new Date().toISOString(),
    lastEdited: new Date().toISOString()
  };
  contacts.push(newContact);
  writeContactsToFile(contacts);
  res.redirect(`/contacts/${newContact.id}`);
});

app.get('/contacts/:id/edit', (req, res) => {
  const contacts = readContactsFromFile();
  const requestedContact = contacts.find(contact => contact.id === req.params.id);
  res.render('editContact', { contact: requestedContact });
});

app.put('/contacts/:id', (req, res) => {
  let contacts = readContactsFromFile();
  contacts = contacts.map(contact => {
    if (contact.id === req.params.id) {
      return { ...contact, ...req.body, lastEdited: new Date().toISOString() };
    }
    return contact;
  });
  writeContactsToFile(contacts);
  res.redirect(`/contacts/${req.params.id}`);
});

app.delete('/contacts/:id', (req, res) => {
  let contacts = readContactsFromFile();
  contacts = contacts.filter(contact => contact.id !== req.params.id);
  writeContactsToFile(contacts);
  res.redirect('/contacts');
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send(`Something broke! Error: ${err.message}`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
