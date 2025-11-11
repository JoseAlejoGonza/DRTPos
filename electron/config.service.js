const fs = require('fs');
const path = require('path');
const { app } = require('electron');

/**
 * Servicio de configuración del sistema
 */
class ConfigService {
  constructor() {
    this.configPath = path.join(__dirname, 'config.json');
    this.userConfigPath = path.join(app.getPath('userData'), 'user-config.json');
    this.config = this.loadConfig();
  }

  /**
   * Carga la configuración desde archivos
   */
  loadConfig() {
    try {
      // Cargar configuración base
      const defaultConfig = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
      
      // Intentar cargar configuración de usuario
      let userConfig = {};
      if (fs.existsSync(this.userConfigPath)) {
        userConfig = JSON.parse(fs.readFileSync(this.userConfigPath, 'utf8'));
      }

      // Combinar configuraciones (usuario sobrescribe defaults)
      return this.deepMerge(defaultConfig, userConfig);
    } catch (error) {
      console.error('Error cargando configuración:', error);
      // Retornar configuración mínima en caso de error
      return this.getMinimalConfig();
    }
  }

  /**
   * Guarda la configuración de usuario
   */
  saveUserConfig(newConfig) {
    try {
      // Asegurar que el directorio existe
      const userDataDir = app.getPath('userData');
      if (!fs.existsSync(userDataDir)) {
        fs.mkdirSync(userDataDir, { recursive: true });
      }

      // Guardar solo las configuraciones que han cambiado del default
      fs.writeFileSync(this.userConfigPath, JSON.stringify(newConfig, null, 2), 'utf8');
      
      // Recargar configuración
      this.config = this.loadConfig();
      
      return true;
    } catch (error) {
      console.error('Error guardando configuración:', error);
      return false;
    }
  }

  /**
   * Combina objetos de configuración recursivamente
   */
  deepMerge(target, source) {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  /**
   * Obtiene configuración mínima por defecto
   */
  getMinimalConfig() {
    return {
      company: {
        name: "DRT POS System",
        nit: "900000000-1",
        phone: "+57 300 123 4567",
        email: "ventas@drtpos.com"
      },
      invoicing: {
        enabled: true,
        ivaRate: 0.19
      },
      printing: {
        thermal: { enabled: true, defaultPaperWidth: 80 },
        normal: { enabled: true }
      },
      whatsapp: {
        enabled: true,
        companyPhone: "+573001234567"
      },
      ui: {
        currency: "COP",
        language: "es-CO"
      }
    };
  }

  // Métodos getter para acceso fácil a configuraciones específicas

  /**
   * Obtiene configuración de la empresa
   */
  getCompanyConfig() {
    return this.config.company || this.getMinimalConfig().company;
  }

  /**
   * Obtiene configuración de facturación
   */
  getInvoicingConfig() {
    return this.config.invoicing || this.getMinimalConfig().invoicing;
  }

  /**
   * Obtiene configuración de impresión
   */
  getPrintingConfig() {
    return this.config.printing || this.getMinimalConfig().printing;
  }

  /**
   * Obtiene configuración de WhatsApp
   */
  getWhatsAppConfig() {
    return this.config.whatsapp || this.getMinimalConfig().whatsapp;
  }

  /**
   * Obtiene configuración de métodos de pago
   */
  getPaymentConfig() {
    return this.config.payments || {
      methods: [
        { id: "cash", name: "Efectivo", enabled: true },
        { id: "card", name: "Tarjeta", enabled: true },
        { id: "transfer", name: "Transferencia", enabled: true }
      ]
    };
  }

  /**
   * Obtiene configuración de UI
   */
  getUIConfig() {
    return this.config.ui || this.getMinimalConfig().ui;
  }

  /**
   * Actualiza configuración específica de empresa
   */
  updateCompanyConfig(companyData) {
    const newConfig = { ...this.config };
    newConfig.company = { ...newConfig.company, ...companyData };
    return this.saveUserConfig(newConfig);
  }

  /**
   * Actualiza configuración de facturación
   */
  updateInvoicingConfig(invoicingData) {
    const newConfig = { ...this.config };
    newConfig.invoicing = { ...newConfig.invoicing, ...invoicingData };
    return this.saveUserConfig(newConfig);
  }

  /**
   * Actualiza configuración de WhatsApp
   */
  updateWhatsAppConfig(whatsAppData) {
    const newConfig = { ...this.config };
    newConfig.whatsapp = { ...newConfig.whatsapp, ...whatsAppData };
    return this.saveUserConfig(newConfig);
  }

  /**
   * Habilita/deshabilita método de pago
   */
  togglePaymentMethod(methodId, enabled) {
    const newConfig = { ...this.config };
    if (!newConfig.payments) newConfig.payments = { methods: [] };
    
    const method = newConfig.payments.methods.find(m => m.id === methodId);
    if (method) {
      method.enabled = enabled;
    } else {
      // Agregar nuevo método si no existe
      newConfig.payments.methods.push({
        id: methodId,
        name: methodId.charAt(0).toUpperCase() + methodId.slice(1),
        enabled: enabled
      });
    }
    
    return this.saveUserConfig(newConfig);
  }

  /**
   * Obtiene toda la configuración actual
   */
  getAllConfig() {
    return { ...this.config };
  }

  /**
   * Resetea configuración a valores por defecto
   */
  resetToDefaults() {
    try {
      // Eliminar archivo de configuración de usuario
      if (fs.existsSync(this.userConfigPath)) {
        fs.unlinkSync(this.userConfigPath);
      }
      
      // Recargar configuración
      this.config = this.loadConfig();
      
      return true;
    } catch (error) {
      console.error('Error reseteando configuración:', error);
      return false;
    }
  }

  /**
   * Exporta configuración actual
   */
  exportConfig() {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Importa configuración desde string JSON
   */
  importConfig(configJson) {
    try {
      const importedConfig = JSON.parse(configJson);
      return this.saveUserConfig(importedConfig);
    } catch (error) {
      console.error('Error importando configuración:', error);
      return false;
    }
  }
}

module.exports = ConfigService;