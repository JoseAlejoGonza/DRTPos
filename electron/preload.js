const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Productos
  getProducts: () => ipcRenderer.invoke('products:getAll'),
  addProduct: (p) => ipcRenderer.invoke('products:add', p),
  updateProduct: (p) => ipcRenderer.invoke('products:update', p),
  deleteProduct: (id) => ipcRenderer.invoke('products:delete', id),
  openImageDialog: () => ipcRenderer.invoke('open-image-dialog'),

  // Categorías
  getCategories: () => ipcRenderer.invoke('categories:getAll'),
  addCategory: (name) => ipcRenderer.invoke('categories:add', name),
  deleteCategory: (id) => ipcRenderer.invoke('categories:delete', id),


  // Clientes
  getClients: () => ipcRenderer.invoke('clients:getAll'),
  addClient: (c) => ipcRenderer.invoke('clients:add', c),
  updateClient: (c) => ipcRenderer.invoke('clients:update', c),
  deleteClient: (id) => ipcRenderer.invoke('clients:delete', id),

  // Facturas
  getInvoices: () => ipcRenderer.invoke('invoices:getAll'),
  addInvoice: (i) => ipcRenderer.invoke('invoices:add', i),
  updateInvoiceStatus: (id, status) => ipcRenderer.invoke('invoices:updateStatus', {id, status}),
  deleteInvoice: (id) => ipcRenderer.invoke('invoices:delete', id),

  // Ventas
  getSales: () => ipcRenderer.invoke('sales:getAll'),
  addSale: (s) => ipcRenderer.invoke('sales:add', s),

  // Detalle de ventas
  getDetailSales: () => ipcRenderer.invoke('detailSales:getAll'),
  addDetailSale: (d) => ipcRenderer.invoke('detailSales:add', d),

  // Imprimir
  printTicket: (sale) => ipcRenderer.invoke('print:ticket', sale)
});