extends Sprite2D

@export var scroll_speed: float = 200.0

func _process(delta: float) -> void:
	position.x -= scroll_speed * delta
	# Loop background if it goes off screen
	if position.x < -texture.get_width() * scale.x / 2:
		position.x += texture.get_width() * scale.x
