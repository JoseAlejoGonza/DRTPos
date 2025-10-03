const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const db = require('./db');
const isDev = !!process.env.ELECTRON_START_URL;
let mainWindow;

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

  console.log(isDev, 'esto es isDev');

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
ipcMain.handle('products:update', (e, p) => {
  // Actualizar producto incluyendo categoría
  const stmt = db.db.prepare('UPDATE products SET code=?, name=?, price=?, stock=?, category_id=? WHERE id=?');
  return stmt.run(p.code, p.name, p.price, p.stock, p.category_id, p.id);
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