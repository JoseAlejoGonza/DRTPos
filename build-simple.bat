@echo off
echo ========================================
echo DRT POS - Build Simple (Solo Carpeta)
echo ========================================

echo.
echo Paso 1: Limpiando archivos anteriores...
if exist "release" (
    rmdir /s /q "release" 2>nul
    echo - Release folder eliminado
)

echo.
echo Paso 2: Construyendo Angular...
cd frontend
call ng build --configuration=electron
if %errorlevel% neq 0 (
    echo ERROR: Fallo el build de Angular
    echo Intentando con configuracion production...
    call ng build --configuration=production
    if %errorlevel% neq 0 (
        echo ERROR: Ambos builds de Angular fallaron
        pause
        exit /b 1
    )
)
cd ..

echo.
echo Paso 3: Creando carpeta ejecutable (sin instalador)...
call npx electron-builder --win dir --publish=never
if %errorlevel% neq 0 (
    echo ERROR: Fallo electron-builder
    echo.
    echo Verificando si se creo la carpeta sin empaquetar...
    if exist "release\win-unpacked" (
        echo.
        echo ¡EXITO PARCIAL!
        echo La aplicacion se creo en: release\win-unpacked\
        echo Puedes ejecutar: release\win-unpacked\DRT POS.exe
    ) else (
        echo No se encontro carpeta ejecutable
    )
    pause
    exit /b 1
)

echo.
echo ========================================
echo ¡EXITO! Aplicacion creada
echo ========================================
echo.
echo La aplicacion esta en: release\win-unpacked\
echo Para ejecutar: release\win-unpacked\DRT POS.exe
echo.
echo Esta carpeta es portable - puedes copiarla a otro PC
echo y funcionara sin instalacion.
echo.
pause