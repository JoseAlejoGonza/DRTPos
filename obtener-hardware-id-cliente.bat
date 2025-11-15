@echo off
echo.
echo ========================================
echo     OBTENER HARDWARE ID - DRT POS
echo ========================================
echo.

REM Verificar si Node.js está instalado
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ ERROR: Node.js no está instalado en este equipo
    echo.
    echo Para obtener el Hardware ID:
    echo 1. Contacte al soporte técnico
    echo 2. O instale Node.js desde: https://nodejs.org
    echo.
    pause
    exit /b 1
)

echo ✅ Node.js encontrado. Generando Hardware ID...
echo.

REM Crear script temporal
echo const os = require('os'); > temp_hwid.js
echo const crypto = require('crypto'); >> temp_hwid.js
echo const { networkInterfaces } = require('os'); >> temp_hwid.js
echo const interfaces = networkInterfaces(); >> temp_hwid.js
echo let macAddress = ''; >> temp_hwid.js
echo for (const name of Object.keys(interfaces)) { >> temp_hwid.js
echo   for (const iface of interfaces[name]) { >> temp_hwid.js
echo     if (!iface.internal ^&^& iface.mac !== '00:00:00:00:00:00') { >> temp_hwid.js
echo       macAddress = iface.mac; >> temp_hwid.js
echo       break; >> temp_hwid.js
echo     } >> temp_hwid.js
echo   } >> temp_hwid.js
echo   if (macAddress) break; >> temp_hwid.js
echo } >> temp_hwid.js
echo const cpuModel = os.cpus()[0].model; >> temp_hwid.js
echo const platform = os.platform(); >> temp_hwid.js
echo const combinedInfo = `${macAddress}-${cpuModel}-${platform}`; >> temp_hwid.js
echo const hardwareId = crypto.createHash('sha256').update(combinedInfo).digest('hex'); >> temp_hwid.js
echo console.log('Hardware ID:', hardwareId); >> temp_hwid.js

REM Ejecutar script
node temp_hwid.js

REM Limpiar archivo temporal
del temp_hwid.js

echo.
echo ========================================
echo        INSTRUCCIONES PARA EL CLIENTE
echo ========================================
echo.
echo 1. Copie el Hardware ID mostrado arriba
echo 2. Envíelo al proveedor del software
echo 3. Recibirá un código de licencia específico
echo 4. Instale la licencia desde la aplicación
echo.
echo Para soporte técnico contacte al proveedor
echo.
pause