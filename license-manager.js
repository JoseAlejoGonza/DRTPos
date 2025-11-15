const LicenseService = require('./electron/license.service');
const readline = require('readline');
const fs = require('fs');
const os = require('os');

/**
 * DRT POS - Herramienta Unificada de Licencias
 * - Obtener Hardware ID
 * - Generar licencias para clientes
 * - Todo en una sola herramienta
 */

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise(resolve => {
    rl.question(prompt, resolve);
  });
}

function showBanner() {
  console.clear();
  console.log('██████╗ ██████╗ ████████╗    ██████╗  ██████╗ ███████╗');
  console.log('██╔══██╗██╔══██╗╚══██╔══╝    ██╔══██╗██╔═══██╗██╔════╝');
  console.log('██║  ██║██████╔╝   ██║       ██████╔╝██║   ██║███████╗');
  console.log('██║  ██║██╔══██╗   ██║       ██╔═══╝ ██║   ██║╚════██║');
  console.log('██████╔╝██║  ██║   ██║       ██║     ╚██████╔╝███████║');
  console.log('╚═════╝ ╚═╝  ╚═╝   ╚═╝       ╚═╝      ╚═════╝ ╚══════╝');
  console.log('');
  console.log('🔧 Herramienta de Gestión de Licencias v1.0');
  console.log('━'.repeat(60));
  console.log('');
}

async function getHardwareID() {
  console.log('🔍 OBTENER HARDWARE ID');
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
  
  // Hardware ID del cliente
  console.log('');
  const hardwareId = await question('💻 Hardware ID del cliente (16 caracteres): ');
  if (hardwareId.length !== 16) {
    console.log(`❌ Error: Hardware ID debe tener exactamente 16 caracteres (actual: ${hardwareId.length})`);
    await question('Presiona Enter para continuar...');
    return;
  }
  
  // Duración de la licencia
  console.log('');
  const daysInput = await question('📅 Días de validez (Enter = 365): ');
  const days = parseInt(daysInput) || 365;
  
  console.log('');
  console.log('⚙️  Generando licencia...');
  
  try {
    // Crear licencia
    const licenseService = new LicenseService();
    licenseService.hardwareId = hardwareId; // Usar el Hardware ID del cliente
    
    const encryptedLicense = licenseService.generateLicense(customerName, days);
    
    // Calcular fecha de expiración
    const expirationDate = new Date(Date.now() + (days * 24 * 60 * 60 * 1000));
    
    console.clear();
    console.log('✅ LICENCIA GENERADA EXITOSAMENTE');
    console.log('━'.repeat(60));
    console.log('');
    console.log('📋 Detalles de la Licencia:');
    console.log(`   Cliente: ${customerName}`);
    console.log(`   Hardware ID: ${hardwareId}`);
    console.log(`   Válida por: ${days} días`);
    console.log(`   Expira el: ${expirationDate.toLocaleDateString()}`);
    console.log(`   Generada: ${new Date().toLocaleString()}`);
    console.log('');
    console.log('🔐 CÓDIGO DE LICENCIA:');
    console.log('┌' + '─'.repeat(78) + '┐');
    
    // Dividir el código en líneas de 76 caracteres para mejor visualización
    const lineLength = 76;
    for (let i = 0; i < encryptedLicense.length; i += lineLength) {
      const line = encryptedLicense.substring(i, i + lineLength);
      console.log(`│ ${line.padEnd(lineLength)} │`);
    }
    
    console.log('└' + '─'.repeat(78) + '┘');
    console.log('');
    
    // Guardar en archivo
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `licencia-${customerName.replace(/[^a-zA-Z0-9]/g, '')}-${timestamp}.txt`;
    
    const licenseInfo = [
      `DRT POS - Código de Licencia`,
      `Generated: ${new Date().toLocaleString()}`,
      `Customer: ${customerName}`,
      `Hardware ID: ${hardwareId}`,
      `Valid for: ${days} days`,
      `Expires: ${expirationDate.toLocaleDateString()}`,
      ``,
      `License Code:`,
      encryptedLicense,
      ``,
      `Instructions:`,
      `1. Copy the license code above`,
      `2. Open DRT POS software`,
      `3. Go to Licenses section`,
      `4. Paste the code and click "Install License"`
    ].join('\n');
    
    fs.writeFileSync(filename, licenseInfo);
    
    console.log('💾 ARCHIVO GUARDADO:');
    console.log(`   📄 ${filename}`);
    console.log('');
    console.log('📨 INSTRUCCIONES PARA EL CLIENTE:');
    console.log('   1. Copia el código de licencia completo');
    console.log('   2. Abre el software DRT POS');
    console.log('   3. Ve a la sección "Licencias" en el menú');
    console.log('   4. Pega el código y haz clic en "Instalar Licencia"');
    console.log('');
    
  } catch (error) {
    console.log('❌ Error generando licencia:', error.message);
  }
  
  await question('Presiona Enter para continuar...');
}

async function showMenu() {
  while (true) {
    showBanner();
    
    console.log('📋 OPCIONES DISPONIBLES:');
    console.log('');
    console.log('   1️⃣  Obtener Hardware ID de este equipo');
    console.log('   2️⃣  Generar licencia para cliente');
    console.log('   3️⃣  Información del sistema');
    console.log('   4️⃣  Salir');
    console.log('');
    
    const option = await question('🎯 Selecciona una opción (1-4): ');
    
    switch (option) {
      case '1':
        await getHardwareID();
        break;
        
      case '2':
        await generateLicense();
        break;
        
      case '3':
        await showSystemInfo();
        break;
        
      case '4':
        console.log('');
        console.log('👋 ¡Gracias por usar DRT POS License Manager!');
        console.log('');
        rl.close();
        return;
        
      default:
        console.log('❌ Opción inválida. Presiona Enter para continuar...');
        await question('');
    }
  }
}

async function showSystemInfo() {
  console.log('💻 INFORMACIÓN DEL SISTEMA');
  console.log('━'.repeat(40));
  
  const licenseService = new LicenseService();
  const hwInfo = licenseService.getHardwareInfo();
  
  console.log('');
  console.log(`🖥️  Nombre del equipo: ${hwInfo.hostname}`);
  console.log(`🔧 Procesador: ${hwInfo.cpu}`);
  console.log(`💿 Plataforma: ${hwInfo.platform}`);
  console.log(`🏗️  Arquitectura: ${hwInfo.arch}`);
  console.log(`🧠 Memoria RAM: ${hwInfo.memory}`);
  console.log(`🔑 Hardware ID: ${hwInfo.hardwareId}`);
  console.log('');
  
  await question('Presiona Enter para continuar...');
}

// Iniciar aplicación
if (require.main === module) {
  console.log('Iniciando DRT POS License Manager...');
  setTimeout(() => {
    showMenu().catch(error => {
      console.error('Error:', error);
      rl.close();
    });
  }, 1000);
}

module.exports = {
  getHardwareID,
  generateLicense
};