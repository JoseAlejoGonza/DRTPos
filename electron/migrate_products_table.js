const path = require('path');
const Database = require('better-sqlite3');
const dbPath = 'C:/Users/JoseGonzalez/AppData/Roaming/Electron/pos.db';
const db = new Database(dbPath);

function addColumnIfNotExists(table, column, type) {
  const info = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!info.some(col => col.name === column)) {
    db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`).run();
    console.log(`Columna '${column}' agregada a la tabla '${table}'.`);
  }
}

addColumnIfNotExists('products', 'color', 'TEXT');
addColumnIfNotExists('products', 'category_id', 'INTEGER');

console.log('Migración completada.');
