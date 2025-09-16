const path = require('path');
const { app } = require('electron');
const Database = require('better-sqlite3');

const dbPath = path.join(app.getPath('userData'), 'pos.db');
const db = new Database(dbPath);

// Esquema mínimo
db.prepare(`CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT,
  name TEXT,
  price REAL,
  stock INTEGER
)`).run();

db.prepare(`CREATE TABLE IF NOT EXISTS sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT,
  total REAL,
  payload TEXT
)`).run();

function addProduct(product) {
  return db.prepare('INSERT INTO products (name, price) VALUES (?, ?)').run(product.name, product.price);
}

function getProducts() {
  return db.prepare('SELECT * FROM products').all();
}

module.exports = db;