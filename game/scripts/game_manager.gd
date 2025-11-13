extends Node
class_name GameManager

# WebSocket client connection
var websocket_client: WebSocketClient
var is_connected: bool = false
var connection_retry_timer: float = 0.0
const CONNECTION_RETRY_DELAY: float = 5.0

# Game state
var knight: Knight
var enemy_spawner: EnemySpawner
var ui_score: Label
var ui_health: Label
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

func _ready():
	print("[GameManager] Starting game manager...")
	
	# Initialize WebSocket client
	websocket_client = WebSocketClient.new()
	websocket_client.donation_received.connect(_on_donation_received)
	websocket_client.connection_changed.connect(_on_connection_changed)
	add_child(websocket_client)
	
	# Connect to backend
	_connect_to_backend()
	
	# Find game objects
	_setup_game_references()
	
	# Connect signals
	_setup_game_signals()
	
	print("[GameManager] Game manager initialized")

func _setup_game_references():
	"""Find and cache references to game objects"""
	knight = get_node("../Knight") as Knight
	enemy_spawner = get_node("../EnemySpawner") as EnemySpawner
	
	# UI references
	ui_score = get_node("../UI/ScoreLabel") as Label
	ui_health = get_node("../UI/HealthLabel") as Label
	ui_boost_timer = get_node("../UI/BoostTimer") as Label
	ui_boost_type = get_node("../UI/BoostType") as Label
	boost_timer_bar = get_node("../UI/BoostTimerBar") as ProgressBar
	
	if not knight:
		push_error("[GameManager] Could not find Knight node")
	if not enemy_spawner:
		push_error("[GameManager] Could not find EnemySpawner node")

func _setup_game_signals():
	"""Connect to game object signals"""
	if knight:
		knight.health_changed.connect(_on_knight_health_changed)
		knight.enemy_killed.connect(_on_enemy_killed)
		knight.damage_dealt.connect(_on_damage_dealt)
	
	if enemy_spawner:
		enemy_spawner.enemy_spawned.connect(_on_enemy_spawned)

func _connect_to_backend():
	"""Attempt to connect to WebSocket backend"""
	var ws_url = "ws://localhost:3001"
	print("[GameManager] Connecting to WebSocket server: ", ws_url)
	websocket_client.connect_to_server(ws_url)

func _process(delta):
	# Handle connection retry
	if not is_connected:
		connection_retry_timer += delta
		if connection_retry_timer >= CONNECTION_RETRY_DELAY:
			connection_retry_timer = 0.0
			_connect_to_backend()
	
	# Update boost timer
	if active_boost != "":
		var time_remaining = boost_end_time - Time.get_time_dict_from_system()["unix"]
		if time_remaining <= 0:
			_end_current_boost()
		else:
			_update_boost_ui(time_remaining)
	
	# Update UI
	_update_ui()

func _update_ui():
	"""Update all UI elements with current game state"""
	if ui_score:
		ui_score.text = "Score: " + str(score)
	
	if ui_health and knight:
		ui_health.text = "Health: " + str(knight.health) + "/" + str(knight.max_health)

func _update_boost_ui(time_remaining: float):
	"""Update boost-related UI elements"""
	if ui_boost_timer:
		ui_boost_timer.text = "Boost: %.1fs" % time_remaining
	
	if ui_boost_type:
		var boost_text = active_boost
		if boost_stacks > 1:
			boost_text += " x" + str(boost_stacks)
		ui_boost_type.text = boost_text
	
	if boost_timer_bar:
		var original_duration = _get_boost_duration(active_boost)
		var progress = time_remaining / original_duration
		boost_timer_bar.value = progress * 100

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
func _on_connection_changed(connected: bool):
	"""Handle WebSocket connection state changes"""
	is_connected = connected
	if connected:
		print("[GameManager] Connected to backend server")
		connection_retry_timer = 0.0
		_send_game_state()
	else:
		print("[GameManager] Disconnected from backend server")

func _on_donation_received(donation_data: Dictionary):
	"""Handle incoming donation events from backend"""
	print("[GameManager] Donation received: ", donation_data)
	
	var event_type = donation_data.get("event_type", "")
	var amount = donation_data.get("amount", 0.0)
	var username = donation_data.get("username", "Anonymous")
	var message = donation_data.get("message", "")
	
	# Process the donation effect
	_process_donation_effect(event_type, amount, username, message)
	
	# Emit signal for other systems
	donation_received.emit(donation_data)

func _process_donation_effect(event_type: String, amount: float, username: String, message: String):
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
		_:
			print("[GameManager] Unknown donation effect: ", event_type)

func _apply_speed_boost(amount: float):
	"""Apply speed boost to knight"""
	if not knight:
		return
	
	var boost_multiplier = 1.5
	var duration = _get_boost_duration("speed_boost")
	
	# Handle stacking
	if active_boost == "speed_boost":
		boost_stacks += 1
		boost_end_time += duration * 0.5  # Extend duration
	else:
		_end_current_boost()
		active_boost = "speed_boost"
		boost_stacks = 1
		boost_end_time = Time.get_time_dict_from_system()["unix"] + duration
	
	knight.apply_speed_boost(boost_multiplier)
	print("[GameManager] Applied speed boost (x", boost_stacks, ")")

func _apply_damage_boost(amount: float):
	"""Apply damage boost to knight"""
	if not knight:
		return
	
	var boost_multiplier = 1.75
	var duration = _get_boost_duration("damage_boost")
	
	# Handle stacking
	if active_boost == "damage_boost":
		boost_stacks += 1
		boost_end_time += duration * 0.5
	else:
		_end_current_boost()
		active_boost = "damage_boost"
		boost_stacks = 1
		boost_end_time = Time.get_time_dict_from_system()["unix"] + duration
	
	knight.apply_damage_boost(boost_multiplier)
	print("[GameManager] Applied damage boost (x", boost_stacks, ")")

func _apply_health_boost(amount: float):
	"""Apply instant health restoration"""
	if not knight:
		return
	
	var heal_amount = int(amount * 2)  # $1 = 2 health
	knight.heal(heal_amount)
	print("[GameManager] Applied health boost: +", heal_amount, " health")

func _apply_shield(amount: float):
	"""Apply temporary shield to knight"""
	if not knight:
		return
	
	var duration = _get_boost_duration("shield")
	
	# Shield doesn't stack, just extends duration
	if active_boost == "shield":
		boost_end_time += duration * 0.5
	else:
		_end_current_boost()
		active_boost = "shield"
		boost_stacks = 1
		boost_end_time = Time.get_time_dict_from_system()["unix"] + duration
	
	knight.apply_shield(true)
	print("[GameManager] Applied shield protection")

func _spawn_enemy_wave(amount: float):
	"""Spawn additional enemies based on donation amount"""
	if not enemy_spawner:
		return
	
	var enemy_count = max(1, int(amount))  # At least 1 enemy per dollar
	enemy_spawner.spawn_wave(enemy_count)
	print("[GameManager] Spawned enemy wave: ", enemy_count, " enemies")

func _end_current_boost():
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
func _on_knight_health_changed(new_health: int, max_health: int):
	"""Handle knight health changes"""
	# Health UI is updated in _update_ui()
	pass

func _on_enemy_killed(enemy_position: Vector2, enemy_type: String):
	"""Handle enemy death events"""
	kills += 1
	score += 10  # Base score per kill
	
	# Send updated stats to backend
	_send_game_stats()

func _on_damage_dealt(damage: int, target_position: Vector2):
	"""Handle damage dealt by knight"""
	damage_dealt += damage

func _on_enemy_spawned(enemy: Node2D):
	"""Handle new enemy spawning"""
	# Connect to enemy signals if needed
	pass

# Backend communication
func _send_game_state():
	"""Send current game state to backend"""
	if not is_connected or not websocket_client:
		return
	
	var game_state = {
		"type": "game_state_update",
		"data": {
			"score": score,
			"knight_health": knight.health if knight else 0,
			"knight_max_health": knight.max_health if knight else 100,
			"active_boost": active_boost,
			"boost_stacks": boost_stacks,
			"boost_time_remaining": max(0, boost_end_time - Time.get_time_dict_from_system()["unix"]) if active_boost != "" else 0
		}
	}
	
	websocket_client.send_message(game_state)

func _send_game_stats():
	"""Send updated game statistics to backend"""
	if not is_connected or not websocket_client:
		return
	
	var stats = {
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

func force_boost_end():
	"""Manually end current boost (for admin controls)"""
	_end_current_boost()

func add_score(points: int):
	"""Add points to score (for special events)"""
	score += points
	_send_game_stats()