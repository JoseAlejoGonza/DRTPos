const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');
const { execSync } = require('child_process');

// Importar LicenseService inline para pkg
class LicenseService {
  constructor() {
    // Usar la misma ubicación que el software principal
    // Buscar el archivo en múltiples ubicaciones posibles
    const possiblePaths = [
      path.join(process.cwd(), 'license.key'),           // Ubicación principal (junto al exe)
      path.join(__dirname, 'license.key'),               // Directorio del script
      path.join(process.cwd(), 'electron', 'license.key'), // Si está en development
      path.join(process.cwd(), 'resources', 'app.asar.unpacked', 'electron', 'license.key') // Empaquetado
    ];
    
    // Usar la primera ubicación como principal
    this.licenseFile = possiblePaths[0];
    this.allPossiblePaths = possiblePaths;
  }

  generateHardwareId() {
    try {
      const networkInterfaces = os.networkInterfaces();
      let macAddress = '';
      
      // Buscar la primera interfaz con MAC address válida
      for (const name of Object.keys(networkInterfaces)) {
        const interfaces = networkInterfaces[name];
        for (const iface of interfaces) {
          if (!iface.internal && iface.mac && iface.mac !== '00:00:00:00:00:00') {
            macAddress = iface.mac;
            break;
          }
        }
        if (macAddress) break;
      }

      const cpus = os.cpus();
      const cpuModel = cpus[0] ? cpus[0].model : 'unknown';
      const platform = os.platform();
      const arch = os.arch();

      // Crear identificador único usando hash
      const hardwareInfo = `${macAddress}-${cpuModel}-${platform}-${arch}`;
      const hash = crypto.createHash('md5').update(hardwareInfo).digest('hex');
      
      return hash.substring(0, 16);
    } catch (error) {
      console.error('Error generando Hardware ID:', error);
      return null;
    }
  }

  getHardwareInfo() {
    try {
      const networkInterfaces = os.networkInterfaces();
      let macAddress = 'No disponible';
      
      for (const name of Object.keys(networkInterfaces)) {
        const interfaces = networkInterfaces[name];
        for (const iface of interfaces) {
          if (!iface.internal && iface.mac && iface.mac !== '00:00:00:00:00:00') {
            macAddress = iface.mac;
            break;
          }
        }
        if (macAddress !== 'No disponible') break;
      }

      const cpus = os.cpus();
      const cpuModel = cpus[0] ? cpus[0].model : 'CPU no disponible';
      
      return {
        hostname: os.hostname(),
        platform: os.platform(),
        arch: os.arch(),
        cpu: cpuModel,
        memory: `${Math.round(os.totalmem() / (1024 * 1024 * 1024))} GB`,
        mac: macAddress,
        uptime: Math.round(os.uptime() / 3600)
      };
    } catch (error) {
      console.error('Error obteniendo información del hardware:', error);
      return {
        hostname: 'No disponible',
        platform: 'No disponible',
        arch: 'No disponible',
        cpu: 'No disponible',
        memory: 'No disponible',
        mac: 'No disponible',
        uptime: 0
      };
    }
  }

  generateLicense(hardwareId, customerName, days = 365) {
    try {
      const licenseData = {
        hardwareId: hardwareId,
        customer: customerName,
        issuedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + (days * 24 * 60 * 60 * 1000)).toISOString(),
        version: '1.0'
      };

      // Encriptar usando método moderno compatible con la aplicación
      const algorithm = 'aes-256-cbc';
      const key = crypto.scryptSync('DRT-POS-LICENSE-KEY-2025', 'salt', 32);
      const iv = crypto.randomBytes(16);
      
      const cipher = crypto.createCipheriv(algorithm, key, iv);
      let encrypted = cipher.update(JSON.stringify(licenseData), 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Formato: IV:datos_encriptados
      const encryptedLicense = iv.toString('hex') + ':' + encrypted;
      
      // GUARDAR ARCHIVO EN EL DIRECTORIO ACTUAL
      const licenseFilePath = path.join(process.cwd(), 'license.key');
      fs.writeFileSync(licenseFilePath, encryptedLicense, 'utf8');
      
      return {
        success: true,
        encryptedLicense: encryptedLicense,
        licenseData: licenseData,
        filePath: licenseFilePath
      };
    } catch (error) {
      console.error('Error generando licencia:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  installLicense(encryptedLicense) {
    try {
      // Validar formato
      if (!encryptedLicense || typeof encryptedLicense !== 'string') {
        throw new Error('Código de licencia inválido');
      }

      // Intentar validar la licencia antes de instalar
      const validation = this.validateLicenseCode(encryptedLicense);
      if (!validation.valid) {
        return {
          success: false,
          message: validation.message || 'Licencia inválida'
        };
      }

      // Guardar licencia en la ubicación principal
      fs.writeFileSync(this.licenseFile, encryptedLicense);
      
      // También guardar en ubicaciones alternativas para compatibilidad
      const alternativeLocations = [
        path.join(process.cwd(), 'electron', 'license.key'),
        path.join(process.cwd(), 'license.lic'), // Formato anterior por compatibilidad
        path.join(process.cwd(), 'resources', 'app.asar.unpacked', 'electron', 'license.key'),
        path.join(process.cwd(), 'resources', 'license.key'),
        path.join(process.cwd(), 'resources', 'app', 'electron', 'license.key')
      ];
      
      alternativeLocations.forEach(altPath => {
        try {
          // Crear directorio si no existe
          const dir = path.dirname(altPath);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          fs.writeFileSync(altPath, encryptedLicense);
        } catch (error) {
          // Ignorar errores en ubicaciones alternativas
          console.log(`Nota: No se pudo escribir en ${altPath}`);
        }
      });
      
      return {
        success: true,
        message: 'Licencia instalada correctamente en múltiples ubicaciones'
      };
    } catch (error) {
      console.error('Error instalando licencia:', error);
      return {
        success: false,
        message: `Error instalando licencia: ${error.message}`
      };
    }
  }

  // Método para buscar archivos de licencia existentes
  findExistingLicense() {
    for (const licensePath of this.allPossiblePaths) {
      if (fs.existsSync(licensePath)) {
        return licensePath;
      }
    }
    return null;
  }

  validateLicenseCode(encryptedLicense) {
    try {
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
      
      const licenseData = JSON.parse(decrypted);
      
      // Verificar Hardware ID
      const currentHardwareId = this.generateHardwareId();
      if (licenseData.hardwareId !== currentHardwareId) {
        return {
          valid: false,
          message: 'Esta licencia no es válida para este equipo'
        };
      }
      
      // Verificar expiración
      if (new Date(licenseData.expiresAt) < new Date()) {
        return {
          valid: false,
          message: 'Licencia expirada'
        };
      }
      
      return {
        valid: true,
        message: 'Licencia válida',
        data: licenseData
      };
    } catch (error) {
      return {
        valid: false,
        message: 'Licencia corrupta o inválida'
      };
    }
  }
}

// Funciones de utilidad para entrada de usuario sin dependencias externas
function question(prompt) {
  return new Promise((resolve) => {
    process.stdout.write(prompt);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    
    process.stdin.once('data', (data) => {
      process.stdin.pause();
      resolve(data.toString().trim());
    });
  });
}

function clearScreen() {
  process.stdout.write('\x1Bc');
}

// Funciones principales
async function showWelcome() {
  clearScreen();
  console.log('');
  console.log('██████╗ ██████╗ ████████╗    ██████╗  ██████╗ ███████╗');
  console.log('██╔══██╗██╔══██╗╚══██╔══╝    ██╔══██╗██╔═══██╗██╔════╝');
  console.log('██║  ██║██████╔╝   ██║       ██████╔╝██║   ██║███████╗');
  console.log('██║  ██║██╔══██╗   ██║       ██╔═══╝ ██║   ██║╚════██║');
  console.log('██████╔╝██║  ██║   ██║       ██║     ╚██████╔╝███████║');
  console.log('╚═════╝ ╚═╝  ╚═╝   ╚═╝       ╚═╝      ╚═════╝ ╚══════╝');
  console.log('');
  console.log('     🔑 ADMINISTRADOR DE LICENCIAS INDEPENDIENTE 🔑');
  console.log('                  Versión 2.0 - Sin Node.js');
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
}

async function showMenu() {
  console.log('📋 OPCIONES DISPONIBLES:');
  console.log('');
  console.log('   1. 🔑 Obtener Hardware ID de este equipo');
  console.log('   2. 🏭 Generar licencia para cliente (Distribuidor)');
  console.log('   3. � Activar licencia existente (RECOMENDADO)');
  console.log('   4. ℹ️  Ver información del sistema');
  console.log('   5. 🚪 Salir');
  console.log('');
}

async function getHardwareId() {
  console.log('🔑 OBTENER HARDWARE ID');
  console.log('━'.repeat(40));
  
  const licenseService = new LicenseService();
  const hardwareId = licenseService.generateHardwareId();
  const hwInfo = licenseService.getHardwareInfo();
  
  console.log('');
  console.log('📋 Información del Sistema:');
  console.log(`   Equipo: ${hwInfo.hostname}`);
  console.log(`   CPU: ${hwInfo.cpu.substring(0, 50)}...`);
  console.log(`   Plataforma: ${hwInfo.platform} (${hwInfo.arch})`);
  console.log(`   Memoria: ${hwInfo.memory}`);
  console.log('');
  console.log('🔑 HARDWARE ID:');
  console.log('┌' + '─'.repeat(58) + '┐');
  console.log(`│ ${hardwareId.padEnd(56)} │`);
  console.log('└' + '─'.repeat(58) + '┘');
  console.log('');
  console.log('📋 Instrucciones:');
  console.log('   1. Copia el Hardware ID mostrado arriba');
  console.log('   2. Envíalo al proveedor del software');
  console.log('   3. Recibirás un código de licencia específico');
  console.log('');
  
  await question('Presiona Enter para continuar...');
  return hardwareId;
}

async function generateLicense() {
  console.log('🏭 GENERAR LICENCIA PARA CLIENTE');
  console.log('━'.repeat(40));
  console.log('');
  
  // Datos del cliente
  const customerName = await question('👤 Nombre del cliente: ');
  if (!customerName.trim()) {
    console.log('❌ Error: El nombre del cliente es requerido');
    await question('Presiona Enter para continuar...');
    return;
  }
  
  const hardwareId = await question('🔧 Hardware ID del cliente: ');
  if (!hardwareId.trim() || hardwareId.length !== 16) {
    console.log('❌ Error: Hardware ID inválido (debe tener 16 caracteres)');
    await question('Presiona Enter para continuar...');
    return;
  }
  
  const daysInput = await question('📅 Días de validez (Enter = 365): ');
  const days = daysInput.trim() ? parseInt(daysInput) : 365;
  
  if (isNaN(days) || days <= 0) {
    console.log('❌ Error: Número de días inválido');
    await question('Presiona Enter para continuar...');
    return;
  }
  
  console.log('');
  console.log('⏳ Generando licencia...');
  
  const licenseService = new LicenseService();
  const result = licenseService.generateLicense(hardwareId, customerName, days);
  
  if (result.success) {
    console.log('');
    console.log('✅ ¡Licencia generada exitosamente!');
    console.log('');
    console.log('� Archivo guardado en: ' + result.filePath);
    console.log('');
    console.log('��📊 Detalles de la licencia:');
    console.log(`   Cliente: ${result.licenseData.customer}`);
    console.log(`   Hardware ID: ${result.licenseData.hardwareId}`);
    console.log(`   Válida hasta: ${new Date(result.licenseData.expiresAt).toLocaleDateString('es-ES')}`);
    console.log('');
    console.log('🔐 CÓDIGO DE LICENCIA:');
    console.log('┌' + '─'.repeat(78) + '┐');
    
    // Dividir código en líneas de 76 caracteres para mejor visualización
    const code = result.encryptedLicense;
    const chunks = [];
    for (let i = 0; i < code.length; i += 76) {
      chunks.push(code.substring(i, i + 76));
    }
    
    chunks.forEach(chunk => {
      console.log(`│ ${chunk.padEnd(76)} │`);
    });
    
    console.log('└' + '─'.repeat(78) + '┘');
    console.log('');
    
    // Guardar en archivo
    const fileName = `licencia_${customerName.replace(/\s+/g, '_')}_${Date.now()}.txt`;
    const fileContent = `DRT POS - Licencia de Software
================================

Cliente: ${result.licenseData.customer}
Hardware ID: ${result.licenseData.hardwareId}
Generada: ${new Date(result.licenseData.issuedAt).toLocaleString('es-ES')}
Válida hasta: ${new Date(result.licenseData.expiresAt).toLocaleString('es-ES')}

CÓDIGO DE LICENCIA:
${result.encryptedLicense}

INSTRUCCIONES:
1. Enviar este código al cliente
2. El cliente debe usar la opción 3 del administrador
3. La licencia es específica para el Hardware ID proporcionado

© DRT Solutions SAS - ${new Date().getFullYear()}`;
    
    try {
      fs.writeFileSync(fileName, fileContent);
      console.log(`💾 Licencia guardada en: ${fileName}`);
    } catch (error) {
      console.log('⚠️  No se pudo guardar el archivo, pero el código es válido');
    }
  } else {
    console.log('');
    console.log('❌ Error generando licencia:');
    console.log(`   ${result.error}`);
  }
  
  console.log('');
  await question('Presiona Enter para continuar...');
}

// Función para activar/copiar licencia a todas las ubicaciones
async function activateLicense() {
  console.clear();
  console.log('🔓 ACTIVAR LICENCIA EXISTENTE');
  console.log('━'.repeat(40));
  console.log('');
  
  const licenseService = new LicenseService();
  
  // Buscar licencia existente
  let sourceLicensePath = licenseService.findExistingLicense();
  
  if (!sourceLicensePath) {
    console.log('❌ No se encontró ningún archivo de licencia.');
    console.log('');
    console.log('💡 Sugerencia: Primero genera una licencia (opción 2)');
    console.log('');
    await question('Presiona Enter para continuar...');
    return;
  }
  
  console.log(`📄 Licencia encontrada en: ${sourceLicensePath}`);
  console.log('');
  
  // Validar la licencia antes de copiar
  try {
    const licenseContent = fs.readFileSync(sourceLicensePath, 'utf8');
    const decrypted = licenseService.decrypt(licenseContent);
    const licenseData = JSON.parse(decrypted);
    
    // Verificar hardware ID
    const currentHardwareId = licenseService.generateHardwareId();
    if (licenseData.hardwareId !== currentHardwareId) {
      console.log('❌ ADVERTENCIA: Esta licencia fue generada para otro equipo.');
      console.log(`   Licencia para Hardware ID: ${licenseData.hardwareId}`);
      console.log(`   Hardware ID actual: ${currentHardwareId}`);
      console.log('');
      
      const proceed = await question('¿Deseas continuar de todas formas? (s/N): ');
      if (proceed.toLowerCase() !== 's' && proceed.toLowerCase() !== 'si') {
        console.log('❌ Operación cancelada.');
        await question('Presiona Enter para continuar...');
        return;
      }
    }
    
    console.log('✅ Licencia válida para este equipo.');
    console.log(`   Cliente: ${licenseData.client}`);
    console.log(`   Emitida: ${licenseData.issueDate}`);
    console.log(`   Expira: ${licenseData.expiryDate}`);
    console.log('');
    
  } catch (err) {
    console.log('⚠️  No se pudo validar la licencia completamente, pero se intentará copiar.');
    console.log('');
  }
  
  // Copiar licencia a todas las ubicaciones
  console.log('📋 Copiando licencia a todas las ubicaciones necesarias...');
  console.log('');
  
  let copiedCount = 0;
  let errorCount = 0;
  
  // Definir ubicaciones específicas para DRT POS
  const targetLocations = [
    // Directorio actual
    path.join(process.cwd(), 'license.key'),
    // Directorio padre -> DRT-POS-SOFTWARE (caso más común)
    path.join(path.dirname(process.cwd()), 'DRT-POS-SOFTWARE', 'license.key'),
    // Ubicaciones del usuario
    path.join(os.homedir(), 'AppData', 'Local', 'DRT-POS', 'license.key'),
    path.join(os.homedir(), 'Documents', 'DRT-POS', 'license.key'),
    // Ubicaciones relativas comunes
    path.join(process.cwd(), '..', 'DRT-POS-SOFTWARE', 'license.key'),
    path.join(process.cwd(), 'DRT-POS-SOFTWARE', 'license.key')
  ];
  
  // Eliminar duplicados
  const uniqueLocations = [...new Set(targetLocations)];
  
  for (const targetPath of uniqueLocations) {
    try {
      // Crear directorio si no existe
      const targetDir = path.dirname(targetPath);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      
      // Copiar archivo
      fs.copyFileSync(sourceLicensePath, targetPath);
      console.log(`   ✅ ${targetPath}`);
      copiedCount++;
      
    } catch (err) {
      console.log(`   ❌ ${targetPath} - ${err.message}`);
      errorCount++;
    }
  }
  
  console.log('');
  console.log('📊 RESULTADO:');
  console.log(`   ✅ Copias exitosas: ${copiedCount}`);
  console.log(`   ❌ Errores: ${errorCount}`);
  console.log('');
  
  if (copiedCount > 0) {
    console.log('🎉 ¡Licencia activada exitosamente!');
    console.log('');
    console.log('💡 Ahora puedes ejecutar DRT POS normalmente.');
  } else {
    console.log('❌ No se pudo activar la licencia en ninguna ubicación.');
    console.log('');
    console.log('💡 Intenta ejecutar como administrador o verifica los permisos.');
  }
  
  console.log('');
  await question('Presiona Enter para continuar...');
}

async function installLicense() {
  console.log('📦 INSTALAR LICENCIA DE CLIENTE');
  console.log('━'.repeat(40));
  console.log('');
  
  const licenseService = new LicenseService();
  const currentHardwareId = licenseService.generateHardwareId();
  
  console.log(`🔧 Hardware ID de este equipo: ${currentHardwareId}`);
  console.log('');
  console.log('📋 Instrucciones:');
  console.log('   1. Pega el código completo de licencia que recibiste');
  console.log('   2. Asegúrate de copiar TODO el código');
  console.log('   3. Presiona Enter dos veces para instalar');
  console.log('');
  
  const licenseCode = await question('🔐 Pega el código de licencia: ');
  
  if (!licenseCode.trim()) {
    console.log('❌ Error: No se proporcionó código de licencia');
    await question('Presiona Enter para continuar...');
    return;
  }
  
  console.log('');
  console.log('⏳ Instalando licencia...');
  
  const result = licenseService.installLicense(licenseCode.trim());
  
  console.log('');
  if (result.success) {
    console.log('✅ ¡Licencia instalada correctamente!');
    console.log('');
    console.log('🎉 El software DRT POS ahora puede ejecutarse en este equipo');
    console.log('');
    console.log('📋 Próximos pasos:');
    console.log('   1. Cierra este administrador');
    console.log('   2. Ejecuta "DRT POS.exe"');
    console.log('   3. ¡Disfruta del software!');
  } else {
    console.log('❌ Error instalando licencia:');
    console.log(`   ${result.message}`);
    console.log('');
    console.log('🔧 Posibles soluciones:');
    console.log('   • Verifica que hayas copiado el código completo');
    console.log('   • Confirma que la licencia sea para este Hardware ID');
    console.log('   • Contacta al proveedor si el problema persiste');
  }
  
  console.log('');
  await question('Presiona Enter para continuar...');
}

async function showSystemInfo() {
  console.log('ℹ️ INFORMACIÓN DEL SISTEMA');
  console.log('━'.repeat(40));
  
  const licenseService = new LicenseService();
  const hwInfo = licenseService.getHardwareInfo();
  const hardwareId = licenseService.generateHardwareId();
  
  console.log('');
  console.log('🖥️  Información del Hardware:');
  console.log(`   Nombre del equipo: ${hwInfo.hostname}`);
  console.log(`   Procesador: ${hwInfo.cpu}`);
  console.log(`   Plataforma: ${hwInfo.platform}`);
  console.log(`   Arquitectura: ${hwInfo.arch}`);
  console.log(`   Memoria total: ${hwInfo.memory}`);
  console.log(`   MAC Address: ${hwInfo.mac}`);
  console.log(`   Tiempo encendido: ${hwInfo.uptime} horas`);
  console.log('');
  console.log('🔑 Identificación:');
  console.log(`   Hardware ID: ${hardwareId}`);
  console.log('');
  console.log('📁 Archivos de Licencia:');
  console.log(`   Ubicación principal: ${licenseService.licenseFile}`);
  
  // Buscar licencias existentes en todas las ubicaciones
  const existingLicense = licenseService.findExistingLicense();
  let licenseInfo = null;
  
  if (existingLicense) {
    console.log(`   ✅ Licencia encontrada en: ${existingLicense}`);
    
    // Verificar todas las ubicaciones posibles
    console.log('');
    console.log('🔍 Estado en todas las ubicaciones:');
    licenseService.allPossiblePaths.forEach((licensePath, index) => {
      if (fs.existsSync(licensePath)) {
        console.log(`   ${index + 1}. ✅ ${licensePath}`);
      } else {
        console.log(`   ${index + 1}. ❌ ${licensePath}`);
      }
    });
    
    // Intentar leer información de la licencia
    try {
      const licenseContent = fs.readFileSync(existingLicense, 'utf8');
      const validation = licenseService.validateLicenseCode(licenseContent);
      licenseInfo = validation;
      
      console.log('');
      if (validation.valid) {
        console.log('   Validez: ✅ Licencia válida');
        console.log(`   Cliente: ${validation.data.customer}`);
        console.log(`   Emitida: ${new Date(validation.data.issuedAt).toLocaleDateString('es-ES')}`);
        console.log(`   Expira: ${new Date(validation.data.expiresAt).toLocaleDateString('es-ES')}`);
      } else {
        console.log('   Validez: ❌ Licencia inválida o expirada');
        console.log(`   Razón: ${validation.message}`);
      }
    } catch (error) {
      console.log('   Validez: ⚠️  Error leyendo licencia');
      console.log(`   Error: ${error.message}`);
    }
  } else {
    console.log('   ❌ No se encontró licencia en ninguna ubicación');
    console.log('');
    console.log('🔍 Ubicaciones verificadas:');
    licenseService.allPossiblePaths.forEach((licensePath, index) => {
      console.log(`   ${index + 1}. ${licensePath}`);
    });
  }
  
  console.log('');
  await question('Presiona Enter para continuar...');
}

// Función principal
async function main() {
  while (true) {
    await showWelcome();
    await showMenu();
    
    const choice = await question('👉 Selecciona una opción (1-5): ');
    console.log('');
    
    switch (choice.trim()) {
      case '1':
        await getHardwareId();
        break;
      case '2':
        await generateLicense();
        break;
      case '3':
        await activateLicense();
        break;
      case '4':
        await showSystemInfo();
        break;
      case '5':
        console.log('👋 ¡Gracias por usar DRT POS License Manager!');
        console.log('');
        process.exit(0);
        break;
      default:
        console.log('❌ Opción inválida. Por favor selecciona 1-5.');
        await question('Presiona Enter para continuar...');
        break;
    }
  }
}

// Iniciar aplicación
if (require.main === module) {
  main().catch(error => {
    console.error('Error fatal:', error);
    process.exit(1);
  });
}

module.exports = { LicenseService };