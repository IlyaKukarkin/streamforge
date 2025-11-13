extends Node2D
class_name EnemySpawner

# Enemy spawning configuration
@export var spawn_radius: float = 500.0
@export var min_spawn_distance: float = 200.0
@export var max_enemies: int = 10
@export var base_spawn_interval: float = 3.0
@export var wave_spawn_count: int = 3

# Enemy scene references
@export var enemy_scene: PackedScene
@onready var knight: Knight

# Internal state
var active_enemies: Array[Node2D] = []
var spawn_timer: float = 0.0
var current_spawn_interval: float
var wave_number: int = 1
var wave_in_progress: bool = false

# Screen boundaries (assuming 1280x720)
var screen_width: float = 1280.0
var screen_height: float = 720.0

# Signals
signal enemy_spawned(enemy: Node2D)
signal enemy_defeated(enemy_position: Vector2, enemy_type: String)
signal wave_completed(wave_number: int)

func _ready():
	print("[EnemySpawner] Initializing enemy spawner...")
	
	# Load enemy scene if not set
	if not enemy_scene:
		enemy_scene = preload("res://scenes/Enemy.tscn")
	
	# Find knight reference
	knight = get_node("../Knight") as Knight
	if knight:
		print("[EnemySpawner] Found knight at position: ", knight.global_position)
	else:
		push_error("[EnemySpawner] Could not find Knight node")
	
	# Initialize spawn settings
	current_spawn_interval = base_spawn_interval
	spawn_timer = current_spawn_interval
	
	print("[EnemySpawner] Enemy spawner initialized")

func _process(delta):
	# Update spawn timer
	spawn_timer -= delta
	
	# Check if we should spawn a new enemy
	if spawn_timer <= 0.0 and should_spawn_enemy():
		spawn_enemy()
		spawn_timer = current_spawn_interval
	
	# Clean up defeated enemies
	cleanup_defeated_enemies()
	
	# Check for wave completion
	if wave_in_progress and active_enemies.is_empty():
		complete_wave()

func should_spawn_enemy() -> bool:
	"""Check if conditions are met for spawning a new enemy"""
	# Don't spawn if we're at max capacity
	if active_enemies.size() >= max_enemies:
		return false
	
	# Don't spawn if knight is dead
	if not knight or not knight.is_alive():
		return false
	
	return true

func spawn_enemy(enemy_type: String = "goblin") -> Node2D:
	"""Spawn a single enemy at a random position around the knight"""
	if not enemy_scene:
		push_error("[EnemySpawner] No enemy scene loaded")
		return null
	
	# Create enemy instance
	var enemy = enemy_scene.instantiate() as Node2D
	if not enemy:
		push_error("[EnemySpawner] Failed to instantiate enemy scene")
		return null
	
	# Set enemy position
	var spawn_position = get_random_spawn_position()
	enemy.global_position = spawn_position
	
	# Configure enemy based on type and wave
	configure_enemy(enemy, enemy_type)
	
	# Add to scene and track
	get_parent().add_child(enemy)
	active_enemies.append(enemy)
	wave_in_progress = true  # Mark wave as active when enemies are spawned
	
	# Connect enemy signals
	if enemy.has_signal("enemy_defeated"):
		enemy.enemy_defeated.connect(_on_enemy_defeated)
	
	print("[EnemySpawner] Spawned ", enemy_type, " at position: ", spawn_position)
	enemy_spawned.emit(enemy)
	
	return enemy

func spawn_wave(enemy_count: int = 0) -> void:
	"""Spawn a wave of enemies (triggered by donations)"""
	var spawn_count = enemy_count if enemy_count > 0 else wave_spawn_count
	
	print("[EnemySpawner] Spawning wave with ", spawn_count, " enemies")
	
	for i in range(spawn_count):
		# Add small delay between spawns
		await get_tree().create_timer(i * 0.2).timeout
		
		if should_spawn_enemy():
			var enemy_type = get_random_enemy_type()
			spawn_enemy(enemy_type)

func get_random_spawn_position() -> Vector2:
	"""Get a random position around the knight, outside min distance"""
	if not knight:
		# Fallback to screen edges if no knight
		return get_screen_edge_position()
	
	var knight_pos = knight.global_position
	var attempts = 0
	var max_attempts = 20
	
	while attempts < max_attempts:
		# Generate random angle and distance
		var angle = randf() * 2.0 * PI
		var distance = randf_range(min_spawn_distance, spawn_radius)
		
		# Calculate position
		var spawn_pos = knight_pos + Vector2(cos(angle), sin(angle)) * distance
		
		# Check if position is valid (on screen and not too close)
		if is_valid_spawn_position(spawn_pos, knight_pos):
			return spawn_pos
		
		attempts += 1
	
	# Fallback to screen edge if no valid position found
	print("[EnemySpawner] Could not find valid spawn position, using screen edge")
	return get_screen_edge_position()

func is_valid_spawn_position(pos: Vector2, knight_pos: Vector2) -> bool:
	"""Check if a spawn position is valid"""
	# Check screen boundaries (with margin)
	var margin = 50.0
	if pos.x < -margin or pos.x > screen_width + margin:
		return false
	if pos.y < -margin or pos.y > screen_height + margin:
		return false
	
	# Check minimum distance from knight
	var distance_to_knight = pos.distance_to(knight_pos)
	if distance_to_knight < min_spawn_distance:
		return false
	
	return true

func get_screen_edge_position() -> Vector2:
	"""Get a random position at the edge of the screen"""
	var edge = randi() % 4
	var pos = Vector2.ZERO
	
	match edge:
		0: # Top edge
			pos = Vector2(randf() * screen_width, -50.0)
		1: # Right edge  
			pos = Vector2(screen_width + 50.0, randf() * screen_height)
		2: # Bottom edge
			pos = Vector2(randf() * screen_width, screen_height + 50.0)
		3: # Left edge
			pos = Vector2(-50.0, randf() * screen_height)
	
	return pos

func get_random_enemy_type() -> String:
	"""Get a random enemy type based on current wave"""
	var types = ["goblin"]
	
	# Add stronger enemies in later waves
	if wave_number >= 3:
		types.append("orc")
	if wave_number >= 5:
		types.append("orc")  # Higher chance of orcs
	if wave_number >= 7:
		types.append("dragon")
	
	return types[randi() % types.size()]

func configure_enemy(enemy: Node2D, enemy_type: String) -> void:
	"""Configure enemy stats based on type and wave number"""
	if not enemy.has_method("set_stats"):
		return
	
	var base_health = 50
	var base_attack = 10
	var base_speed = 100.0
	
	# Adjust stats based on enemy type
	match enemy_type:
		"goblin":
			base_health = 30
			base_attack = 8
			base_speed = 120.0
		"orc":
			base_health = 80
			base_attack = 15
			base_speed = 80.0
		"dragon":
			base_health = 150
			base_attack = 25
			base_speed = 60.0
	
	# Scale with wave number
	var wave_multiplier = 1.0 + (wave_number - 1) * 0.1
	var final_health = int(base_health * wave_multiplier)
	var final_attack = int(base_attack * wave_multiplier)
	var final_speed = base_speed * wave_multiplier
	
	# Set enemy stats
	enemy.set_stats(final_health, final_attack, final_speed, enemy_type)
	
	print("[EnemySpawner] Configured ", enemy_type, " with health: ", final_health, ", attack: ", final_attack)

func cleanup_defeated_enemies() -> void:
	"""Remove defeated enemies from active list"""
	var enemies_to_remove: Array[Node2D] = []
	
	for enemy in active_enemies:
		var is_defeated = enemy.get("is_defeated") if is_instance_valid(enemy) else true
		if not is_instance_valid(enemy) or is_defeated:
			enemies_to_remove.append(enemy)
	
	for enemy in enemies_to_remove:
		active_enemies.erase(enemy)
		if is_instance_valid(enemy):
			enemy.queue_free()

func complete_wave() -> void:
	"""Handle wave completion"""
	print("[EnemySpawner] Wave ", wave_number, " completed!")
	wave_completed.emit(wave_number)
	
	wave_number += 1
	wave_in_progress = false  # Reset wave flag
	
	# Adjust spawn rate for next wave (spawn faster)
	current_spawn_interval = max(1.0, base_spawn_interval - (wave_number - 1) * 0.2)
	
	print("[EnemySpawner] Starting wave ", wave_number, " with spawn interval: ", current_spawn_interval)

# Signal handlers
func _on_enemy_defeated(enemy_position: Vector2, enemy_type: String):
	"""Handle enemy defeat notification"""
	print("[EnemySpawner] Enemy defeated at: ", enemy_position)
	enemy_defeated.emit(enemy_position, enemy_type)

# Public API
func get_enemy_count() -> int:
	"""Get current number of active enemies"""
	cleanup_defeated_enemies()
	return active_enemies.size()

func get_wave_number() -> int:
	"""Get current wave number"""
	return wave_number

func force_spawn_wave(count: int = 3) -> void:
	"""Force spawn a wave (for admin/testing)"""
	spawn_wave(count)

func clear_all_enemies() -> void:
	"""Remove all active enemies"""
	for enemy in active_enemies:
		if is_instance_valid(enemy):
			enemy.queue_free()
	
	active_enemies.clear()
	print("[EnemySpawner] Cleared all enemies")

func set_wave_number(new_wave: int) -> void:
	"""Set the current wave number (for testing)"""
	wave_number = max(1, new_wave)
	current_spawn_interval = max(1.0, base_spawn_interval - (wave_number - 1) * 0.2)
	print("[EnemySpawner] Set wave number to: ", wave_number)