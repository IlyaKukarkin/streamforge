# StreamForge Build Commands
# Usage: bun run <command>
#
# This file provides simple command aliases that work from the project root
# without needing to change directories or load PowerShell modules

# Basic commands
install:
	cd backend && bun install

dev:
	cd backend && bun dev

start:
	cd backend && bun start

build:
	cd backend && bun run build

# Quality checks
lint:
	cd backend && bun run lint

lint-fix:
	cd backend && bun run lint:fix

test:
	cd backend && bun test

type-check:
	cd backend && bun run type-check

# Cleanup
clean:
	cd backend && rm -rf node_modules dist

# Setup
setup: install
	@echo "Backend setup complete!"
	@echo "Next: Open game/project.godot in Godot Editor"

# Status check
status:
	@echo "=== StreamForge Project Status ==="
	@echo "Backend dependencies:" && (test -d backend/node_modules && echo "✅ Installed" || echo "❌ Missing")
	@echo "Backend build:" && (test -d backend/dist && echo "✅ Built" || echo "⚠️  Not built")
	@echo "Game project:" && (test -f game/project.godot && echo "✅ Found" || echo "❌ Missing")

# Help
help:
	@echo "StreamForge Development Commands:"
	@echo ""
	@echo "Setup & Installation:"
	@echo "  bun run setup      - Install dependencies"
	@echo "  bun run install    - Install backend dependencies only"
	@echo ""
	@echo "Development:"
	@echo "  bun run dev        - Start backend in development mode"
	@echo "  bun run start      - Start backend in production mode"
	@echo "  bun run build      - Build backend for production"
	@echo ""
	@echo "Quality & Testing:"
	@echo "  bun run lint       - Lint backend code"
	@echo "  bun run test       - Run backend tests"
	@echo "  bun run type-check - TypeScript type checking"
	@echo ""
	@echo "Utilities:"
	@echo "  bun run clean      - Remove node_modules and build files"
	@echo "  bun run status     - Show project status"
	@echo "  bun run help       - Show this help"
	@echo ""
	@echo "PowerShell Scripts:"
	@echo "  .\\setup.ps1        - First-time project setup"
	@echo "  .\\scripts.ps1      - Load development functions"
	@echo "  .\\dev.bat          - Start PowerShell with scripts loaded"

.PHONY: install dev start build lint lint-fix test type-check clean setup status help