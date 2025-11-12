# StreamForge Development Scripts

This document explains the root-level scripts created to simplify development workflow.

## Overview

The project now includes several script files that allow you to build, run, and manage both the backend and game projects from the root directory without needing to `cd` into subdirectories.

## Script Files Created

### 1. `package.json` (Root Level)
Contains npm/bun scripts that can be run from the project root:

```powershell
# Basic development
bun run setup          # Install all dependencies
bun run dev            # Start backend in development mode
bun run start          # Start backend in production mode
bun run build          # Build backend for production

# Quality assurance
bun run lint           # Lint backend code
bun run test           # Run backend tests
bun run type-check     # TypeScript type checking

# Utilities
bun run clean          # Clean build artifacts and node_modules
```

### 2. `scripts.ps1` (PowerShell Module)
Advanced PowerShell functions for development workflow:

```powershell
# Load the module
. .\scripts.ps1

# Available functions
Install-Dependencies   # Install all project dependencies
Start-Backend         # Start backend server (dev or prod mode)
Build-Backend         # Build backend with full validation
Test-Backend          # Run all backend tests and checks
Open-Game             # Open game in Godot Editor
Export-Game           # Export game (if Godot CLI available)
Start-FullStack       # Start backend + open game simultaneously
Stop-FullStack        # Stop all development services
Reset-Project         # Clean and reinstall everything
Show-Status           # Display project status and available commands
```

### 3. `setup.ps1` (First-Time Setup)
Automated setup script for new developers:

```powershell
# Run first-time setup
.\setup.ps1
```

Features:
- Checks prerequisites (Bun, Godot)
- Installs all dependencies
- Creates configuration files
- Validates TypeScript compilation
- Loads development scripts
- Shows next steps

### 4. `dev.bat` (Quick Script Loader)
Windows batch file for easy PowerShell script access:

```cmd
# Starts PowerShell with development scripts loaded
.\dev.bat
```

### 5. `Makefile` (Alternative Command Interface)
Traditional Makefile-style commands (works with `bun run`):

```powershell
bun run help          # Show all available commands
bun run status        # Show project status
```

## Usage Examples

### New Developer Setup
```powershell
# Clone the repository
git clone <repo-url>
cd streamforge

# First-time setup
.\setup.ps1

# Start development
Start-FullStack
```

### Daily Development
```powershell
# Option 1: Use bun scripts
bun run dev

# Option 2: Use PowerShell functions
. .\scripts.ps1
Start-Backend

# Option 3: Use the persistent session
.\dev.bat
Show-Status
```

### Production Build
```powershell
# Build everything
bun run build

# Or with validation
. .\scripts.ps1
Build-Backend
```

## Key Benefits

1. **No Directory Changes**: All commands work from the root directory
2. **Platform Consistency**: All scripts are PowerShell-compatible (Windows)
3. **Bun Integration**: Uses Bun for all JavaScript/TypeScript operations
4. **Constitution Compliance**: Follows the project constitution requirements
5. **Multiple Interfaces**: Choose between bun scripts, PowerShell functions, or batch files
6. **Full Automation**: Setup script handles complete environment preparation

## Constitution Alignment

These scripts align with the project constitution by:
- **Development Environment**: All scripts are PowerShell-compatible
- **Bun Requirement**: All JS/TS operations use Bun instead of npm
- **Simplicity**: Reduces complexity by eliminating directory navigation
- **Observability**: `Show-Status` provides clear project state visibility

## Troubleshooting

### Common Issues

1. **Bun not found**: Install Bun from https://bun.sh
2. **PowerShell execution policy**: Run `Set-ExecutionPolicy RemoteSigned`
3. **Godot not found**: Install Godot or use Godot Editor manually
4. **TypeScript errors**: Run `bun run type-check` to see detailed issues

### Getting Help

```powershell
# Show project status and available commands
. .\scripts.ps1
Show-Status

# Show all bun script options
bun run help
```

## Future Enhancements

- CI/CD integration scripts
- Docker containerization scripts
- Automated testing workflows
- Deployment scripts
- Performance monitoring scripts