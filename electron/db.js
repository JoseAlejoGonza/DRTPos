const path = require('path');
const { app } = require('electron');
const Database = require('better-sqlite3');

const dbPath = path.join(app.getPath('userData'), 'pos.db');
const db = new Database(dbPath);
const fs = require('fs');


// Tabla de categorías
db.prepare(`CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
)`).run();



// Tabla de productos con columna imagen
db.prepare(`CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT,
  name TEXT,
  price REAL,
  stock INTEGER,
  color TEXT,
  imagen BLOB,
  category_id INTEGER,
  FOREIGN KEY (category_id) REFERENCES categories(id)
)`).run();

// Si la columna imagen no existe, agregarla (migración)
const productCols = db.prepare("PRAGMA table_info(products)").all();
if (!productCols.some(col => col.name === 'imagen')) {
  db.prepare('ALTER TABLE products ADD COLUMN imagen BLOB').run();
}

db.prepare(`CREATE TABLE IF NOT EXISTS sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT,
  total REAL,
  payload TEXT
)`).run();

// Tabla de facturas
db.prepare(`CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  id_sale INTEGER,
  invoice_number TEXT,
  date TEXT,
  id_client INTEGER,
  invoice_status TEXT,
  url_invoice_electronic TEXT,
  FOREIGN KEY (id_sale) REFERENCES sales(id),
  FOREIGN KEY (id_client) REFERENCES clients(id)
)`).run();
// Tabla de detalle de ventas
db.prepare(`CREATE TABLE IF NOT EXISTS detail_sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  id_sale INTEGER,
  id_product TEXT,
  quantity TEXT,
  FOREIGN KEY (id_sale) REFERENCES sales(id)
)`).run();
// Tabla de ventas
db.prepare(`CREATE TABLE IF NOT EXISTS sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date_sale TEXT,
  total_sale REAL,
  id_client INTEGER,
  FOREIGN KEY (id_client) REFERENCES clients(id)
)`).run();
// Tabla de clientes
db.prepare(`CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_type TEXT,
  document_number TEXT,
  name TEXT,
  address TEXT,
  phone_number TEXT,
  email TEXT,
  registration_date TEXT
)`).run();

// Adición para sales
function addSale(sale) {
  return db.prepare(`INSERT INTO sales (date_sale, total_sale, id_client) VALUES (?, ?, ?)`)
    .run(sale.date_sale, sale.total_sale, sale.id_client || null);
}

function getSales() {
  return db.prepare('SELECT * FROM sales').all();
}

// Adición para detail_sales
function addDetailSale(detail) {
  return db.prepare(`INSERT INTO detail_sales (id_sale, id_product, quantity) VALUES (?, ?, ?)`)
    .run(detail.id_sale, detail.id_product, detail.quantity);
}

function getDetailSales() {
  return db.prepare('SELECT * FROM detail_sales').all();
}
// CRUD para invoices
function addInvoice(invoice) {
  return db.prepare(`INSERT INTO invoices (id_sale, invoice_number, date, id_client, invoice_status, url_invoice_electronic)
    VALUES (?, ?, ?, ?, ?, ?)`)
    .run(invoice.id_sale, invoice.invoice_number, invoice.date, invoice.id_client || null, invoice.invoice_status, invoice.url_invoice_electronic);
}

function getInvoices() {
  return db.prepare('SELECT * FROM invoices').all();
}

function updateInvoiceStatus(id, status) {
  return db.prepare('UPDATE invoices SET invoice_status=? WHERE id=?').run(status, id);
}

function deleteInvoice(id) {
  return db.prepare('DELETE FROM invoices WHERE id=?').run(id);
}
// CRUD para clients
function addClient(client) {
  return db.prepare(`INSERT INTO clients (document_type, document_number, name, address, phone_number, email, registration_date)
    VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(client.document_type, client.document_number, client.name, client.address, client.phone_number, client.email, client.registration_date);
}

function getClients() {
  return db.prepare('SELECT * FROM clients').all();
}

function updateClient(client) {
  return db.prepare(`UPDATE clients SET document_type=?, document_number=?, name=?, address=?, phone_number=?, email=?, registration_date=? WHERE id=?`)
    .run(client.document_type, client.document_number, client.name, client.address, client.phone_number, client.email, client.registration_date, client.id);
}

function deleteClient(id) {
  return db.prepare('DELETE FROM clients WHERE id=?').run(id);
}

function addProduct(product) {
  // Guarda la cantidad, color y la categoría
  // let imagenBlob = null;
  // if (product.image && fs.existsSync(product.image)) {
  //   try {
  //       imagenBlob = fs.readFileSync(product.image);
  //       console.log('Imagen convertida a Buffer (BLOB).');
  //   } catch (e) {
  //       console.error('Error al leer el archivo para BLOB:', e);
  //       // Si hay error de lectura, sigue con imagenBlob = null
  //   }
  // }
  return db.prepare('INSERT INTO products (imagen, name, price, stock, color, category_id) VALUES (?, ?, ?, ?, ?, ?)')
    .run(product.image, product.name, product.price, product.stock, product.color || '', product.category_id || null);
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
  img_blob = convertir_a_blob(product.image);
  let imagenBlob = null;
  if (product.image && fs.existsSync(product.image)) {
    try {
        // 2. LEER el contenido binario del archivo
        //    fs.readFileSync() devuelve un objeto Buffer, que es el BLOB
        imagenBlob = fs.readFileSync(product.image);
        console.log('Imagen convertida a Buffer (BLOB).');
    } catch (e) {
        console.error('Error al leer el archivo para BLOB:', e);
        // Si hay error de lectura, sigue con imagenBlob = null
    }
  }
  return db.prepare(`
    UPDATE products
    SET imagen = ?, name = ?, price = ?, stock = ?, color = ?, category_id = ?
    WHERE id = ?
  `).run(
    imagenBlob,
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
  // Clients
  addClient,
  getClients,
  updateClient,
  deleteClient,
  // Invoices
  addInvoice,
  getInvoices,
  updateInvoiceStatus,
  deleteInvoice,
  // Sales
  addSale,
  getSales,
  // Detail Sales
  addDetailSale,
  getDetailSales,
  db
};