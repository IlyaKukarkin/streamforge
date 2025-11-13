extends Control
class_name BoostTimer

# UI component for displaying boost timer information
# Shows "BOOST ACTIVE: XX seconds remaining"

# UI components
@onready var boost_label: Label = $VBoxContainer/BoostLabel
@onready var timer_label: Label = $VBoxContainer/TimerLabel
@onready var progress_bar: ProgressBar = $VBoxContainer/ProgressBar
@onready var boost_panel: Panel = $BoostPanel

# Boost tracking
var boost_manager: BoostManager
var is_boost_visible: bool = false

# Visual settings
var boost_color: Color = Color.ORANGE
var warning_color: Color = Color.RED
var warning_threshold: float = 30.0  # Show warning when < 30 seconds remain

func _ready():
	print("[BoostTimer] Boost timer UI initialized")
	
	# Initially hide the boost timer
	hide_boost_timer()
	
	# Find boost manager
	_find_boost_manager()
	
	# Setup UI elements
	_setup_ui()

func _find_boost_manager():
	"""Find the boost manager node"""
	boost_manager = get_tree().get_first_node_in_group("boost_manager")
	
	if not boost_manager:
		# Try to find it by searching for the class
		var nodes = get_tree().get_nodes_in_group("boost_manager")
		if nodes.size() > 0:
			boost_manager = nodes[0]
	
	if boost_manager:
		# Connect to boost manager signals
		boost_manager.boost_started.connect(_on_boost_started)
		boost_manager.boost_expired.connect(_on_boost_expired)
		boost_manager.boost_time_updated.connect(_on_boost_time_updated)
		print("[BoostTimer] Connected to boost manager")
	else:
		print("[BoostTimer] Warning: Could not find boost manager")

func _setup_ui():
	"""Setup UI element properties"""
	if boost_label:
		boost_label.text = "BOOST ACTIVE"
		boost_label.add_theme_color_override("font_color", boost_color)
	
	if timer_label:
		timer_label.text = "0:00"
		timer_label.add_theme_color_override("font_color", Color.WHITE)
	
	if progress_bar:
		progress_bar.min_value = 0.0
		progress_bar.max_value = 100.0
		progress_bar.value = 0.0

func _on_boost_started(boost_type: String, multiplier: float, duration: float):
	"""Handle boost started event"""
	print("[BoostTimer] Boost started: ", boost_type, " (", multiplier, "x for ", duration, "s)")
	
	# Update boost label
	if boost_label:
		var boost_text = "BOOST ACTIVE"
		if boost_type != "BOOST":
			boost_text = boost_type + " ACTIVE"
		boost_label.text = boost_text
	
	# Reset progress bar
	if progress_bar:
		progress_bar.max_value = duration
		progress_bar.value = duration
	
	# Show the timer
	show_boost_timer()

func _on_boost_expired(boost_type: String):
	"""Handle boost expired event"""
	print("[BoostTimer] Boost expired: ", boost_type)
	
	# Hide the timer
	hide_boost_timer()

func _on_boost_time_updated(time_remaining: float):
	"""Handle boost time update"""
	if not is_boost_visible:
		return
	
	# Update timer label
	if timer_label:
		timer_label.text = _format_time(time_remaining)
		
		# Change color if warning threshold reached
		if time_remaining <= warning_threshold:
			timer_label.add_theme_color_override("font_color", warning_color)
		else:
			timer_label.add_theme_color_override("font_color", Color.WHITE)
	
	# Update progress bar
	if progress_bar:
		progress_bar.value = time_remaining

func show_boost_timer():
	"""Show the boost timer UI"""
	visible = true
	is_boost_visible = true
	
	# Animate appearance
	var tween = create_tween()
	modulate = Color.TRANSPARENT
	tween.tween_property(self, "modulate", Color.WHITE, 0.3)
	
	print("[BoostTimer] Showing boost timer")

func hide_boost_timer():
	"""Hide the boost timer UI"""
	is_boost_visible = false
	
	# Animate disappearance
	var tween = create_tween()
	tween.tween_property(self, "modulate", Color.TRANSPARENT, 0.3)
	tween.tween_callback(func(): visible = false)
	
	print("[BoostTimer] Hiding boost timer")

func _format_time(seconds: float) -> String:
	"""Format seconds into MM:SS format"""
	var minutes = int(seconds) / 60
	var secs = int(seconds) % 60
	return "%d:%02d" % [minutes, secs]

func force_update():
	"""Force update the timer display from boost manager"""
	if not boost_manager:
		return
	
	var boost_info = boost_manager.get_boost_info()
	
	if boost_info.active:
		if not is_boost_visible:
			_on_boost_started(boost_info.type, boost_info.multiplier, boost_info.duration)
		_on_boost_time_updated(boost_info.time_remaining)
	else:
		if is_boost_visible:
			hide_boost_timer()

# Manual control methods (for testing)
func test_show_boost(duration: float = 60.0):
	"""Test method to show boost timer"""
	_on_boost_started("TEST", 1.5, duration)

func test_hide_boost():
	"""Test method to hide boost timer"""
	_on_boost_expired("TEST")

func set_boost_manager(manager: BoostManager):
	"""Manually set boost manager reference"""
	boost_manager = manager
	_find_boost_manager()  # This will connect signals