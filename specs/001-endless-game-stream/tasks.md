---
description: "Task list for endless game stream MVP implementation"
---

# Tasks: Endless Game Stream

**Input**: Design documents from `/specs/001-endless-game-stream/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Testing for this prototype is deferred to the stabilization backlog. All test-related tasks are tagged with [TEST] and detailed in T077 (see below). Implementation tasks do not require tests unless explicitly tagged.

**Organization**: Tasks are grouped by user story (P1, P2, P3) to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Game**: `game/` (Godot 4 project, **pure GDScript only** - no TypeScript/GodotJS integration)
- **Backend**: `backend/src/` (Bun + TypeScript)
- **Overlays**: `backend/overlays/`
- **Scripts**: `backend/scripts/`
- **Tests**: (deferred for prototype, backlog documented)

**Note**: The game uses pure GDScript with native WebSocket support. All TypeScript code is in the backend service only. The game and backend communicate via JSON over WebSocket (see contracts/).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create project structure per implementation plan (game/, backend/, docs/)
- [x] T002 [P] Initialize Godot 4 project with GDScript linting configured in game/ (pure GDScript, no TypeScript integration)
- [x] T003 [P] Initialize Bun + TypeScript backend project with linting in backend/
- [x] T004 [P] Configure TypeScript compiler (tsconfig.json) in backend/
- [x] T005 [P] Create backend/package.json with dependencies (bun, ws, typescript, dotenv, etc.)
- [x] T006 [P] Create game/project.godot with Godot 4 settings and scene structure (GDScript only)
- [x] T007 Create backend/.env.example (no actual secrets) with documented vars (ADMIN_API_KEY, PORT, LOG_FILE)
- [x] T008 Create README.md at repository root with quick start and architecture overview
- [x] T009 Create backend/README.md with backend setup, API docs, and deployment instructions
- [x] T010 Create game/README.md with game setup, scene structure, and GDScript conventions

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T011 Implement backend WebSocket server in backend/src/server.ts (listen on port 3001)
- [x] T012 [P] Implement backend HTTP admin server in backend/src/admin-api.ts (port 3000, routes for /health, /stats, /start, /stop, /pause, /resume, /reset)
- [x] T013 [P] Create game state management service in backend/src/game-state.ts (GameState class, CRUD operations, state transitions)
- [x] T014 [P] Create donation event queue in backend/src/donation-queue.ts (FIFO queue, rate-limiting logic, cooldown tracking)
- [x] T015 [P] Create rate-limiting middleware in backend/src/middleware/rate-limiter.ts (10 donations/60s global, 3 per user)
- [x] T016 [P] Create logging service in backend/src/services/logger.ts (file + stdout, JSON format for debugging)
- [x] T017 [P] Create TypeScript types/interfaces for all entities in backend/src/types/index.ts (GameState, DonationEvent, Enemy, Knight, OverlayState)
- [x] T018 [P] Create Godot game base scene in game/scenes/Game.tscn (root scene with camera, UI layers, enemy spawner)
- [x] T019 [P] Create Godot knight scene in game/scenes/Knight.tscn (sprite, collision, input handling)
- [x] T020 [P] Create Godot enemy prefab in game/scenes/Enemy.tscn (sprite, health bar, collision, AI placeholder)
- [x] T021 [P] Implement Godot WebSocket client in game/scripts/websocket-client.gd (connect to backend, send/receive JSON using JSON.parse_string() and JSON.stringify())
- [x] T022 [P] Create backend environment loader in backend/src/config.ts (read .env, export config object with types)
- [x] T023 Create backend entry point in backend/src/index.ts (initialize servers, start listening, handle signals for graceful shutdown)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Play Endless Game (Priority: P1) 🎯 MVP

**Goal**: Knight character walks right, defeats enemies, accumulates score; game resets on death.

**[TEST] Independent Test**: Can be fully tested by running the game and verifying:
- Knight moves to the right continuously
- Score increments as knight progresses (e.g., +10 per enemy defeated)
- Enemies spawn at intervals (e.g., every 5-10 seconds)
- Knight takes damage from enemies and can die
- Game resets when knight health reaches 0
- Score resets on game over

### Implementation for User Story 1

- [x] T024 [P] [US1] Create Knight class in game/scripts/knight.gd (attributes: health, attack, position, sprites, animation state machine)
- [x] T025 [P] [US1] Create Enemy class in game/scripts/enemy.gd (attributes: type, health, attack, position, AI pathfinding toward knight)
- [x] T026 [P] [US1] Implement enemy spawner in game/scripts/enemy-spawner.gd (spawn GOBLIN/ORC at intervals, manage enemy list)
- [x] T027 [US1] Implement combat logic in game/scripts/combat.gd (knight attack vs. enemy, damage calculation, health reduction)
- [x] T028 [US1] Implement knight movement in game/scripts/knight.gd (constant rightward movement, collision detection, screen boundaries)
- [x] T029 [US1] Implement knight death and reset in game/scripts/game-manager.gd (reset game state, reset score, respawn knight, show "Game Over" screen)
- [x] T030 [P] [US1] Create score UI in game/scenes/ui/ScoreDisplay.tscn and game/scripts/ui/score-display.gd (display score at top, update on enemy defeat)
- [x] T031 [US1] Connect knight to game state in game/scripts/game-manager.gd (track health, score, wave number; sync with backend periodic updates)
- [x] T032 [P] [US1] Implement game loop in game/scripts/game-manager.gd (update knight position, enemy positions, combat, score every frame at 60 FPS)
- [x] T033 [US1] Create backend game state sync in backend/src/game-state-sync.ts (periodically send gamestate.update events to overlays)
- [x] T034 [P] [US1] Create score overlay in backend/overlays/score.html (display current score, wave, knight health)
- [x] [TEST] T035 [US1] Test P1 user story: Run game, verify knight moves, enemies spawn, score increments, game resets on death

**Checkpoint**: User Story 1 is fully functional and testable independently

---

## Phase 4: User Story 2 - Donation Boost (Priority: P2)

**Goal**: Viewers donate to boost knight's attack by 50% for 10 minutes. Boost is visually indicated and times out.

**Independent Test**: Can be tested by:
- Simulating a BOOST donation via demo script
- Verifying knight's attack increases by 50% for 10 minutes
- Verifying boost timer is displayed in UI
- Verifying boost expires after timeout
- Verifying stacking behavior (new boost replaces old or queues)

### Implementation for User Story 2

- [x] T036 [P] [US2] Implement donation event handler in backend/src/donation-handler.ts (parse donation events, route to game via WebSocket)
- [x] T037 [P] [US2] Create donation event processor in backend/src/event-processor.ts (apply BOOST event to game state, handle rate-limiting/cooldowns)
- [x] T038 [P] [US2] Implement boost effect system in game/scripts/boost-manager.gd (apply attack boost, track expiry time, remove on timeout)
- [x] T039 [US2] Integrate boost into knight combat in game/scripts/combat.gd (use boosted attack value when calculating damage)
- [x] T040 [P] [US2] Create boost timer UI in game/scenes/ui/BoostTimer.tscn and game/scripts/ui/boost-timer.gd (show "BOOST ACTIVE: XX seconds remaining")
- [x] T041 [US2] Implement backend donation event reception in backend/src/websocket-server.ts (listen for donation.received on admin channel or HTTP)
- [x] T042 [P] [US2] Create donation alert overlay in backend/overlays/donation-alert.html (display "User donated $X to BOOST!" with animation)
- [x] T043 [US2] Implement overlay update on donation in backend/src/overlay-sync.ts (send overlay.donation_alert event when boost applied)
- [x] T044 [US2] Create demo boost donation in backend/scripts/donate-simulator.ts (simulate BOOST event with amount 5 USD, 50% boost, 600s duration)
- [x] [TEST] T045 [US2] Test P2 user story: Simulate boost donation, verify attack increases, timer displays, boost expires, overlay alerts

**Checkpoint**: User Stories 1 AND 2 should both work independently

### Testing Instructions for Phase 4

**Prerequisites**: 
1. Backend server running (`bun run dev` in backend/)
2. Game running in Godot (with BoostTimer UI integrated into main scene)
3. Donation alert overlay open in browser (`backend/overlays/donation-alert.html`)

**Test Commands**:
```bash
# Test basic boost donation
cd backend
bun run scripts/donate-simulator.ts boost

# Test custom amount and viewer
bun run scripts/donate-simulator.ts boost 7.50 "TestViewer"

# Test multiple donation types
bun run scripts/donate-simulator.ts heal 2.00
bun run scripts/donate-simulator.ts enemy 3.00
bun run scripts/donate-simulator.ts dragon 10.00

# Test donation spree
bun run scripts/donate-simulator.ts spree 5 3000
```

**Expected Results**:
- Donation alert appears in overlay with animation
- Knight attack increases (check combat damage numbers)
- Boost timer appears in game UI showing countdown
- Boost expires after 10 minutes, attack returns to normal
- WebSocket messages logged in backend console

---

## Phase 5: User Story 3 - Donation Challenge (Priority: P3)

**Goal**: Viewers donate to spawn a dragon or special enemy to challenge the knight. Multiple enemies can be active.

**[TEST] Independent Test**: Can be tested by:
- Simulating a SPAWN_DRAGON donation via demo script
- Verifying dragon appears in-game at spawn location
- Verifying dragon has high health/attack (DRAGON type: 100 health, 30 attack)
- Verifying multiple enemies can exist simultaneously
- Verifying donor info is credited (overlay shows "User123 spawned DRAGON!")

### Implementation for User Story 3

- [ ] T046 [P] [US3] Implement SPAWN_ENEMY/SPAWN_DRAGON event handler in backend/src/event-processor.ts (apply to game state, queue enemy)
- [ ] T047 [P] [US3] Implement enemy spawner with donation types in game/scripts/enemy-spawner.gd (spawn GOBLIN, ORC, DRAGON based on event, track donor info)
- [ ] T048 [P] [US3] Create Dragon enemy prefab in game/scenes/Dragon.tscn (higher stats: 100 health, 30 attack, larger sprite)
- [ ] T049 [US3] Add dragon to enemy type definitions in game/scripts/enemy.gd (DRAGON type with unique stats and behavior)
- [ ] T050 [US3] Implement enemy stacking/queue management in game/scripts/enemy-manager.gd (track multiple active enemies, resolve conflicts)
- [ ] T051 [P] [US3] Create challenge overlay in backend/overlays/challenge-alert.html (display "User123 donated $X to spawn DRAGON!")
- [ ] T052 [US3] Implement overlay update on challenge spawn in backend/src/overlay-sync.ts (send overlay.donation_alert for challenge events)
- [ ] T053 [P] [US3] Create demo challenge donation in backend/scripts/donate-simulator.ts (simulate SPAWN_DRAGON event with amount 10 USD)
- [ ] T054 [US3] Implement cooldown for SPAWN_DRAGON in backend/src/donation-queue.ts (max 1 dragon per 30 seconds)
- [ ] T055 [US3] Test P3 user story: Simulate dragon spawn, verify appears in-game, verify high difficulty, verify overlay shows donor

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Integration & Cross-Cutting Concerns

**Purpose**: Ensure all components work together, reliability, observability, and deployment

- [ ] T056 [P] Integrate WebSocket connection in game/scripts/websocket-client.gd (auto-connect on game start, auto-reconnect on disconnect)
- [ ] T057 [P] Implement heartbeat/ping-pong in backend/src/websocket.ts (send ping every 30s, track alive connections)
- [ ] T058 [P] Implement error handling for donation failures in backend/src/error-handler.ts (graceful degradation, user notification)
- [ ] T059 [P] Implement logging for all donation events in backend/src/services/logger.ts (JSON log format: timestamp, donationId, viewerId, eventType, status)
- [ ] T060 [P] Create metrics collection in backend/src/metrics.ts (track donation count, revenue, error rate, event latency)
- [ ] T061 [P] Expose metrics via /admin/stats endpoint in backend/src/admin-api.ts (include uptime, fps, donation stats, connection count)
- [ ] T062 Implement graceful shutdown in backend/src/index.ts (handle SIGTERM, close WebSocket connections, flush logs)
- [ ] T063 [P] Create Docker support: backend/Dockerfile for containerized backend service
- [ ] T064 [P] Create PM2 config in pm2.config.js (auto-restart backend on crash, log management)
- [ ] T065 [P] Create docker-compose.yml for multi-container orchestration (backend, optional game service)
- [ ] T066 Create deployment instructions in docs/DEPLOYMENT.md (VPS setup, firewall, env vars, PM2/Docker commands)
- [ ] T067 [P] Create health check endpoint in backend/src/admin-api.ts (/admin/health returns status and uptime)
- [ ] T068 [P] Test full integration: Run backend + game + donation simulator + OBS overlay, verify end-to-end flow
- [ ] T069 Create troubleshooting guide in docs/TROUBLESHOOTING.md (common issues, diagnostics, fixes)

---

## Phase 7: Polish & Documentation

**Purpose**: Finalize, document, and prepare for production

- [ ] T070 [P] Create API documentation in docs/API.md (describe all WebSocket and HTTP endpoints with examples)
- [ ] T071 [P] Create architecture diagram in docs/ARCHITECTURE.md (game, backend, overlays, VPS, connections)
- [ ] T072 [P] Update backend/README.md with complete setup, environment variables, running locally, deployment
- [ ] T073 [P] Update game/README.md with Godot version, scene structure, GDScript style guide (pure GDScript, no TypeScript), how to add new enemies
- [ ] T074 Create demo scenario walkthrough in docs/DEMO.md (step-by-step instructions to run local demo with donation simulator)
- [ ] T075 [P] Add code comments to all backend src files explaining functions, parameters, return types
- [ ] T076 [P] Add code comments to all game scripts (.gd files) with function purposes and logic
- [ ] [TEST] T077 Create TESTING_BACKLOG.md documenting tests to add during stabilization:
  -  Unit tests: combat logic, rate-limiting, state transitions
  -  Integration tests: donation flow end-to-end, WebSocket communication
  -  Load tests: concurrent donations, scalability limits
  -  UI/UX tests: overlay display, knight animation, enemy variety
- [ ] T078 Create VERSIONING.md defining semantic versioning for APIs and releases
- [ ] T079 [P] Verify no secrets in repo (.env files in .gitignore, example .env.example provided)
- [ ] T080 Create CHANGELOG.md with v1.0.0 initial release notes
- [ ] [TEST] T081 Run quickstart.md walkthrough: Local setup, demo simulation, OBS integration, verify all steps work
- [ ] [TEST] T082 Final code review: Ensure all code meets constitution requirements (code quality, style, maintainability)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Integration (Phase 6)**: Depends on all desired user stories being complete
- **Polish (Phase 7)**: Depends on Integration phase completion

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - May integrate with US1 but should be independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - May integrate with US1/US2 but should be independently testable

### Within Each User Story

- Models before services
- Services before endpoints/UI
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

**Phase 1 (Setup)**: All [P] marked tasks can run in parallel
- T002, T003, T004, T005, T006 (backend/game setup)

**Phase 2 (Foundational)**: All [P] marked tasks can run in parallel
- T012-T022 (WebSocket, admin API, game state, rate-limiting, logging, types, WebSocket client, config)

**Phase 3 (User Story 1)**: Within story, tasks marked [P] can run in parallel
- T024-T026, T030, T032, T034 (knight, enemy, enemy spawner, UI, game loop, overlay)

**Phase 4 (User Story 2)**: Within story, tasks marked [P] can run in parallel
- T036-T040, T042-T043 (donation handler, processor, boost effect, combat, boost timer, overlay)

**Phase 5 (User Story 3)**: Within story, tasks marked [P] can run in parallel
- T046-T049, T051-T053 (spawn event handler, spawner, dragon prefab, challenge overlay)

**Phase 6 (Integration)**: All [P] marked tasks can run in parallel
- T056-T065 (WebSocket, heartbeat, error handling, logging, metrics, Docker, PM2)

**Phase 7 (Polish)**: All [P] marked tasks can run in parallel
- T070-T076, T079 (documentation, code comments, secrets verification)

---

## Parallel Example: User Story 1

```bash
# Launch all parallel knight, enemy, UI setup together:
Task: "Create Knight class in game/scripts/knight.gd" (T024)
Task: "Create Enemy class in game/scripts/enemy.gd" (T025)
Task: "Implement enemy spawner in game/scripts/enemy-spawner.gd" (T026)
Task: "Create score UI in game/scenes/ui/ScoreDisplay.tscn" (T030)
Task: "Create score overlay in backend/overlays/score.html" (T034)

# Then (after above complete):
Task: "Implement combat logic" (T027)
Task: "Implement knight movement" (T028)
Task: "Implement knight death and reset" (T029)
Task: "Implement knight movement in game/scripts/knight.gd" (T031)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

**MVP Scope**: Knight walks right, encounters enemies, scores points, dies and resets. No donations.
**MVP Files**: `game/scripts/knight.gd`, `game/scripts/enemy.gd`, `game/scripts/combat.gd`, `game/scripts/game-manager.gd`, `backend/src/server.ts` (basic state sync)

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (knight, enemies, gameplay)
   - Developer B: User Story 2 (donation boost, backend handler)
   - Developer C: User Story 3 (challenge events, dragon enemy)
3. Stories complete and integrate independently
4. All meet at Phase 6 (Integration) to ensure everything works together

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- Testing is OPTIONAL for prototype; backlog documented in Phase 7 (T077) for stabilization phase
