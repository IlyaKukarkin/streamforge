# Game (Godot 4)

Pure GDScript implementation of the endless 2D side-scroller. The knight character walks right, fights enemies, and responds to donation events via WebSocket communication with the backend.

## 🎮 Game Overview

- **Genre**: 2D endless side-scroller
- **Character**: Knight with 100 health, 20 base attack
- **Enemies**: Goblins, Orcs, Dragons (donation-spawned)
- **Score System**: Points awarded for enemy defeats and distance
- **Donation Integration**: Real-time events affect gameplay

## 🏗️ Architecture

The game uses pure GDScript with:
- **Native WebSocket**: `WebSocketClient` for backend communication
- **JSON Protocol**: `JSON.parse_string()` and `JSON.stringify()` for messages
- **Scene Architecture**: Modular scenes for knight, enemies, UI
- **State Management**: Central `GameManager` coordinates all systems

## 🚀 Quick Start

### Prerequisites

- [Godot 4.3+](https://godotengine.org/download)
- Backend service running (see `../backend/README.md`)

### Opening the Project

1. Launch Godot Editor
2. Click "Import"
3. Navigate to `game/project.godot`
4. Click "Import & Edit"

### Running the Game

**In Editor:**
- Press `F5` or click "Play" button
- Select `scenes/Game.tscn` as main scene if prompted

**Exported Build:**
```bash
# Export from Godot Editor:
# Project → Export → Add Export Template → Export Project
./StreamForge.exe  # Windows
./StreamForge.x86_64  # Linux
```

## 📁 Project Structure

```text
game/
├── project.godot          # Godot project configuration
├── scenes/               # Game scenes
│   ├── Game.tscn         # Main game scene
│   ├── Knight.tscn       # Player character
│   ├── Enemy.tscn        # Enemy prefab
│   ├── Dragon.tscn       # Special dragon enemy
│   └── ui/              # User interface
│       ├── ScoreDisplay.tscn
│       └── BoostTimer.tscn
├── scripts/             # GDScript source code
│   ├── game_manager.gd   # Central game controller
│   ├── knight.gd         # Knight character logic
│   ├── enemy.gd         # Enemy AI and behavior
│   ├── enemy_spawner.gd  # Enemy generation system
│   ├── combat.gd        # Combat calculations
│   ├── boost_manager.gd  # Donation boost effects
│   ├── websocket_client.gd # Backend communication
│   └── ui/              # UI controllers
│       ├── score_display.gd
│       └── boost_timer.gd
└── assets/              # Game assets
    ├── sprites/         # Character and enemy sprites
    │   ├── knight.png
    │   ├── goblin.png
    │   ├── orc.png
    │   └── dragon.png
    └── sounds/          # Audio effects (optional)
```

## 🎯 Gameplay Systems

### Knight Character

**Attributes:**
- Health: 100 (resets on death)
- Base Attack: 20 (boostable to 30 with 50% boost)
- Movement: Constant rightward at configurable speed
- Combat: Automatic when encountering enemies

**States:**
- `RUNNING`: Normal movement and combat
- `BOOSTED`: Enhanced attack power with visible timer
- `DEAD`: Triggers game reset

### Enemy System

**Enemy Types:**
- **Goblin**: 20 health, 5 attack (standard spawn)
- **Orc**: 40 health, 10 attack (standard spawn) 
- **Dragon**: 100 health, 30 attack (donation-spawned special)

**Spawning:**
- Automatic: Goblins/Orcs every 5-10 seconds
- Donation: Dragons via `SPAWN_DRAGON` events
- Rate Limited: Max 1 dragon per 30 seconds

### Combat System

**Mechanics:**
- Turn-based when knight encounters enemy
- Damage = attacker's attack value
- Knight attack boosted by donation effects
- Death triggers appropriate state transitions

### Donation Events

**Supported Events:**
- `BOOST`: Increase attack by 50% for 10 minutes
- `SPAWN_DRAGON`: Spawn high-difficulty dragon enemy
- Future: `HEAL`, `SPAWN_ENEMY` variants

**Event Processing:**
1. Backend sends via WebSocket
2. `WebSocketClient` receives JSON message
3. `GameManager` applies effect to game state
4. UI updates reflect changes (boost timer, new enemies)

## 🔧 Configuration

### Project Settings

Key settings in `project.godot`:
- **Display**: 1280x720 fixed window size
- **Physics**: Separate layers for Knight, Enemies, Environment
- **Input**: Admin controls for testing
- **Rendering**: Forward+ renderer, pixel-perfect filtering

### GDScript Settings

**Warnings Enabled:**
- Unused variables/parameters
- Untyped declarations
- Unsafe property/method access
- Shadowed variables

**Style Guidelines:**
- Static typing: `var health: int = 100`
- Clear function signatures: `func take_damage(amount: int) -> bool:`
- Descriptive variable names
- Consistent indentation (tabs)

### WebSocket Configuration

**Connection:**
```gdscript
# In websocket_client.gd
const BACKEND_URL = "ws://localhost:3001/game"

func _ready():
    websocket.connect_to_url(BACKEND_URL)
    websocket.message_received.connect(_on_message_received)
```

**Message Handling:**
```gdscript
func _on_message_received(message: String):
    var data = JSON.parse_string(message)
    if data.type == "donation.received":
        GameManager.apply_donation_event(data.payload)
```

## 🎨 Assets

### Sprites

The game uses simple 2D sprites:
- **Knight**: 64x64 pixel character sprite
- **Enemies**: 32x32 to 64x64 depending on type
- **UI Elements**: Score display, boost timer graphics

**Format Requirements:**
- PNG format with transparency
- Power-of-2 dimensions recommended
- Pixel art style for consistency

### Audio (Optional)

Future enhancement for:
- Combat sound effects
- Background music
- Donation event audio cues

## 🐛 Debug Features

### Admin Controls

**Keyboard Shortcuts** (development only):
- `Enter`: Reset game state
- `Space`: Toggle pause
- `1-5`: Simulate donation events

**Console Output:**
```gdscript
# Enable in GameManager
func _ready():
    if OS.is_debug_build():
        print("Debug mode enabled")
        show_debug_overlay = true
```

### WebSocket Debug

**Connection Status:**
```gdscript
func _on_connection_established():
    print("WebSocket connected to backend")
    
func _on_connection_closed():
    print("WebSocket disconnected - attempting reconnect")
```

**Message Logging:**
```gdscript
func _on_message_received(message: String):
    if OS.is_debug_build():
        print("Received: ", message)
```

## 🚀 Performance

### Optimization Settings

**Rendering:**
- Fixed 60 FPS target
- Single viewport rendering
- Minimal post-processing effects

**Memory:**
- Object pooling for enemies
- Texture streaming for large sprites
- Automatic garbage collection

**Network:**
- WebSocket heartbeat every 30 seconds
- State updates only on changes
- Message queuing for offline periods

### Profiling

**Built-in Profiler:**
1. Run game in debug mode
2. View → Profiler
3. Monitor FPS, memory, network

**Performance Targets:**
- 60 FPS stable gameplay
- <200ms donation event latency
- <50MB memory usage

## 🔄 State Management

### Game State Sync

**Local State:**
```gdscript
# In GameManager
var game_state = {
    "status": "RUNNING",
    "knight_health": 100,
    "knight_attack": 20,
    "score": 0,
    "wave": 1,
    "boost_active": false,
    "boost_expiry": 0
}
```

**Backend Sync:**
```gdscript
func send_state_update():
    var message = {
        "type": "gamestate.update", 
        "payload": game_state,
        "timestamp": Time.get_unix_time_from_system()
    }
    websocket.send_text(JSON.stringify(message))
```

### Save System

Currently: **No persistent save system** (endless gameplay)

Future: High scores, player preferences

## 🤝 Contributing

### Code Style

1. **Follow GDScript conventions:**
   - `snake_case` for variables and functions
   - `PascalCase` for classes and scenes
   - Static typing wherever possible

2. **Scene organization:**
   - One script per scene
   - Clear node hierarchy
   - Descriptive node names

3. **Comments:**
   ```gdscript
   ## Main game state manager
   ## Coordinates knight, enemies, and donation events
   class_name GameManager extends Node
   ```

### Testing

**Manual Testing:**
1. Run game in editor
2. Use backend donation simulator
3. Verify events apply correctly
4. Check WebSocket logs

**Automated Testing:** 
Deferred for stabilization phase

### Adding New Features

**New Enemy Types:**
1. Create scene inheriting from `Enemy.tscn`
2. Implement enemy-specific AI in script
3. Add to spawner type list
4. Update combat calculations

**New Donation Events:**
1. Add event type to backend contracts
2. Implement handler in `GameManager`
3. Add UI feedback if needed
4. Test with donation simulator

---

**Next Steps**: 
- Run the game: `F5` in Godot Editor
- Test with backend: See `../backend/README.md`
- Deploy: See `../docs/DEPLOYMENT.md`