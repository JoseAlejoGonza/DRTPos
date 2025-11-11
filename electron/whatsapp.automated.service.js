const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

class WhatsAppAutomatedService {
  constructor(options = {}) {
    this.options = options || {};
    this.ready = false;

    // Use LocalAuth to persist session in a predictable location inside userData
    const sessionPath = path.join(app.getPath('userData'), 'whatsapp-session');
    if (!fs.existsSync(sessionPath)) {
      try { fs.mkdirSync(sessionPath, { recursive: true }); } catch (e) { /* ignore */ }
    }

    this.sessionPath = sessionPath;

    this.client = new Client({
      authStrategy: new LocalAuth({ clientId: 'drtpos', dataPath: sessionPath }),
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      }
    });

    this._init();
  }

  _init() {
    this.client.on('qr', (qr) => {
      // Store last QR string so main can expose it via IPC
      this.lastQr = qr;
      // QR received and stored; avoid printing to console to prevent leaking QR in deployed environments.
    });

    this.client.on('ready', () => {
      this.ready = true;
      console.log('WhatsAppAutomatedService: Cliente listo');
    });

    this.client.on('auth_failure', (msg) => {
      console.error('WhatsAppAutomatedService: Fallo de autenticación', msg);
    });

    this.client.on('disconnected', (reason) => {
      this.ready = false;
      console.warn('WhatsAppAutomatedService: Desconectado', reason);
    });

    // Initialize client (non-blocking)
    this.client.initialize();
  }

  getStatus() {
    return {
      ready: !!this.ready,
      lastQr: this.lastQr || null,
      initialized: !!this.client,
      sessionPath: this.sessionPath
    };
  }

  validatePhoneNumber(phone) {
    if (!phone) return null;
    let clean = String(phone).replace(/[^\d+]/g, '');
    if (!clean.startsWith('+')) {
      if (clean.startsWith('57')) clean = '+' + clean;
      else clean = '+57' + clean;
    }
    const phoneRegex = /^\+57[39]\d{9}$/;
    return phoneRegex.test(clean) ? clean : null;
  }

  async ensureReady(timeout = 30000) {
    if (this.ready) return true;
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('Timeout espera WhatsApp client')), timeout);
      this.client.once('ready', () => { clearTimeout(t); this.ready = true; resolve(true); });
    });
  }

  async sendMedia(targetPhone, filePath, caption = '') {
    try {
      await this.ensureReady();
      const validPhone = this.validatePhoneNumber(targetPhone);
      if (!validPhone) throw new Error('Número de teléfono inválido: ' + targetPhone);

      const chatId = validPhone.replace('+', '') + '@c.us';

      if (!fs.existsSync(filePath)) throw new Error('Archivo no encontrado: ' + filePath);

      const media = MessageMedia.fromFilePath(filePath);
      const sent = await this.client.sendMessage(chatId, media, { caption });
      return { success: true, result: sent }; 
    } catch (error) {
      console.error('WhatsAppAutomatedService sendMedia error:', error);
      throw error;
    }
  }
}

module.exports = WhatsAppAutomatedService;
