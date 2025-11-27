# StreamForge Development Scripts
# PowerShell scripts for building and running backend and game projects

# Backend Scripts
function Start-Backend {
    param(
        [string]$Mode = "dev"
    )
    
    Write-Host "Starting StreamForge backend in $Mode mode..." -ForegroundColor Green
    Set-Location "backend"
    
    switch ($Mode) {
        "dev" { 
            Write-Host "Running in development mode with hot reload..." -ForegroundColor Yellow
            bun dev 
        }
        "prod" { 
            Write-Host "Starting production server..." -ForegroundColor Yellow
            bun start 
        }
        default { 
            Write-Host "Invalid mode. Use 'dev' or 'prod'" -ForegroundColor Red
            return
        }
    }
    
    Set-Location ".."
}

function Build-Backend {
    Write-Host "Building StreamForge backend..." -ForegroundColor Green
    Set-Location "backend"
    
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    bun install
    
    Write-Host "Type checking..." -ForegroundColor Yellow
    bun run type-check
    
    Write-Host "Linting..." -ForegroundColor Yellow
    bun run lint
    
    Write-Host "Building..." -ForegroundColor Yellow
    bun run build
    
    Write-Host "Backend build complete!" -ForegroundColor Green
    Set-Location ".."
}

function Test-Backend {
    Write-Host "Testing StreamForge backend..." -ForegroundColor Green
    Set-Location "backend"
    
    Write-Host "Running type check..." -ForegroundColor Yellow
    bun run type-check
    
    Write-Host "Running linter..." -ForegroundColor Yellow
    bun run lint
    
    Write-Host "Running tests..." -ForegroundColor Yellow
    bun test
    
    Set-Location ".."
}

function Install-Dependencies {
    Write-Host "Installing all project dependencies..." -ForegroundColor Green
    
    Write-Host "Installing root dependencies..." -ForegroundColor Yellow
    bun install
    
    Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
    Set-Location "backend"
    bun install
    Set-Location ".."
    
    Write-Host "Dependencies installed!" -ForegroundColor Green
}

# Game Scripts
function Open-Game {
    Write-Host "Opening StreamForge game in Godot Editor..." -ForegroundColor Green
    
    $godotPath = Get-Command "godot" -ErrorAction SilentlyContinue
    if ($godotPath) {
        godot "game/project.godot"
    } else {
        Write-Host "Godot not found in PATH. Please open game/project.godot manually in Godot Editor." -ForegroundColor Yellow
        Start-Process explorer "game"
    }
}

function Export-Game {
    param(
        [string]$Platform = "windows",
        [string]$OutputDir = "dist/game"
    )
    
    Write-Host "Exporting StreamForge game for $Platform..." -ForegroundColor Green
    
    if (-not (Test-Path $OutputDir)) {
        New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
    }
    
    $godotPath = Get-Command "godot" -ErrorAction SilentlyContinue
    if ($godotPath) {
        Write-Host "Exporting with Godot CLI..." -ForegroundColor Yellow
        Set-Location "game"
        godot --headless --export-release $Platform "../$OutputDir/streamforge.exe"
        Set-Location ".."
        Write-Host "Game exported to $OutputDir" -ForegroundColor Green
    } else {
        Write-Host "Godot CLI not found. Please export manually from Godot Editor:" -ForegroundColor Yellow
        Write-Host "1. Open game/project.godot in Godot Editor" -ForegroundColor Gray
        Write-Host "2. Go to Project > Export" -ForegroundColor Gray
        Write-Host "3. Select your platform and export" -ForegroundColor Gray
    }
}

# Development workflow scripts
function Start-FullStack {
    Write-Host "Starting full StreamForge development environment..." -ForegroundColor Green
    
    Write-Host "Starting backend server..." -ForegroundColor Yellow
    Start-Job -Name "StreamForge-Backend" -ScriptBlock {
        Set-Location $args[0]
        Set-Location "backend"
        bun dev
    } -ArgumentList (Get-Location)
    
    Start-Sleep 2
    Write-Host "Backend started in background job. Use Stop-FullStack to stop." -ForegroundColor Green
    
    Write-Host "Opening game in Godot Editor..." -ForegroundColor Yellow
    Open-Game
}

function Stop-FullStack {
    Write-Host "Stopping StreamForge development environment..." -ForegroundColor Green
    
    Get-Job -Name "StreamForge-Backend" -ErrorAction SilentlyContinue | Stop-Job
    Get-Job -Name "StreamForge-Backend" -ErrorAction SilentlyContinue | Remove-Job
    
    Write-Host "Development environment stopped." -ForegroundColor Green
}

function Reset-Project {
    Write-Host "Resetting StreamForge project..." -ForegroundColor Green
    
    Write-Host "Stopping any running services..." -ForegroundColor Yellow
    Stop-FullStack
    
    Write-Host "Cleaning backend..." -ForegroundColor Yellow
    Set-Location "backend"
    Remove-Item -Recurse -Force "node_modules", "dist" -ErrorAction SilentlyContinue
    Set-Location ".."
    
    Write-Host "Reinstalling dependencies..." -ForegroundColor Yellow
    Install-Dependencies
    
    Write-Host "Project reset complete!" -ForegroundColor Green
}

function Show-Status {
    Write-Host "StreamForge Project Status" -ForegroundColor Green
    Write-Host "=========================" -ForegroundColor Green
    
    # Check backend status
    Write-Host "`nBackend:" -ForegroundColor Cyan
    Set-Location "backend"
    
    if (Test-Path "node_modules") {
        Write-Host "  ✅ Dependencies installed" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Dependencies not installed (run Install-Dependencies)" -ForegroundColor Red
    }
    
    if (Test-Path "dist") {
        Write-Host "  ✅ Built" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  Not built (run Build-Backend)" -ForegroundColor Yellow
    }
    
    # Check if backend is running
    $backendJob = Get-Job -Name "StreamForge-Backend" -ErrorAction SilentlyContinue
    if ($backendJob -and $backendJob.State -eq "Running") {
        Write-Host "  🟢 Backend server running" -ForegroundColor Green
    } else {
        Write-Host "  🔴 Backend server not running" -ForegroundColor Gray
    }
    
    Set-Location ".."
    
    # Check game status
    Write-Host "`nGame:" -ForegroundColor Cyan
    if (Test-Path "game/project.godot") {
        Write-Host "  ✅ Godot project configured" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Godot project not found" -ForegroundColor Red
    }
    
    # Check Godot installation
    $godotPath = Get-Command "godot" -ErrorAction SilentlyContinue
    if ($godotPath) {
        Write-Host "  ✅ Godot CLI available" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  Godot CLI not in PATH (manual export required)" -ForegroundColor Yellow
    }
    
    Write-Host "`nQuick Commands:" -ForegroundColor Cyan
    Write-Host "  Install-Dependencies  - Install all dependencies" -ForegroundColor Gray
    Write-Host "  Start-Backend         - Start backend server" -ForegroundColor Gray
    Write-Host "  Build-Backend         - Build backend for production" -ForegroundColor Gray
    Write-Host "  Open-Game             - Open game in Godot Editor" -ForegroundColor Gray
    Write-Host "  Start-FullStack       - Start both backend and open game" -ForegroundColor Gray
    Write-Host "  Show-Status           - Show this status" -ForegroundColor Gray
}

# Export functions for use
Export-ModuleMember -Function Start-Backend, Build-Backend, Test-Backend, Install-Dependencies
Export-ModuleMember -Function Open-Game, Export-Game
Export-ModuleMember -Function Start-FullStack, Stop-FullStack, Reset-Project, Show-Status

# Show help on import
Write-Host "StreamForge Development Scripts Loaded!" -ForegroundColor Green
Write-Host "Run 'Show-Status' to see project status and available commands." -ForegroundColor Yellow