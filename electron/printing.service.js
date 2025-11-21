const { BrowserWindow, app } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const printer = require('node-printer');

/**
 * Servicio de impresión para POS
 * Maneja impresión en impresoras normales y térmicas
 */
class PrintingService {
  constructor() {
    this.printerConfig = {
      thermal: {
        enabled: true,
        paperWidth: 80, // 80mm por defecto
        availableWidths: [58, 60, 80], // Anchos disponibles
        charactersPerLine: {
          58: 32,
          60: 35,
          80: 48
        }
      },
      normal: {
        enabled: true,
        defaultFormat: 'A4'
      }
    };
  }

  /**
   * Obtiene las impresoras disponibles
   */
  async getAvailablePrinters() {
    try {
      const mainWindow = BrowserWindow.getFocusedWindow();
      if (!mainWindow) {
        throw new Error('No hay ventana activa');
      }

      console.log('Obteniendo lista de impresoras desde Electron...');
      const printers = await mainWindow.webContents.getPrintersAsync();
      console.log('Impresoras detectadas por Electron:', printers.map(p => ({
        name: p.name,
        status: p.status,
        isDefault: p.isDefault,
        description: p.description
      })));
      
      // Clasificar impresoras con criterios más amplios
      const thermalKeywords = ['thermal', 'pos', 'receipt', 'ticket', 'tm', 'rp', 'ep', '58mm', '80mm', 'bixolon', 'epson', 'star'];
      
      const thermalPrinters = printers.filter(printer => {
        const printerNameLower = printer.name.toLowerCase();
        const printerDescLower = (printer.description || '').toLowerCase();
        
        return thermalKeywords.some(keyword => 
          printerNameLower.includes(keyword) || printerDescLower.includes(keyword)
        );
      });

      const normalPrinters = printers.filter(printer => 
        !thermalPrinters.includes(printer)
      );

      console.log('Clasificación de impresoras:');
      console.log('- Térmicas:', thermalPrinters.map(p => p.name));
      console.log('- Normales:', normalPrinters.map(p => p.name));

      return {
        thermal: thermalPrinters,
        normal: normalPrinters,
        all: printers
      };
    } catch (error) {
      console.error('Error obteniendo impresoras:', error);
      return { thermal: [], normal: [], all: [] };
    }
  }

  /**
   * Configura el ancho de papel para impresora térmica
   */
  setThermalPaperWidth(width) {
    if (this.printerConfig.thermal.availableWidths.includes(width)) {
      this.printerConfig.thermal.paperWidth = width;
      return true;
    }
    return false;
  }

  /**
   * Genera ticket térmico para venta
   */
  generateThermalTicket(saleData, clientData, invoiceData, paymentMethod) {
    const width = this.printerConfig.thermal.paperWidth;
    const charsPerLine = this.printerConfig.thermal.charactersPerLine[width];
    
    let ticket = '';
    
    // Función para centrar texto
    const centerText = (text) => {
      const padding = Math.max(0, Math.floor((charsPerLine - text.length) / 2));
      return ' '.repeat(padding) + text;
    };
    
    // Función para justificar texto (izquierda-derecha)
    const justifyText = (left, right) => {
      const availableSpace = charsPerLine - left.length - right.length;
      const spaces = Math.max(1, availableSpace);
      return left + ' '.repeat(spaces) + right;
    };
    
    // Línea de separación
    const separator = '='.repeat(charsPerLine);
    const thinSeparator = '-'.repeat(charsPerLine);
    
    // Encabezado
    ticket += centerText('DRT POS SYSTEM') + '\n';
    ticket += centerText('NIT: 900000000-1') + '\n';
    ticket += centerText('Tel: +57 300 123 4567') + '\n';
    ticket += separator + '\n';
    
    // Información de la venta
    ticket += centerText('TICKET DE VENTA') + '\n';
    if (invoiceData && invoiceData.requiresInvoice) {
      ticket += centerText('FACTURA ELECTRONICA') + '\n';
      ticket += `Factura: ${invoiceData.invoiceNumber}\n`;
    }
    ticket += `Fecha: ${new Date().toLocaleDateString('es-CO')}\n`;
    ticket += `Hora: ${new Date().toLocaleTimeString('es-CO')}\n`;
    ticket += thinSeparator + '\n';
    
    // Datos del cliente (si hay factura)
    if (clientData && invoiceData && invoiceData.requiresInvoice) {
      ticket += 'CLIENTE:\n';
      ticket += `${clientData.name}\n`;
      ticket += `${clientData.document_type}: ${clientData.document_number}\n`;
      if (clientData.phone_number) {
        ticket += `Tel: ${clientData.phone_number}\n`;
      }
      ticket += thinSeparator + '\n';
    }
    
    // Productos
    ticket += 'PRODUCTOS:\n';
    saleData.items.forEach(item => {
      const productLine = `${item.name.substring(0, charsPerLine - 10)}`;
      ticket += productLine + '\n';
      
      // Usar precio real cobrado (con descuento aplicado) si está disponible
      const realPrice = item.real_price || item.price;
      const qtyPrice = `${item.quantity} x $${realPrice.toLocaleString('es-CO')}`;
      const total = `$${(realPrice * item.quantity).toLocaleString('es-CO')}`;
      ticket += justifyText(qtyPrice, total) + '\n';
    });
    
    ticket += separator + '\n';
    
    // Totales
    // Usar total real cobrado (con descuento aplicado)
    const totalReal = saleData.total_with_discount || saleData.total;
    const subtotal = totalReal / 1.19;
    const iva = totalReal - subtotal;
    
    ticket += justifyText('Subtotal:', `$${subtotal.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`) + '\n';
    ticket += justifyText('IVA (19%):', `$${iva.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`) + '\n';
    
    // Mostrar descuento si existe
    if (saleData.discount && saleData.discount > 0) {
      ticket += justifyText('Descuento:', `-$${saleData.discount.toLocaleString('es-CO')}`) + '\n';
    }
    
    ticket += justifyText('TOTAL:', `$${totalReal.toLocaleString('es-CO')}`) + '\n';
    
    ticket += separator + '\n';
    
    // Método de pago
    ticket += `Pago: ${paymentMethod}\n`;
    
    // Información adicional
    if (invoiceData && invoiceData.requiresInvoice) {
      ticket += thinSeparator + '\n';
      ticket += centerText('FACTURA ELECTRONICA') + '\n';
      ticket += `CUFE: ${invoiceData.cufe ? invoiceData.cufe.substring(0, 20) + '...' : 'N/A'}\n`;
      ticket += centerText('Resolucion DIAN No.') + '\n';
      ticket += centerText('18764003411234 del 2023-01-01') + '\n';
    }
    
    ticket += thinSeparator + '\n';
    ticket += centerText('¡Gracias por su compra!') + '\n';
    ticket += centerText('www.drtpos.com') + '\n';
    ticket += '\n\n\n'; // Espacios para corte
    
    return ticket;
  }

  /**
   * Genera HTML para impresión normal
   */
  generateNormalPrintHTML(saleData, clientData, invoiceData, paymentMethod) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Comprobante de Venta</title>
    <style>
        @media print {
            @page {
                margin: 10mm;
                size: A4;
            }
            body {
                margin: 0;
                font-family: 'Courier New', monospace;
            }
        }
        body {
            font-family: 'Courier New', monospace;
            margin: 20px;
            font-size: 12px;
        }
        .header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
        }
        .company-name {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .invoice-info {
            margin: 15px 0;
            border: 1px solid #000;
            padding: 10px;
        }
        .client-info {
            margin: 15px 0;
            border: 1px solid #000;
            padding: 10px;
        }
        .products-table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
        }
        .products-table th,
        .products-table td {
            border: 1px solid #000;
            padding: 5px;
            text-align: left;
        }
        .products-table th {
            background-color: #f0f0f0;
            font-weight: bold;
        }
        .totals {
            margin-top: 20px;
            border-top: 2px solid #000;
            padding-top: 10px;
        }
        .total-line {
            display: flex;
            justify-content: space-between;
            margin: 3px 0;
        }
        .total-final {
            font-weight: bold;
            font-size: 14px;
            border-top: 1px solid #000;
            margin-top: 5px;
            padding-top: 5px;
        }
        .footer {
            margin-top: 30px;
            text-align: center;
            border-top: 1px solid #000;
            padding-top: 10px;
            font-size: 10px;
        }
        .payment-method {
            margin: 15px 0;
            padding: 10px;
            border: 1px solid #000;
            background-color: #f9f9f9;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="company-name">DRT POS SYSTEM</div>
        <div>NIT: 900000000-1</div>
        <div>Tel: +57 300 123 4567</div>
        <div>Email: ventas@drtpos.com</div>
    </div>
    
    <div class="invoice-info">
        <h3>${invoiceData && invoiceData.requiresInvoice ? 'FACTURA ELECTRÓNICA' : 'COMPROBANTE DE VENTA'}</h3>
        ${invoiceData && invoiceData.requiresInvoice ? `<p><strong>Número de Factura:</strong> ${invoiceData.invoiceNumber}</p>` : ''}
        <p><strong>Fecha:</strong> ${new Date().toLocaleDateString('es-CO')}</p>
        <p><strong>Hora:</strong> ${new Date().toLocaleTimeString('es-CO')}</p>
    </div>
    
    ${clientData && invoiceData && invoiceData.requiresInvoice ? `
    <div class="client-info">
        <h4>DATOS DEL CLIENTE</h4>
        <p><strong>Nombre:</strong> ${clientData.name}</p>
        <p><strong>Documento:</strong> ${clientData.document_type} ${clientData.document_number}</p>
        <p><strong>Dirección:</strong> ${clientData.address || 'N/A'}</p>
        <p><strong>Teléfono:</strong> ${clientData.phone_number || 'N/A'}</p>
        <p><strong>Email:</strong> ${clientData.email || 'N/A'}</p>
    </div>
    ` : ''}
    
    <table class="products-table">
        <thead>
            <tr>
                <th>Producto</th>
                <th>Cantidad</th>
                <th>Precio Unit.</th>
                <th>Total</th>
            </tr>
        </thead>
        <tbody>
            ${saleData.items.map(item => {
                const realPrice = item.real_price || item.price;
                return `
            <tr>
                <td>${item.name}</td>
                <td>${item.quantity}</td>
                <td>$${realPrice.toLocaleString('es-CO')}</td>
                <td>$${(realPrice * item.quantity).toLocaleString('es-CO')}</td>
            </tr>
            `;
            }).join('')}
        </tbody>
    </table>
    
    <div class="totals">
        ${saleData.original_total && saleData.original_total !== saleData.total ? `
        <div class="total-line">
            <span>Subtotal Original:</span>
            <span>$${(saleData.original_total / 1.19).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</span>
        </div>
        <div class="total-line">
            <span>Descuento Aplicado:</span>
            <span>-$${saleData.discount.toLocaleString('es-CO')}</span>
        </div>
        ` : ''}
        <div class="total-line">
            <span>Subtotal:</span>
            <span>$${((saleData.total_with_discount || saleData.total) / 1.19).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</span>
        </div>
        <div class="total-line">
            <span>IVA (19%):</span>
            <span>$${(((saleData.total_with_discount || saleData.total) * 0.19) / 1.19).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</span>
        </div>
        <div class="total-line total-final">
            <span>TOTAL A PAGAR:</span>
            <span>$${(saleData.total_with_discount || saleData.total).toLocaleString('es-CO')}</span>
        </div>
    </div>
    
    <div class="payment-method">
        <h4>MÉTODO DE PAGO</h4>
        <p>${paymentMethod}</p>
    </div>
    
    ${invoiceData && invoiceData.requiresInvoice ? `
    <div class="footer">
        <p><strong>INFORMACIÓN DE FACTURACIÓN ELECTRÓNICA</strong></p>
        <p>CUFE: ${invoiceData.cufe || 'N/A'}</p>
        <p>Esta es una representación gráfica de la factura electrónica</p>
        <p>Resolución DIAN No. 18764003411234 del 2023-01-01</p>
        <p>Autorizada su numeración del 1 al 50000000</p>
    </div>
    ` : `
    <div class="footer">
        <p>¡Gracias por su compra!</p>
        <p>www.drtpos.com</p>
        <p>Este documento no constituye factura para efectos tributarios</p>
    </div>
    `}
</body>
</html>`;
  }

  /**
   * Imprime en impresora térmica
   */
  async printThermal(saleData, clientData, invoiceData, paymentMethod, printerName) {
    try {
      console.log('🖨️ INICIANDO IMPRESIÓN TÉRMICA');
      console.log('Impresora seleccionada:', printerName);
      console.log('Datos de venta:', saleData);
      console.log('Ancho de papel configurado:', this.printerConfig.thermal.paperWidth + 'mm');

      // Verificar que la impresora existe
      const availablePrinters = await this.getAvailablePrinters();
      const targetPrinter = availablePrinters.all.find(p => p.name === printerName);
      
      if (!targetPrinter) {
        throw new Error(`Impresora "${printerName}" no encontrada. Impresoras disponibles: ${availablePrinters.all.map(p => p.name).join(', ')}`);
      }

      console.log('✓ Impresora encontrada:', {
        name: targetPrinter.name,
        status: targetPrinter.status,
        isDefault: targetPrinter.isDefault,
        description: targetPrinter.description
      });

      const ticketContent = this.generateThermalTicket(saleData, clientData, invoiceData, paymentMethod);
      console.log('✓ Contenido del ticket generado:', ticketContent.substring(0, 200) + '...');
      
      // Crear ventana invisible para impresión
      console.log('📄 Creando ventana de impresión...');
      const printWindow = new BrowserWindow({
        width: 300,
        height: 600,
        show: false, // Cambiar a true para debug visual
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      });

      // Crear HTML para la impresión térmica
      const thermalHTML = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Ticket Térmico</title>
    <style>
        @media print {
            @page { 
                margin: 0; 
                size: ${this.printerConfig.thermal.paperWidth}mm auto;
            }
            body {
                margin: 0;
                padding: 2mm;
            }
        }
        @media screen {
            body {
                width: ${this.printerConfig.thermal.paperWidth}mm;
                margin: 10px auto;
                padding: 5mm;
                border: 1px solid #ccc;
            }
        }
        body { 
            font-family: 'Courier New', 'Consolas', monospace; 
            font-size: 10px; 
            line-height: 1.2;
            white-space: pre-line;
            color: black;
        }
    </style>
</head>
<body>${ticketContent}</body>
</html>`;

      console.log('🌐 Cargando contenido HTML...');
      await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(thermalHTML)}`);
      
      // Esperar a que la página se cargue completamente
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const options = {
        silent: true,
        printBackground: false,
        deviceName: printerName,
        color: false,
        margins: {
          marginType: 'none'
        },
        landscape: false,
        scaleFactor: 100
      };

      console.log('🖨️ Enviando a impresora con opciones:', options);
      
      const printResult = await printWindow.webContents.print(options);
      console.log('📋 Resultado de impresión:', printResult);
      
      printWindow.close();
      
      console.log('✅ IMPRESIÓN TÉRMICA COMPLETADA EXITOSAMENTE');
      return { 
        success: true, 
        message: `Impresión térmica enviada a ${printerName}`,
        printerUsed: printerName,
        paperWidth: this.printerConfig.thermal.paperWidth
      };
      
    } catch (error) {
      console.error('❌ ERROR EN IMPRESIÓN TÉRMICA:', error);
      console.error('Stack trace:', error.stack);
      throw new Error(`Error en impresión térmica: ${error.message}`);
    }
  }

  /**
   * Imprime en impresora normal
   */
  async printNormal(saleData, clientData, invoiceData, paymentMethod, printerName) {
    try {
      const printWindow = new BrowserWindow({
        width: 800,
        height: 600,
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      });

      const htmlContent = this.generateNormalPrintHTML(saleData, clientData, invoiceData, paymentMethod);
      await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
      
      const options = {
        silent: true,
        printBackground: true,
        deviceName: printerName
      };

      await printWindow.webContents.print(options);
      printWindow.close();
      
      return { success: true, message: 'Impresión normal completada' };
    } catch (error) {
      console.error('Error en impresión normal:', error);
      throw error;
    }
  }

  /**
   * Prueba básica de impresión (solo texto simple)
   */
  async testBasicPrint(printerName) {
    try {
      console.log('🧪 PRUEBA BÁSICA DE IMPRESIÓN');
      console.log('Impresora:', printerName);

      const printWindow = new BrowserWindow({
        width: 400,
        height: 300,
        show: true, // Mostrar para debug
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      });

      const basicHTML = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Prueba Básica</title>
    <style>
        @media print {
            @page { 
                margin: 5mm; 
                size: 80mm auto;
            }
        }
        body { 
            font-family: 'Courier New', monospace; 
            font-size: 12px; 
            margin: 0;
            padding: 5px;
        }
        .center { text-align: center; }
        .bold { font-weight: bold; }
    </style>
</head>
<body>
    <div class="center bold">PRUEBA DE IMPRESIÓN</div>
    <div class="center">DRT POS System</div>
    <div>================================</div>
    <div>Fecha: ${new Date().toLocaleDateString()}</div>
    <div>Hora: ${new Date().toLocaleTimeString()}</div>
    <div>Impresora: ${printerName}</div>
    <div>================================</div>
    <div class="center">Si ve este texto, la</div>
    <div class="center">impresión está funcionando</div>
    <div>================================</div>
    <br><br><br>
</body>
</html>`;

      await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(basicHTML)}`);
      
      // Esperar un momento para que se cargue
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const options = {
        silent: false, // Mostrar diálogo para debug
        printBackground: true,
        deviceName: printerName
      };

      console.log('Enviando prueba básica con opciones:', options);
      const result = await printWindow.webContents.print(options);
      
      // No cerrar inmediatamente para debug
      setTimeout(() => printWindow.close(), 5000);
      
      return { success: true, message: 'Prueba básica enviada', result };
    } catch (error) {
      console.error('Error en prueba básica:', error);
      throw error;
    }
  }

  /**
   * Función para ejecutar comandos de forma asincrónica (basada en tu código exitoso)
   */
  executeCommand(command) {
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error ejecutando comando: ${command}`, error);
          reject(error);
        } else {
          console.log(`Comando ejecutado exitosamente: ${command}`);
          resolve(stdout);
        }
      });
    });
  }

  /**
   * Método directo mejorado para corte y apertura de cajón
   */
  async executeDirectPrinterCommands(printerName, tempDir) {
    console.log('🔧 Ejecutando comandos ESC/POS con método directo mejorado...');
    
    // Crear comandos básicos que funcionan con la mayoría de impresoras POS
    const commands = {
      // Comando para avanzar papel (ayuda a completar la impresión)
      advance: Buffer.from([0x1B, 0x64, 0x05]), // ESC d 5 (avanzar 5 líneas)
      // Comando de corte total estándar
      cut: Buffer.from([0x1D, 0x56, 0x00]), // GS V 0
      // Comando alternativo de corte parcial
      cutPartial: Buffer.from([0x1D, 0x56, 0x01]), // GS V 1
      // Comando para abrir cajón - estándar
      drawer1: Buffer.from([0x1B, 0x70, 0x00, 0x19, 0x19]), // ESC p 0 25 25
      // Comando alternativo para cajón
      drawer2: Buffer.from([0x1B, 0x70, 0x00, 0x40, 0x40])  // ESC p 0 64 64
    };
    
    let success = false;
    let operations = [];
    
    // 1. Primero avanzar papel para completar impresión
    try {
      console.log('📄 Avanzando papel para completar impresión...');
      const advanceFile = path.join(tempDir, 'advance.bin');
      fs.writeFileSync(advanceFile, commands.advance);
      await this.executeCommand(`copy /B "${advanceFile}" "\\\\localhost\\${printerName}"`);
      operations.push('✓ Papel avanzado');
    } catch (error) {
      console.warn('⚠️ Error avanzando papel:', error.message);
    }
    
    // 2. Intentar abrir cajón con comandos estándar
    for (const [name, cmd] of Object.entries({ drawer1: commands.drawer1, drawer2: commands.drawer2 })) {
      try {
        console.log(`💼 Intentando abrir cajón con ${name}...`);
        const drawerFile = path.join(tempDir, `${name}.bin`);
        fs.writeFileSync(drawerFile, cmd);
        await this.executeCommand(`copy /B "${drawerFile}" "\\\\localhost\\${printerName}"`);
        operations.push('✓ Cajón abierto');
        success = true;
        break;
      } catch (error) {
        console.warn(`⚠️ Error con ${name}:`, error.message);
      }
    }
    
    // 3. Intentar cortar papel
    for (const [name, cmd] of Object.entries({ cut: commands.cut, cutPartial: commands.cutPartial })) {
      try {
        console.log(`✂️ Intentando cortar papel con ${name}...`);
        const cutFile = path.join(tempDir, `${name}.bin`);
        fs.writeFileSync(cutFile, cmd);
        await this.executeCommand(`copy /B "${cutFile}" "\\\\localhost\\${printerName}"`);
        operations.push('✓ Papel cortado');
        success = true;
        break;
      } catch (error) {
        console.warn(`⚠️ Error con ${name}:`, error.message);
      }
    }
    
    if (!success && operations.length === 0) {
      throw new Error('No se pudieron ejecutar comandos ESC/POS con método directo');
    }
    
    return {
      success: true,
      operations: operations,
      message: `Operaciones completadas: ${operations.join(', ')}`
    };
  }

  /**
   * Ejecuta comandos avanzados usando node-printer (método RAW recomendado)
   */
  async executeAdvancedPrinterCommandsRAW(printerName) {
    console.log('🔧 Ejecutando comandos ESC/POS con node-printer (RAW)...');
    
    try {
      // 1. Comando de Inicialización (opcional, pero buena práctica)
      const initialize = Buffer.from([0x1B, 0x40]); // ESC @
      
      // 2. Comando para abrir el cajón (ESC p 0 25 250)
      const openDrawer = Buffer.from([0x1B, 0x70, 0x00, 0x19, 0xFA]); // [27, 112, 0, 25, 250]
      
      // 3. Comando para Corte Total (GS V 0)
      const fullCut = Buffer.from([0x1D, 0x56, 0x00]); // [29, 86, 0]
      
      // 4. Combinar todos los comandos
      const commands = Buffer.concat([initialize, openDrawer, fullCut]);
      
      // 5. Enviar el buffer de comandos a la impresora
      return new Promise((resolve, reject) => {
        printer.printDirect({
          data: commands,
          printer: printerName, // El nombre de la impresora que ya tienes
          type: 'RAW', // **Importante:** Envía los datos sin procesamiento del driver
          success: (jobId) => {
            console.log(`✅ Comandos de corte/cajón enviados exitosamente (Job ID: ${jobId})`);
            resolve({
              success: true,
              jobId: jobId,
              operations: ['✓ Cajón abierto', '✓ Corte de papel'],
              message: 'Operaciones completadas: Cajón abierto, Corte de papel'
            });
          },
          error: (err) => {
            console.error("❌ Error al enviar comandos avanzados:", err);
            reject(new Error(`Error en node-printer: ${err.message || err}`));
          }
        });
      });
      
    } catch (error) {
      console.error('❌ Error preparando comandos ESC/POS:', error);
      throw new Error(`Error preparando comandos: ${error.message}`);
    }
  }

  /**
   * Ejecuta comandos avanzados de impresora con soporte para múltiples tipos (método legacy)
   */
  async executeAdvancedPrinterCommands(printerName, tempDir) {
    const printerNameLower = printerName.toLowerCase();
    
    // Detectar tipo de impresora y usar comandos específicos
    let cutCommands, drawerCommands;
    
    if (printerNameLower.includes('pos-80') || printerNameLower.includes('pos80')) {
      console.log('🔧 Detectada impresora POS-80 - Usando comandos específicos');
      // Comandos específicos para POS-80
      cutCommands = [
        // Comandos alternativos para POS-80
        { name: 'corte_pos80_1', buffer: Buffer.from([0x1B, 0x6D]) }, // ESC m
        { name: 'corte_pos80_2', buffer: Buffer.from([0x1D, 0x56, 0x41, 0x10]) }, // GS V A
        { name: 'corte_pos80_3', buffer: Buffer.from([0x1B, 0x69]) }, // ESC i
        { name: 'corte_pos80_4', buffer: Buffer.from([0x0C]) }, // Form Feed
        { name: 'corte_pos80_5', buffer: Buffer.from([0x1D, 0x56, 0x30]) }, // GS V 0
        { name: 'avance_papel', buffer: Buffer.from([0x1B, 0x64, 0x05]) }
      ];
      
      drawerCommands = [
        // Comandos específicos para cajón POS-80
        { name: 'cajon_pos80_1', buffer: Buffer.from([0x1B, 0x70, 0x00, 0x32, 0x32]) },
        { name: 'cajon_pos80_2', buffer: Buffer.from([0x1B, 0x70, 0x01, 0x32, 0x32]) },
        { name: 'cajon_pos80_3', buffer: Buffer.from([0x10, 0x14, 0x01, 0x00, 0x05]) },
        { name: 'cajon_pos80_4', buffer: Buffer.from([0x1B, 0x70, 0x00, 0x19, 0x19]) }
      ];
      
    } else if (printerNameLower.includes('xpos') || printerNameLower.includes('t82')) {
      console.log('🔧 Detectada impresora XPos T82E - Usando comandos específicos');
      // Comandos alternativos para XPos T82E
      cutCommands = [
        // Comando de corte estándar ESC/POS
        { name: 'corte_estandar', buffer: Buffer.from([0x1D, 0x56, 0x00]) },
        // Comando de corte parcial alternativo
        { name: 'corte_parcial', buffer: Buffer.from([0x1D, 0x56, 0x01]) },
        // Solo avance de papel sin corte
        { name: 'avance_papel', buffer: Buffer.from([0x1B, 0x64, 0x05]) }
      ];
      
      drawerCommands = [
        // Comando estándar para cajón
        { name: 'cajon_estandar', buffer: Buffer.from([0x1B, 0x70, 0x00, 0x19, 0x19]) },
        // Comando alternativo XPos
        { name: 'cajon_xpos', buffer: Buffer.from([0x1B, 0x70, 0x00, 0x40, 0x80]) }
      ];
      
    } else if (printerNameLower.includes('epson') || printerNameLower.includes('tm-') || printerNameLower.includes('tmu')) {
      console.log('🔧 Detectada impresora Epson - Usando comandos específicos');
      // Comandos específicos para Epson
      cutCommands = [
        { name: 'corte_epson_total', buffer: Buffer.from([0x1D, 0x56, 0x00]) }, // GS V (corte total)
        { name: 'corte_epson_parcial', buffer: Buffer.from([0x1D, 0x56, 0x01]) }, // GS V (corte parcial)
        { name: 'corte_epson_especifico', buffer: Buffer.from([0x1D, 0x56, 0x41, 0x03]) }, // GS V A (Epson específico)
        { name: 'corte_epson_avance', buffer: Buffer.from([0x1D, 0x56, 0x42, 0x00]) }, // GS V B (con avance)
        { name: 'corte_epson_alternativo', buffer: Buffer.from([0x1D, 0x56, 0x30]) }, // GS V 0 (alternativo)
        { name: 'avance_papel', buffer: Buffer.from([0x1B, 0x64, 0x05]) } // Avance de papel
      ];
      
      drawerCommands = [
        { name: 'cajon_epson_estandar', buffer: Buffer.from([0x1B, 0x70, 0x00, 0x40, 0x80]) }, // ESC p Epson estándar
        { name: 'cajon_epson_puerto1', buffer: Buffer.from([0x1B, 0x70, 0x01, 0x40, 0x80]) }, // ESC p puerto 1
        { name: 'cajon_epson_alt1', buffer: Buffer.from([0x1B, 0x70, 0x00, 0x19, 0x19]) }, // ESC p alternativo
        { name: 'cajon_epson_alt2', buffer: Buffer.from([0x1B, 0x70, 0x00, 0x32, 0x32]) } // ESC p parámetros largos
      ];
      
    } else if (printerNameLower.includes('digitalpos')) {
      console.log('🔧 Detectada impresora DigitalPos - Usando comandos verificados');
      // Comandos que funcionan con DigitalPos
      cutCommands = [
        { name: 'corte_digitalpos', buffer: Buffer.concat([Buffer.from([0x1B, 0x64, 0x05]), Buffer.from([0x1D, 0x56, 0x42, 0x00])]) }
      ];
      
      drawerCommands = [
        { name: 'cajon_digitalpos', buffer: Buffer.from([0x1B, 0x70, 0x00, 0x40, 0x40]) }
      ];
      
    } else {
      console.log('🔧 Impresora genérica - Usando múltiples comandos de prueba');
      // Comandos genéricos para otras impresoras
      cutCommands = [
        { name: 'corte_estandar_1', buffer: Buffer.from([0x1D, 0x56, 0x00]) },
        { name: 'corte_estandar_2', buffer: Buffer.from([0x1D, 0x56, 0x01]) },
        { name: 'corte_estandar_3', buffer: Buffer.from([0x1D, 0x56, 0x42, 0x00]) },
        { name: 'solo_avance', buffer: Buffer.from([0x1B, 0x64, 0x05]) }
      ];
      
      drawerCommands = [
        { name: 'cajon_estandar_1', buffer: Buffer.from([0x1B, 0x70, 0x00, 0x19, 0x19]) },
        { name: 'cajon_estandar_2', buffer: Buffer.from([0x1B, 0x70, 0x00, 0x40, 0x40]) }
      ];
    }

    // 🚫 COMANDOS DE CORTE TEMPORALMENTE DESHABILITADOS
    console.log('⚠️ Saltando comandos de corte (deshabilitados para prueba de cajón)');
    let cutSuccess = false; // Forzado a false
    
    /*
    // Intentar comandos de corte (COMENTADO TEMPORALMENTE)
    let cutSuccess = false;
    for (const cutCmd of cutCommands) {
      try {
        console.log(`🔄 Intentando comando de corte: ${cutCmd.name}`);
        const cutFile = path.join(tempDir, `cut-${cutCmd.name}.bin`);
        fs.writeFileSync(cutFile, cutCmd.buffer);
        
        // Intentar múltiples métodos de envío
        let success = false;
        
        try {
          await this.executeCommand(`copy /B "${cutFile}" "\\\\localhost\\${printerName}"`);
          success = true;
        } catch (directError) {
          try {
            const psCommand = `Get-Content "${cutFile}" -Raw -Encoding Byte | Out-Printer -Name "${printerName}"`;
            await this.executeCommand(`powershell -Command "${psCommand}"`);
            success = true;
          } catch (psError) {
            try {
              await this.executeCommand(`print /D:"${printerName}" "${cutFile}"`);
              success = true;
            } catch (printError) {
              console.warn(`❌ Comando de corte ${cutCmd.name} falló en todos los métodos`);
              continue;
            }
          }
        }
        
        if (success) {
          console.log(`✅ Comando de corte exitoso: ${cutCmd.name}`);
          cutSuccess = true;
          break;
        }
      }
    }
    */

    // Intentar comandos de cajón
    let drawerSuccess = false;
    for (const drawerCmd of drawerCommands) {
      try {
        console.log(`🔄 Intentando comando de cajón: ${drawerCmd.name}`);
        const drawerFile = path.join(tempDir, `drawer-${drawerCmd.name}.bin`);
        fs.writeFileSync(drawerFile, drawerCmd.buffer);
        
        await this.executeCommand(`copy /B "${drawerFile}" "\\\\localhost\\${printerName}"`);
        console.log(`✅ Comando de cajón exitoso: ${drawerCmd.name}`);
        drawerSuccess = true;
        break;
      } catch (error) {
        console.warn(`❌ Comando de cajón ${drawerCmd.name} falló:`, error.message);
        continue;
      }
    }

    // Reportar resultados
    const results = [];
    if (cutSuccess) results.push('✓ Corte de papel');
    if (drawerSuccess) results.push('✓ Cajón abierto');
    
    if (results.length === 0) {
      throw new Error('Ningún comando ESC/POS funcionó con esta impresora');
    }
    
    return {
      success: true,
      operations: results,
      message: `Operaciones completadas: ${results.join(', ')}`
    };
  }

  /**
   * Impresión térmica usando el método exitoso (notepad + comandos ESC/POS)
   */
  async printThermalLegacy(saleData, clientData, invoiceData, paymentMethod, printerName) {
    try {
      let companyConfig = null;
      
      // Si el primer parámetro es un objeto completo, extraer los datos
      if (typeof saleData === 'object' && saleData.saleData) {
        const data = saleData;
        saleData = data.saleData;
        clientData = data.clientData;
        invoiceData = data.invoiceData;
        paymentMethod = data.paymentMethod;
        printerName = data.printerName;
        companyConfig = data.companyConfig; // Extraer configuración de empresa
      }
      
      console.log('🖨️ IMPRESIÓN TÉRMICA LEGACY (Método exitoso)');
      console.log('Impresora:', printerName);
      console.log('Datos recibidos:', { saleData, clientData, invoiceData, paymentMethod });
      
      // DEBUG: Logs detallados para verificar estructura de datos
      console.log('🔍 DEBUG - Estructura completa de saleData:', JSON.stringify(saleData, null, 2));
      console.log('🔍 DEBUG - Items detallados:');
      if (saleData && saleData.items) {
        saleData.items.forEach((item, index) => {
          console.log(`  Item ${index}:`, {
            name: item.name,
            price: item.price,
            real_price: item.real_price,
            quantity: item.quantity,
            total_item: item.price * item.quantity,
            real_total_item: (item.real_price || item.price) * item.quantity
          });
        });
      }
      console.log('🔍 DEBUG - Totales en saleData:', {
        total: saleData?.total,
        total_with_discount: saleData?.total_with_discount,
        discount: saleData?.discount,
        original_total: saleData?.original_total
      });
      
      // Crear directorio temporal si no existe
      const tempDir = path.join(app.getPath('userData'), 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const ticketPath = path.join(tempDir, 'ticket.txt');
      
      // Generar contenido del ticket usando configuración o valores por defecto
      const fecha = new Date().toLocaleString();
      const facturaNumero = Math.floor(Math.random() * 1000000);
      
      // Usar configuración de empresa o valores por defecto
      const tienda = companyConfig?.name || "DRT POS SYSTEM";
      const nit = companyConfig?.nit ? `NIT: ${companyConfig.nit}` : "NIT: 900000000-1";
      const direccion = companyConfig?.address || "Sistema Punto de Venta";
      const ciudad = companyConfig?.city ? ` - ${companyConfig.city}` : "";
      const telefono = companyConfig?.phone ? `Tel: ${companyConfig.phone}` : "Tel: +57 300 123 4567";
      const email = companyConfig?.email ? `Email: ${companyConfig.email}` : "";
      
      console.log('🏢 Datos de empresa para ticket:', {
        tienda,
        nit,
        direccion: direccion + ciudad,
        telefono,
        email
      });
      
      // Calcular totales usando precios reales cobrados (con descuento)
      let subtotal = saleData.items.reduce((acc, item) => {
        const realPrice = item.real_price || item.price;
        return acc + (realPrice * item.quantity);
      }, 0);
      let iva = subtotal * 0.19 / 1.19;
      let total = saleData.total_with_discount || subtotal;

      // Ancho máximo de caracteres (tu configuración)
      const anchoMaximo = 24;

      // Construir encabezado dinámico
      let ticket = `
${"=".repeat(anchoMaximo)}
${tienda.padStart((anchoMaximo + tienda.length) / 2)}
${(direccion + ciudad).padStart((anchoMaximo + (direccion + ciudad).length) / 2)}
${nit.padStart((anchoMaximo + nit.length) / 2)}
${telefono.padStart((anchoMaximo + telefono.length) / 2)}`;

      // Agregar email si existe
      if (email) {
        ticket += `
${email.padStart((anchoMaximo + email.length) / 2)}`;
      }

      ticket += `
${"=".repeat(anchoMaximo)}
Fecha: ${fecha}
${invoiceData && invoiceData.requiresInvoice ? `Factura No: ${invoiceData.invoiceNumber}` : `Recibo No: ${facturaNumero}`}`;

      // Agregar datos del cliente si existe
      if (clientData) {
        ticket += `
Cliente: ${clientData.name}
${clientData.document_type}: ${clientData.document_number}`;
        
        if (clientData.phone_number) {
          ticket += `
Tel Cliente: ${clientData.phone_number}`;
        }
      }

      ticket += `
${"-".repeat(anchoMaximo)}
Producto   Cant.  Precio
${"-".repeat(anchoMaximo)}
`;

      // Agregar productos (usando precios reales cobrados)
      saleData.items.forEach((item) => {
        let nombre = item.name.length > 11 ? item.name.substring(0, 8) + ".." : item.name.padEnd(12, " ");
        let cantidad = item.quantity.toString().padEnd(2, " ");
        const realPrice = item.real_price || item.price;
        let precio = `$${(realPrice * item.quantity).toFixed(0)}`.padStart(10, " ");
        ticket += `${nombre}${cantidad}${precio}\n`;
      });

      ticket += `
${"-".repeat(anchoMaximo)}
Subtotal:       $${(subtotal/1.19).toFixed(0)}
IVA (19%):      $${iva.toFixed(0)}`;
      
      // Mostrar descuento si existe
      if (saleData.discount && saleData.discount > 0) {
        ticket += `
Descuento:     -$${saleData.discount.toFixed(0)}`;
      }
      
      ticket += `
${"-".repeat(anchoMaximo)}
TOTAL:          $${total.toFixed(0)}
${"=".repeat(anchoMaximo)}
Pago:           ${paymentMethod}
${clientData ? `Cliente: ${clientData.name}` : ''}
${clientData ? `Doc: ${clientData.document_type} ${clientData.document_number}` : ''}
${"=".repeat(anchoMaximo)}
${"Gracias por su compra!".padStart((anchoMaximo + 20) / 2)}
${tienda.padStart((anchoMaximo + tienda.length) / 2)}





`; // Agregar múltiples saltos de línea finales para asegurar impresión completa

      // Escribir archivo de ticket
      console.log('📄 Escribiendo archivo de ticket...');
      fs.writeFileSync(ticketPath, ticket, "utf8");
      console.log('✓ Archivo de ticket creado:', ticketPath);

      // Imprimir usando notepad (tu método exitoso)
      console.log('🖨️ Enviando a impresión con notepad...');
      await this.executeCommand(`notepad /p "${ticketPath}"`);
      console.log('✓ Ticket enviado a impresión');

      // Comandos ESC/POS para corte de papel con manejo de errores
      console.log('✂️ Ejecutando corte de papel y apertura de cajón...');
      try {
        // Intentar método directo mejorado
        console.log('🎯 Intentando método directo mejorado...');
        await this.executeDirectPrinterCommands(printerName, tempDir);
        console.log('✅ Corte de papel y cajón realizados exitosamente');
      } catch (directError) {
        console.warn('⚠️ Método directo falló, intentando método legacy:', directError.message);
        try {
          // Fallback al método legacy
          console.log('🔄 Intentando método legacy como respaldo...');
          await this.executeAdvancedPrinterCommands(printerName, tempDir);
          console.log('✅ Corte de papel y cajón realizados exitosamente con método legacy');
        } catch (legacyError) {
          console.warn('⚠️ Ambos métodos fallaron, continuando sin corte/cajón:', legacyError.message);
          // No lanzar error, solo mostrar advertencia para que la impresión continúe
        }
      }

      console.log('✅ IMPRESIÓN TÉRMICA LEGACY COMPLETADA EXITOSAMENTE');
      return {
        success: true,
        message: `Impresión completada con método legacy: ${printerName}`,
        printerUsed: printerName,
        method: 'legacy-notepad-escpos'
      };

    } catch (error) {
      console.error('❌ ERROR EN IMPRESIÓN TÉRMICA LEGACY:', error);
      throw new Error(`Error en impresión legacy: ${error.message}`);
    }
  }

  /**
   * Prueba comandos ESC/POS individuales (útil para debugging)
   */
  async testESCPOSCommands(printerName) {
    try {
      console.log('🧪 PRUEBA DE COMANDOS ESC/POS INDIVIDUALES');
      console.log('Impresora objetivo:', printerName);

      const tempDir = path.join(app.getPath('userData'), 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // Detectar tipo de impresora para comandos específicos
      let testCommands;
      const printerNameLower = printerName.toLowerCase();
      
      if (printerNameLower.includes('pos-80') || printerNameLower.includes('pos80')) {
        console.log('🔧 Usando comandos de prueba específicos para POS-80');
        testCommands = [
          { name: 'Avance papel (5 líneas)', buffer: Buffer.from([0x1B, 0x64, 0x05]) },
          { name: 'Corte POS-80 Método 1 (ESC m)', buffer: Buffer.from([0x1B, 0x6D]) },
          { name: 'Corte POS-80 Método 2 (GS V A)', buffer: Buffer.from([0x1D, 0x56, 0x41, 0x10]) },
          { name: 'Corte POS-80 Método 3 (ESC i)', buffer: Buffer.from([0x1B, 0x69]) },
          { name: 'Corte POS-80 Método 4 (Form Feed)', buffer: Buffer.from([0x0C]) },
          { name: 'Corte POS-80 Método 5 (GS V 0)', buffer: Buffer.from([0x1D, 0x56, 0x30]) },
          { name: 'Cajón POS-80 Método 1', buffer: Buffer.from([0x1B, 0x70, 0x00, 0x32, 0x32]) },
          { name: 'Cajón POS-80 Método 2', buffer: Buffer.from([0x1B, 0x70, 0x01, 0x32, 0x32]) },
          { name: 'Cajón POS-80 Método 3', buffer: Buffer.from([0x10, 0x14, 0x01, 0x00, 0x05]) },
          { name: 'Cajón POS-80 Método 4', buffer: Buffer.from([0x1B, 0x70, 0x00, 0x19, 0x19]) }
        ];
      } else if (printerNameLower.includes('epson') || printerNameLower.includes('tm-') || printerNameLower.includes('tmu')) {
        console.log('🔧 Usando comandos de prueba específicos para Epson');
        testCommands = [
          { name: 'Avance papel (5 líneas)', buffer: Buffer.from([0x1B, 0x64, 0x05]) },
          { name: 'Corte Epson Total (GS V 0)', buffer: Buffer.from([0x1D, 0x56, 0x00]) },
          { name: 'Corte Epson Parcial (GS V 1)', buffer: Buffer.from([0x1D, 0x56, 0x01]) },
          { name: 'Corte Epson Específico (GS V A)', buffer: Buffer.from([0x1D, 0x56, 0x41, 0x03]) },
          { name: 'Corte Epson con Avance (GS V B)', buffer: Buffer.from([0x1D, 0x56, 0x42, 0x00]) },
          { name: 'Corte Epson Alternativo (GS V 30)', buffer: Buffer.from([0x1D, 0x56, 0x30]) },
          { name: 'Cajón Epson Estándar', buffer: Buffer.from([0x1B, 0x70, 0x00, 0x40, 0x80]) },
          { name: 'Cajón Epson Puerto 1', buffer: Buffer.from([0x1B, 0x70, 0x01, 0x40, 0x80]) },
          { name: 'Cajón Epson Alternativo 1', buffer: Buffer.from([0x1B, 0x70, 0x00, 0x19, 0x19]) },
          { name: 'Cajón Epson Alternativo 2', buffer: Buffer.from([0x1B, 0x70, 0x00, 0x32, 0x32]) }
        ];
      } else {
        console.log('🔧 Usando comandos de prueba estándar');
        testCommands = [
          { name: 'Avance papel (5 líneas)', buffer: Buffer.from([0x1B, 0x64, 0x05]) },
          { name: 'Corte total estándar', buffer: Buffer.from([0x1D, 0x56, 0x00]) },
          { name: 'Corte parcial', buffer: Buffer.from([0x1D, 0x56, 0x01]) },
          { name: 'Corte con avance', buffer: Buffer.from([0x1D, 0x56, 0x42, 0x00]) },
          { name: 'Cajón método 1', buffer: Buffer.from([0x1B, 0x70, 0x00, 0x19, 0x19]) },
          { name: 'Cajón método 2', buffer: Buffer.from([0x1B, 0x70, 0x00, 0x40, 0x40]) },
          { name: 'Cajón XPos', buffer: Buffer.from([0x1B, 0x70, 0x00, 0x40, 0x80]) }
        ];
      }

      const results = [];
      
      for (const cmd of testCommands) {
        try {
          console.log(`\n🔄 Probando: ${cmd.name}`);
          const testFile = path.join(tempDir, `test-${cmd.name.replace(/\s+/g, '-').toLowerCase()}.bin`);
          fs.writeFileSync(testFile, cmd.buffer);
          
          // Método 1: Intentar copia directa al puerto de la impresora
          let success = false;
          let finalError = null;
          
          try {
            await this.executeCommand(`copy /B "${testFile}" "\\\\localhost\\${printerName}"`);
            console.log(`✅ ${cmd.name}: ÉXITO (copia directa)`);
            success = true;
          } catch (directCopyError) {
            console.log(`⚠️ ${cmd.name}: Fallo copia directa, intentando método alternativo...`);
            
            // Método 2: Usar PowerShell para enviar a la impresora
            try {
              const psCommand = `Get-Content "${testFile}" -Raw -Encoding Byte | Out-Printer -Name "${printerName}"`;
              await this.executeCommand(`powershell -Command "${psCommand}"`);
              console.log(`✅ ${cmd.name}: ÉXITO (PowerShell)`);
              success = true;
            } catch (psError) {
              console.log(`⚠️ ${cmd.name}: Fallo PowerShell, intentando print command...`);
              
              // Método 3: Usar comando print de Windows
              try {
                await this.executeCommand(`print /D:"${printerName}" "${testFile}"`);
                console.log(`✅ ${cmd.name}: ÉXITO (print command)`);
                success = true;
              } catch (printError) {
                console.log(`❌ ${cmd.name}: FALLO en todos los métodos`);
                console.log(`   - Copia directa: ${directCopyError.message}`);
                console.log(`   - PowerShell: ${psError.message}`);
                console.log(`   - Print command: ${printError.message}`);
                finalError = `Múltiples fallos: ${directCopyError.message}`;
              }
            }
          }
          
          if (success) {
            results.push({ command: cmd.name, status: 'SUCCESS', error: null });
            // Esperar un poco entre comandos para ver el efecto
            await new Promise(resolve => setTimeout(resolve, 2000));
          } else {
            results.push({ command: cmd.name, status: 'ERROR', error: finalError });
          }
          
        } catch (error) {
          console.log(`❌ ${cmd.name}: ERROR GENERAL - ${error.message}`);
          results.push({ command: cmd.name, status: 'ERROR', error: error.message });
        }
      }

      console.log('\n📊 RESUMEN DE PRUEBAS:');
      results.forEach(result => {
        const status = result.status === 'SUCCESS' ? '✅' : '❌';
        console.log(`${status} ${result.command}: ${result.status}`);
        if (result.error) {
          console.log(`   Error: ${result.error}`);
        }
      });

      return {
        success: true,
        results: results,
        summary: `Probados ${results.length} comandos. Exitosos: ${results.filter(r => r.status === 'SUCCESS').length}`
      };

    } catch (error) {
      console.error('Error en prueba de comandos ESC/POS:', error);
      throw error;
    }
  }

  /**
   * Muestra diálogo de impresión
   */
  async showPrintDialog(saleData, clientData, invoiceData, paymentMethod) {
    try {
      const printWindow = new BrowserWindow({
        width: 800,
        height: 600,
        show: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      });

      const htmlContent = this.generateNormalPrintHTML(saleData, clientData, invoiceData, paymentMethod);
      await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
      
      // Mostrar diálogo de impresión
      const options = {
        silent: false,
        printBackground: true
      };

      await printWindow.webContents.print(options);
      printWindow.close();
      
      return { success: true, message: 'Diálogo de impresión mostrado' };
    } catch (error) {
      console.error('Error mostrando diálogo de impresión:', error);
      throw error;
    }
  }
}

module.exports = PrintingService;