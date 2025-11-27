extends CharacterBody2D
class_name Knight

# Character stats
@export var max_health: int = 100
@export var base_speed: float = 300.0
@export var base_damage: int = 25

# Current state
var health: int
var current_speed: float
var current_damage: int
var is_shielded: bool = false
var is_attacking: bool = false
var attack_cooldown: float = 0.0

# Boost tracking
var speed_boost_active: bool = false
var damage_boost_active: bool = false
var speed_boost_multiplier: float = 1.0
var damage_boost_multiplier: float = 1.0

# Components
@onready var sprite: Sprite2D = $Sprite2D
@onready var collision_shape: CollisionShape2D = $CollisionShape2D
@onready var attack_area: Area2D = $AttackArea
@onready var attack_collision: CollisionShape2D = $AttackArea/CollisionShape2D

# Constants
const ATTACK_COOLDOWN: float = 0.5
const ATTACK_DURATION: float = 0.2

# Signals
signal health_changed(new_health: int, max_health: int)
signal enemy_killed(enemy_position: Vector2, enemy_type: String)
signal damage_dealt(damage: int, target_position: Vector2)
signal knight_died()

func _ready():
	print("[Knight] Initializing knight...")
	
	# Initialize stats
	health = max_health
	current_speed = base_speed
	current_damage = base_damage
	
	# Setup attack area
	if attack_area:
		attack_area.body_entered.connect(_on_attack_area_body_entered)
	
	print("[Knight] Knight initialized with health: ", health, ", speed: ", current_speed)

func _physics_process(delta):
	# Update attack cooldown
	if attack_cooldown > 0:
		attack_cooldown -= delta
	
	# Handle attack duration
	if is_attacking:
		var attack_time_remaining = ATTACK_DURATION - (ATTACK_COOLDOWN - attack_cooldown)
		if attack_time_remaining <= 0:
			is_attacking = false
			_update_attack_area_visibility()
	
	# Handle input and movement
	_handle_input()
	_handle_movement(delta)
	
	# Move the character
	move_and_slide()
	
	# Check screen boundaries
	_check_screen_boundaries()

func _handle_input():
	"""Process player input"""
	# Attack input (optional - could be automatic for endless game)
	if Input.is_action_just_pressed("ui_accept") or Input.is_action_just_pressed("attack"):
		_try_attack()

func _handle_movement(delta):
	"""Knight remains stationary; background and obstacles scroll to create movement illusion"""
	# No movement for knight; velocity is zero
	velocity = Vector2.ZERO
	# Background and obstacles should be moved by the game manager or scene to create the illusion of movement
	# Ensure sprite faces right
	if sprite:
		sprite.scale.x = abs(sprite.scale.x)

func _try_attack() -> void:
	"""Attempt to perform an attack"""
	if attack_cooldown > 0 or is_attacking:
		return
	
	print("[Knight] Attacking!")
	is_attacking = true
	attack_cooldown = ATTACK_COOLDOWN
	
	# Show attack area briefly
	_update_attack_area_visibility()
	
	# Check for enemies in attack range
	_check_attack_hits()

func _check_attack_hits() -> void:
	"""Check for enemies hit by the attack"""
	if not attack_area:
		return
	
	var bodies: Array = attack_area.get_overlapping_bodies()
	for body in bodies:
		if body is Node2D and body != self and "take_damage" in body:
			_attack_enemy(body)

func _attack_enemy(enemy: Node2D) -> void:
	"""Deal damage to an enemy"""
	var damage: int = Combat.calculate_knight_damage(self)
	var enemy_position: Vector2 = enemy.global_position
	
	print("[Knight] Dealing ", damage, " damage to enemy at ", enemy_position)
	
	# Apply damage
	var enemy_died: bool = false
	if "take_damage" in enemy:
		enemy_died = enemy.take_damage(damage)
	
	# Create damage visual feedback
	Combat.create_damage_number(damage, enemy_position)
	
	# Emit damage dealt signal
	damage_dealt.emit(damage, enemy_position)
	
	# Check if enemy was killed
	if enemy_died:
		enemy_killed.emit(enemy_position, enemy.get("enemy_type"))

func _update_attack_area_visibility() -> void:
	"""Update visual feedback for attack area"""
	if not attack_area:
		return
	
	# For now, we don't have visual feedback, but we could add particles/effects here
	# The attack area collision remains active
	pass

func _check_screen_boundaries() -> void:
	"""Keep knight within screen boundaries"""
	var screen_size: Vector2 = get_viewport_rect().size
	var margin: float = 32.0  # Keep knight 32 pixels from edge
	
	# Keep knight within horizontal bounds
	if global_position.x < margin:
		global_position.x = margin
	elif global_position.x > screen_size.x - margin:
		global_position.x = screen_size.x - margin
	
	# Keep knight within vertical bounds  
	if global_position.y < margin:
		global_position.y = margin
	elif global_position.y > screen_size.y - margin:
		global_position.y = screen_size.y - margin

func _on_attack_area_body_entered(body: Node2D) -> void:
	"""Handle enemy entering attack range (only used during active attack)"""
	if is_attacking and body.has_method("take_damage") and body != self:
		_attack_enemy(body)

# Health management
func take_damage(damage: int) -> bool:
	"""Take damage and return true if knight died"""
	if is_shielded:
		print("[Knight] Damage blocked by shield!")
		return false
	
	health = max(0, health - damage)
	print("[Knight] Took ", damage, " damage. Health: ", health, "/", max_health)
	
	health_changed.emit(health, max_health)
	
	# Update visual feedback
	_update_damage_feedback()
	
	# Check for death
	if health <= 0:
		_handle_death()
		return true
	
	return false

func heal(amount: int) -> void:
	"""Restore health"""
	var old_health: int = health
	health = min(max_health, health + amount)
	
	if health != old_health:
		print("[Knight] Healed for ", health - old_health, " health. Health: ", health, "/", max_health)
		health_changed.emit(health, max_health)
		_update_heal_feedback()

func _update_damage_feedback() -> void:
	"""Visual feedback for taking damage"""
	# Flash red briefly
	if sprite:
		var tween: Tween = create_tween()
		tween.tween_property(sprite, "modulate", Color.RED, 0.1)
		tween.tween_property(sprite, "modulate", Color.WHITE, 0.1)

func _update_heal_feedback() -> void:
	"""Visual feedback for healing"""
	# Flash green briefly
	if sprite:
		var tween: Tween = create_tween()
		tween.tween_property(sprite, "modulate", Color.GREEN, 0.2)
		tween.tween_property(sprite, "modulate", Color.WHITE, 0.2)

func _handle_death() -> void:
	"""Handle knight death"""
	print("[Knight] Knight has died!")
	knight_died.emit()
	
	# Disable input and movement
	set_physics_process(false)
	
	# Visual death effect
	if sprite:
		var tween: Tween = create_tween()
		tween.tween_property(sprite, "modulate", Color(1, 1, 1, 0.3), 1.0)
		tween.tween_property(sprite, "scale", Vector2.ZERO, 1.0)

# Boost management
func apply_speed_boost(multiplier: float) -> void:
	"""Apply speed boost with given multiplier"""
	speed_boost_multiplier = multiplier
	speed_boost_active = true
	_update_speed()
	
	# Visual feedback
	if sprite:
		sprite.modulate = Color(0.5, 0.5, 1.5)  # Blue tint

func remove_speed_boost() -> void:
	"""Remove active speed boost"""
	speed_boost_active = false
	speed_boost_multiplier = 1.0
	_update_speed()
	_reset_sprite_color()

func apply_damage_boost(multiplier: float) -> void:
	"""Apply damage boost with given multiplier"""
	damage_boost_multiplier = multiplier
	damage_boost_active = true
	_update_damage()
	
	# Visual feedback
	if sprite:
		sprite.modulate = Color(1.5, 0.5, 0.5)  # Red tint

func remove_damage_boost() -> void:
	"""Remove active damage boost"""
	damage_boost_active = false
	damage_boost_multiplier = 1.0
	_update_damage()
	_reset_sprite_color()

func apply_shield(enabled: bool) -> void:
	"""Apply or remove shield protection"""
	is_shielded = enabled
	
	# Visual feedback
	if sprite:
		if is_shielded:
			sprite.modulate = Color(1.5, 1.5, 0.5)  # Golden tint
		else:
			_reset_sprite_color()

func _update_speed() -> void:
	"""Recalculate current speed based on boosts"""
	current_speed = base_speed
	if speed_boost_active:
		current_speed *= speed_boost_multiplier

func _update_damage() -> void:
	"""Recalculate current damage based on boosts"""
	current_damage = base_damage
	if damage_boost_active:
		current_damage = int(current_damage * damage_boost_multiplier)

func _reset_sprite_color() -> void:
	"""Reset sprite to default color"""
	if sprite:
		# Check for active boosts to maintain their colors
		if is_shielded:
			sprite.modulate = Color(1.5, 1.5, 0.5)  # Golden
		elif damage_boost_active:
			sprite.modulate = Color(1.5, 0.5, 0.5)  # Red
		elif speed_boost_active:
			sprite.modulate = Color(0.5, 0.5, 1.5)  # Blue
		else:
			sprite.modulate = Color.WHITE

# Public API
func get_health_percentage() -> float:
	"""Get health as a percentage (0.0 - 1.0)"""
	return float(health) / float(max_health)

func is_alive() -> bool:
	"""Check if knight is still alive"""
	return health > 0

func get_knight_position() -> Vector2:
	"""Get knight's current position"""
	return global_position

func reset_knight() -> void:
	"""Reset knight to initial state (for game restart)"""
	health = max_health
	current_speed = base_speed
	current_damage = base_damage
	is_shielded = false
	is_attacking = false
	attack_cooldown = 0.0
	
	speed_boost_active = false
	damage_boost_active = false
	speed_boost_multiplier = 1.0
	damage_boost_multiplier = 1.0
	
	# Reset position to spawn point (left side of screen)
	global_position = Vector2(100, get_viewport_rect().size.y / 2)
	velocity = Vector2.ZERO
	
	# Emit health changed signal to update UI
	health_changed.emit(health, max_health)
	
	print("[Knight] Knight reset to spawn position")
	speed_boost_multiplier = 1.0
	damage_boost_multiplier = 1.0
	
	set_physics_process(true)
	_reset_sprite_color()
	
	if sprite:
		sprite.scale = Vector2.ONE
	
	health_changed.emit(health, max_health)
