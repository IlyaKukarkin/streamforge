extends Control
class_name ScoreDisplay

# UI References
@onready var score_label: Label = $ScoreLabel
@onready var health_label: Label = $HealthLabel  
@onready var kills_label: Label = $KillsLabel
@onready var wave_label: Label = $WaveLabel
@onready var boost_timer: Label = $BoostTimer
@onready var boost_type: Label = $BoostType
@onready var boost_timer_bar: ProgressBar = $BoostTimerBar

# Current values
var current_score: int = 0
var current_health: int = 100
var max_health: int = 100
var current_kills: int = 0
var current_wave: int = 1
var boost_time_remaining: float = 0.0
var boost_duration: float = 0.0
var current_boost_type: String = ""

func _ready():
	print("[ScoreDisplay] Score UI initialized")
	update_all_display()

func update_score(score: int):
	"""Update the score display"""
	current_score = score
	if score_label:
		score_label.text = "Score: " + str(score)

func update_health(health: int, max_hp: int):
	"""Update the health display"""
	current_health = health
	max_health = max_hp
	if health_label:
		health_label.text = "Health: " + str(health) + "/" + str(max_hp)
		
		# Change color based on health percentage
		var health_percent = float(health) / float(max_hp)
		if health_percent <= 0.2:
			health_label.modulate = Color.RED
		elif health_percent <= 0.5:
			health_label.modulate = Color.YELLOW
		else:
			health_label.modulate = Color.WHITE

func update_kills(kills: int):
	"""Update the kills counter"""
	current_kills = kills
	if kills_label:
		kills_label.text = "Kills: " + str(kills)

func update_wave(wave: int):
	"""Update the wave display"""
	current_wave = wave
	if wave_label:
		wave_label.text = "Wave: " + str(wave)

func update_boost_timer(time_remaining: float, total_duration: float, boost_type: String):
	"""Update the boost timer display"""
	boost_time_remaining = time_remaining
	boost_duration = total_duration
	current_boost_type = boost_type
	
	if time_remaining > 0 and boost_type != "":
		# Show boost info
		if boost_timer:
			var minutes = int(time_remaining) / 60
			var seconds = int(time_remaining) % 60
			boost_timer.text = "Boost: %d:%02d" % [minutes, seconds]
			boost_timer.visible = true
			
		if boost_type:
			boost_type.text = boost_type.to_upper() + " ACTIVE"
			boost_type.visible = true
			
		# Update progress bar
		if boost_timer_bar and total_duration > 0:
			boost_timer_bar.value = (time_remaining / total_duration) * 100.0
			boost_timer_bar.visible = true
	else:
		# Hide boost displays
		if boost_timer:
			boost_timer.visible = false
		if boost_type:
			boost_type.visible = false
		if boost_timer_bar:
			boost_timer_bar.visible = false

func show_game_over(final_score: int, final_kills: int):
	"""Display game over screen"""
	if score_label:
		score_label.text = "GAME OVER! Final Score: " + str(final_score)
		score_label.modulate = Color.RED
		
	if kills_label:
		kills_label.text = "Total Kills: " + str(final_kills)
		kills_label.modulate = Color.RED

func reset_display():
	"""Reset all displays to initial state"""
	current_score = 0
	current_health = 100
	max_health = 100
	current_kills = 0
	current_wave = 1
	boost_time_remaining = 0.0
	current_boost_type = ""
	
	# Reset colors
	if score_label:
		score_label.modulate = Color.WHITE
	if health_label:
		health_label.modulate = Color.WHITE
	if kills_label:
		kills_label.modulate = Color.WHITE
		
	update_all_display()

func update_all_display():
	"""Update all UI elements"""
	update_score(current_score)
	update_health(current_health, max_health)
	update_kills(current_kills)
	update_wave(current_wave)
	update_boost_timer(boost_time_remaining, boost_duration, current_boost_type)

# Animation helpers
func flash_score(color: Color = Color.YELLOW):
	"""Flash the score display to draw attention"""
	if score_label:
		var tween = create_tween()
		tween.tween_property(score_label, "modulate", color, 0.2)
		tween.tween_property(score_label, "modulate", Color.WHITE, 0.2)

func flash_health(color: Color = Color.RED):
	"""Flash the health display when taking damage"""
	if health_label:
		var tween = create_tween()
		tween.tween_property(health_label, "modulate", color, 0.1)
		tween.tween_property(health_label, "modulate", Color.WHITE, 0.1)

# Utility functions
func get_current_stats() -> Dictionary:
	"""Get current UI state as dictionary"""
	return {
		"score": current_score,
		"health": current_health,
		"max_health": max_health,
		"kills": current_kills,
		"wave": current_wave,
		"boost_active": current_boost_type != "",
		"boost_type": current_boost_type,
		"boost_time": boost_time_remaining
	}