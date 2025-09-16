const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Productos
  getProducts: () => ipcRenderer.invoke('products:getAll'),
  addProduct: (p) => ipcRenderer.invoke('products:add', p),
  updateProduct: (p) => ipcRenderer.invoke('products:update', p),
  deleteProduct: (id) => ipcRenderer.invoke('products:delete', id),

  // Ventas
  createSale: (sale) => ipcRenderer.invoke('sale:create', sale),
  getSales: (from, to) => ipcRenderer.invoke('sale:get', { from, to }),

  // Imprimir
  printTicket: (sale) => ipcRenderer.invoke('print:ticket', sale)
});