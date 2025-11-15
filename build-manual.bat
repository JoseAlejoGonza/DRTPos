@echo off
echo ========================================
echo DRT POS - Metodo Manual de Emergencia
echo ========================================

echo.
echo Este script crea una version portable manualmente
echo sin usar electron-builder (que esta fallando)
echo.

echo Paso 1: Verificando Angular build...
if not exist "frontend\dist\frontend\index.html" (
    echo Build de Angular no encontrado. Ejecutando...
    cd frontend
    call ng build --configuration=electron
    cd ..
)

echo.
echo Paso 2: Creando estructura manual...
if not exist "release-manual" mkdir "release-manual"
if not exist "release-manual\app" mkdir "release-manual\app"

echo.
echo Paso 3: Copiando archivos...
xcopy /E /I /Y "frontend\dist\frontend\*" "release-manual\app\frontend\"
xcopy /E /I /Y "electron\*" "release-manual\app\electron\"
copy "package.json" "release-manual\app\"

echo.
echo Paso 4: Creando script de ejecucion...
echo @echo off > "release-manual\DRT-POS.bat"
echo cd app >> "release-manual\DRT-POS.bat"
echo node electron/main.js >> "release-manual\DRT-POS.bat"
echo pause >> "release-manual\DRT-POS.bat"

echo.
echo Paso 5: Instalando dependencias en release...
cd "release-manual\app"
call npm install --production
cd ..\..

echo.
echo ========================================
echo ¡VERSION MANUAL CREADA!
echo ========================================
echo.
echo Para ejecutar: release-manual\DRT-POS.bat
echo.
echo Esta version requiere Node.js en el PC destino
echo pero NO requiere electron-builder
echo.
pause