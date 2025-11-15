const Database = require('better-sqlite3');
const db = new Database('./database.db');

console.log('🔍 Buscando productos huérfanos en detail_sales...');

// Ver qué productos están en detail_sales pero no en products
const orphans = db.prepare(`
  SELECT DISTINCT ds.product_id, COUNT(*) as count
  FROM detail_sales ds
  LEFT JOIN products p ON ds.product_id = p.id
  WHERE p.id IS NULL
  GROUP BY ds.product_id
`).all();

console.log('📊 Productos huérfanos encontrados:', orphans);

if (orphans.length > 0) {
  console.log('🗑️ Eliminando registros huérfanos...');
  
  orphans.forEach(orphan => {
    const deleted = db.prepare('DELETE FROM detail_sales WHERE product_id = ?').run(orphan.product_id);
    console.log(`✅ Eliminados ${deleted.changes} registros de producto ID ${orphan.product_id}`);
  });
  
  console.log('✨ Limpieza completada');
} else {
  console.log('✅ No se encontraron productos huérfanos');
}

// Verificar estado final
const finalCount = db.prepare('SELECT COUNT(*) as total FROM detail_sales').get();
console.log(`📊 Total de registros en detail_sales después de limpieza: ${finalCount.total}`);

const validProducts = db.prepare(`
  SELECT COUNT(DISTINCT ds.product_id) as valid_products
  FROM detail_sales ds
  INNER JOIN products p ON ds.product_id = p.id
`).get();
console.log(`✅ Productos válidos en detail_sales: ${validProducts.valid_products}`);

db.close();