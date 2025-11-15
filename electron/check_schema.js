const Database = require('better-sqlite3');
const path = require('path');

// Simular el path de Electron
const dbPath = path.join(__dirname, 'database.db');
const db = new Database(dbPath);

console.log('🔍 Esquema de detail_sales:');
const schema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='detail_sales'").get();
console.log(schema.sql);

console.log('\n🔍 Columnas de detail_sales:');
const columns = db.prepare("PRAGMA table_info(detail_sales)").all();
columns.forEach(col => {
  console.log(`  - ${col.name} (${col.type})`);
});

console.log('\n📊 Primeros registros de detail_sales:');
const sample = db.prepare("SELECT * FROM detail_sales LIMIT 3").all();
console.log(sample);

db.close();