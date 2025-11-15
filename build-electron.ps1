# DRT POS Build Script - PowerShell Version
# Run as: .\build-electron.ps1

Write-Host "========================================" -ForegroundColor Green
Write-Host "Building DRT POS Electron Application" -ForegroundColor Green  
Write-Host "========================================" -ForegroundColor Green

# Function to check if running as administrator
function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# Check administrator status
if (Test-Administrator) {
    Write-Host "Running with administrator privileges - Good!" -ForegroundColor Yellow
} else {
    Write-Host "Running without administrator privileges - Using no-sign build method" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Step 1: Cleaning cache and previous builds..." -ForegroundColor Cyan

# Clean electron-builder cache
$cacheDir = "$env:LOCALAPPDATA\electron-builder\Cache"
if (Test-Path $cacheDir) {
    Write-Host "Clearing electron-builder cache..." -ForegroundColor Yellow
    try {
        Remove-Item $cacheDir -Recurse -Force -ErrorAction SilentlyContinue
    } catch {
        Write-Host "Cache cleanup partial - continuing..." -ForegroundColor Yellow
    }
}

# Clean previous release
if (Test-Path "release") {
    Write-Host "Clearing previous release..." -ForegroundColor Yellow
    Remove-Item "release" -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "Step 2: Installing dependencies..." -ForegroundColor Cyan
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to install dependencies" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "Step 3: Installing frontend dependencies..." -ForegroundColor Cyan
Set-Location frontend
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to install frontend dependencies" -ForegroundColor Red
    Set-Location ..
    Read-Host "Press Enter to exit"
    exit 1
}
Set-Location ..

Write-Host ""
Write-Host "Step 4: Building Angular application..." -ForegroundColor Cyan
npm run build:web:electron
if ($LASTEXITCODE -ne 0) {
    Write-Host "WARNING: Electron build failed, trying production build..." -ForegroundColor Yellow
    npm run build:web
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Both Angular builds failed" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}

Write-Host ""
Write-Host "Step 5: Building Electron application..." -ForegroundColor Cyan

# Try different build methods in order of preference
$buildSuccess = $false

# Method 1: No-sign build (most compatible)
Write-Host "Trying no-sign build method..." -ForegroundColor Yellow
npm run build:electron:no-sign
if ($LASTEXITCODE -eq 0) {
    $buildSuccess = $true
    Write-Host "No-sign build succeeded!" -ForegroundColor Green
} else {
    Write-Host "No-sign build failed, trying portable..." -ForegroundColor Yellow
    
    # Method 2: Portable build
    npm run build:portable
    if ($LASTEXITCODE -eq 0) {
        $buildSuccess = $true
        Write-Host "Portable build succeeded!" -ForegroundColor Green
    } else {
        Write-Host "Portable build failed, trying directory build..." -ForegroundColor Yellow
        
        # Method 3: Directory only (no installer)
        npm run dist:simple
        if ($LASTEXITCODE -eq 0) {
            $buildSuccess = $true
            Write-Host "Directory build succeeded!" -ForegroundColor Green
        }
    }
}

if ($buildSuccess) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "SUCCESS: Build completed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Check the 'release' folder for:" -ForegroundColor Cyan
    if (Test-Path "release\*.exe") {
        Write-Host "- Installer (.exe)" -ForegroundColor Green
    }
    if (Test-Path "release\win-unpacked") {
        Write-Host "- Portable version (win-unpacked folder)" -ForegroundColor Green
        Write-Host "  Run: release\win-unpacked\DRT POS.exe" -ForegroundColor Yellow
    }
    Write-Host "========================================" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "ERROR: All build methods failed" -ForegroundColor Red
    Write-Host ""
    Write-Host "TROUBLESHOOTING SUGGESTIONS:" -ForegroundColor Yellow
    Write-Host "1. Run PowerShell as Administrator" -ForegroundColor White
    Write-Host "2. Clear all caches: npm run clean:cache" -ForegroundColor White
    Write-Host "3. Check Windows Defender exclusions" -ForegroundColor White
    Write-Host "4. Try building on a different machine" -ForegroundColor White
    Write-Host "========================================" -ForegroundColor Red
}

Read-Host "Press Enter to exit"