# Phase 0 Research: Endless Game Stream

**Created**: 2025-11-11
**Feature**: Endless Game Stream

## Research Tasks

- Research Godot 4 TypeScript integration for game logic and event handling
- Research Bun + TypeScript backend setup for donation event queue and WebSocket bridge
- Research best practices for simulating Streamlabs/Twitch donation events in dev
- Research secure, reliable WebSocket communication between backend and Godot game
- Research HTML overlay integration with OBS Studio (serving overlays from backend)
- Research rate-limiting and cooldown implementation for donation events (backend)
- Research admin HTTP endpoints for backend (start/stop, stats, health)
- Research auto-restart and reliability (Docker/PM2 for backend/game)
- Research basic metrics/logging for observability (backend/game)
- Research secure secrets management (no secrets in repo)

## Consolidated Findings

### Godot 4 Game Language Choice: GDScript vs. GodotJS

**Decision**: Use **pure GDScript** for the entire game (no GodotJS wrapper).

**Rationale**:
1. **Simplicity & Stability**: GDScript is Godot's native language, fully supported, and battle-tested for game logic. GodotJS is a third-party wrapper that adds complexity and potential instability.
2. **Performance**: GDScript is optimized for Godot's architecture; adding a JavaScript runtime (GodotJS) introduces overhead with no meaningful benefit for this use case.
3. **WebSocket Communication**: GDScript has excellent built-in WebSocket support (`WebSocketClient`, `WebSocketPeer`). JSON parsing/serialization is straightforward with `JSON.parse_string()` and `JSON.stringify()`. No need for TypeScript in-game.
4. **Minimal Protocol Sharing**: The WebSocket protocol is simple JSON; type definitions can be documented in contracts/ and manually implemented in GDScript (no need for shared TypeScript types).
5. **Learning Curve**: GDScript is easier for game developers; GodotJS requires knowledge of both JavaScript ecosystem and Godot's architecture.
6. **Deployment**: Pure GDScript exports cleanly to all platforms; GodotJS may complicate builds and increase binary size.
7. **Maintenance**: Fewer dependencies = fewer breaking changes. GodotJS is community-maintained and may lag behind Godot releases.

**What GodotJS Would Offer** (and why it's not needed here):
- Reusing TypeScript types between backend and game → **Not worth it**: Protocol is simple; manual GDScript types are sufficient.
- JavaScript libraries in-game → **Not needed**: All complex logic (rate-limiting, queue, metrics) is in the backend.
- Developer preference for JS/TS → **Not applicable**: Game logic is simple (movement, combat, state sync).

**Alternatives Considered**:
- **Pure GDScript** (CHOSEN): Native, performant, simple, well-documented. Best fit for this MVP.
- **GodotJS**: Adds JS/TS runtime to game; benefits are minimal for this use case; adds complexity, potential instability, and larger binary.
- **C#**: Godot supports C# natively, but it's overkill for this simple game and doesn't improve backend synergy.
- **GDNative (C/C++)**: For performance-critical code; unnecessary here; adds complexity.

**Updated Architecture**:
- **Game**: Pure GDScript (knight, enemies, combat, WebSocket client, JSON protocol)
- **Backend**: Bun + TypeScript (donation queue, rate-limiting, admin API, overlay server)
- **Protocol**: JSON over WebSocket (documented in contracts/, implemented separately in GDScript and TypeScript)

**Recommendation**: Stick with **pure GDScript** for simplicity, stability, and performance. The backend handles all complex TypeScript logic; the game only needs to send/receive simple JSON messages.

### Bun + TypeScript Backend
- **Decision**: Use Bun v1.x with TypeScript for backend service, event queue, and WebSocket bridge.
- **Rationale**: Bun is fast, supports TypeScript natively, and is easy to deploy; PM2 or Docker for auto-restart.
- **Alternatives considered**: Node.js (slower, more dependencies), Deno (less mature ecosystem).

### Simulating Donation Events
- **Decision**: Create a demo script in backend/scripts/ to simulate Streamlabs/Twitch events using JSON payloads.
- **Rationale**: Enables local testing and rapid prototyping; avoids dependency on live services.
- **Alternatives considered**: Manual API calls, mock services.

### WebSocket Communication
- **Decision**: Use secure WebSocket (wss://) with JSON protocol for backend-to-game communication.
- **Rationale**: Real-time, reliable, easy to debug; JSON is language-agnostic.
- **Alternatives considered**: HTTP polling (slower), TCP sockets (less standard for web/game integration).

### OBS HTML Overlay Integration
- **Decision**: Serve overlays from backend/overlays/ as static HTML; OBS browser source loads overlay via local network.
- **Rationale**: Simple, reliable, easy to update overlays; works with OBS Studio out of the box.
- **Alternatives considered**: Custom OBS plugins (more complex), remote overlays (less reliable for MVP).

### Rate-Limiting & Cooldown
- **Decision**: Implement per-user and global rate-limiting in backend; cooldown timers for donation-triggered events.
- **Rationale**: Prevents abuse, ensures fair gameplay; easy to implement in Bun/TypeScript.
- **Alternatives considered**: No limits (risk of spam), external rate-limiters (overkill for MVP).

### Admin HTTP Endpoints
- **Decision**: Expose /admin/start, /admin/stop, /admin/stats, /admin/health endpoints in backend.
- **Rationale**: Enables remote control and monitoring; easy to secure with environment-based secrets.
- **Alternatives considered**: CLI-only control (less flexible), no endpoints (harder to monitor).

### Auto-Restart & Reliability
- **Decision**: Use PM2 or Docker for backend/game auto-restart and process management.
- **Rationale**: Ensures high uptime, easy to deploy and monitor.
- **Alternatives considered**: Manual restart (unreliable), systemd (more complex for cross-platform).

### Metrics & Logging
- **Decision**: Log all donation events, errors, and key game state changes to file and stdout; expose basic metrics via /admin/stats.
- **Rationale**: Enables observability and debugging; supports future monitoring integration.
- **Alternatives considered**: No logging (unacceptable), external metrics (overkill for MVP).

### Secrets Management
- **Decision**: Use environment variables for secrets; never commit secrets to repo.
- **Rationale**: Secure, standard practice; easy to rotate and manage.
- **Alternatives considered**: .env files in repo (insecure), hardcoded secrets (unacceptable).
