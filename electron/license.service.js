const os = require('os');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * Servicio de Licencias - Ata el software a hardware específico
 */
class LicenseService {
  constructor() {
    // Obtener directorio de ejecución de la aplicación (no del proceso interno)
    const appPath = process.execPath ? path.dirname(process.execPath) : process.cwd();
    
    // Definir múltiples ubicaciones posibles para el archivo de licencia
    const possiblePaths = [
      path.join(appPath, 'license.key'),                      // Junto al ejecutable
      path.join(appPath, 'electron', 'license.key'),          // Subdirectorio electron
      path.join(appPath, 'resources', 'license.key'),         // Recursos
      path.join(appPath, 'resources', 'app.asar.unpacked', 'electron', 'license.key'), // Empaquetado
      path.join(__dirname, 'license.key'),                    // Ubicación original (electron/)
      path.join(process.cwd(), 'license.key'),                // Directorio raíz de la aplicación
      path.join(__dirname, '..', 'license.key')               // Un nivel arriba
    ];
    
    this.licenseFile = this.findExistingLicense(possiblePaths) || possiblePaths[0];
    this.allPossiblePaths = possiblePaths;
    this.hardwareId = this.generateHardwareId();
  }

  /**
   * Busca archivo de licencia existente en las ubicaciones posibles
   */
  findExistingLicense(paths) {
    for (const licensePath of paths) {
      if (fs.existsSync(licensePath)) {
        return licensePath;
      }
    }
    return null;
  }

  /**
   * Genera ID único basado en hardware del PC
   */
  generateHardwareId() {
    const networkInterfaces = os.networkInterfaces();
    const cpus = os.cpus();
    
    // Obtener MAC address de la primera interfaz de red
    let macAddress = '';
    for (const iface of Object.values(networkInterfaces)) {
      for (const config of iface) {
        if (!config.internal && config.mac !== '00:00:00:00:00:00') {
          macAddress = config.mac;
          break;
        }
      }
      if (macAddress) break;
    }
    
    // Combinar información del hardware
    const hardwareInfo = {
      mac: macAddress,
      cpu: cpus[0]?.model || 'unknown',
      platform: os.platform(),
      arch: os.arch(),
      hostname: os.hostname()
    };
    
    // Crear hash único del hardware
    const hardwareString = JSON.stringify(hardwareInfo);
    return crypto.createHash('sha256').update(hardwareString).digest('hex').substring(0, 16);
  }

  /**
   * Genera una licencia para este hardware específico
   */
  generateLicense(customerName, expirationDays = 365) {
    const licenseData = {
      customer: customerName,
      hardwareId: this.hardwareId,
      generatedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + (expirationDays * 24 * 60 * 60 * 1000)).toISOString(),
      version: '1.0.0',
      features: ['pos', 'reports', 'printing']
    };
    
    // Cifrar la licencia
    const licenseString = JSON.stringify(licenseData);
    
    // Usar método moderno de encriptación
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync('DRT-POS-LICENSE-KEY-2025', 'salt', 32);
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(licenseString, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Combinar IV y datos encriptados
    const result = iv.toString('hex') + ':' + encrypted;
    
    return result;
  }

  /**
   * Valida si el software puede ejecutarse en este PC
   */
  validateLicense() {
    try {
      // Buscar licencia en todas las ubicaciones posibles
      const existingLicense = this.findExistingLicense(this.allPossiblePaths);
      
      if (!existingLicense) {
        return {
          valid: false,
          reason: 'NO_LICENSE',
          message: 'Licencia no encontrada. Contacte al proveedor.'
        };
      }
      
      // Usar el archivo encontrado
      const actualLicenseFile = existingLicense;
      
      // SOLUCIÓN: Si encontramos la licencia, pero no está en nuestro directorio de trabajo,
      // copiarla ahí para futuras ejecuciones
      const workingLicenseFile = path.join(__dirname, 'license.key');
      if (actualLicenseFile !== workingLicenseFile && !fs.existsSync(workingLicenseFile)) {
        try {
          const licenseContent = fs.readFileSync(actualLicenseFile, 'utf8');
          fs.writeFileSync(workingLicenseFile, licenseContent);
        } catch (copyError) {
          // Ignorar errores de copia, usar el archivo encontrado
        }
      }

      const encryptedLicense = fs.readFileSync(actualLicenseFile, 'utf8');
      
      let licenseData;
      try {
        // Descifrar licencia usando método moderno
        const algorithm = 'aes-256-cbc';
        const key = crypto.scryptSync('DRT-POS-LICENSE-KEY-2025', 'salt', 32);
        
        // Separar IV y datos encriptados
        const parts = encryptedLicense.trim().split(':');
        if (parts.length !== 2) {
          throw new Error('Formato de licencia inválido');
        }
        
        const iv = Buffer.from(parts[0], 'hex');
        const encrypted = parts[1];
        
        const decipher = crypto.createDecipheriv(algorithm, key, iv);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        licenseData = JSON.parse(decrypted);
      } catch (decryptError) {
        return {
          valid: false,
          reason: 'INVALID_LICENSE',
          message: 'Licencia corrupta o inválida. Contacte al proveedor.'
        };
      }
      
      // Validar hardware
      if (licenseData.hardwareId !== this.hardwareId) {
        return {
          valid: false,
          reason: 'HARDWARE_MISMATCH',
          message: 'Esta licencia no es válida para este equipo. Contacte al proveedor.'
        };
      }
      
      // Validar expiración
      const now = new Date();
      const expiration = new Date(licenseData.expiresAt);
      
      if (now > expiration) {
        return {
          valid: false,
          reason: 'EXPIRED',
          message: 'La licencia ha expirado. Contacte al proveedor para renovar.'
        };
      }
      
      // Calcular días restantes
      const daysLeft = Math.ceil((expiration - now) / (1000 * 60 * 60 * 24));
      
      return {
        valid: true,
        message: `Licencia válida para ${licenseData.customer}. Expira en ${daysLeft} días.`,
        reason: 'VALID_LICENSE',
        customer: licenseData.customer,
        expiresAt: licenseData.expiresAt,
        daysLeft: daysLeft,
        features: licenseData.features
      };
      
    } catch (error) {
      return {
        valid: false,
        reason: 'INVALID_LICENSE',
        message: 'Licencia corrupta o inválida. Contacte al proveedor.'
      };
    }
  }

  /**
   * Instala una licencia en el sistema
   */
  installLicense(encryptedLicense) {
    try {
      // Validar que la licencia funciona antes de instalar
      fs.writeFileSync(this.licenseFile + '.temp', encryptedLicense);
      
      const originalFile = this.licenseFile;
      this.licenseFile = this.licenseFile + '.temp';
      
      const validation = this.validateLicense();
      
      this.licenseFile = originalFile;
      
      if (validation.valid) {
        fs.renameSync(this.licenseFile + '.temp', this.licenseFile);
        return { success: true, message: 'Licencia instalada correctamente' };
      } else {
        fs.unlinkSync(this.licenseFile + '.temp');
        return { success: false, message: validation.message };
      }
      
    } catch (error) {
      return { success: false, message: 'Error instalando licencia: ' + error.message };
    }
  }

  /**
   * Obtiene información del hardware para generar licencia
   */
  getHardwareInfo() {
    return {
      hardwareId: this.hardwareId,
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      cpu: os.cpus()[0]?.model || 'unknown',
      memory: Math.round(os.totalmem() / 1024 / 1024 / 1024) + ' GB'
    };
  }

  /**
   * Obtiene el estado actual de la licencia para mostrar en UI
   */
  checkLicenseStatus() {
    const validation = this.validateLicense();
    
    if (!validation.valid) {
      return {
        isValid: false,
        message: validation.message
      };
    }

    // Convertir formato de respuesta
    return {
      isValid: true,
      customerName: validation.customer,
      expirationDate: new Date(validation.expiresAt).toLocaleDateString(),
      hardwareId: this.hardwareId,
      daysRemaining: validation.daysLeft,
      isExpired: validation.reason === 'EXPIRED'
    };
  }
}

module.exports = LicenseService;