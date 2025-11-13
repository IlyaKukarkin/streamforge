extends Node
class_name BoostManager

# Boost system for managing timed effects on the knight
# Handles attack boost, track expiry time, remove on timeout

# Boost tracking
var is_boost_active: bool = false
var boost_start_time: float = 0.0
var boost_duration: float = 0.0
var boost_multiplier: float = 1.0
var boost_type: String = ""

# References
var knight: Knight
var game_manager: GameManager

# Signals
signal boost_started(boost_type: String, multiplier: float, duration: float)
signal boost_expired(boost_type: String)
signal boost_time_updated(time_remaining: float)

func _ready():
	print("[BoostManager] Boost manager initialized")
	
	# Find references
	_find_references()

func _find_references():
	"""Find required node references"""
	# Find knight
	knight = get_tree().get_first_node_in_group("knight")
	if not knight:
		print("[BoostManager] Warning: Could not find knight node")
	
	# Find game manager
	game_manager = get_tree().get_first_node_in_group("game_manager")
	if not game_manager:
		print("[BoostManager] Warning: Could not find game manager")

func _process(delta):
	"""Update boost timers"""
	if is_boost_active:
		var elapsed_time = Time.get_ticks_msec() / 1000.0 - boost_start_time
		var time_remaining = boost_duration - elapsed_time
		
		# Emit time update for UI
		boost_time_updated.emit(time_remaining)
		
		# Check if boost has expired
		if time_remaining <= 0:
			_expire_boost()

func apply_boost(type: String, multiplier: float, duration_seconds: float):
	"""Apply a boost effect to the knight"""
	print("[BoostManager] Applying boost: ", type, " (", multiplier, "x for ", duration_seconds, "s)")
	
	# If boost is already active, extend or replace it
	if is_boost_active:
		print("[BoostManager] Extending existing boost")
		# For now, we replace the boost (could be changed to extend)
		_remove_current_boost()
	
	# Set boost parameters
	boost_type = type
	boost_multiplier = multiplier
	boost_duration = duration_seconds
	boost_start_time = Time.get_ticks_msec() / 1000.0
	is_boost_active = true
	
	# Apply boost to knight based on type
	_apply_boost_to_knight()
	
	# Emit signal
	boost_started.emit(boost_type, boost_multiplier, boost_duration)

func _apply_boost_to_knight():
	"""Apply the boost effect to the knight"""
	if not knight:
		print("[BoostManager] Error: No knight reference to apply boost")
		return
	
	match boost_type:
		"DAMAGE", "BOOST", "ATTACK":
			# Apply damage/attack boost
			knight.apply_damage_boost(boost_multiplier)
			print("[BoostManager] Applied damage boost: ", boost_multiplier, "x")
		
		"SPEED":
			# Apply speed boost
			knight.apply_speed_boost(boost_multiplier)
			print("[BoostManager] Applied speed boost: ", boost_multiplier, "x")
		
		_:
			print("[BoostManager] Warning: Unknown boost type: ", boost_type)

func _expire_boost():
	"""Handle boost expiration"""
	print("[BoostManager] Boost expired: ", boost_type)
	
	# Remove boost from knight
	_remove_current_boost()
	
	# Emit expiration signal
	boost_expired.emit(boost_type)
	
	# Reset boost state
	is_boost_active = false
	boost_type = ""
	boost_multiplier = 1.0
	boost_duration = 0.0
	boost_start_time = 0.0

func _remove_current_boost():
	"""Remove the current boost effect from the knight"""
	if not knight:
		return
	
	match boost_type:
		"DAMAGE", "BOOST", "ATTACK":
			knight.remove_damage_boost()
		"SPEED":
			knight.remove_speed_boost()

func force_expire_boost():
	"""Manually expire the current boost"""
	if is_boost_active:
		_expire_boost()

func get_boost_info() -> Dictionary:
	"""Get current boost information"""
	if not is_boost_active:
		return {
			"active": false,
			"type": "",
			"multiplier": 1.0,
			"time_remaining": 0.0
		}
	
	var elapsed_time = Time.get_ticks_msec() / 1000.0 - boost_start_time
	var time_remaining = boost_duration - elapsed_time
	
	return {
		"active": true,
		"type": boost_type,
		"multiplier": boost_multiplier,
		"time_remaining": max(0.0, time_remaining),
		"duration": boost_duration
	}

func is_boost_active_type(type: String) -> bool:
	"""Check if a specific boost type is currently active"""
	return is_boost_active and boost_type == type

func get_time_remaining() -> float:
	"""Get remaining boost time in seconds"""
	if not is_boost_active:
		return 0.0
	
	var elapsed_time = Time.get_ticks_msec() / 1000.0 - boost_start_time
	return max(0.0, boost_duration - elapsed_time)

func get_boost_progress() -> float:
	"""Get boost progress as percentage (0.0 - 1.0)"""
	if not is_boost_active or boost_duration <= 0:
		return 0.0
	
	var elapsed_time = Time.get_ticks_msec() / 1000.0 - boost_start_time
	return clamp(elapsed_time / boost_duration, 0.0, 1.0)

# Event handlers for WebSocket messages
func handle_boost_event(event_data: Dictionary):
	"""Handle boost event from backend"""
	print("[BoostManager] Received boost event: ", event_data)
	
	var boost_type = event_data.get("eventType", "BOOST")
	var parameters = event_data.get("parameters", {})
	var multiplier = parameters.get("boostPercent", 50) / 100.0 + 1.0  # Convert percent to multiplier
	var duration = parameters.get("durationSeconds", 600)  # Default 10 minutes
	
	apply_boost(boost_type, multiplier, duration)

func reset_boosts():
	"""Reset all boosts (for game restart)"""
	if is_boost_active:
		_remove_current_boost()
	
	is_boost_active = false
	boost_type = ""
	boost_multiplier = 1.0
	boost_duration = 0.0
	boost_start_time = 0.0
	
	print("[BoostManager] All boosts reset")