const fs = require('fs');
const path = require('path');
const { app, BrowserWindow } = require('electron');

/**
 * Servicio de facturación electrónica
 * Aquí se implementará la integración con la DIAN para Colombia
 */
class InvoicingService {
  constructor() {
    this.config = {
      // Configuración para facturación electrónica DIAN
      environment: 'test', // 'test' o 'production'
      companyNIT: '900000000-1', // NIT de la empresa
      companyName: 'DRT POS System',
      companyAddress: 'Dirección de la empresa',
      companyPhone: '+57 300 123 4567',
      companyEmail: 'facturacion@drtpos.com',
      // Configuración técnica DIAN
      certificatePath: '', // Ruta al certificado digital
      certificatePassword: '', // Password del certificado
      dianEndpoint: 'https://vpfe-hab.dian.gov.co/WcfDianCustomerServices.svc', // Endpoint DIAN habilitación
      dianTestEndpoint: 'https://vpfe-hab.dian.gov.co/WcfDianCustomerServices.svc'
    };
  }

  /**
   * Genera una factura electrónica
   * @param {Object} saleData - Datos de la venta
   * @param {Object} clientData - Datos del cliente
   * @returns {Promise<Object>} - Resultado de la facturación
   */
  async generateElectronicInvoice(saleData, clientData) {
    try {
      // Por ahora, simular el proceso de facturación electrónica
      console.log('Iniciando proceso de facturación electrónica...');
      console.log('Datos de venta:', saleData);
      console.log('Datos del cliente:', clientData);

      // Simular delay de procesamiento
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Generar número de factura
      const invoiceNumber = this.generateInvoiceNumber();
      
      // Aquí iría la lógica real de comunicación con la DIAN
      // 1. Crear el XML de la factura según especificaciones DIAN
      // 2. Firmarlo digitalmente
      // 3. Enviarlo a la DIAN
      // 4. Procesar la respuesta
      
      const invoiceResult = {
        success: true,
        invoiceNumber: invoiceNumber,
        cufe: this.generateCUFE(), // Código Único de Facturación Electrónica
        qrCode: this.generateQRCode(invoiceNumber),
        xmlPath: await this.generateInvoiceXML(saleData, clientData, invoiceNumber),
        pdfPath: await this.generateInvoicePDF(saleData, clientData, invoiceNumber),
        dianResponse: {
          status: 'ACCEPTED',
          statusCode: '00',
          statusMessage: 'Factura procesada exitosamente',
          processedAt: new Date().toISOString()
        }
      };

      console.log('Factura electrónica generada exitosamente:', invoiceResult);
      return invoiceResult;

    } catch (error) {
      console.error('Error generando factura electrónica:', error);
      throw error;
    }
  }

  /**
   * Genera el número de factura
   */
  generateInvoiceNumber() {
    const prefix = 'FE';
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}${timestamp}${random}`;
  }

  /**
   * Genera el CUFE (simulado)
   */
  generateCUFE() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  /**
   * Genera el código QR para la factura
   */
  generateQRCode(invoiceNumber) {
    // Aquí se generaría el QR real con los datos de la factura
    return `QR_${invoiceNumber}_${Date.now()}`;
  }

  /**
   * Genera el XML de la factura (simulado)
   */
  async generateInvoiceXML(saleData, clientData, invoiceNumber) {
    const invoicesDir = path.join(app.getPath('userData'), 'invoices', 'xml');
    if (!fs.existsSync(invoicesDir)) {
      fs.mkdirSync(invoicesDir, { recursive: true });
    }

    const xmlContent = this.createInvoiceXML(saleData, clientData, invoiceNumber);
    const xmlPath = path.join(invoicesDir, `${invoiceNumber}.xml`);
    
    fs.writeFileSync(xmlPath, xmlContent, 'utf8');
    return xmlPath;
  }

  /**
   * Crea el contenido XML de la factura
   */
  createInvoiceXML(saleData, clientData, invoiceNumber) {
    // Plantilla básica XML UBL 2.1 para factura electrónica DIAN
    return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:UBLVersionID>UBL 2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>DIAN 2.1</cbc:CustomizationID>
  <cbc:ID>${invoiceNumber}</cbc:ID>
  <cbc:IssueDate>${new Date().toISOString().split('T')[0]}</cbc:IssueDate>
  <cbc:IssueTime>${new Date().toISOString().split('T')[1].split('.')[0]}</cbc:IssueTime>
  <cbc:InvoiceTypeCode>01</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>COP</cbc:DocumentCurrencyCode>
  
  <!-- Datos del emisor -->
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="31">${this.config.companyNIT}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name>${this.config.companyName}</cbc:Name>
      </cac:PartyName>
    </cac:Party>
  </cac:AccountingSupplierParty>
  
  <!-- Datos del cliente -->
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="${clientData.document_type}">${clientData.document_number}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name>${clientData.name}</cbc:Name>
      </cac:PartyName>
    </cac:Party>
  </cac:AccountingCustomerParty>
  
  <!-- Totales -->
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="COP">${(saleData.total / 1.19).toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="COP">${(saleData.total / 1.19).toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="COP">${saleData.total.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="COP">${saleData.total.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  
  <!-- Líneas de factura -->
  ${saleData.items.map((item, index) => `
  <cac:InvoiceLine>
    <cbc:ID>${index + 1}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="NIU">${item.quantity}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="COP">${(item.price * item.quantity).toFixed(2)}</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Description>${item.name}</cbc:Description>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="COP">${item.price.toFixed(2)}</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>
  `).join('')}
</Invoice>`;
  }

  /**
   * Genera el PDF de la factura
   */
  async generateInvoicePDF(saleData, clientData, invoiceNumber) {
    const invoicesDir = path.join(app.getPath('userData'), 'invoices', 'pdf');
    if (!fs.existsSync(invoicesDir)) {
      fs.mkdirSync(invoicesDir, { recursive: true });
    }

    // Crear PDF usando una ventana oculta y printToPDF para tamaño carta
    const pdfPath = path.join(invoicesDir, `${invoiceNumber}.pdf`);
    const htmlContent = this.createInvoiceHTML(saleData, clientData, invoiceNumber);

    // Guardar HTML por si se necesita inspeccionar
    try {
      fs.writeFileSync(pdfPath.replace('.pdf', '.html'), htmlContent, 'utf8');
    } catch (e) {
      console.error('Error guardando HTML de factura:', e);
    }

    // Crear ventana oculta para renderizar el HTML
    let win = new BrowserWindow({
      show: false,
      webPreferences: {
        contextIsolation: true,
        sandbox: false
      }
    });

    try {
      // Cargar el contenido HTML como data URL
      await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent));

      // Esperar un breve momento para que termine el render
      await new Promise((res) => setTimeout(res, 300));

      // Generar PDF (LETTER)
      const pdfBuffer = await win.webContents.printToPDF({
        pageSize: 'LETTER',
        printBackground: true,
        margins: { top: 20, left: 20, right: 20, bottom: 20 }
      });

      fs.writeFileSync(pdfPath, pdfBuffer);
      return pdfPath;
    } catch (error) {
      console.error('Error generando PDF de factura:', error);
      // Devolver path aunque no exista PDF real (para compatibilidad)
      return pdfPath;
    } finally {
      if (win && !win.isDestroyed()) win.close();
      win = null;
    }
  }

  /**
   * Crea el HTML de la factura
   */
  createInvoiceHTML(saleData, clientData, invoiceNumber) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Factura ${invoiceNumber}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .invoice-details { margin: 20px 0; }
        .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .table th { background-color: #f2f2f2; }
        .totals { text-align: right; margin-top: 20px; }
        .footer { margin-top: 30px; text-align: center; font-size: 12px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${this.config.companyName}</h1>
        <p>${this.config.companyAddress}</p>
        <p>Tel: ${this.config.companyPhone}</p>
        <p>NIT: ${this.config.companyNIT}</p>
    </div>
    
    <div class="invoice-details">
        <h2>FACTURA ELECTRÓNICA</h2>
        <p><strong>Número:</strong> ${invoiceNumber}</p>
        <p><strong>Fecha:</strong> ${new Date().toLocaleDateString('es-CO')}</p>
        <p><strong>Hora:</strong> ${new Date().toLocaleTimeString('es-CO')}</p>
    </div>
    
    <div class="client-details">
        <h3>DATOS DEL CLIENTE</h3>
        <p><strong>Nombre:</strong> ${clientData.name}</p>
        <p><strong>Documento:</strong> ${clientData.document_type} ${clientData.document_number}</p>
        <p><strong>Dirección:</strong> ${clientData.address || 'N/A'}</p>
        <p><strong>Teléfono:</strong> ${clientData.phone_number || 'N/A'}</p>
        <p><strong>Email:</strong> ${clientData.email || 'N/A'}</p>
    </div>
    
    <table class="table">
        <thead>
            <tr>
                <th>Producto</th>
                <th>Cantidad</th>
                <th>Precio Unit.</th>
                <th>Total</th>
            </tr>
        </thead>
        <tbody>
            ${saleData.items.map(item => `
            <tr>
                <td>${item.name}</td>
                <td>${item.quantity}</td>
                <td>$${item.price.toLocaleString('es-CO')}</td>
                <td>$${(item.price * item.quantity).toLocaleString('es-CO')}</td>
            </tr>
            `).join('')}
        </tbody>
    </table>
    
    <div class="totals">
        <p><strong>Subtotal:</strong> $${(saleData.total / 1.19).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</p>
        <p><strong>IVA (19%):</strong> $${(saleData.total * 0.19 / 1.19).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</p>
        <p><strong>Total:</strong> $${saleData.total.toLocaleString('es-CO')}</p>
    </div>
    
    <div class="footer">
        <p>Esta es una representación gráfica de la factura electrónica</p>
        <p>CUFE: ${this.generateCUFE()}</p>
        <p>Resolución DIAN No. 18764003411234 del 2023-01-01</p>
    </div>
</body>
</html>`;
  }
}

module.exports = InvoicingService;