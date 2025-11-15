@echo off
echo ========================================
echo Building DRT POS Electron Application
echo ========================================

echo.
echo Step 1: Cleaning cache and temp files...
if exist "C:\Users\%USERNAME%\AppData\Local\electron-builder\Cache" (
    echo Clearing electron-builder cache...
    rmdir /s /q "C:\Users\%USERNAME%\AppData\Local\electron-builder\Cache" 2>nul
)
if exist "release" (
    echo Clearing previous release...
    rmdir /s /q "release" 2>nul
)

echo.
echo Step 2: Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo Step 3: Installing frontend dependencies...
cd frontend
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install frontend dependencies
    pause
    exit /b 1
)
cd ..

echo.
echo Step 4: Building Angular application (Electron configuration)...
call npm run build:web:electron
if %errorlevel% neq 0 (
    echo WARNING: Electron build failed, trying production build...
    call npm run build:web
    if %errorlevel% neq 0 (
        echo ERROR: Both builds failed
        pause
        exit /b 1
    )
)

echo.
echo Step 5: Building Electron installer (no-sign mode)...
call npx electron-builder --publish=never --config.win.signAndEditExecutable=false --config.compression=store
if %errorlevel% neq 0 (
    echo ERROR: Failed to build Electron installer
    echo Trying alternative build method...
    call npx electron-builder --win portable --publish=never
    if %errorlevel% neq 0 (
        echo ERROR: All build methods failed
        echo.
        echo ALTERNATIVE: Creating portable version...
        if exist "release\win-unpacked" (
            echo Found unpacked version at: release\win-unpacked\
            echo You can run the application directly from there
            echo or compress it manually into a ZIP file
        )
        pause
        exit /b 1
    )
)

echo.
echo ========================================
echo SUCCESS: Build completed!
echo Check the 'release' folder for:
echo - Installer (.exe)
echo - Portable version (win-unpacked folder)
echo ========================================
pause