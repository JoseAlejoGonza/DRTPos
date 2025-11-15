@echo off
echo.
echo ========================================
echo    SIMULADOR DE VENTA DRT POS
echo ========================================
echo.

REM Colores para mejor visualización
set "reset=[0m"
set "bold=[1m"
set "red=[31m"
set "green=[32m"
set "yellow=[33m"
set "blue=[34m"

echo %bold%%blue%Paso 1: Verificando artefacto de distribucion...%reset%
if not exist "release\win-unpacked\DRT POS.exe" (
    echo %red%ERROR: Artefacto no encontrado. Ejecutando build...%reset%
    call npm run build:folder-only
    if errorlevel 1 (
        echo %red%ERROR: Fallo en la construccion del artefacto%reset%
        pause
        exit /b 1
    )
) else (
    echo %green%✓ Artefacto encontrado%reset%
)

echo.
echo %bold%%blue%Paso 2: Creando carpeta de cliente simulado...%reset%
if exist "C:\Temp\Cliente-DRT-POS" rmdir /s /q "C:\Temp\Cliente-DRT-POS"
mkdir "C:\Temp\Cliente-DRT-POS"
xcopy "release\win-unpacked\*" "C:\Temp\Cliente-DRT-POS\" /E /I /Q
echo %green%✓ Artefacto copiado a carpeta de cliente%reset%

echo.
echo %bold%%blue%Paso 3: Generando licencia para este hardware...%reset%
node test-license-generator.js > temp-license-output.txt
if errorlevel 1 (
    echo %red%ERROR: No se pudo generar la licencia%reset%
    pause
    exit /b 1
)

REM Extraer el código de licencia del archivo de salida
for /f "usebackq delims=" %%i in ("test-license.txt") do set "LICENSE_CODE=%%i"
echo %green%✓ Licencia generada exitosamente%reset%

echo.
echo %bold%%yellow%========================================%reset%
echo %bold%%yellow%        INFORMACION DEL CLIENTE%reset% 
echo %bold%%yellow%========================================%reset%
echo.
echo %bold%Carpeta del cliente:%reset% C:\Temp\Cliente-DRT-POS
echo %bold%Ejecutable:%reset% DRT POS.exe
echo %bold%Estado sin licencia:%reset% Se cierra con error
echo.
echo %bold%%green%Codigo de licencia generado:%reset%
type test-license.txt
echo.

echo %bold%%yellow%========================================%reset%
echo %bold%%yellow%      INSTRUCCIONES DE PRUEBA%reset%
echo %bold%%yellow%========================================%reset%
echo.
echo %bold%1. PRUEBA SIN LICENCIA:%reset%
echo    - Ir a: cd "C:\Temp\Cliente-DRT-POS"
echo    - Ejecutar: "DRT POS.exe"
echo    - Resultado esperado: Se cierra con error de licencia
echo.
echo %bold%2. INSTALACION DE LICENCIA:%reset%
echo    - Ejecutar aplicacion desde modo desarrollo: npm run dev
echo    - Ir a seccion "Licencias" en el menu
echo    - Pegar el codigo de licencia mostrado arriba  
echo    - Hacer clic en "Instalar Licencia"
echo    - Verificar que muestre "Valida"
echo.
echo %bold%3. PRUEBA CON LICENCIA:%reset%
echo    - Cerrar modo desarrollo
echo    - Ejecutar: cd "C:\Temp\Cliente-DRT-POS" && "DRT POS.exe"  
echo    - Resultado esperado: Aplicacion funciona normalmente
echo.

echo %bold%%green%========================================%reset%
echo %bold%%green%         SIMULACION COMPLETA%reset%
echo %bold%%green%========================================%reset%
echo.
echo Este simulador ha creado un escenario completo de venta:
echo ✓ Artefacto de distribucion listo
echo ✓ Carpeta de cliente simulada  
echo ✓ Licencia especifica generada
echo ✓ Manual de instrucciones mostrado
echo.
echo %bold%Siguiente paso:%reset% Seguir las instrucciones de prueba arriba
echo %bold%Para soporte:%reset% Revisar MANUAL-VENTA-LICENCIAS.md
echo.

REM Limpiar archivos temporales
if exist "temp-license-output.txt" del "temp-license-output.txt"

echo Presione cualquier tecla para continuar...
pause >nul