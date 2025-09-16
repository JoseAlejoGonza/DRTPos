const { app, BrowserWindow, ipcMain } = require('electron');
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
      nodeIntegration: false
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
  return db.prepare('SELECT * FROM products').all();
});
ipcMain.handle('products:add', (e, p) => {
  const stmt = db.prepare('INSERT INTO products (code,name,price,stock) VALUES (?,?,?,?)');
  const info = stmt.run(p.code, p.name, p.price, p.stock);
  return info.lastInsertRowid;
});
ipcMain.handle('products:update', (e, p) => {
  const stmt = db.prepare('UPDATE products SET code=?, name=?, price=?, stock=? WHERE id=?');
  return stmt.run(p.code, p.name, p.price, p.stock, p.id);
});
ipcMain.handle('products:delete', (e, id) => {
  return db.prepare('DELETE FROM products WHERE id=?').run(id);
});

// SALES
ipcMain.handle('sale:create', (e, sale) => {
  const stmt = db.prepare('INSERT INTO sales (date, total, payload) VALUES (?, ?, ?)');
  const info = stmt.run(new Date().toISOString(), sale.total, JSON.stringify(sale));
  return info.lastInsertRowid;
});
ipcMain.handle('sale:get', (e, {from,to}) => {
  return db.prepare('SELECT * FROM sales WHERE date BETWEEN ? AND ?').all(from, to);
});