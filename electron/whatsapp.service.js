const { shell } = require('electron');
const path = require('path');
const fs = require('fs');

/**
 * Servicio de WhatsApp para envío de facturas
 */
class WhatsAppService {
  constructor() {
    this.config = {
      // Configuración de la empresa
      companyPhone: '+573001234567', // Número de WhatsApp de la empresa
      companyName: 'DRT POS System',
      // Templates de mensajes
      templates: {
        invoiceMessage: `¡Hola! 👋

Gracias por tu compra en *{companyName}*.

Te enviamos tu factura electrónica:
📄 *Factura:* {invoiceNumber}
💰 *Total:* ${'{total}'}
📅 *Fecha:* {date}

{invoiceDetails}

¡Esperamos verte pronto! 😊

_Este es un mensaje automático del sistema POS._`,

        receiptMessage: `¡Hola! 👋

Gracias por tu compra en *{companyName}*.

Te enviamos tu comprobante de venta:
🧾 *Comprobante de venta*
💰 *Total:* ${'{total}'}
📅 *Fecha:* {date}

{purchaseDetails}

¡Esperamos verte pronto! 😊

_Este es un mensaje automático del sistema POS._`
      }
    };
  }

  /**
   * Valida un número de teléfono para WhatsApp
   */
  validatePhoneNumber(phone) {
    // Remover caracteres no numéricos excepto +
    let cleanPhone = phone.replace(/[^\d+]/g, '');
    
    // Si no tiene código de país, agregar +57 (Colombia)
    if (!cleanPhone.startsWith('+')) {
      if (cleanPhone.startsWith('57')) {
        cleanPhone = '+' + cleanPhone;
      } else {
        cleanPhone = '+57' + cleanPhone;
      }
    }
    
    // Validar que tenga el formato correcto
    const phoneRegex = /^\+57[39]\d{9}$/;
    return phoneRegex.test(cleanPhone) ? cleanPhone : null;
  }

  /**
   * Genera el mensaje para envío de factura por WhatsApp
   */
  generateInvoiceMessage(saleData, clientData, invoiceData) {
    const template = this.config.templates.invoiceMessage;
    
    // Generar detalles de los productos
    const invoiceDetails = saleData.items.map(item => 
      `• ${item.name} (${item.quantity}x) - $${(item.price * item.quantity).toLocaleString('es-CO')}`
    ).join('\n');
    
    return template
      .replace('{companyName}', this.config.companyName)
      .replace('{invoiceNumber}', invoiceData.invoiceNumber)
      .replace('{total}', saleData.total.toLocaleString('es-CO'))
      .replace('{date}', new Date().toLocaleDateString('es-CO'))
      .replace('{invoiceDetails}', invoiceDetails);
  }

  /**
   * Genera el mensaje para envío de comprobante por WhatsApp
   */
  generateReceiptMessage(saleData, clientData) {
    const template = this.config.templates.receiptMessage;
    
    // Generar detalles de la compra
    const purchaseDetails = saleData.items.map(item => 
      `• ${item.name} (${item.quantity}x) - $${(item.price * item.quantity).toLocaleString('es-CO')}`
    ).join('\n');
    
    return template
      .replace('{companyName}', this.config.companyName)
      .replace('{total}', saleData.total.toLocaleString('es-CO'))
      .replace('{date}', new Date().toLocaleDateString('es-CO'))
      .replace('{purchaseDetails}', purchaseDetails);
  }

  /**
   * Genera URL para WhatsApp Web con mensaje preformateado
   */
  generateWhatsAppURL(phoneNumber, message, attachmentPath = null) {
    const validPhone = this.validatePhoneNumber(phoneNumber);
    if (!validPhone) {
      throw new Error('Número de teléfono inválido');
    }

    // Remover el + del número para la URL
    const urlPhone = validPhone.replace('+', '');
    
    // Codificar el mensaje
    const encodedMessage = encodeURIComponent(message);
    
    // Generar URL de WhatsApp Web
    const whatsappURL = `https://wa.me/${urlPhone}?text=${encodedMessage}`;
    
    return {
      url: whatsappURL,
      phone: validPhone,
      message: message
    };
  }

  /**
   * Envía factura por WhatsApp (abre WhatsApp Web)
   */
  async sendInvoice(saleData, clientData, invoiceData) {
    try {
      if (!clientData.phone_number) {
        throw new Error('El cliente no tiene número de teléfono registrado');
      }

      // Generar mensaje
      const message = this.generateInvoiceMessage(saleData, clientData, invoiceData);
      
      // Generar URL de WhatsApp
      const whatsappData = this.generateWhatsAppURL(clientData.phone_number, message);
      
      // Abrir WhatsApp Web en el navegador
      await shell.openExternal(whatsappData.url);
      
      return {
        success: true,
        message: 'WhatsApp Web abierto para envío de factura',
        phone: whatsappData.phone,
        whatsappURL: whatsappData.url
      };
      
    } catch (error) {
      console.error('Error enviando factura por WhatsApp:', error);
      throw error;
    }
  }

  /**
   * Abre WhatsApp Web para enviar una factura y además abre el PDF generado
   * Para adjuntar el PDF será necesario que el usuario lo agregue manualmente en la interfaz de WhatsApp Web.
   * Esta función abre WhatsApp Web con el mensaje y abre el PDF en el visor del sistema (u carpeta) para facilitar la operación.
   */
  async sendInvoiceWithAttachment(targetPhone, saleData, clientData, invoiceData, pdfPath) {
    try {
      // Validar teléfono objetivo
      const validPhone = this.validatePhoneNumber(targetPhone || clientData.phone_number || '');
      if (!validPhone) {
        throw new Error('Número de teléfono inválido');
      }

      // Generar mensaje usando los datos disponibles
      const message = this.generateInvoiceMessage(saleData, clientData, invoiceData);

      // Generar URL de WhatsApp
      const whatsappData = this.generateWhatsAppURL(validPhone, message);

      // Abrir WhatsApp Web
      await shell.openExternal(whatsappData.url);

      // Intentar abrir el PDF para que el usuario pueda adjuntarlo rápidamente
      if (pdfPath && fs.existsSync(pdfPath)) {
        // Abrir el archivo PDF en el visor por defecto
        await shell.openPath(pdfPath);
      } else if (pdfPath) {
        // Si path no existe, abrir carpeta contenedora
        const dir = path.dirname(pdfPath);
        if (fs.existsSync(dir)) await shell.openPath(dir);
      }

      return {
        success: true,
        message: 'WhatsApp Web abierto y PDF mostrado para adjuntar manualmente',
        phone: validPhone,
        whatsappURL: whatsappData.url,
        pdfPath
      };
    } catch (error) {
      console.error('Error enviando factura con adjunto por WhatsApp:', error);
      throw error;
    }
  }

  /**
   * Envía comprobante de venta por WhatsApp (abre WhatsApp Web)
   */
  async sendReceipt(saleData, clientData) {
    try {
      if (!clientData.phone_number) {
        throw new Error('El cliente no tiene número de teléfono registrado');
      }

      // Generar mensaje
      const message = this.generateReceiptMessage(saleData, clientData);
      
      // Generar URL de WhatsApp
      const whatsappData = this.generateWhatsAppURL(clientData.phone_number, message);
      
      // Abrir WhatsApp Web en el navegador
      await shell.openExternal(whatsappData.url);
      
      return {
        success: true,
        message: 'WhatsApp Web abierto para envío de comprobante',
        phone: whatsappData.phone,
        whatsappURL: whatsappData.url
      };
      
    } catch (error) {
      console.error('Error enviando comprobante por WhatsApp:', error);
      throw error;
    }
  }

  /**
   * Obtiene la vista previa del mensaje que se enviará
   */
  getMessagePreview(saleData, clientData, invoiceData = null) {
    try {
      let message;
      let messageType;
      
      if (invoiceData) {
        message = this.generateInvoiceMessage(saleData, clientData, invoiceData);
        messageType = 'factura';
      } else {
        message = this.generateReceiptMessage(saleData, clientData);
        messageType = 'comprobante';
      }
      
      const validPhone = clientData.phone_number ? 
        this.validatePhoneNumber(clientData.phone_number) : null;
      
      return {
        success: true,
        messageType,
        message,
        phone: validPhone,
        canSend: !!validPhone
      };
      
    } catch (error) {
      console.error('Error generando vista previa:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Configura el número de teléfono de la empresa
   */
  setCompanyPhone(phone) {
    const validPhone = this.validatePhoneNumber(phone);
    if (validPhone) {
      this.config.companyPhone = validPhone;
      return true;
    }
    return false;
  }

  /**
   * Configura el nombre de la empresa
   */
  setCompanyName(name) {
    this.config.companyName = name;
  }

  /**
   * Personaliza los templates de mensajes
   */
  updateMessageTemplate(templateType, newTemplate) {
    if (this.config.templates[templateType]) {
      this.config.templates[templateType] = newTemplate;
      return true;
    }
    return false;
  }

  /**
   * Obtiene la configuración actual
   */
  getConfig() {
    return { ...this.config };
  }
}

module.exports = WhatsAppService;