extends Node
class_name EnemyManager

# Manages multiple active enemies and resolves conflicts
# Handles enemy coordination, priority, and advanced AI behaviors

# Enemy tracking
var managed_enemies: Array[Node2D] = []
var enemy_priorities: Dictionary = {}
var max_managed_enemies: int = 20

# Conflict resolution
var spawn_conflict_radius: float = 100.0
var enemy_separation_distance: float = 80.0

# Signals
signal enemy_added(enemy: Node2D)
signal enemy_removed(enemy: Node2D)
signal conflict_resolved(enemies: Array)

func _ready() -> void:
	print("[EnemyManager] Enemy manager initialized")

func _process(_delta: float) -> void:
	# Clean up defeated or invalid enemies
	_cleanup_defeated_enemies()
	
	# Resolve enemy conflicts (prevent overcrowding)
	_resolve_spatial_conflicts()
	
	# Update enemy priorities
	_update_enemy_priorities()

func add_enemy(enemy: Node2D, priority: int = 1) -> void:
	"""Add an enemy to management"""
	if not enemy or enemy in managed_enemies:
		return
	
	if managed_enemies.size() >= max_managed_enemies:
		_remove_lowest_priority_enemy()
	
	managed_enemies.append(enemy)
	enemy_priorities[enemy] = priority
	
	# Connect to enemy signals if available
	if enemy.has_signal("enemy_defeated"):
		enemy.enemy_defeated.connect(_on_enemy_defeated)
	
	print("[EnemyManager] Added enemy with priority: ", priority)
	enemy_added.emit(enemy)

func remove_enemy(enemy: Node2D) -> void:
	"""Remove an enemy from management"""
	if not enemy or enemy not in managed_enemies:
		return
	
	managed_enemies.erase(enemy)
	enemy_priorities.erase(enemy)
	
	print("[EnemyManager] Removed enemy from management")
	enemy_removed.emit(enemy)

func get_managed_enemy_count() -> int:
	"""Get number of currently managed enemies"""
	_cleanup_defeated_enemies()
	return managed_enemies.size()

func get_enemies_by_type(enemy_type: String) -> Array[Node2D]:
	"""Get all managed enemies of a specific type"""
	var matching_enemies: Array[Node2D] = []
	
	for enemy: Node2D in managed_enemies:
		if is_instance_valid(enemy) and enemy.get("enemy_type") == enemy_type:
			matching_enemies.append(enemy)
	
	return matching_enemies

func get_highest_priority_enemy() -> Node2D:
	"""Get the enemy with the highest priority"""
	var highest_priority: int = -1
	var priority_enemy: Node2D = null
	
	for enemy: Node2D in managed_enemies:
		if is_instance_valid(enemy):
			var priority: int = enemy_priorities.get(enemy, 0)
			if priority > highest_priority:
				highest_priority = priority
				priority_enemy = enemy
	
	return priority_enemy

func set_enemy_priority(enemy: Node2D, priority: int) -> void:
	"""Set priority for a specific enemy"""
	if enemy in managed_enemies:
		enemy_priorities[enemy] = priority
		print("[EnemyManager] Updated enemy priority to: ", priority)

func clear_all_enemies() -> void:
	"""Remove all enemies from management"""
	for enemy: Node2D in managed_enemies:
		if is_instance_valid(enemy):
			enemy.queue_free()
	
	managed_enemies.clear()
	enemy_priorities.clear()
	print("[EnemyManager] Cleared all managed enemies")

func get_enemies_near_position(position: Vector2, radius: float) -> Array[Node2D]:
	"""Get enemies within radius of a position"""
	var nearby_enemies: Array[Node2D] = []
	
	for enemy: Node2D in managed_enemies:
		if is_instance_valid(enemy):
			var distance: float = enemy.global_position.distance_to(position)
			if distance <= radius:
				nearby_enemies.append(enemy)
	
	return nearby_enemies

func resolve_spawn_conflict(spawn_position: Vector2) -> Vector2:
	"""Resolve conflicts when spawning at a position"""
	var nearby_enemies: Array[Node2D] = get_enemies_near_position(spawn_position, spawn_conflict_radius)
	
	if nearby_enemies.is_empty():
		return spawn_position
	
	# Find a clear position nearby
	var attempts: int = 0
	var max_attempts: int = 10
	var adjusted_position: Vector2 = spawn_position
	
	while attempts < max_attempts:
		var angle: float = randf() * 2.0 * PI
		var distance: float = randf_range(spawn_conflict_radius, spawn_conflict_radius * 1.5)
		adjusted_position = spawn_position + Vector2(cos(angle), sin(angle)) * distance
		
		var conflicts: Array[Node2D] = get_enemies_near_position(adjusted_position, enemy_separation_distance)
		if conflicts.is_empty():
			break
		
		attempts += 1
	
	if attempts >= max_attempts:
		print("[EnemyManager] Could not resolve spawn conflict, using original position")
		return spawn_position
	
	print("[EnemyManager] Resolved spawn conflict, moved position by: ", adjusted_position - spawn_position)
	return adjusted_position

# Private methods
func _cleanup_defeated_enemies() -> void:
	"""Remove defeated or invalid enemies"""
	var enemies_to_remove: Array[Node2D] = []
	
	for enemy: Node2D in managed_enemies:
		var is_defeated: bool = false
		if is_instance_valid(enemy):
			is_defeated = enemy.get("is_defeated") if enemy.has_method("get") else false
		else:
			is_defeated = true
		
		if is_defeated or not is_instance_valid(enemy):
			enemies_to_remove.append(enemy)
	
	for enemy: Node2D in enemies_to_remove:
		remove_enemy(enemy)

func _resolve_spatial_conflicts() -> void:
	"""Prevent enemies from clustering too close together"""
	var conflicts_resolved: int = 0
	
	for i: int in range(managed_enemies.size()):
		var enemy_a: Node2D = managed_enemies[i]
		if not is_instance_valid(enemy_a):
			continue
		
		for j: int in range(i + 1, managed_enemies.size()):
			var enemy_b: Node2D = managed_enemies[j]
			if not is_instance_valid(enemy_b):
				continue
			
			var distance: float = enemy_a.global_position.distance_to(enemy_b.global_position)
			if distance < enemy_separation_distance:
				_separate_enemies(enemy_a, enemy_b)
				conflicts_resolved += 1
	
	if conflicts_resolved > 0:
		conflict_resolved.emit(managed_enemies.slice(0, conflicts_resolved * 2))

func _separate_enemies(enemy_a: Node2D, enemy_b: Node2D) -> void:
	"""Separate two enemies that are too close"""
	var direction: Vector2 = (enemy_b.global_position - enemy_a.global_position).normalized()
	var separation: float = enemy_separation_distance / 2.0
	
	# Move enemies apart
	enemy_a.global_position -= direction * separation * 0.1
	enemy_b.global_position += direction * separation * 0.1

func _update_enemy_priorities() -> void:
	"""Update enemy priorities based on game state"""
	# Dragon enemies get higher priority
	# Enemies near knight get higher priority
	# Donation-spawned enemies get higher priority
	
	for enemy: Node2D in managed_enemies:
		if not is_instance_valid(enemy):
			continue
		
		var base_priority: int = 1
		var enemy_type: String = enemy.get("enemy_type") if enemy.has_method("get") else "goblin"
		
		# Type-based priority
		match enemy_type:
			"dragon":
				base_priority = 5
			"orc":
				base_priority = 3
			"goblin":
				base_priority = 1
		
		# Donation spawn bonus
		var is_donation_spawn: bool = enemy.get("is_donation_spawn") if enemy.has_method("get") else false
		if is_donation_spawn:
			base_priority += 2
		
		enemy_priorities[enemy] = base_priority

func _remove_lowest_priority_enemy() -> void:
	"""Remove the enemy with lowest priority to make room"""
	var lowest_priority: int = 999
	var lowest_enemy: Node2D = null
	
	for enemy: Node2D in managed_enemies:
		if is_instance_valid(enemy):
			var priority: int = enemy_priorities.get(enemy, 0)
			if priority < lowest_priority:
				lowest_priority = priority
				lowest_enemy = enemy
	
	if lowest_enemy:
		print("[EnemyManager] Removing lowest priority enemy (priority: ", lowest_priority, ")")
		lowest_enemy.queue_free()
		remove_enemy(lowest_enemy)

# Signal handlers
func _on_enemy_defeated(enemy_position: Vector2, _enemy_type: String) -> void:
	"""Handle enemy defeat"""
	print("[EnemyManager] Enemy defeated at: ", enemy_position)

# Public API
func get_stats() -> Dictionary:
	"""Get manager statistics"""
	return {
		"managed_enemies": managed_enemies.size(),
		"max_capacity": max_managed_enemies,
		"dragon_count": get_enemies_by_type("dragon").size(),
		"orc_count": get_enemies_by_type("orc").size(),
		"goblin_count": get_enemies_by_type("goblin").size()
	}