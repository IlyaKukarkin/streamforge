extends CharacterBody2D
class_name Enemy

# Enemy configuration
@export var enemy_type: String = "goblin"
@export var max_health: int = 50
@export var attack_damage: int = 10
@export var move_speed: float = 100.0
@export var attack_range: float = 64.0
@export var attack_cooldown: float = 2.0

# Current state
var health: int
var target_knight: Knight
var is_defeated: bool = false
var is_attacking: bool = false
var attack_timer: float = 0.0
var last_attack_time: float = 0.0

# Donation spawn info
var is_donation_spawn: bool = false
var donor_name: String = ""
var spawn_time: float = 0.0

# AI behavior
var state: String = "seeking" # seeking, attacking, dead
var detection_range: float = 200.0
var stun_duration: float = 0.5
var stun_timer: float = 0.0

# Components
@onready var sprite: Sprite2D = $Sprite2D
@onready var collision_shape: CollisionShape2D = $CollisionShape2D
@onready var health_bar: ProgressBar = $HealthBar

# Signals
signal enemy_defeated(enemy_position: Vector2, enemy_type: String)
signal knight_attacked(damage: int, enemy_position: Vector2)

func _ready() -> void:
	print("[Enemy] Initializing ", enemy_type, " enemy...")
	
	# Initialize health
	health = max_health
	
	# Find knight target
	target_knight = find_knight()
	
	# Update health bar
	update_health_bar()
	
	# Set sprite color based on enemy type
	update_sprite_appearance()
	
	print("[Enemy] ", enemy_type, " initialized with health: ", health)

func _physics_process(delta: float) -> void:
	if is_defeated or stun_timer > 0.0:
		if stun_timer > 0.0:
			stun_timer -= delta
		return
	
	# Update attack timer
	if attack_timer > 0.0:
		attack_timer -= delta
	
	# AI behavior based on state
	match state:
		"seeking":
			seek_knight(delta)
		"attacking":
			attack_knight(delta)
		"dead":
			return
	
	# Move the enemy
	move_and_slide()

func find_knight() -> Knight:
	"""Find the knight in the scene"""
	var knight_node: Node = get_node("../Knight")
	if knight_node and knight_node is Knight:
		return knight_node as Knight
	
	# Search in parent's children if direct path doesn't work
	var parent: Node = get_parent()
	for child: Node in parent.get_children():
		if child is Knight:
			return child as Knight
	
	push_error("[Enemy] Could not find Knight node")
	return null

func seek_knight(_delta: float) -> void:
	"""Move towards the knight"""
	if not target_knight or not target_knight.is_alive():
		velocity = Vector2.ZERO
		return
	
	var distance_to_knight: float = global_position.distance_to(target_knight.global_position)
	
	# Switch to attack state if close enough
	if distance_to_knight <= attack_range:
		state = "attacking"
		velocity = Vector2.ZERO
		return
	
	# Move towards knight
	var direction: Vector2 = (target_knight.global_position - global_position).normalized()
	velocity = direction * move_speed
	
	# Face the knight
	if direction.x != 0:
		sprite.scale.x = abs(sprite.scale.x) * sign(direction.x)

func attack_knight(_delta: float) -> void:
	"""Attack the knight if in range and cooldown is ready"""
	if not target_knight or not target_knight.is_alive():
		state = "seeking"
		return
	
	var distance_to_knight: float = global_position.distance_to(target_knight.global_position)
	
	# Return to seeking if knight moved away
	if distance_to_knight > attack_range * 1.2: # Add some hysteresis
		state = "seeking"
		return
	
	# Stop moving while attacking
	velocity = Vector2.ZERO
	
	# Attack if cooldown is ready
	if attack_timer <= 0.0:
		perform_attack()
		attack_timer = attack_cooldown

func perform_attack() -> void:
	"""Execute an attack on the knight"""
	if not target_knight:
		return
	
	print("[Enemy] ", enemy_type, " attacks knight for ", attack_damage, " damage")
	
	# Deal damage to knight
	var _knight_died: bool = target_knight.take_damage(attack_damage)
	
	# Visual attack feedback
	show_attack_effect()
	
	# Emit attack signal
	knight_attacked.emit(attack_damage, global_position)
	
	last_attack_time = Time.get_time_dict_from_system()["unix"]

func show_attack_effect() -> void:
	"""Show visual feedback for attack"""
	# Flash white briefly
	if sprite:
		var tween: Tween = create_tween()
		tween.tween_property(sprite, "modulate", Color.WHITE * 1.5, 0.1)
		tween.tween_property(sprite, "modulate", get_base_color(), 0.1)

func take_damage(damage: int) -> bool:
	"""Take damage and return true if enemy died"""
	if is_defeated:
		return true
	
	health = max(0, health - damage)
	print("[Enemy] ", enemy_type, " took ", damage, " damage. Health: ", health, "/", max_health)
	
	# Update health bar
	update_health_bar()
	
	# Visual damage feedback
	show_damage_effect()
	
	# Add brief stun
	stun_timer = stun_duration
	
	# Check for death
	if health <= 0:
		handle_death()
		return true
	
	return false

func show_damage_effect() -> void:
	"""Show visual feedback for taking damage"""
	# Flash red briefly
	if sprite:
		var tween: Tween = create_tween()
		tween.tween_property(sprite, "modulate", Color.RED, 0.2)
		tween.tween_property(sprite, "modulate", get_base_color(), 0.2)

func handle_death() -> void:
	"""Handle enemy death"""
	if is_defeated:
		return
		
	print("[Enemy] ", enemy_type, " has been defeated!")
	is_defeated = true
	state = "dead"
	
	# Disable collision
	collision_shape.set_deferred("disabled", true)
	
	# Visual death effect
	if sprite:
		var tween: Tween = create_tween()
		tween.tween_property(sprite, "modulate", Color(1, 1, 1, 0.3), 1.0)
		tween.tween_property(sprite, "scale", Vector2.ZERO, 1.0)
		tween.tween_callback(queue_free)
	
	# Hide health bar
	if health_bar:
		health_bar.visible = false
	
	# Emit defeat signal
	enemy_defeated.emit(global_position, enemy_type)

func update_health_bar() -> void:
	"""Update the health bar display"""
	if not health_bar:
		return
	
	health_bar.max_value = max_health
	health_bar.value = health
	
	# Change color based on health percentage
	var health_percent: float = float(health) / float(max_health)
	var _bar_color: Color = Color.GREEN
	
	if health_percent <= 0.3:
		_bar_color = Color.RED
	elif health_percent <= 0.6:
		_bar_color = Color.YELLOW
	
	# Note: This would require a custom theme or StyleBoxFlat to change color
	# For now, the health bar will use default styling

func update_sprite_appearance() -> void:
	"""Update sprite appearance based on enemy type"""
	if not sprite:
		return
	
	var base_color: Color = get_base_color()
	sprite.modulate = base_color

func get_base_color() -> Color:
	"""Get the base color for this enemy type"""
	match enemy_type:
		"goblin":
			return Color.GREEN
		"orc":
			return Color(0.8, 0.4, 0.2)  # Brown
		"dragon":
			return Color.RED
		_:
			return Color.WHITE

# Public API for configuration
func set_stats(new_health: int, new_attack: int, new_speed: float, new_type: String) -> void:
	"""Set enemy stats (called by spawner)"""
	max_health = new_health
	health = new_health
	attack_damage = new_attack
	move_speed = new_speed
	enemy_type = new_type
	
	update_health_bar()
	update_sprite_appearance()
	
	print("[Enemy] Stats set - Type: ", new_type, ", Health: ", new_health, ", Attack: ", new_attack, ", Speed: ", new_speed)

func get_health_percentage() -> float:
	"""Get health as a percentage (0.0 - 1.0)"""
	return float(health) / float(max_health)

func is_alive() -> bool:
	"""Check if enemy is still alive"""
	return not is_defeated and health > 0

func get_distance_to_knight() -> float:
	"""Get distance to the knight"""
	if target_knight:
		return global_position.distance_to(target_knight.global_position)
	return -1.0

func force_death() -> void:
	"""Force enemy death (for admin/testing)"""
	health = 0
	handle_death()

# Donation spawn methods
func set_donor_info(donor: String) -> void:
	"""Set information about the donor who spawned this enemy"""
	donor_name = donor
	spawn_time = Time.get_time_dict_from_system()["unix"]
	print("[Enemy] Enemy spawned by donor: ", donor)

func mark_as_donation_spawn(is_donation: bool) -> void:
	"""Mark this enemy as spawned from a donation"""
	is_donation_spawn = is_donation
	if is_donation:
		# Make donation-spawned enemies slightly more prominent
		if sprite:
			sprite.scale *= 1.1  # 10% larger
		print("[Enemy] Enemy marked as donation spawn")

func get_donor_info() -> Dictionary:
	"""Get donor information for this enemy"""
	return {
		"is_donation_spawn": is_donation_spawn,
		"donor_name": donor_name,
		"spawn_time": spawn_time
	}
