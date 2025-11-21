const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const db = require('./db');
const InvoicingService = require('./invoicing.service');
const PrintingService = require('./printing.service');
const WhatsAppService = require('./whatsapp.service');
const WhatsAppAutomatedService = require('./whatsapp.automated.service');
const ConfigService = require('./config.service');
const isDev = !!process.env.ELECTRON_START_URL;
let mainWindow;

// Inicializar servicios
const configService = new ConfigService();
const invoicingService = new InvoicingService();
const printingService = new PrintingService();
const whatsAppService = new WhatsAppService();
const whatsAppAutomatedService = new WhatsAppAutomatedService();

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
    icon: path.join(__dirname, '../frontend/src/assets/icons/icon-drt.png'), // Icono de la aplicación
    webPreferences: {
      preload: path.join(__dirname, './preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
      // Configuraciones para prevenir bloqueo de inputs
      backgroundThrottling: false, // Evita throttling en background
      offscreen: false, // Asegurar rendering normal
      spellcheck: false, // Deshabilitar spellcheck que puede causar conflictos
      enableRemoteModule: false,
      sandbox: false
    },
    // Configuraciones adicionales de ventana
    show: false, // No mostrar hasta que esté listo
    titleBarStyle: 'default'
  });

  // Mostrar ventana cuando esté lista para prevenir problemas de rendering
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Prevenir bloqueos de input con eventos de focus
  mainWindow.webContents.on('dom-ready', () => {
    console.log('DOM Ready - Inyectando fix preventivo para inputs');
    // Inyectar código para prevenir bloqueos de input
    mainWindow.webContents.executeJavaScript(`
      (function() {
        console.log('🛡️ Aplicando sistema preventivo para inputs...');
        
        let fixInterval;
        let inputObserver;
        let isFixing = false;
        
        // Función de fix suave
        function softInputFix() {
          if (isFixing) return;
          isFixing = true;
          
          try {
            const inputs = document.querySelectorAll('input, textarea, select');
            let blockedCount = 0;
            
            inputs.forEach((input, index) => {
              if (input.disabled || input.readOnly) return;
              
              // Detectar inputs potencialmente bloqueados
              const rect = input.getBoundingClientRect();
              const isVisible = rect.width > 0 && rect.height > 0;
              
              if (isVisible) {
                // Test rápido: intentar enfocar y desenfocar
                const wasFocused = document.activeElement === input;
                
                if (!wasFocused) {
                  input.focus();
                  setTimeout(() => {
                    if (document.activeElement !== input) {
                      // Input posiblemente bloqueado
                      blockedCount++;
                      console.log('⚠️ Input posiblemente bloqueado detectado:', input);
                      
                      // Fix suave
                      input.style.pointerEvents = 'none';
                      setTimeout(() => {
                        input.style.pointerEvents = '';
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                      }, 10);
                    } else {
                      input.blur();
                    }
                  }, 5);
                }
              }
            });
            
            if (blockedCount > 0) {
              console.log('🔧 Detectados', blockedCount, 'inputs bloqueados - aplicando fix suave');
            }
            
          } catch (error) {
            console.error('Error en fix suave:', error);
          } finally {
            isFixing = false;
          }
        }
        
        // Fix preventivo deshabilitado temporalmente para evitar conflictos
        // fixInterval = setInterval(softInputFix, 60000); // Reducido a cada minuto si se reactiva
        
        // Observer para nuevos inputs
        function setupInputWatchers() {
          const inputs = document.querySelectorAll('input, textarea, select');
          inputs.forEach(input => {
            if (input.dataset.fixWatcher) return; // Ya tiene watcher
            
            input.dataset.fixWatcher = 'true';
            
            // Watcher para detectar bloqueos
            input.addEventListener('focus', function() {
              this.dataset.lastFocus = Date.now().toString();
            });
            
            input.addEventListener('click', function() {
              this.dataset.lastClick = Date.now().toString();
              
              // Si click pero no focus después de 100ms, posible bloqueo
              setTimeout(() => {
                if (document.activeElement !== this) {
                  console.log('🚨 Input bloqueado detectado en click:', this);
                  this.focus();
                }
              }, 100);
            });
          });
        }
        
        // Setup inicial
        setupInputWatchers();
        
        // Observer para nuevos elementos
        inputObserver = new MutationObserver(() => {
          setTimeout(setupInputWatchers, 100);
        });
        
        inputObserver.observe(document.body, { 
          childList: true, 
          subtree: true 
        });
        
        // Teclas de emergencia
        document.addEventListener('keydown', function(e) {
          // F5 - Reload
          if (e.key === 'F5') {
            location.reload();
          }
          
          // Ctrl+Shift+F - Fix manual rápido
          if (e.ctrlKey && e.shiftKey && e.key === 'F') {
            e.preventDefault();
            console.log('🔧 Fix manual activado por teclado');
            softInputFix();
          }
        });
        
        // Cleanup al salir
        window.addEventListener('beforeunload', () => {
          if (fixInterval) clearInterval(fixInterval);
          if (inputObserver) inputObserver.disconnect();
        });
        
        console.log('✅ Sistema preventivo de inputs activado');
      })();
    `);
  });

  if (isDev) {
    mainWindow.loadURL(process.env.ELECTRON_START_URL || 'http://localhost:4200');
    mainWindow.webContents.openDevTools();
  } else {
    // Verificar si existe el build de producción
    const prodPath = path.join(__dirname, '../frontend/dist/frontend/browser/index.html');
    const altProdPath = path.join(__dirname, '../frontend/dist/frontend/index.html');
    
    if (require('fs').existsSync(prodPath)) {
      mainWindow.loadFile(prodPath);
    } else if (require('fs').existsSync(altProdPath)) {
      mainWindow.loadFile(altProdPath);
    } else {
      console.error('No se encontró el build de producción. Ejecutar: npm run build');
      // Como fallback, intentar cargar desde el servidor de desarrollo
      mainWindow.loadURL('http://localhost:4200');
    }
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
  // Usar la función updateProduct del módulo db.js que incluye cost_price
  console.log('🔍 IPC products:update - Producto recibido:', p);
  return db.updateProduct(p);
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

// PROFIT REPORTS
ipcMain.handle('reports:getProfitByProduct', (e, {startDate, endDate}) => 
  db.getProfitByProduct(startDate, endDate));
ipcMain.handle('reports:getProfitByCategory', (e, {startDate, endDate}) => 
  db.getProfitByCategory(startDate, endDate));
ipcMain.handle('reports:getDailyProfitSummary', (e, date) => 
  db.getDailyProfitSummary(date));

// USERS & AUTHENTICATION
ipcMain.handle('auth:login', (e, {username, password}) => {
  try {
    const user = db.authenticateUser(username, password);
    return { success: true, user };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('users:getAll', () => {
  try {
    return { success: true, users: db.getAllUsers() };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('users:create', (e, userData) => {
  try {
    const result = db.createUser(userData);
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('users:update', (e, userData) => {
  try {
    const result = db.updateUser(userData);
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('users:delete', (e, id) => {
  try {
    const result = db.deleteUser(id);
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('users:changePassword', (e, {userId, currentPassword, newPassword}) => {
  try {
    const result = db.changePassword(userId, currentPassword, newPassword);
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
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
      total_sale: saleData.total, // Total con descuento
      original_total: saleData.originalTotal || saleData.total,
      discount: saleData.discount || 0,
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

ipcMain.handle('print:testESCPOS', async (event, printerName) => {
  console.log('🧪 [main.js] Prueba de comandos ESC/POS para impresora:', printerName);
  try {
    return await printingService.testESCPOSCommands(printerName);
  } catch (error) {
    console.error('❌ [main.js] Error en prueba ESC/POS:', error);
    throw error;
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
    const stmt = db.db.prepare('SELECT total_sale, original_total, discount, date_sale FROM sales WHERE date_sale BETWEEN ? AND ?');
    const rows = stmt.all(from, to);
    
    console.log('📊 Datos de salesSummary:', { from, to, rowCount: rows.length, sampleRow: rows[0] });
    
    const totalGross = rows.reduce((s, r) => s + (parseFloat(r.total_sale) || 0), 0);
    const totalOriginal = rows.reduce((s, r) => s + (parseFloat(r.original_total) || parseFloat(r.total_sale) || 0), 0);
    const totalDiscount = rows.reduce((s, r) => s + (parseFloat(r.discount) || 0), 0);
    const taxes = totalGross * ivaRate / (1 + ivaRate);
    const totalNet = totalGross - taxes;
    
    return { 
      success: true, 
      totalGross: Math.round(totalGross * 100) / 100, 
      totalOriginal: Math.round(totalOriginal * 100) / 100,
      totalDiscount: Math.round(totalDiscount * 100) / 100,
      taxes: Math.round(taxes * 100) / 100, 
      totalNet: Math.round(totalNet * 100) / 100, 
      count: rows.length 
    };
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

    const stmt = db.db.prepare(`SELECT ${groupExpr} as period, COUNT(*) as count_sales, SUM(COALESCE(total_sale, 0)) as total, SUM(COALESCE(original_total, total_sale, 0)) as original_total, SUM(COALESCE(discount, 0)) as total_discount FROM sales WHERE date_sale BETWEEN ? AND ? GROUP BY period ORDER BY period`);
    const rows = stmt.all(from, to);
    console.log('📊 salesByRange rows:', rows.slice(0, 3));
    return { success: true, rows };
  } catch (error) {
    console.error('Error reports:salesByRange', error);
    return { success: false, error: error.message || String(error) };
  }
});

ipcMain.handle('reports:salesByProduct', (event, { from, to }) => {
  try {
    // make join robust: cast ds.id_product to integer in case it was stored as text
    // Obtener ventas reales con descuentos proporcionales
    const stmt = db.db.prepare(`
      SELECT 
        p.id as productId, 
        p.name as productName, 
        p.price as unitPrice,
        SUM(COALESCE(CAST(ds.quantity AS INTEGER),0)) as quantitySold,
        SUM(COALESCE(CAST(ds.quantity AS INTEGER),0) * COALESCE(p.price,0)) as originalSales,
        SUM(
          CASE 
            WHEN COALESCE(s.original_total, s.total_sale) > 0 THEN
              (COALESCE(CAST(ds.quantity AS INTEGER),0) * COALESCE(p.price,0)) * 
              (COALESCE(s.total_sale, 0) / COALESCE(s.original_total, s.total_sale))
            ELSE COALESCE(CAST(ds.quantity AS INTEGER),0) * COALESCE(p.price,0)
          END
        ) as totalSales,
        SUM(
          CASE 
            WHEN COALESCE(s.original_total, s.total_sale) > 0 THEN
              (COALESCE(CAST(ds.quantity AS INTEGER),0) * COALESCE(p.price,0)) * 
              (COALESCE(s.discount, 0) / COALESCE(s.original_total, s.total_sale))
            ELSE 0
          END
        ) as totalDiscount
      FROM detail_sales ds 
      JOIN products p ON p.id = CAST(ds.id_product AS INTEGER) 
      JOIN sales s ON s.id = ds.id_sale 
      WHERE s.date_sale BETWEEN ? AND ? 
      GROUP BY p.id, p.name, p.price 
      ORDER BY quantitySold DESC
    `);
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
    // Obtener ventas por categoría con valores reales
    const stmt = db.db.prepare(`
      SELECT 
        c.id as categoryId, 
        c.name as categoryName,
        SUM(COALESCE(CAST(ds.quantity AS INTEGER),0)) as quantitySold,
        SUM(
          CASE 
            WHEN COALESCE(s.original_total, s.total_sale) > 0 THEN
              (COALESCE(CAST(ds.quantity AS INTEGER),0) * COALESCE(p.price,0)) * 
              (COALESCE(s.total_sale, 0) / COALESCE(s.original_total, s.total_sale))
            ELSE COALESCE(CAST(ds.quantity AS INTEGER),0) * COALESCE(p.price,0)
          END
        ) as totalSales,
        SUM(
          CASE 
            WHEN COALESCE(s.original_total, s.total_sale) > 0 THEN
              (COALESCE(CAST(ds.quantity AS INTEGER),0) * COALESCE(p.price,0)) * 
              (COALESCE(s.discount, 0) / COALESCE(s.original_total, s.total_sale))
            ELSE 0
          END
        ) as totalDiscount
      FROM detail_sales ds 
      JOIN products p ON p.id = CAST(ds.id_product AS INTEGER) 
      LEFT JOIN categories c ON p.category_id = c.id 
      JOIN sales s ON s.id = ds.id_sale 
      WHERE s.date_sale BETWEEN ? AND ? 
      GROUP BY c.id, c.name 
      ORDER BY totalSales DESC
    `);
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

// Handler específico para reportes de descuentos
ipcMain.handle('reports:discounts', (event, { from, to }) => {
  try {
    const stmt = db.db.prepare(`
      SELECT 
        date_sale,
        original_total,
        total_sale,
        discount,
        payment_method,
        ROUND((discount / original_total) * 100, 2) as discount_percentage
      FROM sales 
      WHERE date_sale BETWEEN ? AND ? 
        AND discount > 0 
      ORDER BY date_sale DESC
    `);
    const rows = stmt.all(from, to);
    
    // Estadísticas de descuentos
    const totalDiscounts = rows.reduce((s, r) => s + (r.discount || 0), 0);
    const avgDiscount = rows.length > 0 ? totalDiscounts / rows.length : 0;
    const maxDiscount = rows.length > 0 ? Math.max(...rows.map(r => r.discount || 0)) : 0;
    const salesWithDiscount = rows.length;
    
    return { 
      success: true, 
      rows,
      stats: {
        totalDiscounts,
        avgDiscount,
        maxDiscount,
        salesWithDiscount
      }
    };
  } catch (error) {
    console.error('Error reports:discounts', error);
    return { success: false, error: error.message || String(error) };
  }
});

// Handler para cierre de caja diario
ipcMain.handle('reports:dailyClosure', async (event, { date }) => {
  try {
    const from = `${date}T00:00:00`;
    const to = `${date}T23:59:59`;
    
    // Obtener datos detallados de ventas del día
    const stmt = db.db.prepare(`
      SELECT 
        p.name as productName,
        c.name as categoryName,
        SUM(COALESCE(CAST(ds.quantity AS INTEGER), 0)) as quantitySold,
        p.price as unitPrice,
        p.cost_price as unitCost,
        p.stock as currentStock,
        SUM(
          CASE 
            WHEN COALESCE(s.original_total, s.total_sale) > 0 THEN
              (COALESCE(CAST(ds.quantity AS INTEGER), 0) * COALESCE(p.price, 0)) * 
              (COALESCE(s.total_sale, 0) / COALESCE(s.original_total, s.total_sale))
            ELSE COALESCE(CAST(ds.quantity AS INTEGER), 0) * COALESCE(p.price, 0)
          END
        ) as realAmountPaid,
        SUM(
          CASE 
            WHEN COALESCE(s.original_total, s.total_sale) > 0 THEN
              (COALESCE(CAST(ds.quantity AS INTEGER), 0) * COALESCE(p.price, 0)) * 
              (COALESCE(s.discount, 0) / COALESCE(s.original_total, s.total_sale))
            ELSE 0
          END
        ) as discountApplied,
        SUM(COALESCE(CAST(ds.quantity AS INTEGER), 0) * COALESCE(p.cost_price, 0)) as totalCost,
        SUM(
          CASE 
            WHEN COALESCE(s.original_total, s.total_sale) > 0 THEN
              (COALESCE(CAST(ds.quantity AS INTEGER), 0) * COALESCE(p.price, 0)) * 
              (COALESCE(s.total_sale, 0) / COALESCE(s.original_total, s.total_sale)) -
              (COALESCE(CAST(ds.quantity AS INTEGER), 0) * COALESCE(p.cost_price, 0))
            ELSE 
              (COALESCE(CAST(ds.quantity AS INTEGER), 0) * COALESCE(p.price, 0)) -
              (COALESCE(CAST(ds.quantity AS INTEGER), 0) * COALESCE(p.cost_price, 0))
          END
        ) as totalProfit,
        CASE 
          WHEN COALESCE(p.price, 0) > 0 THEN
            ROUND(((COALESCE(p.price, 0) - COALESCE(p.cost_price, 0)) / COALESCE(p.price, 0)) * 100, 2)
          ELSE 0
        END as profitMarginPercent
      FROM detail_sales ds
      JOIN products p ON p.id = CAST(ds.id_product AS INTEGER)
      LEFT JOIN categories c ON p.category_id = c.id
      JOIN sales s ON s.id = ds.id_sale
      WHERE s.date_sale BETWEEN ? AND ?
      GROUP BY p.id, p.name, c.name, p.price, p.cost_price, p.stock
      ORDER BY realAmountPaid DESC
    `);
    
    const products = stmt.all(from, to);
    
    // Resumen general del día
    const summaryStmt = db.db.prepare(`
      SELECT 
        COUNT(*) as totalSales,
        SUM(COALESCE(total_sale, 0)) as totalRevenue,
        SUM(COALESCE(discount, 0)) as totalDiscounts,
        SUM(COALESCE(original_total, total_sale, 0)) as originalTotal
      FROM sales 
      WHERE date_sale BETWEEN ? AND ?
    `);
    
    const summary = summaryStmt.get(from, to);
    
    // Calcular totales de costos y ganancias del día
    const totalCost = products.reduce((sum, p) => sum + (p.totalCost || 0), 0);
    const totalProfit = products.reduce((sum, p) => sum + (p.totalProfit || 0), 0);
    const overallProfitMargin = summary.totalRevenue > 0 ? 
      Math.round((totalProfit / summary.totalRevenue) * 100 * 100) / 100 : 0;
    
    return {
      success: true,
      date,
      products,
      summary: {
        totalSales: summary.totalSales || 0,
        totalRevenue: Math.round((summary.totalRevenue || 0) * 100) / 100,
        totalDiscounts: Math.round((summary.totalDiscounts || 0) * 100) / 100,
        originalTotal: Math.round((summary.originalTotal || 0) * 100) / 100,
        totalCost: Math.round(totalCost * 100) / 100,
        totalProfit: Math.round(totalProfit * 100) / 100,
        overallProfitMargin: overallProfitMargin
      }
    };
  } catch (error) {
    console.error('Error reports:dailyClosure', error);
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

// ============================================================================
// BACKUP HANDLERS
// ============================================================================

// Handler para obtener estadísticas de backup
ipcMain.handle('backup:getStats', async () => {
  try {
    const fs = require('fs');
    const dbPath = path.join(app.getPath('userData'), 'pos.db');
    
    if (!fs.existsSync(dbPath)) {
      return { success: false, error: 'Database file not found at: ' + dbPath };
    }
    
    const stats = fs.statSync(dbPath);
    return {
      success: true,
      stats: {
        size: stats.size,
        modified: stats.mtime,
        created: stats.ctime,
        path: dbPath
      }
    };
  } catch (error) {
    console.error('Error backup:getStats', error);
    return { success: false, error: error.message || String(error) };
  }
});

// Handler para crear backup
ipcMain.handle('backup:create', async () => {
  try {
    const fs = require('fs');
    const dbPath = path.join(app.getPath('userData'), 'pos.db');
    
    if (!fs.existsSync(dbPath)) {
      return { success: false, error: 'Database file not found at: ' + dbPath };
    }
    
    // Pedir ruta al usuario para guardar el backup
    const { canceled, filePath: destPath } = await dialog.showSaveDialog(BrowserWindow.getFocusedWindow(), {
      defaultPath: `backup-${new Date().toISOString().slice(0, 10)}.db`,
      filters: [
        { name: 'Database files', extensions: ['db'] },
        { name: 'All files', extensions: ['*'] }
      ]
    });
    
    if (canceled || !destPath) {
      return { success: false, error: 'Backup cancelled by user' };
    }
    
    // Copiar el archivo de base de datos
    await fs.promises.copyFile(dbPath, destPath);
    
    return {
      success: true,
      backupPath: destPath,
      message: 'Backup created successfully'
    };
  } catch (error) {
    console.error('Error backup:create', error);
    return { success: false, error: error.message || String(error) };
  }
});

// Handler para restaurar backup
ipcMain.handle('backup:restore', async () => {
  try {
    const fs = require('fs');
    const dbPath = path.join(app.getPath('userData'), 'pos.db');
    
    // Pedir al usuario que seleccione el archivo de backup
    const { canceled, filePaths } = await dialog.showOpenDialog(BrowserWindow.getFocusedWindow(), {
      title: 'Seleccionar archivo de backup',
      filters: [
        { name: 'Database files', extensions: ['db'] },
        { name: 'All files', extensions: ['*'] }
      ],
      properties: ['openFile']
    });
    
    if (canceled || filePaths.length === 0) {
      return { success: false, error: 'Restore cancelled by user' };
    }
    
    const backupPath = filePaths[0];
    
    // Verificar que el archivo de backup existe
    if (!fs.existsSync(backupPath)) {
      return { success: false, error: 'Backup file not found' };
    }
    
    // Crear backup de la base de datos actual antes de restaurar
    const currentBackupPath = path.join(app.getPath('userData'), `pos_backup_before_restore_${Date.now()}.db`);
    if (fs.existsSync(dbPath)) {
      await fs.promises.copyFile(dbPath, currentBackupPath);
    }
    
    // Restaurar la base de datos desde el backup
    await fs.promises.copyFile(backupPath, dbPath);
    
    return {
      success: true,
      restoredFrom: backupPath,
      currentBackupPath: currentBackupPath,
      message: 'Backup restored successfully. Previous database backed up to: ' + currentBackupPath
    };
  } catch (error) {
    console.error('Error backup:restore', error);
    return { success: false, error: error.message || String(error) };
  }
});

// SISTEMA DE FIX PARA INPUTS BLOQUEADOS
ipcMain.handle('system:fixInputs', async () => {
  try {
    console.log('🔧 Aplicando fix de emergencia para inputs bloqueados...');
    
    if (!mainWindow) return { success: false, error: 'Ventana principal no disponible' };
    
    // Inyectar fix de emergencia específico para Angular
    const result = await mainWindow.webContents.executeJavaScript(`
      (function() {
        console.log('🚨 EJECUTANDO FIX DE EMERGENCIA ANGULAR PARA INPUTS');
        
        try {
          // 1. Buscar inputs en todos los contextos posibles
          const allInputs = [];
          
          // Buscar en document principal
          document.querySelectorAll('input, textarea, select').forEach(input => allInputs.push(input));
          
          // Buscar en shadow DOM si existe
          document.querySelectorAll('*').forEach(el => {
            if (el.shadowRoot) {
              el.shadowRoot.querySelectorAll('input, textarea, select').forEach(input => allInputs.push(input));
            }
          });
          
          // Buscar inputs específicos de Angular
          const angularSelectors = [
            'input[formcontrolname]',
            'input[ng-model]', 
            'input[ngModel]',
            'input[_ngcontent-ng-c]',
            'input.form-control',
            'textarea[formcontrolname]',
            'textarea[ng-model]',
            'textarea[ngModel]',
            'select[formcontrolname]',
            'select[ng-model]',
            'select[ngModel]'
          ];
          
          angularSelectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(input => {
              if (!allInputs.includes(input)) {
                allInputs.push(input);
              }
            });
          });
          
          console.log('🔍 Encontrados', allInputs.length, 'inputs totales para procesar');
          
          if (allInputs.length === 0) {
            console.log('⚠️ No se encontraron inputs - posible problema de renderizado');
            // Forzar re-render completo
            document.body.style.visibility = 'hidden';
            document.body.offsetHeight;
            document.body.style.visibility = 'visible';
            
            // Volver a buscar después del re-render
            setTimeout(() => {
              const newInputs = document.querySelectorAll('input, textarea, select');
              console.log('🔄 Después de re-render encontrados:', newInputs.length, 'inputs');
            }, 100);
          }
          
          // 2. Fix agresivo para cada input
          allInputs.forEach((input, index) => {
            if (input.disabled || input.readOnly) {
              console.log('⏭️ Saltando input deshabilitado:', index);
              return;
            }
            
            console.log('🔧 Procesando input', index, ':', {
              tag: input.tagName,
              type: input.type,
              id: input.id,
              className: input.className,
              value: input.value,
              visible: input.offsetWidth > 0 && input.offsetHeight > 0
            });
            
            const currentValue = input.value;
            const isActive = document.activeElement === input;
            
            // Reset completo del input
            try {
              // 1. Desconectar completamente
              input.blur();
              input.style.pointerEvents = 'none';
              input.readOnly = true;
              
              setTimeout(() => {
                // 2. Reconectar paso a paso
                input.readOnly = false;
                input.style.pointerEvents = '';
                
                // 3. Restaurar valor
                if (input.value !== currentValue) {
                  input.value = currentValue;
                }
                
                // 4. Crear y disparar eventos sintéticos
                const events = ['focus', 'input', 'change', 'keyup', 'blur'];
                events.forEach((eventType, eventIndex) => {
                  setTimeout(() => {
                    const event = new Event(eventType, { 
                      bubbles: true, 
                      cancelable: true,
                      composed: true 
                    });
                    input.dispatchEvent(event);
                  }, eventIndex * 10);
                });
                
                // 5. Forzar focus si era el activo
                if (isActive) {
                  setTimeout(() => {
                    input.focus();
                    input.click(); // Click adicional para asegurar activación
                  }, 100);
                }
                
                // 6. Hack específico para Angular: trigger change detection
                setTimeout(() => {
                  if (input.ng) {
                    // Si tiene referencia de Angular, forzar update
                    try {
                      input.ng.detectChanges();
                    } catch (e) {
                      console.log('No se pudo forzar detectChanges en input', index);
                    }
                  }
                  
                  // Disparar evento personalizado para Angular
                  input.dispatchEvent(new CustomEvent('ngModelChange', {
                    detail: { value: currentValue },
                    bubbles: true
                  }));
                  
                }, 150);
                
              }, 50 + (index * 10));
              
            } catch (inputError) {
              console.error('Error procesando input', index, ':', inputError);
            }
          });
          
          // 3. Fix global de Angular después de procesar inputs
          setTimeout(() => {
            console.log('🔄 Aplicando fix global de Angular...');
            
            try {
              // Disparar eventos globales para forzar re-render
              window.dispatchEvent(new Event('resize'));
              window.dispatchEvent(new Event('orientationchange'));
              
              // Forzar click en diferentes elementos para restaurar event listeners
              const clickTargets = [document.body, document.documentElement];
              clickTargets.forEach(target => {
                if (target) {
                  const clickEvent = new MouseEvent('click', { bubbles: true });
                  target.dispatchEvent(clickEvent);
                }
              });
              
              // Intentar acceder a Angular si está disponible globalmente
              if (window.ng) {
                try {
                  const appRoot = document.querySelector('app-root');
                  if (appRoot && window.ng.getComponent) {
                    const component = window.ng.getComponent(appRoot);
                    if (component && component.constructor) {
                      console.log('🅰️ Componente Angular encontrado:', component.constructor.name);
                    }
                  }
                } catch (ngError) {
                  console.log('No se pudo acceder a Angular global:', ngError.message);
                }
              }
              
              console.log('✅ Fix de emergencia Angular completado');
              
            } catch (globalError) {
              console.error('Error en fix global:', globalError);
            }
            
          }, 1000);
          
          return 'Fix Angular aplicado - ' + allInputs.length + ' inputs procesados';
          
        } catch (error) {
          console.error('❌ Error crítico en fix de emergencia:', error);
          return 'Error crítico: ' + error.message;
        }
      })();
    `);
    
    console.log('✅ Fix de emergencia aplicado exitosamente');
    return { 
      success: true, 
      message: 'Fix de emergencia aplicado. Los inputs deberían funcionar normalmente.' 
    };
    
  } catch (error) {
    console.error('❌ Error aplicando fix de emergencia:', error);
    return { 
      success: false, 
      error: 'Error aplicando fix: ' + (error.message || error) 
    };
  }
});

ipcMain.handle('system:forceReload', async () => {
  try {
    if (mainWindow) {
      mainWindow.reload();
      return { success: true, message: 'Aplicación reiniciada' };
    }
    return { success: false, error: 'Ventana no disponible' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('system:resetAngular', async () => {
  try {
    console.log('🔄 Reiniciando Angular componentes...');
    
    if (!mainWindow) return { success: false, error: 'Ventana principal no disponible' };
    
    const result = await mainWindow.webContents.executeJavaScript(`
      (function() {
        console.log('🅰️ REINICIO COMPLETO DE ANGULAR');
        
        try {
          // 1. Limpiar todos los timers y observers
          const highestId = setTimeout(() => {}, 1);
          for (let i = 0; i < highestId; i++) {
            clearTimeout(i);
            clearInterval(i);
          }
          
          // 2. Forzar garbage collection de eventos
          document.querySelectorAll('*').forEach(el => {
            if (el.cloneNode) {
              const newEl = el.cloneNode(true);
              if (el.parentNode && el.tagName !== 'HTML' && el.tagName !== 'BODY') {
                try {
                  el.parentNode.replaceChild(newEl, el);
                } catch (e) {
                  // Si falla, continuar con el siguiente
                }
              }
            }
          });
          
          // 3. Forzar recarga suave del DOM
          const body = document.body;
          const html = body.innerHTML;
          body.innerHTML = '';
          setTimeout(() => {
            body.innerHTML = html;
            
            // 4. Restaurar focus y eventos después de recrear DOM
            setTimeout(() => {
              const inputs = document.querySelectorAll('input, textarea, select');
              console.log('🔧 Reactivando', inputs.length, 'inputs después de reset');
              
              inputs.forEach((input, index) => {
                if (input.disabled || input.readOnly) return;
                
                // Activación forzada
                setTimeout(() => {
                  input.focus();
                  setTimeout(() => input.blur(), 10);
                }, index * 10);
              });
              
              console.log('✅ Reset completo de Angular finalizado');
            }, 500);
            
          }, 100);
          
          return 'Angular reset completado';
          
        } catch (error) {
          console.error('Error en reset de Angular:', error);
          return 'Error en reset: ' + error.message;
        }
      })();
    `);
    
    return { 
      success: true, 
      message: 'Reset de Angular completado: ' + result 
    };
    
  } catch (error) {
    console.error('❌ Error en reset de Angular:', error);
    return { 
      success: false, 
      error: 'Error en reset: ' + (error.message || error) 
    };
  }
});