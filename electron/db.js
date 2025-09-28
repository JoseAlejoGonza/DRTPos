const path = require('path');
const { app } = require('electron');
const Database = require('better-sqlite3');

const dbPath = path.join(app.getPath('userData'), 'pos.db');
const db = new Database(dbPath);


// Tabla de categorías
db.prepare(`CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
)`).run();


// Tabla de productos con relación a categoría y color
db.prepare(`CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT,
  name TEXT,
  price REAL,
  stock INTEGER,
  color TEXT,
  category_id INTEGER,
  FOREIGN KEY (category_id) REFERENCES categories(id)
)`).run();

db.prepare(`CREATE TABLE IF NOT EXISTS sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT,
  total REAL,
  payload TEXT
)`).run();


function addProduct(product) {
  // Guarda la cantidad, color y la categoría
  return db.prepare('INSERT INTO products (name, price, stock, color, category_id) VALUES (?, ?, ?, ?, ?)')
    .run(product.name, product.price, product.stock, product.color || '', product.category_id || null);
}


function getProducts() {
  // Incluye el nombre de la categoría y el color
  return db.prepare(`SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id`).all();
}

function addCategory(name) {
  return db.prepare('INSERT INTO categories (name) VALUES (?)').run(name);
}

function getCategories() {
  return db.prepare('SELECT * FROM categories').all();
}

function deleteCategory(id) {
  return db.prepare('DELETE FROM categories WHERE id = ?').run(id);
}

function updateProduct(product) {
  // Actualiza el producto por id
  return db.prepare(`
    UPDATE products
    SET name = ?, price = ?, stock = ?, color = ?, category_id = ?
    WHERE id = ?
  `).run(
    product.name,
    product.price,
    product.quantity, // Asegúrate que sea 'stock' y no 'quantity'
    product.color || '',
    product.category_id || null,
    product.id
  );
}

module.exports = {
  addProduct,
  getProducts,
  addCategory,
  getCategories,
  deleteCategory,
  updateProduct,
  db
};