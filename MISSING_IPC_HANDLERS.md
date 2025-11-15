# 🚨 MANEJADORES IPC FALTANTES EN MAIN.JS

## ❌ PRODUCTOS (Frontend espera vs Backend tiene):
- ❌ `products:getAll` -> Tiene: `get-products` 
- ❌ `products:add` -> Tiene: `add-product`
- ❌ `products:update` -> Tiene: `update-product` 
- ❌ `products:delete` -> Tiene: `delete-product`
- ❌ `products:getByCode` -> NO TIENE
- ❌ `open-image-dialog` -> NO TIENE

## ❌ CATEGORÍAS:
- ❌ `categories:getAll` -> Tiene: `get-categories`
- ❌ `categories:add` -> Tiene: `add-category` 
- ❌ `categories:delete` -> Tiene: `delete-category`

## ❌ CLIENTES (NO TIENE NINGUNO):
- ❌ `clients:getAll` -> NO TIENE
- ❌ `clients:add` -> NO TIENE
- ❌ `clients:update` -> NO TIENE
- ❌ `clients:delete` -> NO TIENE
- ❌ `clients:searchByDocument` -> NO TIENE

## ❌ FACTURAS (NO TIENE NINGUNO):
- ❌ `invoices:getAll` -> NO TIENE
- ❌ `invoices:add` -> NO TIENE
- ❌ `invoices:updateStatus` -> NO TIENE
- ❌ `invoices:delete` -> NO TIENE

## ❌ VENTAS:
- ❌ `sales:getAll` -> Tiene: `get-sales`
- ❌ `sales:add` -> Tiene: `save-sale`

## ❌ DETALLE VENTAS (NO TIENE NINGUNO):
- ❌ `detailSales:getAll` -> NO TIENE
- ❌ `detailSales:add` -> NO TIENE

## ❌ IMPRESIÓN (NO TIENE NINGUNO):
- ❌ `print:ticket` -> Tiene: `print-receipt`
- ❌ `printers:getAll` -> NO TIENE
- ❌ `print:thermal` -> NO TIENE
- ❌ `print:normal` -> NO TIENE
- ❌ `print:dialog` -> NO TIENE
- ❌ `print:setThermalWidth` -> NO TIENE
- ❌ `print:testBasic` -> NO TIENE
- ❌ `print:thermalLegacy` -> NO TIENE

## ❌ PROCESAMIENTO DE PAGO (NO TIENE NINGUNO):
- ❌ `payment:process` -> NO TIENE

## ❌ WHATSAPP (NO TIENE NINGUNO):
- ❌ `whatsapp:sendInvoice` -> NO TIENE
- ❌ `whatsapp:sendReceipt` -> NO TIENE
- ❌ `whatsapp:getPreview` -> NO TIENE
- ❌ `whatsapp:sendInvoiceWithAttachment` -> NO TIENE
- ❌ `whatsapp:autoSendInvoice` -> NO TIENE
- ❌ `whatsapp:autoStatus` -> NO TIENE
- ❌ `whatsapp:clearAutoQr` -> NO TIENE

## ❌ FACTURACIÓN ELECTRÓNICA (NO TIENE NINGUNO):
- ❌ `invoice:generateElectronic` -> Tiene: `generate-invoice`

## ❌ ARCHIVOS (NO TIENE NINGUNO):
- ❌ `file:saveCopy` -> NO TIENE
- ❌ `file:saveText` -> NO TIENE

## ❌ REPORTES (NO TIENE NINGUNO):
- ❌ `reports:salesSummary` -> NO TIENE
- ❌ `reports:salesByRange` -> NO TIENE
- ❌ `reports:salesByProduct` -> NO TIENE
- ❌ `reports:salesByCategory` -> NO TIENE
- ❌ `reports:taxSummary` -> NO TIENE
- ❌ `reports:frequency` -> NO TIENE
- ❌ `reports:exportPdf` -> NO TIENE

## ✅ CONFIGURACIÓN (YA AGREGADOS):
- ✅ `config:getAll` -> YA TIENE
- ✅ `config:getCompany` -> YA TIENE  
- ✅ `config:getInvoicing` -> YA TIENE
- ✅ `config:getWhatsApp` -> YA TIENE
- ✅ `config:getPrinting` -> YA TIENE
- ✅ `config:getPayments` -> YA TIENE
- ✅ `config:updateCompany` -> YA TIENE
- ✅ `config:updateInvoicing` -> YA TIENE
- ✅ `config:updateWhatsApp` -> YA TIENE
- ✅ `config:togglePaymentMethod` -> YA TIENE
- ✅ `config:reset` -> YA TIENE
- ✅ `config:export` -> YA TIENE
- ✅ `config:import` -> YA TIENE

## ❌ LICENCIAS (NO TIENE NINGUNO):
- ❌ `license:validate` -> NO TIENE
- ❌ `license:getHardwareInfo` -> NO TIENE
- ❌ `license:install` -> NO TIENE
- ❌ `license:checkStatus` -> NO TIENE

## ❌ BACKUP (NO TIENE NINGUNO):
- ❌ `backup:create` -> Tiene: `backup-data`
- ❌ `backup:restore` -> Tiene: `restore-data`
- ❌ `backup:verify` -> NO TIENE
- ❌ `backup:getStats` -> NO TIENE

## 📊 RESUMEN:
- ✅ **Funcionan**: Solo configuración (13 manejadores)
- ❌ **NO Funcionan**: Productos, Clientes, Facturas, Ventas, Impresión, WhatsApp, Reportes, Licencias, Backup
- 🚨 **Total Faltantes**: ~50+ manejadores IPC

## ⚠️ IMPACTO:
Esto explica por qué:
- No se pueden guardar clientes ❌
- Los reportes no funcionan ❌  
- La impresión no funciona ❌
- WhatsApp no funciona ❌
- Muchas funciones del POS están rotas ❌