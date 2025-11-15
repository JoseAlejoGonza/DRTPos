# 🚀 Manual Completo: Venta de DRT POS con Sistema de Licencias

## 📦 **PARTE 1: PREPARACIÓN DEL ARTEFACTO PARA EL CLIENTE**

### Paso 1: Crear el Paquete de Distribución
```bash
# En la carpeta del proyecto
npm run build:folder-only
```

**Resultado:** Se crea la carpeta `release/win-unpacked/` que contiene:
- `DRT POS.exe` - Ejecutable principal 
- Archivos de soporte y dependencias
- **IMPORTANTE**: No incluye archivo de licencia (por seguridad)

### Paso 2: Comprimir para Envío
```bash
# Crear ZIP del contenido de win-unpacked
# Nombre sugerido: DRT-POS-v1.0-Setup.zip
```

---

## 💰 **PARTE 2: PROCESO DE VENTA AL CLIENTE**

### Escenario de Venta:
1. **Cliente interesado** contacta por WhatsApp/email
2. **Demostración** del software (screenshots/video)
3. **Negociación** de precio y términos
4. **Entrega** del archivo ZIP
5. **Activación** mediante licencia específica

---

## 🔧 **PARTE 3: GENERACIÓN DE LICENCIAS (PROVEEDOR)**

### Paso 1: Cliente Instala y Ejecuta
El cliente descomprime y ejecuta `DRT POS.exe`:
- ❌ **Se cierra inmediatamente** con mensaje de error
- 💬 **Mensaje mostrado**: "Este software requiere una licencia válida para funcionar"
- 📞 **Cliente contacta** al proveedor

### Paso 2: Obtener Hardware ID del Cliente
**Opción A - Cliente técnico:**
```bash
# Cliente ejecuta desde línea de comandos
cd "ruta-donde-descomprimió"
node -e "
const os = require('os');
const crypto = require('crypto');
const { networkInterfaces } = require('os');
const interfaces = networkInterfaces();
let macAddress = '';
for (const name of Object.keys(interfaces)) {
  for (const iface of interfaces[name]) {
    if (!iface.internal && iface.mac !== '00:00:00:00:00:00') {
      macAddress = iface.mac;
      break;
    }
  }
  if (macAddress) break;
}
const cpuModel = os.cpus()[0].model;
const platform = os.platform();
const combinedInfo = \`\${macAddress}-\${cpuModel}-\${platform}\`;
const hardwareId = crypto.createHash('sha256').update(combinedInfo).digest('hex');
console.log('Hardware ID:', hardwareId);
"
```

**Opción B - Cliente no técnico:**
- Proveedor se conecta remotamente (TeamViewer/AnyDesk)
- Proveedor ejecuta el comando y obtiene el Hardware ID

### Paso 3: Generar Licencia Específica
```bash
# En la máquina del proveedor
cd C:\workspaceDRT\DRTPos
node generate-license.js

# Seguir las instrucciones interactivas:
# 1. Ingresar nombre del cliente
# 2. Pegar Hardware ID del cliente  
# 3. Especificar duración (días)
# 4. Copiar código de licencia generado
```

**Ejemplo de salida:**
```
🔐 Código de licencia encriptado:
────────────────────────────────────────────────────────────────────────────────
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2g3h4i5j6k7l8m9n0
────────────────────────────────────────────────────────────────────────────────
```

---

## 🎯 **PARTE 4: ACTIVACIÓN DE LICENCIA (CLIENTE)**

### Paso 1: Instalar Licencia
1. **Recibir código** del proveedor via WhatsApp/Email
2. **Ejecutar aplicación** - esta vez se abrirá normalmente
3. **Ir a sección "Licencias"** en el menú izquierdo
4. **Pegar código** en el campo "Código de Licencia"
5. **Hacer clic** en "Instalar Licencia" 
6. **Verificar estado** - debe mostrar "Válida" con días restantes

### Paso 2: Uso Normal
- ✅ **Aplicación funcional** completamente
- 📅 **Licencia vigente** por período contratado  
- 🔄 **Renovación** contactando al proveedor antes del vencimiento

---

## 🧪 **PARTE 5: PRUEBA COMPLETA DEL SISTEMA**

### Simulación de Venta Paso a Paso:

#### Como Proveedor:
```bash
# 1. Crear artefacto
npm run build:folder-only

# 2. Simular envío - copiar carpeta a otra ubicación
xcopy "release\win-unpacked" "C:\Temp\Cliente-DRT-POS" /E /I

# 3. Ejecutar como cliente (sin licencia)
cd "C:\Temp\Cliente-DRT-POS"
"DRT POS.exe"  # Se debe cerrar con error

# 4. Generar licencia para este equipo
cd C:\workspaceDRT\DRTPos
node test-license-generator.js

# 5. Copiar código generado
```

#### Como Cliente:
```bash
# 1. Ejecutar aplicación (ahora funcionará en modo dev bypass)
cd "C:\Temp\Cliente-DRT-POS"  
"DRT POS.exe"

# 2. Ir a sección "Licencias"
# 3. Pegar código de licencia
# 4. Verificar activación exitosa
# 5. Usar todas las funciones del POS
```

---

## 💡 **CONSEJOS COMERCIALES**

### Precios Sugeridos:
- **Licencia mensual**: $50-100 USD
- **Licencia anual**: $300-600 USD  
- **Licencia perpetua**: $800-1500 USD
- **Soporte técnico**: $20-50 USD/hora

### Argumentos de Venta:
- ✅ **Software profesional** completo
- ✅ **Inventario, ventas, reportes**
- ✅ **Impresión de facturas** 
- ✅ **Base de datos integrada**
- ✅ **Interfaz moderna** e intuitiva
- ✅ **Soporte técnico** incluido
- ✅ **Actualizaciones** por período de licencia

### Términos de Licencia:
- 🔒 **Una licencia = Un equipo**
- 🔄 **Transferencia** previo aviso al proveedor
- 📞 **Soporte incluido** durante vigencia
- 🆕 **Actualizaciones gratuitas** durante vigencia
- ⚠️ **Sin licencia = Sin funcionamiento**

---

## 🔧 **HERRAMIENTAS INCLUIDAS**

1. **`generate-license.js`** - Generador interactivo de licencias
2. **`test-license-generator.js`** - Licencias de prueba para desarrollo  
3. **`production-test-instructions.json`** - Guía de pruebas
4. **Manual de usuario** (este archivo)

---

## 📋 **CHECKLIST DE ENTREGA**

### Antes de Enviar al Cliente:
- [ ] Build completo generado (`npm run build:folder-only`)
- [ ] Carpeta comprimida con nombre claro
- [ ] Manual de instalación incluido
- [ ] Contacto de soporte proporcionado

### Después de la Venta:
- [ ] Hardware ID del cliente obtenido
- [ ] Licencia específica generada 
- [ ] Código enviado de forma segura
- [ ] Activación verificada con el cliente
- [ ] Datos del cliente registrados para soporte

¡Tu sistema DRT POS está listo para venta comercial profesional! 🚀