extends Node
class_name GameManager

# WebSocket client connection
var websocket_client: WebSocketClient
var ws_connected: bool = false
var connection_retry_timer: float = 0.0
const CONNECTION_RETRY_DELAY: float = 5.0

# Periodic sync
var sync_timer: float = 0.0
const SYNC_INTERVAL: float = 2.0  # Sync every 2 seconds

# Performance monitoring
var frame_count: int = 0
var fps_timer: float = 0.0
var current_fps: float = 60.0
var delta_accumulator: float = 0.0
const TARGET_FPS: float = 60.0
const FPS_UPDATE_INTERVAL: float = 1.0  # Update FPS display every second

# Game state
var knight: Knight
var enemy_spawner: EnemySpawner
var score_display: ScoreDisplay

# UI references for boost system
var ui_boost_timer: Label
var ui_boost_type: Label
var boost_timer_bar: ProgressBar

# Current game stats
var score: int = 0
var kills: int = 0
var damage_dealt: int = 0
var damage_taken: int = 0

# Active boost system
var active_boost: String = ""
var boost_end_time: float = 0.0
var boost_stacks: int = 0

signal donation_received(donation_data: Dictionary)
signal game_stats_updated(stats: Dictionary)

func _ready() -> void:
	print("[GameManager] Starting game manager...")
	
	# Initialize WebSocket client
	websocket_client = WebSocketClient.new()
	websocket_client.donation_received.connect(_on_donation_received)
	websocket_client.connection_changed.connect(_on_connection_changed)
	websocket_client.game_state_received.connect(_on_game_state_received)
	add_child(websocket_client)
	
	# Connect to backend
	_connect_to_backend()
	
	# Find game objects
	_setup_game_references()
	
	# Connect signals
	_setup_game_signals()
	
	print("[GameManager] Game manager initialized")

func _setup_game_references() -> void:
	"""Find and cache references to game objects"""
	knight = get_node("../Knight") as Knight
	enemy_spawner = get_node("../EnemySpawner") as EnemySpawner
	score_display = get_node("../UI") as ScoreDisplay
	
	if not knight:
		push_error("[GameManager] Could not find Knight node")
	if not enemy_spawner:
		push_error("[GameManager] Could not find EnemySpawner node")
	if not score_display:
		push_error("[GameManager] Could not find ScoreDisplay UI")

func _setup_game_signals() -> void:
	"""Connect to game object signals"""
	if knight:
		knight.health_changed.connect(_on_knight_health_changed)
		knight.enemy_killed.connect(_on_enemy_killed)
		knight.damage_dealt.connect(_on_damage_dealt)
		knight.knight_died.connect(_on_knight_died)
	
	if enemy_spawner:
		enemy_spawner.enemy_spawned.connect(_on_enemy_spawned)

func _connect_to_backend() -> void:
	"""Attempt to connect to WebSocket backend"""
	var ws_url: String = "ws://localhost:3001"
	print("[GameManager] Connecting to WebSocket server: ", ws_url)
	websocket_client.connect_to_server(ws_url)

func _process(delta: float) -> void:
	# Performance monitoring
	_update_performance_metrics(delta)
	
	# Handle connection retry
	if not ws_connected:
		connection_retry_timer += delta
		if connection_retry_timer >= CONNECTION_RETRY_DELAY:
			connection_retry_timer = 0.0
			_connect_to_backend()
	
	# Update boost timer
	if active_boost != "":
		var time_remaining: float = boost_end_time - Time.get_unix_time_from_system()
		if time_remaining <= 0:
			_end_current_boost()
		else:
			_update_boost_ui(time_remaining)
	
	# Periodic game state sync
	sync_timer += delta
	if sync_timer >= SYNC_INTERVAL:
		sync_timer = 0.0
		_send_detailed_game_state()
	
	# Update UI
	_update_ui()

func _update_ui() -> void:
	"""Update all UI elements with current game state"""
	if score_display:
		score_display.update_score(score)
		if knight:
			score_display.update_health(knight.health, knight.max_health)
		score_display.update_kills(kills)
		if enemy_spawner:
			score_display.update_wave(enemy_spawner.wave_number)

func _update_boost_ui(time_remaining: float) -> void:
	"""Update boost-related UI elements"""
	if score_display:
		var original_duration: float = _get_boost_duration(active_boost)
		var boost_text: String = active_boost
		if boost_stacks > 1:
			boost_text += " x" + str(boost_stacks)
		score_display.update_boost_timer(time_remaining, original_duration, boost_text)

func _get_boost_duration(boost_type: String) -> float:
	"""Get the duration for a specific boost type"""
	match boost_type:
		"speed_boost":
			return 10.0
		"damage_boost":
			return 15.0
		"health_boost":
			return 0.0  # Instant
		"shield":
			return 20.0
		_:
			return 10.0

# Signal handlers
func _on_connection_changed(connected: bool) -> void:
	"""Handle WebSocket connection state changes"""
	ws_connected = connected
	if connected:
		print("[GameManager] Connected to backend server")
		connection_retry_timer = 0.0
		_send_game_state()
	else:
		print("[GameManager] Disconnected from backend server")

func _on_game_state_received(game_state: Dictionary) -> void:
	"""Handle incoming game state updates from backend"""
	print("[GameManager] Game state update received: ", game_state.keys())
	
	# Process pending enemy spawns
	var pending_spawns: Array = game_state.get("pendingEnemySpawns", [])
	if pending_spawns.size() > 0:
		print("[GameManager] Processing ", pending_spawns.size(), " pending enemy spawns")
		_process_enemy_spawns(pending_spawns)

func _process_enemy_spawns(pending_spawns: Array) -> void:
	"""Process pending enemy spawns from backend"""
	if not enemy_spawner:
		print("[GameManager] No enemy spawner available")
		return
	
	for spawn_data: Dictionary in pending_spawns:
		var enemy_type: String = spawn_data.get("enemyType", "GOBLIN")
		var donor_name: String = spawn_data.get("donorName", "Anonymous")
		var _spawn_id: String = spawn_data.get("spawnId", "")  # Prefixed with _ to indicate intentionally unused
		
		print("[GameManager] Spawning ", enemy_type, " from ", donor_name)
		
		# Convert backend enemy type to game enemy type
		var game_enemy_type: String = _convert_enemy_type(enemy_type)
		
		# Spawn the enemy
		var enemy: Node = enemy_spawner.spawn_donation_enemy(game_enemy_type, donor_name)
		
		if enemy:
			print("[GameManager] Successfully spawned ", game_enemy_type, " for ", donor_name)
			# Could notify backend that spawn was processed
		else:
			print("[GameManager] Failed to spawn ", game_enemy_type)

func _convert_enemy_type(backend_type: String) -> String:
	"""Convert backend enemy type to game enemy type"""
	match backend_type:
		"GOBLIN":
			return "goblin"
		"ORC": 
			return "orc"
		"DRAGON":
			return "dragon"
		_:
			return "goblin"

func _on_donation_received(donation_data: Dictionary) -> void:
	"""Handle incoming donation events from backend"""
	print("[GameManager] Donation received: ", donation_data)
	
	var event_type: String = donation_data.get("event_type", "")
	var amount: float = donation_data.get("amount", 0.0)
	var username: String = donation_data.get("username", "Anonymous")
	var message: String = donation_data.get("message", "")
	
	# Process the donation effect
	_process_donation_effect(event_type, amount, username, message)
	
	# Emit signal for other systems
	donation_received.emit(donation_data)

func _process_donation_effect(event_type: String, amount: float, username: String, message: String) -> void:
	"""Apply donation effects to the game"""
	match event_type:
		"speed_boost":
			_apply_speed_boost(amount)
		"damage_boost":
			_apply_damage_boost(amount)
		"health_boost":
			_apply_health_boost(amount)
		"shield":
			_apply_shield(amount)
		"enemy_wave":
			_spawn_enemy_wave(amount)
		"SPAWN_ENEMY":
			_spawn_donation_enemy(username, message)
		"SPAWN_DRAGON":
			_spawn_donation_dragon(username, amount)
		_:
			print("[GameManager] Unknown donation effect: ", event_type)

func _apply_speed_boost(_amount: float) -> void:
	"""Apply speed boost to knight"""
	if not knight:
		return
	
	var boost_multiplier: float = 1.5
	var duration: float = _get_boost_duration("speed_boost")
	
	# Handle stacking
	if active_boost == "speed_boost":
		boost_stacks += 1
		boost_end_time += duration * 0.5  # Extend duration
	else:
		_end_current_boost()
		active_boost = "speed_boost"
		boost_stacks = 1
		boost_end_time = Time.get_unix_time_from_system() + duration
	
	knight.apply_speed_boost(boost_multiplier)
	print("[GameManager] Applied speed boost (x", boost_stacks, ")")

func _apply_damage_boost(_amount: float) -> void:
	"""Apply damage boost to knight"""
	if not knight:
		return
	
	var boost_multiplier: float = 1.75
	var duration: float = _get_boost_duration("damage_boost")
	
	# Handle stacking
	if active_boost == "damage_boost":
		boost_stacks += 1
		boost_end_time += duration * 0.5
	else:
		_end_current_boost()
		active_boost = "damage_boost"
		boost_stacks = 1
		boost_end_time = Time.get_unix_time_from_system() + duration
	
	knight.apply_damage_boost(boost_multiplier)
	print("[GameManager] Applied damage boost (x", boost_stacks, ")")

func _apply_health_boost(amount: float) -> void:
	"""Apply instant health restoration"""
	if not knight:
		return
	
	var heal_amount: int = int(amount * 2)  # $1 = 2 health
	knight.heal(heal_amount)
	print("[GameManager] Applied health boost: +", heal_amount, " health")

func _apply_shield(_amount: float) -> void:
	"""Apply temporary shield to knight"""
	if not knight:
		return
	
	var duration: float = _get_boost_duration("shield")
	
	# Shield doesn't stack, just extends duration
	if active_boost == "shield":
		boost_end_time += duration * 0.5
	else:
		_end_current_boost()
		active_boost = "shield"
		boost_stacks = 1
		boost_end_time = Time.get_unix_time_from_system() + duration
	
	knight.apply_shield(true)
	print("[GameManager] Applied shield protection")

func _spawn_enemy_wave(amount: float) -> void:
	"""Spawn additional enemies based on donation amount"""
	if not enemy_spawner:
		return
	
	var enemy_count: int = max(1, int(amount))  # At least 1 enemy per dollar
	enemy_spawner.spawn_wave(enemy_count)
	print("[GameManager] Spawned enemy wave: ", enemy_count, " enemies")

func _spawn_donation_enemy(username: String, message: String) -> void:
	"""Spawn an enemy from a donation"""
	if not enemy_spawner:
		return
	
	# Default to goblin, but could be parsed from message
	var enemy_type: String = "goblin"
	if "orc" in message.to_lower():
		enemy_type = "orc"
	
	enemy_spawner.spawn_donation_enemy(enemy_type, username)
	print("[GameManager] ", username, " spawned an ", enemy_type)

func _spawn_donation_dragon(username: String, amount: float) -> void:
	"""Spawn a dragon from a donation"""
	if not enemy_spawner:
		return
	
	enemy_spawner.spawn_donation_enemy("dragon", username)
	print("[GameManager] ", username, " donated $", amount, " to spawn a DRAGON!")

func _end_current_boost() -> void:
	"""End the currently active boost"""
	if active_boost == "" or not knight:
		return
	
	match active_boost:
		"speed_boost":
			knight.remove_speed_boost()
		"damage_boost":
			knight.remove_damage_boost()
		"shield":
			knight.apply_shield(false)
	
	print("[GameManager] Ended boost: ", active_boost)
	active_boost = ""
	boost_stacks = 0
	boost_end_time = 0.0
	
	# Clear boost UI
	if ui_boost_timer:
		ui_boost_timer.text = ""
	if ui_boost_type:
		ui_boost_type.text = ""
	if boost_timer_bar:
		boost_timer_bar.value = 0

# Game event handlers
func _on_knight_health_changed(_new_health: int, _max_health: int) -> void:
	"""Handle knight health changes"""
	# Health UI is updated in _update_ui()
	pass

func _on_enemy_killed(_enemy_position: Vector2, enemy_type: String) -> void:
	"""Handle enemy death events"""
	kills += 1
	
	# Calculate score based on enemy type using Combat system
	var enemy_max_health: int = _get_enemy_max_health(enemy_type)
	var score_gain: int = Combat.calculate_score_for_kill(enemy_type, enemy_max_health)
	score += score_gain
	
	# Visual feedback
	if score_display:
		score_display.flash_score()
	
	print("[GameManager] Enemy killed: ", enemy_type, " - Score +", score_gain)
	
	# Update UI
	_update_ui()
	
	# Send updated stats to backend
	_send_game_stats()

func _on_damage_dealt(damage: int, _target_position: Vector2) -> void:
	"""Handle damage dealt by knight"""
	damage_dealt += damage

func _on_enemy_spawned(_enemy: Node2D) -> void:
	"""Handle new enemy spawning"""
	# Connect to enemy signals if needed
	pass

# Backend communication
func _send_game_state() -> void:
	"""Send current game state to backend"""
	if not ws_connected or not websocket_client:
		return
	
	var game_state: Dictionary = {
		"type": "game_state_update",
		"data": {
			"score": score,
			"knight_health": knight.health if knight else 0,
			"knight_max_health": knight.max_health if knight else 100,
			"active_boost": active_boost,
			"boost_stacks": boost_stacks,
			"boost_time_remaining": max(0, boost_end_time - Time.get_unix_time_from_system()) if active_boost != "" else 0
		}
	}
	
	websocket_client.send_message(game_state)

func _send_game_stats() -> void:
	"""Send updated game statistics to backend"""
	if not ws_connected or not websocket_client:
		return
	
	var stats: Dictionary = {
		"type": "stats_update",
		"data": {
			"score": score,
			"kills": kills,
			"damage_dealt": damage_dealt,
			"damage_taken": damage_taken
		}
	}
	
	websocket_client.send_message(stats)
	game_stats_updated.emit(stats["data"])

func _send_detailed_game_state() -> void:
	"""Send complete game state to backend for overlays"""
	if not ws_connected or not websocket_client:
		return
	
	var game_state: Dictionary = {
		"type": "game_state_update",
		"data": {
			"score": score,
			"kills": kills,
			"damage_dealt": damage_dealt,
			"damage_taken": damage_taken,
			"knight": {
				"health": knight.health if knight else 0,
				"max_health": knight.max_health if knight else 0,
				"position": {
					"x": knight.global_position.x if knight else 0.0,
					"y": knight.global_position.y if knight else 0.0
				},
				"alive": knight.is_alive() if knight else false
			},
			"wave": enemy_spawner.wave_number if enemy_spawner else 1,
			"active_enemies": enemy_spawner.active_enemies.size() if enemy_spawner else 0,
			"boost": {
				"active": active_boost != "",
				"type": active_boost,
				"stacks": boost_stacks,
				"time_remaining": max(0, boost_end_time - Time.get_unix_time_from_system()) if active_boost != "" else 0
			},
			"timestamp": Time.get_unix_time_from_system()
		}
	}
	
	websocket_client.send_message(game_state)

# Public API for external systems
func get_current_stats() -> Dictionary:
	"""Get current game statistics"""
	return {
		"score": score,
		"kills": kills,
		"damage_dealt": damage_dealt,
		"damage_taken": damage_taken,
		"knight_health": knight.health if knight else 0,
		"active_boost": active_boost,
		"boost_stacks": boost_stacks
	}

func force_boost_end() -> void:
	"""Manually end current boost (for admin controls)"""
	_end_current_boost()

func add_score(points: int) -> void:
	"""Add points to score (for special events)"""
	score += points
	_send_game_stats()

func _get_enemy_max_health(enemy_type: String) -> int:
	"""Get maximum health for enemy type"""
	match enemy_type:
		"goblin":
			return 30
		"orc":
			return 60
		"dragon":
			return 150
		_:
			return 30

func _update_performance_metrics(delta: float) -> void:
	"""Update FPS and performance tracking"""
	frame_count += 1
	fps_timer += delta
	delta_accumulator += delta
	
	# Update FPS calculation every second
	if fps_timer >= FPS_UPDATE_INTERVAL:
		current_fps = frame_count / fps_timer
		frame_count = 0
		fps_timer = 0.0
		
		# Log performance warnings if FPS drops significantly
		if current_fps < TARGET_FPS * 0.8:  # Less than 48 FPS
			print("[GameManager] Performance warning: FPS dropped to ", current_fps)
		
		# Update performance in detailed game state
		_check_performance_issues()

func _check_performance_issues() -> void:
	"""Check for performance issues and log them"""
	if current_fps < 30.0:
		print("[GameManager] Critical performance issue: FPS = ", current_fps)
		# Could implement automatic quality reduction here
	elif current_fps < 45.0:
		print("[GameManager] Performance degradation: FPS = ", current_fps)

func get_performance_stats() -> Dictionary:
	"""Get current performance statistics"""
	return {
		"fps": current_fps,
		"target_fps": TARGET_FPS,
		"frame_count": frame_count,
		"active_enemies": enemy_spawner.active_enemies.size() if enemy_spawner else 0
	}

func _on_knight_died() -> void:
	"""Handle knight death - show game over and reset after delay"""
	print("[GameManager] Knight died! Final score: ", score, " kills: ", kills)
	
	# Show game over UI
	_show_game_over_screen()
	
	# Wait before reset
	await get_tree().create_timer(3.0).timeout
	
	# Reset the game
	_reset_game()

func _show_game_over_screen() -> void:
	"""Display game over screen with final stats"""
	# Update UI to show game over
	if score_display:
		score_display.show_game_over(score, kills)
	
	# Send final stats to backend
	_send_game_over_stats()
	
	print("[GameManager] Game Over - Score: ", score, ", Kills: ", kills, ", Damage Dealt: ", damage_dealt)

func _reset_game() -> void:
	"""Reset the game state to start over"""
	print("[GameManager] Resetting game...")
	
	# Reset game stats
	score = 0
	kills = 0
	damage_dealt = 0
	damage_taken = 0
	
	# Reset boost system
	active_boost = ""
	boost_end_time = 0.0
	boost_stacks = 0
	
	# Reset knight
	if knight:
		knight.reset_knight()
	
	# Clear all enemies
	if enemy_spawner:
		enemy_spawner.clear_all_enemies()
		enemy_spawner.reset_wave()
	
	# Reset UI
	if score_display:
		score_display.reset_display()
	
	# Update UI
	_update_ui()
	
	# Send reset notification to backend
	websocket_client.send_game_reset()
	
	print("[GameManager] Game reset complete")

func _send_game_over_stats() -> void:
	"""Send final game statistics to backend"""
	var final_stats: Dictionary = {
		"event": "game_over",
		"final_score": score,
		"total_kills": kills,
		"damage_dealt": damage_dealt,
		"damage_taken": damage_taken,
		"game_duration": Time.get_unix_time_from_system() - 0  # Would need start time tracking
	}
	
	if websocket_client:
		websocket_client.send_message(final_stats)
