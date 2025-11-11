const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Productos
  getProducts: () => ipcRenderer.invoke('products:getAll'),
  addProduct: (p) => ipcRenderer.invoke('products:add', p),
  updateProduct: (p) => ipcRenderer.invoke('products:update', p),
  deleteProduct: (id) => ipcRenderer.invoke('products:delete', id),
  getProductByCode: (code) => ipcRenderer.invoke('products:getByCode', code),
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
  searchClientByDocument: (documentType, documentNumber) => ipcRenderer.invoke('clients:searchByDocument', {documentType, documentNumber}),

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
  printTicket: (sale) => ipcRenderer.invoke('print:ticket', sale),

  // Procesamiento completo de pago
  processPayment: (paymentData) => ipcRenderer.invoke('payment:process', paymentData),

  // Impresión
  getAvailablePrinters: () => ipcRenderer.invoke('printers:getAll'),
  printThermal: (data) => ipcRenderer.invoke('print:thermal', data),
  printNormal: (data) => ipcRenderer.invoke('print:normal', data),
  showPrintDialog: (data) => ipcRenderer.invoke('print:dialog', data),
  setThermalPaperWidth: (width) => ipcRenderer.invoke('print:setThermalWidth', width),
  testBasicPrint: (printerName) => ipcRenderer.invoke('print:testBasic', printerName),
  printThermalLegacy: (data) => ipcRenderer.invoke('print:thermalLegacy', data),

  // WhatsApp
  sendWhatsAppInvoice: (data) => ipcRenderer.invoke('whatsapp:sendInvoice', data),
  sendWhatsAppReceipt: (data) => ipcRenderer.invoke('whatsapp:sendReceipt', data),
  getWhatsAppPreview: (data) => ipcRenderer.invoke('whatsapp:getPreview', data),
  sendWhatsAppInvoiceWithAttachment: (data) => ipcRenderer.invoke('whatsapp:sendInvoiceWithAttachment', data),
  autoSendWhatsAppInvoice: (data) => ipcRenderer.invoke('whatsapp:autoSendInvoice', data),
  getWhatsAppAutoStatus: () => ipcRenderer.invoke('whatsapp:autoStatus'),
  clearWhatsAppAutoQr: () => ipcRenderer.invoke('whatsapp:clearAutoQr'),

  // Facturación electrónica
  generateElectronicInvoice: (data) => ipcRenderer.invoke('invoice:generateElectronic', data),

  // Archivos
  saveFileCopy: (filePath) => ipcRenderer.invoke('file:saveCopy', filePath),
  saveTextFile: (defaultName, content, filters) => ipcRenderer.invoke('file:saveText', { defaultName, content, filters }),

  // Reports
  getReportSalesSummary: (from, to) => ipcRenderer.invoke('reports:salesSummary', { from, to }),
  getSalesByRange: (from, to, granularity) => ipcRenderer.invoke('reports:salesByRange', { from, to, granularity }),
  getSalesByProduct: (from, to) => ipcRenderer.invoke('reports:salesByProduct', { from, to }),
  getSalesByCategory: (from, to) => ipcRenderer.invoke('reports:salesByCategory', { from, to }),
  getTaxSummary: (from, to) => ipcRenderer.invoke('reports:taxSummary', { from, to }),
  getFrequency: (from, to) => ipcRenderer.invoke('reports:frequency', { from, to }),
  exportReportPdf: (html, defaultName) => ipcRenderer.invoke('reports:exportPdf', { html, defaultName }),

  // Configuración
  getConfig: () => ipcRenderer.invoke('config:getAll'),
  getCompanyConfig: () => ipcRenderer.invoke('config:getCompany'),
  getInvoicingConfig: () => ipcRenderer.invoke('config:getInvoicing'),
  getWhatsAppConfig: () => ipcRenderer.invoke('config:getWhatsApp'),
  getPrintingConfig: () => ipcRenderer.invoke('config:getPrinting'),
  getPaymentConfig: () => ipcRenderer.invoke('config:getPayments'),
  updateCompanyConfig: (data) => ipcRenderer.invoke('config:updateCompany', data),
  updateInvoicingConfig: (data) => ipcRenderer.invoke('config:updateInvoicing', data),
  updateWhatsAppConfig: (data) => ipcRenderer.invoke('config:updateWhatsApp', data),
  togglePaymentMethod: (methodId, enabled) => ipcRenderer.invoke('config:togglePaymentMethod', { methodId, enabled }),
  resetConfig: () => ipcRenderer.invoke('config:reset'),
  exportConfig: () => ipcRenderer.invoke('config:export'),
  importConfig: (configJson) => ipcRenderer.invoke('config:import', configJson)
});