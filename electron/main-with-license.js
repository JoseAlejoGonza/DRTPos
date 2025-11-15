// === SISTEMA DE LOGGING PARA DIAGNOSTICO ===
const fs = require('fs');
const os = require('os');

function writeLog(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  
  try {
    // Intentar escribir en múltiples ubicaciones
    const logPaths = [
      path.join(os.tmpdir(), 'drt-pos-debug.log'),
      path.join(__dirname, 'debug.log'),
      path.join(process.cwd(), 'debug.log')
    ];
    
    for (const logPath of logPaths) {
      try {
        fs.appendFileSync(logPath, logMessage);
        break; // Si logra escribir en uno, detener
      } catch (error) {
        // Continuar con la siguiente ubicación
      }
    }
  } catch (error) {
    // Si no puede escribir logs, continuar silenciosamente
  }
  
  console.log(logMessage.trim());
}

writeLog('🚀 === INICIANDO DRT POS ===');
writeLog(`🖥️ Plataforma: ${process.platform}`);
writeLog(`🏗️ Arquitectura: ${process.arch}`);
writeLog(`📂 Directorio actual: ${process.cwd()}`);
writeLog(`📂 __dirname: ${__dirname}`);
writeLog(`🔧 Versión Node: ${process.version}`);
writeLog(`🔧 Versión Electron: ${process.versions.electron}`);

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');

writeLog('✅ Imports básicos cargados');

let db, InvoicingService, PrintingService, WhatsAppService, WhatsAppAutomatedService;
let ConfigService, LicenseService, BackupService;

try {
  writeLog('📦 Cargando db.js...');
  db = require('./db');
  writeLog('✅ db.js cargado');
} catch (error) {
  writeLog(`❌ Error cargando db.js: ${error.message}`);
}

try {
  writeLog('📦 Cargando servicios...');
  InvoicingService = require('./invoicing.service');
  PrintingService = require('./printing.service');
  WhatsAppService = require('./whatsapp.service');
  WhatsAppAutomatedService = require('./whatsapp.automated.service');
  ConfigService = require('./config.service');
  LicenseService = require('./license.service');
  BackupService = require('./backup.service');
  writeLog('✅ Todos los servicios cargados');
} catch (error) {
  writeLog(`❌ Error cargando servicios: ${error.message}`);
}
// Detectar si es entorno de desarrollo de manera más robusta
writeLog('🔍 Detectando entorno...');
const isDev = process.env.NODE_ENV === 'development' || 
              (process.env.ELECTRON_START_URL && !app.isPackaged);
writeLog(`🔍 isDev: ${isDev}`);
writeLog(`🔍 app.isPackaged: ${app.isPackaged}`);

// DECLARAR VARIABLES GLOBALMENTE ANTES DE TODO
let mainWindow;
let configService, licenseService, backupService, invoicingService, printingService, whatsAppService, whatsAppAutomatedService;

// Inicializar servicios CON logging
writeLog('🔧 Inicializando servicios...');
try {
  writeLog('🔧 Creando ConfigService...');
  configService = new ConfigService();
  writeLog('✅ ConfigService creado');
  
  writeLog('🔧 Creando LicenseService...');
  licenseService = new LicenseService();
  writeLog('✅ LicenseService creado');
  
  writeLog('🔧 Creando otros servicios...');
  backupService = new BackupService();
  invoicingService = new InvoicingService();
  printingService = new PrintingService();
  whatsAppService = new WhatsAppService();
  whatsAppAutomatedService = new WhatsAppAutomatedService();
  writeLog('✅ Todos los servicios inicializados correctamente');
} catch (error) {
  writeLog(`❌ ERROR CRÍTICO inicializando servicios: ${error.message}`);
  writeLog(`❌ Stack: ${error.stack}`);
  
  // Mostrar error y salir si no se pueden inicializar servicios críticos
  app.whenReady().then(() => {
    dialog.showErrorBox(
      'Error Crítico de Inicialización',
      `No se pudieron inicializar los servicios del sistema.\n\nError: ${error.message}\n\nContacte soporte técnico.\n\nRevise el archivo debug.log para más detalles.`
    );
    app.quit();
  });
  
  process.exit(1);
}

// === VALIDACION DE LICENCIA SIMPLIFICADA Y FORZADA ===
writeLog('🔒 === INICIANDO VALIDACION DE LICENCIA ===');

// VALIDAR LICENCIA INMEDIATAMENTE - BLOQUEAR TODO SI ES INVALIDA
const licenseValidation = licenseService.validateLicense();
console.log('Resultado de validacion licencia:', JSON.stringify(licenseValidation, null, 2));

if (!licenseValidation.valid) {
  console.error('❌❌❌ LICENCIA INVALIDA - BLOQUEANDO APLICACION ❌❌❌');
  
  // Obtener información de diagnóstico detallada
  const diagnosticInfo = {
    currentDir: process.cwd(),
    execPath: process.execPath,
    execDir: process.execPath ? path.dirname(process.execPath) : 'N/A',
    __dirname: __dirname,
    searchPaths: licenseService.allPossiblePaths || [],
    foundLicense: licenseService.licenseFile || 'Ninguna',
    hardwareId: licenseService.hardwareId || 'N/A'
  };
  
  // BLOQUEAR INMEDIATAMENTE - NO CONTINUAR CON NADA MAS
  app.whenReady().then(() => {
    dialog.showMessageBox({
      type: 'error',
      title: 'Licencia Requerida',
      message: `ESTE SOFTWARE REQUIERE UNA LICENCIA VÁLIDA\n\n` +
               `❌ Error: ${licenseValidation.message || 'Licencia no encontrada'}\n` +
               `❌ Razón: ${licenseValidation.reason || 'Sin especificar'}\n\n` +
               `🔍 INFORMACIÓN DE DIAGNÓSTICO:\n` +
               `📁 Directorio actual: ${diagnosticInfo.currentDir}\n` +
               `📁 Ejecutable: ${diagnosticInfo.execPath}\n` +
               `📁 Directorio ejecutable: ${diagnosticInfo.execDir}\n` +
               `📁 Directorio interno: ${diagnosticInfo.__dirname}\n\n` +
               `🔍 BÚSQUEDA DE LICENCIAS:\n` +
               `📄 Licencia encontrada: ${diagnosticInfo.foundLicense}\n\n` +
               `🖥️ Hardware ID: ${diagnosticInfo.hardwareId}\n\n` +
               `💡 SOLUCIÓN:\n` +
               `1. Ejecute license-manager-final.exe\n` +
               `2. Use opción 3 para activar licencia\n` +
               `3. Proporcione este Hardware ID al proveedor\n\n` +
               `📞 Contacte al proveedor para obtener licencia.`,
      buttons: ['Cerrar']
    }).then(() => {
      app.quit();
    });
  });
  
  // SALIR INMEDIATAMENTE - NO EJECUTAR MAS CODIGO
  process.exit(1);
}

console.log('✅✅✅ LICENCIA VALIDA - CONTINUANDO CON LA APLICACION ✅✅✅');

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
    // Estrategia robusta para encontrar index.html
    const fs = require('fs');
    console.log('🔍 Buscando frontend en ubicaciones...');
    console.log('📁 __dirname:', __dirname);
    console.log('📁 process.resourcesPath:', process.resourcesPath);
    console.log('📁 app.getAppPath():', app.getAppPath());
    
    const possiblePaths = [
      // RUTAS CORRECTAS - Angular 18 usa 'browser' directory
      path.join(__dirname, '../frontend/dist/frontend/browser/index.html'),
      path.join(__dirname, '../../frontend/dist/frontend/browser/index.html'),
      
      // Rutas desde app.asar (dentro del archivo empaquetado)
      path.join(app.getAppPath(), 'frontend', 'dist', 'frontend', 'browser', 'index.html'),
      path.join(app.getAppPath(), 'frontend', 'dist', 'frontend', 'index.html'), // fallback
      
      // Rutas legacy (por compatibilidad)
      path.join(__dirname, '../frontend/dist/frontend/index.html'),
      path.join(process.resourcesPath, 'app', 'frontend', 'dist', 'frontend', 'browser', 'index.html'),
      path.join(process.resourcesPath, 'app.asar.unpacked', 'frontend', 'dist', 'frontend', 'browser', 'index.html'),
      
      // Rutas desde resources (legacy)
      path.join(process.resourcesPath, 'app', 'frontend', 'dist', 'frontend', 'index.html'),
      path.join(path.dirname(process.execPath), 'resources', 'app', 'frontend', 'dist', 'frontend', 'browser', 'index.html')
    ];
    
    let indexPath = null;
    for (const testPath of possiblePaths) {
      console.log(`🔍 Probando: ${testPath}`);
      if (fs.existsSync(testPath)) {
        indexPath = testPath;
        console.log('✅ Frontend encontrado en:', indexPath);
        break;
      } else {
        console.log('❌ No encontrado');
      }
    }
    
    if (indexPath) {
      console.log('🚀 Cargando frontend desde:', indexPath);
      mainWindow.loadFile(indexPath);
    } else {
      console.error('❌ CRITICO: No se pudo encontrar index.html en NINGUNA ubicación');
      
      // Como último recurso, intentar cargar una página HTML básica
      const emergencyHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>DRT POS - Error</title>
          <style>
            body { font-family: Arial; padding: 50px; text-align: center; background: #f0f0f0; }
            .error { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          </style>
        </head>
        <body>
          <div class="error">
            <h1>🚫 Error de Aplicación</h1>
            <p>No se pudo encontrar la interfaz de usuario.</p>
            <p>Contacte al soporte técnico.</p>
            <hr>
            <small>Paths probados:</small>
            <pre style="text-align: left; background: #f5f5f5; padding: 10px; border-radius: 5px;">
${possiblePaths.map(p => `❌ ${p}`).join('\n')}
            </pre>
          </div>
        </body>
        </html>
      `;
      
      const tempPath = path.join(require('os').tmpdir(), 'drt-pos-error.html');
      fs.writeFileSync(tempPath, emergencyHtml);
      mainWindow.loadFile(tempPath);
    }
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Software funcionando normalmente (sin diagnóstico)
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});

// === RESTO DEL CODIGO IPC ===
// IPC handlers para comunicación con el frontend
ipcMain.handle('get-products', async () => {
  try {
    return db.prepare('SELECT * FROM products ORDER BY name').all();
  } catch (error) {
    console.error('Error getting products:', error);
    throw error;
  }
});

ipcMain.handle('add-product', async (event, product) => {
  try {
    const stmt = db.prepare(`
      INSERT INTO products (name, description, price, cost, stock, barcode, category, tax_rate) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      product.name,
      product.description,
      product.price,
      product.cost,
      product.stock,
      product.barcode,
      product.category,
      product.tax_rate
    );
    return { id: result.lastInsertRowid, ...product };
  } catch (error) {
    console.error('Error adding product:', error);
    throw error;
  }
});

ipcMain.handle('update-product', async (event, product) => {
  try {
    const stmt = db.prepare(`
      UPDATE products 
      SET name = ?, description = ?, price = ?, cost = ?, stock = ?, barcode = ?, category = ?, tax_rate = ? 
      WHERE id = ?
    `);
    stmt.run(
      product.name,
      product.description,
      product.price,
      product.cost,
      product.stock,
      product.barcode,
      product.category,
      product.tax_rate,
      product.id
    );
    return product;
  } catch (error) {
    console.error('Error updating product:', error);
    throw error;
  }
});

ipcMain.handle('delete-product', async (event, id) => {
  try {
    const stmt = db.prepare('DELETE FROM products WHERE id = ?');
    stmt.run(id);
    return { id };
  } catch (error) {
    console.error('Error deleting product:', error);
    throw error;
  }
});

ipcMain.handle('search-product-by-barcode', async (event, barcode) => {
  try {
    const product = db.prepare('SELECT * FROM products WHERE barcode = ?').get(barcode);
    return product || null;
  } catch (error) {
    console.error('Error searching product by barcode:', error);
    throw error;
  }
});

ipcMain.handle('get-categories', async () => {
  try {
    const categories = db.prepare('SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND category != ""').all();
    return categories.map(row => row.category);
  } catch (error) {
    console.error('Error getting categories:', error);
    throw error;
  }
});

ipcMain.handle('process-sale', async (event, saleData) => {
  try {
    console.log('Processing sale:', saleData);
    
    const transaction = db.transaction(() => {
      // Registrar venta
      const saleStmt = db.prepare(`
        INSERT INTO sales (total, tax_total, payment_method, sale_date, customer_name, customer_id, customer_phone) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      const saleResult = saleStmt.run(
        saleData.total,
        saleData.taxTotal,
        saleData.paymentMethod,
        new Date().toISOString(),
        saleData.customerName,
        saleData.customerId,
        saleData.customerPhone
      );
      
      const saleId = saleResult.lastInsertRowid;
      
      // Registrar items de venta y actualizar stock
      const itemStmt = db.prepare(`
        INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, total_price) 
        VALUES (?, ?, ?, ?, ?)
      `);
      const updateStockStmt = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?');
      
      saleData.items.forEach(item => {
        itemStmt.run(saleId, item.productId, item.quantity, item.price, item.total);
        updateStockStmt.run(item.quantity, item.productId);
      });
      
      return saleId;
    });
    
    const saleId = transaction();
    
    // Generar factura si está configurado
    if (saleData.generateInvoice) {
      const invoiceResult = await invoicingService.generateInvoice({
        saleId,
        ...saleData
      });
      console.log('Invoice generated:', invoiceResult);
      return { saleId, invoice: invoiceResult };
    }
    
    return { saleId };
  } catch (error) {
    console.error('Error processing sale:', error);
    throw error;
  }
});

// Configuración de la empresa
ipcMain.handle('get-company-config', () => {
  return configService.getCompanyConfig();
});

ipcMain.handle('save-company-config', (event, config) => {
  return configService.saveCompanyConfig(config);
});

// Configuración de facturación
ipcMain.handle('get-invoicing-config', () => {
  return configService.getInvoicingConfig();
});

ipcMain.handle('save-invoicing-config', (event, config) => {
  return configService.saveInvoicingConfig(config);
});

// Configuración de WhatsApp
ipcMain.handle('get-whatsapp-config', () => {
  return configService.getWhatsAppConfig();
});

ipcMain.handle('save-whatsapp-config', (event, config) => {
  return configService.saveWhatsAppConfig(config);
});

// Impresión
ipcMain.handle('print-receipt', async (event, receiptData) => {
  try {
    return await printingService.printReceipt(receiptData);
  } catch (error) {
    console.error('Error printing receipt:', error);
    throw error;
  }
});

ipcMain.handle('get-printers', async () => {
  try {
    return await printingService.getPrinters();
  } catch (error) {
    console.error('Error getting printers:', error);
    throw error;
  }
});

// WhatsApp
ipcMain.handle('send-whatsapp-message', async (event, data) => {
  try {
    return await whatsAppService.sendMessage(data.phone, data.message, data.pdfPath);
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    throw error;
  }
});

ipcMain.handle('get-whatsapp-status', async () => {
  try {
    return await whatsAppService.getStatus();
  } catch (error) {
    console.error('Error getting WhatsApp status:', error);
    throw error;
  }
});

ipcMain.handle('initialize-whatsapp', async () => {
  try {
    return await whatsAppService.initialize();
  } catch (error) {
    console.error('Error initializing WhatsApp:', error);
    throw error;
  }
});

// Ventas y reportes
ipcMain.handle('get-sales-report', async (event, dateRange) => {
  try {
    const { startDate, endDate } = dateRange;
    const sales = db.prepare(`
      SELECT s.*, 
             GROUP_CONCAT(p.name || ' x' || si.quantity) as items
      FROM sales s
      LEFT JOIN sale_items si ON s.id = si.sale_id
      LEFT JOIN products p ON si.product_id = p.id
      WHERE DATE(s.sale_date) BETWEEN ? AND ?
      GROUP BY s.id
      ORDER BY s.sale_date DESC
    `).all(startDate, endDate);
    
    return sales;
  } catch (error) {
    console.error('Error getting sales report:', error);
    throw error;
  }
});

ipcMain.handle('get-sales-summary', async (event, dateRange) => {
  try {
    const { startDate, endDate } = dateRange;
    const summary = db.prepare(`
      SELECT 
        COUNT(*) as total_sales,
        SUM(total) as total_amount,
        SUM(tax_total) as total_taxes,
        AVG(total) as average_sale
      FROM sales
      WHERE DATE(sale_date) BETWEEN ? AND ?
    `).get(startDate, endDate);
    
    return summary;
  } catch (error) {
    console.error('Error getting sales summary:', error);
    throw error;
  }
});

// Backup
ipcMain.handle('create-backup', async () => {
  try {
    return await backupService.createBackup();
  } catch (error) {
    console.error('Error creating backup:', error);
    throw error;
  }
});

ipcMain.handle('restore-backup', async (event, backupPath) => {
  try {
    return await backupService.restoreBackup(backupPath);
  } catch (error) {
    console.error('Error restoring backup:', error);
    throw error;
  }
});

ipcMain.handle('get-database-stats', async () => {
  try {
    return await backupService.getDatabaseStats();
  } catch (error) {
    console.error('Error getting database stats:', error);
    throw error;
  }
});