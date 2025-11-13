# streamforge Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-11-11

## Active Technologies

- Godot 4 (GDScript only), Bun v1.x, TypeScript 5.x + Godot 4, Bun, TypeScript, WebSocket, PM2 (or Docker), OBS Studio (001-endless-game-stream)

## Project Structure

```text
backend/          # Bun + TypeScript backend
  src/
  tests/
game/             # Godot 4 game client
  scripts/
  scenes/
specs/            # Feature specifications
  001-endless-game-stream/
.specify/         # Specification templates and tooling
docs/             # Project documentation
```

## Commands

```bash
# Development environment (Windows)
dev.bat                    # Launch PowerShell development scripts

# Backend commands
cd backend
bun install               # Install dependencies
bun run dev              # Start development server
bun test                 # Run tests
bun run lint             # Lint code

# Root-level commands (if available)
make help                # Show available Makefile targets
```

## Development Environment

- **Platform**: Windows with PowerShell
- **Package Manager**: Bun (required for JS/TS projects)
- Use PowerShell-compatible commands and Windows path separators

## Code Style

Godot 4 (GDScript + TypeScript integration), Bun v1.x, TypeScript 5.x: Follow standard conventions

## Recent Changes

- 001-endless-game-stream: Added Godot 4 (GDScript + TypeScript integration), Bun v1.x, TypeScript 5.x + Godot 4, Bun, TypeScript, WebSocket, PM2 (or Docker), OBS Studio

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
