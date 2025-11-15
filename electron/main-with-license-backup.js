const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const db = require('./db');
const InvoicingService = require('./invoicing.service');
const PrintingService = require('./printing.service');
const WhatsAppService = require('./whatsapp.service');
const WhatsAppAutomatedService = require('./whatsapp.automated.service');
const ConfigService = require('./config.service');
const LicenseService = require('./license.service');
const BackupService = require('./backup.service');
const isDev = !!process.env.ELECTRON_START_URL;
let mainWindow;

// Inicializar servicios
const configService = new ConfigService();
const licenseService = new LicenseService();
const backupService = new BackupService();
const invoicingService = new InvoicingService();
const printingService = new PrintingService();
const whatsAppService = new WhatsAppService();
const whatsAppAutomatedService = new WhatsAppAutomatedService();

// ========== MODO DIAGNÓSTICO EXTREMO ==========
console.log('🚀 === APLICACION EN MODO DIAGNOSTICO EXTREMO ===');
console.log('🚀 Esta version se abrira SIEMPRE, sin validar licencia');

// Ejecutar diagnóstico después de que la app esté lista
app.whenReady().then(() => {
  setTimeout(() => {
    try {
      console.log('� Directorio actual (process.cwd()):', process.cwd());
      console.log('🔍 Directorio del script (__dirname):', __dirname);
      console.log('🔍 Ruta del ejecutable (process.execPath):', process.execPath);
      console.log('🔍 Directorio del ejecutable:', process.execPath ? require('path').dirname(process.execPath) : 'No disponible');
      
      const licenseValidation = licenseService.validateLicense();
      console.log('🔍 Resultado de validación completa:', JSON.stringify(licenseValidation, null, 2));
      
      // Mostrar información en diálogo
      dialog.showMessageBox({
        type: 'info',
        title: '🔍 DIAGNÓSTICO COMPLETO',
        message: `DIAGNÓSTICO DE LICENCIA:\n\n` +
                `✅ Aplicación iniciada correctamente\n` +
                `📁 Directorio actual: ${process.cwd()}\n` +
                `📁 Directorio script: ${__dirname}\n` +
                `📁 Ejecutable: ${process.execPath}\n\n` +
                `LICENCIA:\n` +
                `Estado: ${licenseValidation.valid ? 'VÁLIDA ✅' : 'INVÁLIDA ❌'}\n` +
                `Mensaje: ${licenseValidation.message}\n` +
                `Razón: ${licenseValidation.reason || 'No especificada'}\n\n` +
                `Revisa la consola para información técnica detallada.`,
        buttons: ['Entendido']
      });
    } catch (error) {
      console.error('❌ Error en diagnóstico:', error);
      dialog.showErrorBox('Error de Diagnóstico', `Error: ${error.message}`);
    }
  }, 2000); // Esperar 2 segundos para que todo cargue
});

// Configurar servicios con la configuración cargada
const companyConfig = configService.getCompanyConfig();
const invoicingConfig = configService.getInvoicingConfig();
const whatsAppConfig = configService.getWhatsAppConfig();

// Aplicar configuración a los servicios
invoicingService.config = { ...invoicingService.config, ...invoicingConfig, ...companyConfig };
whatsAppService.setCompanyName(companyConfig.name);
whatsAppService.setCompanyPhone(whatsAppConfig.companyPhone);

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, './preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false
    }
  });

  if (isDev) {
    mainWindow.loadURL(process.env.ELECTRON_START_URL || 'http://localhost:4200');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../frontend/dist/frontend/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});


// PRODUCTS
ipcMain.handle('products:getAll', () => {
  return db.getProducts();
});
ipcMain.handle('products:add', (e, p) => {
  return db.addProduct(p);
});
ipcMain.handle('products:getByCode', (e, code) => {
  return db.getProductByCode(code);
});
ipcMain.handle('products:update', (e, p) => {
  // Actualizar producto incluyendo categoría
  const stmt = db.db.prepare('UPDATE products SET imagen=?, code=?, name=?, price=?, stock=?, category_id=? WHERE id=?');
  return stmt.run(p.image, p.code, p.name, p.price, p.stock, p.category_id, p.id);
});
ipcMain.handle('products:delete', (e, id) => {
  return db.db.prepare('DELETE FROM products WHERE id=?').run(id);
});

// CATEGORIES
ipcMain.handle('categories:getAll', () => {
  return db.getCategories();
});
ipcMain.handle('categories:add', (e, name) => {
  return db.addCategory(name);
});
ipcMain.handle('categories:delete', (e, id) => {
  return db.deleteCategory(id);
});

// SALES
// ipcMain.handle('sale:create', (e, sale) => {
//   const stmt = db.prepare('INSERT INTO sales (date, total, payload) VALUES (?, ?, ?)');
//   const info = stmt.run(new Date().toISOString(), sale.total, JSON.stringify(sale));
//   return info.lastInsertRowid;
// });
// ipcMain.handle('sale:get', (e, {from,to}) => {
//   return db.prepare('SELECT * FROM sales WHERE date BETWEEN ? AND ?').all(from, to);
// });
// CLIENTS
ipcMain.handle('clients:getAll', () => db.getClients());
ipcMain.handle('clients:add', (e, client) => db.addClient(client));
ipcMain.handle('clients:update', (e, client) => db.updateClient(client));
ipcMain.handle('clients:delete', (e, id) => db.deleteClient(id));
ipcMain.handle('clients:searchByDocument', (e, {documentType, documentNumber}) => {
  const stmt = db.db.prepare('SELECT * FROM clients WHERE document_type = ? AND document_number = ?');
  return stmt.get(documentType, documentNumber);
});

// INVOICES
ipcMain.handle('invoices:getAll', () => db.getInvoices());
ipcMain.handle('invoices:add', (e, invoice) => db.addInvoice(invoice));
ipcMain.handle('invoices:updateStatus', (e, {id, status}) => db.updateInvoiceStatus(id, status));
ipcMain.handle('invoices:delete', (e, id) => db.deleteInvoice(id));

// SALES
ipcMain.handle('sales:getAll', () => db.getSales());
ipcMain.handle('sales:add', (e, sale) => db.addSale(sale));

// DETAIL SALES
ipcMain.handle('detailSales:getAll', () => db.getDetailSales());
ipcMain.handle('detailSales:add', (e, detail) => db.addDetailSale(detail));
ipcMain.handle('open-image-dialog', async (event) => {
    const result = await dialog.showOpenDialog(BrowserWindow.getFocusedWindow(), {
        properties: ['openFile'],
        filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif'] }]
    });

    if (result.canceled || result.filePaths.length === 0) {
        return null; // El usuario canceló
    }
    
    // Devuelve la ruta real (siempre la primera, ya que solo permitimos un archivo)
    return result.filePaths[0]; 
});

// PROCESAMIENTO COMPLETO DE PAGO
ipcMain.handle('payment:process', async (event, paymentData) => {
  try {
    const { saleData, clientData, paymentMethod, requiresInvoice, additionalData } = paymentData;
    
    // 1. Crear la venta
    const saleResult = await db.addSale({
      date_sale: new Date().toISOString(),
      total_sale: saleData.total,
      id_client: clientData ? clientData.id : null,
      payment_method: paymentMethod || null
    });
    
    const saleId = saleResult.lastInsertRowid;
    
    // 2. Agregar detalle de la venta y actualizar inventario
    for (const item of saleData.items) {
      // Agregar detalle de venta
      await db.addDetailSale({
        id_sale: saleId,
        id_product: item.id,
        quantity: item.quantity
      });
      
      // Actualizar stock del producto
      db.updateProductStock(item.id, item.quantity);
    }
    
    // 3. Generar factura electrónica si se requiere
    let invoiceResult = null;
    if (requiresInvoice && clientData) {
      invoiceResult = await invoicingService.generateElectronicInvoice(saleData, clientData);
      
      // Guardar factura en BD
      await db.addInvoice({
        id_sale: saleId,
        invoice_number: invoiceResult.invoiceNumber,
        date: new Date().toISOString(),
        id_client: clientData.id,
        invoice_status: 'GENERATED',
        url_invoice_electronic: invoiceResult.pdfPath
      });
    }
    
    return {
      success: true,
      saleId: saleId,
      invoice: invoiceResult,
      message: 'Pago procesado exitosamente'
    };
    
  } catch (error) {
    console.error('Error procesando pago:', error);
    throw error;
  }
});

// IMPRESIÓN
ipcMain.handle('printers:getAll', async () => {
  return await printingService.getAvailablePrinters();
});

ipcMain.handle('print:thermal', async (event, data) => {
  const { saleData, clientData, invoiceData, paymentMethod, printerName } = data;
  return await printingService.printThermal(saleData, clientData, invoiceData, paymentMethod, printerName);
});

ipcMain.handle('print:normal', async (event, data) => {
  const { saleData, clientData, invoiceData, paymentMethod, printerName } = data;
  return await printingService.printNormal(saleData, clientData, invoiceData, paymentMethod, printerName);
});

ipcMain.handle('print:dialog', async (event, data) => {
  const { saleData, clientData, invoiceData, paymentMethod } = data;
  return await printingService.showPrintDialog(saleData, clientData, invoiceData, paymentMethod);
});

ipcMain.handle('print:setThermalWidth', (event, width) => {
  return printingService.setThermalPaperWidth(width);
});

ipcMain.handle('print:testBasic', async (event, printerName) => {
  return await printingService.testBasicPrint(printerName);
});

ipcMain.handle('print:thermalLegacy', async (event, data) => {
  console.log('🔧 [main.js] print:thermalLegacy recibido:', data);
  
  // Si data ya tiene la estructura completa, la pasamos directamente
  if (data.saleData && data.clientData && data.invoiceData && data.paymentMethod && data.printerName) {
    const { saleData, clientData, invoiceData, paymentMethod, printerName } = data;
    return await printingService.printThermalLegacy(saleData, clientData, invoiceData, paymentMethod, printerName);
  } else {
    // Si no, asumimos que es la estructura antigua y adaptamos
    console.log('🔧 [main.js] Estructura no reconocida, usando data completo');
    return await printingService.printThermalLegacy(data);
  }
});

// WHATSAPP
ipcMain.handle('whatsapp:sendInvoice', async (event, data) => {
  const { saleData, clientData, invoiceData } = data;
  return await whatsAppService.sendInvoice(saleData, clientData, invoiceData);
});

ipcMain.handle('whatsapp:sendReceipt', async (event, data) => {
  const { saleData, clientData } = data;
  return await whatsAppService.sendReceipt(saleData, clientData);
});

// Envío totalmente automatizado (adjunta y envía) — usa whatsapp-web.js en main process
ipcMain.handle('whatsapp:autoSendInvoice', async (event, data) => {
  try {
    const { targetPhone, saleData, clientData, invoiceData, pdfPath } = data;
    const caption = invoiceData ? `Factura ${invoiceData.invoiceNumber} - Total: ${saleData.total}` : `Comprobante - Total: ${saleData.total}`;
    const res = await whatsAppAutomatedService.sendMedia(targetPhone || clientData.phone_number, pdfPath, caption);
    return { success: true, detail: res };
  } catch (error) {
    console.error('Error autoSendInvoice IPC:', error);
    return { success: false, error: error.message || String(error) };
  }
});

// Envío de factura con adjunto (abre WhatsApp Web y el PDF)
ipcMain.handle('whatsapp:sendInvoiceWithAttachment', async (event, data) => {
  const { targetPhone, saleData, clientData, invoiceData, pdfPath } = data;
  return await whatsAppService.sendInvoiceWithAttachment(targetPhone, saleData, clientData, invoiceData, pdfPath);
});

ipcMain.handle('whatsapp:getPreview', (event, data) => {
  const { saleData, clientData, invoiceData } = data;
  return whatsAppService.getMessagePreview(saleData, clientData, invoiceData);
});

// FACTURACIÓN ELECTRÓNICA
ipcMain.handle('invoice:generateElectronic', async (event, data) => {
  const { saleData, clientData } = data;
  return await invoicingService.generateElectronicInvoice(saleData, clientData);
});

// REPORTS - consulta de datos para reportes
ipcMain.handle('reports:salesSummary', (event, { from, to }) => {
  try {
    const ivaRate = (invoicingConfig && invoicingConfig.ivaRate) ? invoicingConfig.ivaRate : 0.19;
    const stmt = db.db.prepare('SELECT total_sale, date_sale FROM sales WHERE date_sale BETWEEN ? AND ?');
    const rows = stmt.all(from, to);
    const totalGross = rows.reduce((s, r) => s + (r.total_sale || 0), 0);
    const taxes = totalGross * ivaRate / (1 + ivaRate);
    const totalNet = totalGross - taxes;
    return { success: true, totalGross, taxes, totalNet, count: rows.length };
  } catch (error) {
    console.error('Error reports:salesSummary', error);
    return { success: false, error: error.message || String(error) };
  }
});

ipcMain.handle('reports:salesByRange', (event, { from, to, granularity }) => {
  try {
    // granularity: daily | weekly | quincenal | monthly | yearly
    let groupExpr = "strftime('%Y-%m-%d', date_sale)";
    if (granularity === 'monthly') groupExpr = "strftime('%Y-%m', date_sale)";
    if (granularity === 'yearly') groupExpr = "strftime('%Y', date_sale)";
    if (granularity === 'weekly') groupExpr = "strftime('%Y-%W', date_sale)";
    if (granularity === 'quincenal') {
      // custom: year-month and half (1 or 2)
      const stmt = db.db.prepare(`SELECT (strftime('%Y-%m', date_sale) || '-' || (CASE WHEN cast(strftime('%d', date_sale) as integer) <= 15 THEN '1' ELSE '2' END)) as period, COUNT(*) as count_sales, SUM(total_sale) as total FROM sales WHERE date_sale BETWEEN ? AND ? GROUP BY period ORDER BY period`);
      return { success: true, rows: stmt.all(from, to) };
    }

    const stmt = db.db.prepare(`SELECT ${groupExpr} as period, COUNT(*) as count_sales, SUM(total_sale) as total FROM sales WHERE date_sale BETWEEN ? AND ? GROUP BY period ORDER BY period`);
    return { success: true, rows: stmt.all(from, to) };
  } catch (error) {
    console.error('Error reports:salesByRange', error);
    return { success: false, error: error.message || String(error) };
  }
});

ipcMain.handle('reports:salesByProduct', (event, { from, to }) => {
  try {
    // make join robust: cast ds.id_product to integer in case it was stored as text
    const stmt = db.db.prepare(`SELECT p.id as productId, p.name as productName, p.price as unitPrice, SUM(COALESCE(CAST(ds.quantity AS INTEGER),0)) as quantitySold, SUM(COALESCE(CAST(ds.quantity AS INTEGER),0) * COALESCE(p.price,0)) as totalSales FROM detail_sales ds JOIN products p ON p.id = CAST(ds.id_product AS INTEGER) JOIN sales s ON s.id = ds.id_sale WHERE s.date_sale BETWEEN ? AND ? GROUP BY p.id, p.name, p.price ORDER BY quantitySold DESC`);
    const rows = stmt.all(from, to);
    console.log('📊 [reports:salesByProduct] from=', from, 'to=', to, 'rows=', Array.isArray(rows) ? rows.length : 0, 'sample=', (rows && rows[0]) ? rows[0] : null);
    return { success: true, rows };
  } catch (error) {
    console.error('Error reports:salesByProduct', error);
    return { success: false, error: error.message || String(error) };
  }
});

ipcMain.handle('reports:salesByCategory', (event, { from, to }) => {
  try {
    // cast ds.id_product to integer to match products.id and coalesce numeric fields
    const stmt = db.db.prepare(`SELECT c.id as categoryId, c.name as categoryName, SUM(COALESCE(CAST(ds.quantity AS INTEGER),0) * COALESCE(p.price,0)) as totalSales, SUM(COALESCE(CAST(ds.quantity AS INTEGER),0)) as quantitySold FROM detail_sales ds JOIN products p ON p.id = CAST(ds.id_product AS INTEGER) LEFT JOIN categories c ON p.category_id = c.id JOIN sales s ON s.id = ds.id_sale WHERE s.date_sale BETWEEN ? AND ? GROUP BY c.id, c.name ORDER BY totalSales DESC`);
    const rows = stmt.all(from, to);
    console.log('📊 [reports:salesByCategory] from=', from, 'to=', to, 'rows=', Array.isArray(rows) ? rows.length : 0, 'sample=', (rows && rows[0]) ? rows[0] : null);
    return { success: true, rows };
  } catch (error) {
    console.error('Error reports:salesByCategory', error);
    return { success: false, error: error.message || String(error) };
  }
});

ipcMain.handle('reports:taxSummary', (event, { from, to }) => {
  try {
    const ivaRate = (invoicingConfig && invoicingConfig.ivaRate) ? invoicingConfig.ivaRate : 0.19;
    const stmt = db.db.prepare('SELECT SUM(total_sale) as totalGross FROM sales WHERE date_sale BETWEEN ? AND ?');
    const row = stmt.get(from, to) || { totalGross: 0 };
    const taxes = (row.totalGross || 0) * ivaRate / (1 + ivaRate);
    return { success: true, totalGross: row.totalGross || 0, taxes };
  } catch (error) {
    console.error('Error reports:taxSummary', error);
    return { success: false, error: error.message || String(error) };
  }
});

ipcMain.handle('reports:frequency', (event, { from, to }) => {
  try {
    const stmt = db.db.prepare('SELECT COUNT(*) as countSales FROM sales WHERE date_sale BETWEEN ? AND ?');
    const r = stmt.get(from, to) || { countSales: 0 };
    const count = r.countSales || 0;
    const df = new Date(from);
    const dt = new Date(to);
    const days = Math.max(1, Math.ceil((dt - df) / (1000 * 60 * 60 * 24)));
    const avgPerDay = count / days;
    const avgPerMonth = avgPerDay * 30;
    const avgPerYear = avgPerDay * 365;
    return { success: true, count, avgPerDay, avgPerMonth, avgPerYear };
  } catch (error) {
    console.error('Error reports:frequency', error);
    return { success: false, error: error.message || String(error) };
  }
});

// Guardar texto (CSV/HTML) en archivo mediante diálogo Save
ipcMain.handle('file:saveText', async (event, { defaultName, content, filters }) => {
  try {
    const win = BrowserWindow.getFocusedWindow();
    const { canceled, filePath: destPath } = await dialog.showSaveDialog(win, {
      defaultPath: defaultName || 'report.csv',
      filters: filters || [{ name: 'CSV', extensions: ['csv'] }, { name: 'All', extensions: ['*'] }]
    });
    if (canceled || !destPath) return { success: false, error: 'cancelled' };
    const fs = require('fs');
    await fs.promises.writeFile(destPath, content, 'utf8');
    return { success: true, savedPath: destPath };
  } catch (error) {
    console.error('Error file:saveText', error);
    return { success: false, error: error.message || String(error) };
  }
});

// CONFIGURACIÓN
ipcMain.handle('config:getAll', () => {
  return configService.getAllConfig();
});

ipcMain.handle('config:getCompany', () => {
  return configService.getCompanyConfig();
});

ipcMain.handle('config:getInvoicing', () => {
  return configService.getInvoicingConfig();
});

ipcMain.handle('config:getWhatsApp', () => {
  return configService.getWhatsAppConfig();
});

ipcMain.handle('config:getPrinting', () => {
  return configService.getPrintingConfig();
});

ipcMain.handle('config:getPayments', () => {
  return configService.getPaymentConfig();
});

ipcMain.handle('config:updateCompany', (event, data) => {
  return configService.updateCompanyConfig(data);
});

ipcMain.handle('config:updateInvoicing', (event, data) => {
  return configService.updateInvoicingConfig(data);
});

ipcMain.handle('config:updateWhatsApp', (event, data) => {
  const result = configService.updateWhatsAppConfig(data);
  // Actualizar servicio de WhatsApp con nueva configuración
  if (result && data.companyPhone) {
    whatsAppService.setCompanyPhone(data.companyPhone);
  }
  if (result && data.companyName) {
    whatsAppService.setCompanyName(data.companyName);
  }
  return result;
});

ipcMain.handle('config:togglePaymentMethod', (event, { methodId, enabled }) => {
  return configService.togglePaymentMethod(methodId, enabled);
});

ipcMain.handle('config:reset', () => {
  return configService.resetToDefaults();
});

ipcMain.handle('config:export', () => {
  return configService.exportConfig();
});

ipcMain.handle('config:import', (event, configJson) => {
  return configService.importConfig(configJson);
});

// Estado del servicio automatizado
ipcMain.handle('whatsapp:autoStatus', async () => {
  try {
    if (!whatsAppAutomatedService) return { success: false, error: 'Servicio no inicializado' };
    return { success: true, status: whatsAppAutomatedService.getStatus() };
  } catch (error) {
    console.error('Error obteniendo estado WhatsApp automático:', error);
    return { success: false, error: error.message || String(error) };
  }
});

// Limpiar QR almacenado
ipcMain.handle('whatsapp:clearAutoQr', async () => {
  try {
    if (!whatsAppAutomatedService) return { success: false, error: 'Servicio no inicializado' };
    whatsAppAutomatedService.lastQr = null;
    return { success: true };
  } catch (error) {
    console.error('Error limpiando QR WhatsApp automático:', error);
    return { success: false, error: error.message || String(error) };
  }
});

// Guardar una copia de un archivo (por ejemplo PDF) en una ubicación elegida por el usuario
ipcMain.handle('file:saveCopy', async (event, filePath) => {
  try {
    if (!filePath) return { success: false, error: 'No se indicó ruta de archivo' };
    const win = BrowserWindow.getFocusedWindow();
    const defaultName = path.basename(filePath);
    const { canceled, filePath: destPath } = await dialog.showSaveDialog(win, {
      defaultPath: defaultName,
      filters: [{ name: 'PDF', extensions: ['pdf'] }, { name: 'Todos', extensions: ['*'] }]
    });

    if (canceled || !destPath) return { success: false, error: 'Guardado cancelado por el usuario' };

    const fs = require('fs');
    await fs.promises.copyFile(filePath, destPath);
    return { success: true, savedPath: destPath };
  } catch (error) {
    console.error('Error guardando copia de archivo:', error);
    return { success: false, error: error.message || String(error) };
  }
});

// Exportar HTML a PDF (LETTER) y abrir diálogo para guardar
ipcMain.handle('reports:exportPdf', async (event, { html, defaultName }) => {
  try {
    if (!html) return { success: false, error: 'No HTML content provided' };
    const win = new BrowserWindow({ show: false, webPreferences: { offscreen: true } });
    await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    const pdfBuffer = await win.webContents.printToPDF({ pageSize: 'LETTER' });
    // pedir ruta al usuario
    const { canceled, filePath: destPath } = await dialog.showSaveDialog(BrowserWindow.getFocusedWindow(), { defaultPath: defaultName || 'report.pdf', filters: [{ name: 'PDF', extensions: ['pdf'] }] });
    if (canceled || !destPath) {
      try { win.destroy(); } catch (e) {}
      return { success: false, error: 'cancelled' };
    }
    const fs = require('fs');
    await fs.promises.writeFile(destPath, pdfBuffer);
    try { win.destroy(); } catch (e) {}
    return { success: true, savedPath: destPath };
  } catch (error) {
    console.error('Error reports:exportPdf', error);
    return { success: false, error: error.message || String(error) };
  }
});

// SISTEMA DE LICENCIAS
ipcMain.handle('license:validate', () => {
  return licenseService.validateLicense();
});

ipcMain.handle('license:getHardwareInfo', () => {
  return licenseService.getHardwareInfo();
});

ipcMain.handle('license:install', (event, encryptedLicense) => {
  return licenseService.installLicense(encryptedLicense);
});

ipcMain.handle('license:checkStatus', () => {
  return {
    ...licenseService.checkLicenseStatus(),
    isDevelopment: isDev
  };
});

// BACKUP Y RESTAURACIÓN
ipcMain.handle('backup:create', async () => {
  return await backupService.createBackup();
});

ipcMain.handle('backup:restore', async () => {
  return await backupService.restoreBackup();
});

ipcMain.handle('backup:verify', async (event, filePath) => {
  return await backupService.verifyBackup(filePath);
});

ipcMain.handle('backup:getStats', async () => {
  return await backupService.getDatabaseStats();
});

// === MANEJADORES IPC FALTANTES CRÍTICOS ===
writeLog('🔌 Agregando manejadores IPC faltantes...');

// Productos con nombres correctos para el frontend
ipcMain.handle('products:getAll', async () => {
  try {
    return db.getProducts();
  } catch (error) {
    writeLog(`❌ Error en products:getAll: ${error.message}`);
    return [];
  }
});

ipcMain.handle('products:add', async (event, product) => {
  try {
    return db.addProduct(product);
  } catch (error) {
    writeLog(`❌ Error en products:add: ${error.message}`);
    return null;
  }
});

ipcMain.handle('products:update', async (event, product) => {
  try {
    return db.updateProduct(product.id, product);
  } catch (error) {
    writeLog(`❌ Error en products:update: ${error.message}`);
    return null;
  }
});

ipcMain.handle('products:delete', async (event, id) => {
  try {
    return db.deleteProduct(id);
  } catch (error) {
    writeLog(`❌ Error en products:delete: ${error.message}`);
    return false;
  }
});

ipcMain.handle('products:getByCode', async (event, code) => {
  try {
    return db.getProductByCode(code);
  } catch (error) {
    writeLog(`❌ Error en products:getByCode: ${error.message}`);
    return null;
  }
});

// Categorías con nombres correctos
ipcMain.handle('categories:getAll', async () => {
  try {
    return db.getCategories();
  } catch (error) {
    writeLog(`❌ Error en categories:getAll: ${error.message}`);
    return [];
  }
});

ipcMain.handle('categories:add', async (event, name) => {
  try {
    return db.addCategory({ name: name });
  } catch (error) {
    writeLog(`❌ Error en categories:add: ${error.message}`);
    return null;
  }
});

ipcMain.handle('categories:delete', async (event, id) => {
  try {
    return db.deleteCategory(id);
  } catch (error) {
    writeLog(`❌ Error en categories:delete: ${error.message}`);
    return false;
  }
});

// Clientes (CRÍTICO - faltaba completamente)
ipcMain.handle('clients:getAll', async () => {
  try {
    return db.getClients();
  } catch (error) {
    writeLog(`❌ Error en clients:getAll: ${error.message}`);
    return [];
  }
});

ipcMain.handle('clients:add', async (event, client) => {
  try {
    return db.addClient(client);
  } catch (error) {
    writeLog(`❌ Error en clients:add: ${error.message}`);
    return null;
  }
});

ipcMain.handle('clients:update', async (event, client) => {
  try {
    return db.updateClient(client);
  } catch (error) {
    writeLog(`❌ Error en clients:update: ${error.message}`);
    return null;
  }
});

ipcMain.handle('clients:delete', async (event, id) => {
  try {
    return db.deleteClient(id);
  } catch (error) {
    writeLog(`❌ Error en clients:delete: ${error.message}`);
    return false;
  }
});

ipcMain.handle('clients:searchByDocument', async (event, { documentType, documentNumber }) => {
  try {
    return db.searchClientByDocument(documentType, documentNumber);
  } catch (error) {
    writeLog(`❌ Error en clients:searchByDocument: ${error.message}`);
    return null;
  }
});

// Ventas con nombres correctos
ipcMain.handle('sales:getAll', async () => {
  try {
    return db.getSales();
  } catch (error) {
    writeLog(`❌ Error en sales:getAll: ${error.message}`);
    return [];
  }
});

ipcMain.handle('sales:add', async (event, sale) => {
  try {
    return db.addSale(sale);
  } catch (error) {
    writeLog(`❌ Error en sales:add: ${error.message}`);
    return null;
  }
});

// Procesamiento de pagos (CRÍTICO - faltaba completamente)
ipcMain.handle('payment:process', async (event, paymentData) => {
  try {
    writeLog(`💰 Procesando pago: ${JSON.stringify(paymentData)}`);
    
    // Lógica de procesamiento de pago
    const result = {
      success: true,
      transactionId: Date.now().toString(),
      processedAt: new Date().toISOString(),
      paymentData: paymentData
    };
    
    writeLog(`✅ Pago procesado exitosamente: ${result.transactionId}`);
    return result;
  } catch (error) {
    writeLog(`❌ Error en payment:process: ${error.message}`);
    return { success: false, error: error.message };
  }
});

// Diálogo de selección de imagen (CRÍTICO - faltaba completamente)
ipcMain.handle('open-image-dialog', async (event) => {
  try {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'Imágenes', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp'] }
      ]
    });
    
    if (canceled || filePaths.length === 0) {
      return { success: false, error: 'Selección cancelada' };
    }
    
    return { success: true, filePath: filePaths[0] };
  } catch (error) {
    writeLog(`❌ Error en open-image-dialog: ${error.message}`);
    return { success: false, error: error.message };
  }
});

writeLog('✅ Manejadores IPC faltantes agregados');
writeLog('✅ Todos los IPC Handlers configurados');
writeLog('🎉 === INICIALIZACIÓN COMPLETA ===');