const { 
  getAllSales, 
  getAllDetailSales, 
  getAllProducts, 
  executeQuery 
} = require('./db.js');

async function cleanupOrphans() {
  try {
    console.log('🔍 Buscando productos huérfanos en detail_sales...');

    // Obtener todos los detail_sales
    const detailSales = await getAllDetailSales();
    console.log(`📊 Total registros en detail_sales: ${detailSales.length}`);

    // Obtener todos los productos
    const products = await getAllProducts();
    const productIds = new Set(products.map(p => p.id));
    console.log(`📦 Total productos válidos: ${productIds.size}`);

    // Encontrar huérfanos
    const orphans = detailSales.filter(ds => !productIds.has(ds.product_id));
    console.log(`⚠️ Registros huérfanos encontrados: ${orphans.length}`);

    if (orphans.length > 0) {
      console.log('🗑️ Productos huérfanos por ID:');
      const orphansByProduct = {};
      orphans.forEach(orphan => {
        if (!orphansByProduct[orphan.product_id]) {
          orphansByProduct[orphan.product_id] = 0;
        }
        orphansByProduct[orphan.product_id]++;
      });

      Object.keys(orphansByProduct).forEach(productId => {
        console.log(`  - Producto ID ${productId}: ${orphansByProduct[productId]} registros`);
      });

      console.log('🗑️ Eliminando registros huérfanos...');
      
      for (const productId of Object.keys(orphansByProduct)) {
        try {
          await executeQuery('DELETE FROM detail_sales WHERE product_id = ?', [productId]);
          console.log(`✅ Eliminados registros de producto ID ${productId}`);
        } catch (error) {
          console.error(`❌ Error eliminando producto ${productId}:`, error.message);
        }
      }

      console.log('✨ Limpieza completada');
    } else {
      console.log('✅ No se encontraron productos huérfanos');
    }

    // Verificar estado final
    const finalDetailSales = await getAllDetailSales();
    console.log(`📊 Total registros en detail_sales después de limpieza: ${finalDetailSales.length}`);

  } catch (error) {
    console.error('❌ Error en limpieza:', error.message);
  }
}

cleanupOrphans();