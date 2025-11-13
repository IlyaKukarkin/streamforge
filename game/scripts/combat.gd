extends Node
class_name Combat

# Combat system for handling damage calculations and combat interactions
# Static utility functions for consistent combat mechanics across the game

# Combat constants
const CRITICAL_CHANCE: float = 0.1  # 10% critical hit chance
const CRITICAL_MULTIPLIER: float = 2.0  # 2x damage on critical hits
const BASE_ACCURACY: float = 0.95  # 95% hit chance

# Combat calculation functions
static func calculate_damage(attacker_damage: int, defender_armor: int = 0, is_boosted: bool = false, boost_multiplier: float = 1.0) -> int:
	"""Calculate final damage after all modifiers"""
	var base_damage = attacker_damage - defender_armor
	base_damage = max(1, base_damage)  # Minimum 1 damage
	
	# Apply boost if active
	if is_boosted:
		base_damage = int(base_damage * boost_multiplier)
	
	# Check for critical hit
	if randf() < CRITICAL_CHANCE:
		print("[Combat] Critical hit!")
		base_damage = int(base_damage * CRITICAL_MULTIPLIER)
	
	return max(1, base_damage)

static func calculate_knight_damage(knight: Knight) -> int:
	"""Calculate knight's damage with current modifiers"""
	if not knight:
		return 0
	
	var base_damage = knight.current_damage
	return calculate_damage(base_damage, 0, knight.damage_boost_active, knight.damage_boost_multiplier)

static func calculate_enemy_damage(enemy: Enemy) -> int:
	"""Calculate enemy's damage"""
	if not enemy:
		return 0
	
	return calculate_damage(enemy.attack_damage)

static func is_hit_successful(accuracy: float = BASE_ACCURACY) -> bool:
	"""Check if an attack hits based on accuracy"""
	return randf() < accuracy

static func apply_knockback(target: CharacterBody2D, source_position: Vector2, knockback_force: float = 100.0) -> void:
	"""Apply knockback effect to a target"""
	if not target:
		return
	
	var direction = (target.global_position - source_position).normalized()
	var knockback_velocity = direction * knockback_force
	
	# Apply knockback to velocity if the target supports it
	if target.has_method("apply_knockback"):
		target.apply_knockback(knockback_velocity)
	elif "velocity" in target:
		target.velocity += knockback_velocity

static func calculate_experience_points(enemy_type: String, enemy_max_health: int) -> int:
	"""Calculate experience points gained from defeating an enemy"""
	var base_xp = 10
	
	match enemy_type:
		"goblin":
			base_xp = 10
		"orc":
			base_xp = 25
		"dragon":
			base_xp = 100
		_:
			base_xp = 10
	
	# Scale with enemy health for stronger variants
	var health_multiplier = max(1.0, enemy_max_health / 50.0)
	return int(base_xp * health_multiplier)

static func get_damage_type_effectiveness(damage_type: String, target_type: String) -> float:
	"""Get damage multiplier based on damage type vs target type"""
	# Future expansion: different damage types (fire, ice, physical, etc.)
	# For now, all damage is physical with 1.0 effectiveness
	return 1.0

# Combat events and feedback
static func create_damage_number(damage: int, position: Vector2, is_critical: bool = false) -> void:
	"""Create floating damage number at position (visual feedback)"""
	# This would create a floating damage number UI element
	# For now, just print the damage
	var damage_text = str(damage)
	if is_critical:
		damage_text = "CRIT! " + damage_text
	
	print("[Combat] Damage dealt: ", damage_text, " at position: ", position)

static func create_heal_number(heal_amount: int, position: Vector2) -> void:
	"""Create floating heal number at position"""
	print("[Combat] Healed: ", heal_amount, " at position: ", position)

# Status effects (for future expansion)
enum StatusEffect {
	NONE,
	POISON,
	BURNING,
	FROZEN,
	STUNNED,
	BLESSED,
	CURSED
}

static func apply_status_effect(target: Node2D, effect: StatusEffect, duration: float) -> void:
	"""Apply a status effect to a target"""
	# Future implementation for status effects
	print("[Combat] Applied status effect ", StatusEffect.keys()[effect], " to target for ", duration, " seconds")

# Combat utility functions
static func get_distance_between(pos1: Vector2, pos2: Vector2) -> float:
	"""Get distance between two positions"""
	return pos1.distance_to(pos2)

static func is_in_range(attacker_pos: Vector2, target_pos: Vector2, attack_range: float) -> bool:
	"""Check if target is within attack range"""
	return get_distance_between(attacker_pos, target_pos) <= attack_range

static func get_direction_to_target(from: Vector2, to: Vector2) -> Vector2:
	"""Get normalized direction vector from source to target"""
	return (to - from).normalized()

# Score calculation
static func calculate_score_for_kill(enemy_type: String, enemy_max_health: int) -> int:
	"""Calculate score points awarded for killing an enemy"""
	var base_score = 10
	
	match enemy_type:
		"goblin":
			base_score = 10
		"orc":
			base_score = 25
		"dragon":
			base_score = 100
		_:
			base_score = 10
	
	# Bonus for tougher enemies
	var health_bonus = max(0, (enemy_max_health - 50) / 10)
	return base_score + health_bonus