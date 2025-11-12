# StreamForge Project Setup Script
# Run this script for first-time project setup

Write-Host "🎮 StreamForge Project Setup" -ForegroundColor Green
Write-Host "==============================" -ForegroundColor Green

# Check prerequisites
Write-Host "`n🔍 Checking prerequisites..." -ForegroundColor Cyan

# Check Bun
$bunPath = Get-Command "bun" -ErrorAction SilentlyContinue
if ($bunPath) {
    $bunVersion = bun --version
    Write-Host "  ✅ Bun $bunVersion installed" -ForegroundColor Green
} else {
    Write-Host "  ❌ Bun not found. Please install Bun from https://bun.sh" -ForegroundColor Red
    Write-Host "     Run: powershell -c 'irm bun.sh/install.ps1 | iex'" -ForegroundColor Yellow
    exit 1
}

# Check Godot (optional)
$godotPath = Get-Command "godot" -ErrorAction SilentlyContinue
if ($godotPath) {
    Write-Host "  ✅ Godot CLI available" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Godot CLI not in PATH (you can still use Godot Editor)" -ForegroundColor Yellow
    Write-Host "     Download from: https://godotengine.org/download" -ForegroundColor Gray
}

# Install dependencies
Write-Host "`n📦 Installing dependencies..." -ForegroundColor Cyan

Write-Host "Installing root package dependencies..." -ForegroundColor Yellow
bun install

Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
Set-Location "backend"
bun install
Set-Location ".."

# Setup environment files
Write-Host "`n⚙️  Setting up configuration..." -ForegroundColor Cyan

if (-not (Test-Path "backend/.env")) {
    Write-Host "Creating backend .env file from template..." -ForegroundColor Yellow
    Copy-Item "backend/.env.example" "backend/.env"
    Write-Host "  ✅ Created backend/.env (you may want to customize it)" -ForegroundColor Green
} else {
    Write-Host "  ✅ Backend .env already exists" -ForegroundColor Green
}

# Create logs directory
$logsDir = "backend/logs"
if (-not (Test-Path $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
    Write-Host "  ✅ Created logs directory" -ForegroundColor Green
}

# Verify setup
Write-Host "`n🔧 Verifying setup..." -ForegroundColor Cyan

Write-Host "Running type check..." -ForegroundColor Yellow
Set-Location "backend"
$typeCheck = bun run type-check
Set-Location ".."

if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✅ TypeScript compilation successful" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  TypeScript issues found (check output above)" -ForegroundColor Yellow
}

# Load development scripts
Write-Host "`n🚀 Loading development scripts..." -ForegroundColor Cyan
Import-Module ".\scripts.ps1" -Force

Write-Host "`n✅ Setup Complete!" -ForegroundColor Green
Write-Host "==================" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "1. Run 'Start-Backend' to start the backend server" -ForegroundColor White
Write-Host "2. Run 'Open-Game' to open the game in Godot Editor" -ForegroundColor White
Write-Host "3. Or run 'Start-FullStack' to start everything at once" -ForegroundColor White
Write-Host "`nFor help, run 'Show-Status' to see all available commands." -ForegroundColor Yellow

Write-Host "`n🎯 Quick Start Commands:" -ForegroundColor Cyan
Write-Host "  Start-FullStack    # Start backend + open game" -ForegroundColor Gray
Write-Host "  Start-Backend      # Start backend only" -ForegroundColor Gray
Write-Host "  Open-Game          # Open game in Godot Editor" -ForegroundColor Gray
Write-Host "  Show-Status        # Show project status" -ForegroundColor Gray