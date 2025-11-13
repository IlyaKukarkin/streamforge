extends Node
class_name WebSocketClient

# WebSocket connection
var websocket: WebSocketPeer
var connection_url: String = ""
var is_connected: bool = false
var reconnect_timer: float = 0.0
var reconnect_interval: float = 5.0

# Message queue for reliable delivery
var message_queue: Array[Dictionary] = []
var max_queue_size: int = 100

# Signals
signal connection_changed(connected: bool)
signal donation_received(donation_data: Dictionary)
signal game_state_received(game_state: Dictionary)
signal error_occurred(error_message: String)

func _ready():
	print("[WebSocketClient] WebSocket client initialized")
	websocket = WebSocketPeer.new()

func _process(delta):
	# Handle reconnection
	if not is_connected and connection_url != "":
		reconnect_timer -= delta
		if reconnect_timer <= 0.0:
			_attempt_connection()
			reconnect_timer = reconnect_interval
	
	# Poll WebSocket
	if websocket:
		websocket.poll()
		_handle_websocket_state()
		_process_messages()

func connect_to_server(url: String):
	"""Connect to WebSocket server"""
	connection_url = url
	print("[WebSocketClient] Connecting to: ", url)
	_attempt_connection()

func _attempt_connection():
	"""Attempt to connect to the WebSocket server"""
	if websocket:
		var error = websocket.connect_to_url(connection_url)
		if error != OK:
			print("[WebSocketClient] Failed to connect: ", error)
			error_occurred.emit("Failed to connect to server")

func _handle_websocket_state():
	"""Handle WebSocket connection state changes"""
	var state = websocket.get_ready_state()
	
	match state:
		WebSocketPeer.STATE_CONNECTING:
			# Still connecting, do nothing
			pass
			
		WebSocketPeer.STATE_OPEN:
			if not is_connected:
				is_connected = true
				print("[WebSocketClient] Connected to server")
				connection_changed.emit(true)
				_send_client_info()
				_flush_message_queue()
			
		WebSocketPeer.STATE_CLOSING:
			# Connection is closing
			if is_connected:
				print("[WebSocketClient] Connection closing...")
			
		WebSocketPeer.STATE_CLOSED:
			if is_connected:
				is_connected = false
				print("[WebSocketClient] Disconnected from server")
				connection_changed.emit(false)

func _process_messages():
	"""Process incoming WebSocket messages"""
	while websocket.get_available_packet_count() > 0:
		var packet = websocket.get_packet()
		var message_text = packet.get_string_from_utf8()
		
		try:
			var message = JSON.parse_string(message_text)
			if message:
				_handle_message(message)
			else:
				print("[WebSocketClient] Failed to parse message: ", message_text)
		except:
			print("[WebSocketClient] Error parsing message: ", message_text)

func _handle_message(message: Dictionary):
	"""Handle incoming messages from server"""
	var message_type = message.get("type", "")
	var data = message.get("data", {})
	
	print("[WebSocketClient] Received message: ", message_type)
	
	match message_type:
		"connection_established":
			print("[WebSocketClient] Connection established with server")
			
		"donation_event":
			print("[WebSocketClient] Donation event received: ", data)
			donation_received.emit(data)
			
		"game_state_update", "game_state_broadcast":
			print("[WebSocketClient] Game state update received")
			game_state_received.emit(data)
			
		"pong":
			print("[WebSocketClient] Pong received")
			
		"error":
			var error_msg = data.get("message", "Unknown error")
			print("[WebSocketClient] Server error: ", error_msg)
			error_occurred.emit(error_msg)
			
		_:
			print("[WebSocketClient] Unknown message type: ", message_type)

func _send_client_info():
	"""Send client identification to server"""
	var client_info = {
		"type": "client_info",
		"data": {
			"type": "godot-game",
			"version": "1.0.0"
		}
	}
	send_message(client_info)

func send_message(message: Dictionary):
	"""Send a message to the server"""
	if not message.has("timestamp"):
		message["timestamp"] = Time.get_time_dict_from_system()["unix"]
	
	if is_connected and websocket.get_ready_state() == WebSocketPeer.STATE_OPEN:
		var message_text = JSON.stringify(message)
		var error = websocket.send_text(message_text)
		
		if error != OK:
			print("[WebSocketClient] Failed to send message: ", error)
			_queue_message(message)
	else:
		print("[WebSocketClient] Not connected, queueing message")
		_queue_message(message)

func _queue_message(message: Dictionary):
	"""Queue a message for later delivery"""
	if message_queue.size() >= max_queue_size:
		# Remove oldest message to make room
		message_queue.pop_front()
		print("[WebSocketClient] Message queue full, dropped oldest message")
	
	message_queue.append(message)

func _flush_message_queue():
	"""Send all queued messages"""
	if message_queue.is_empty():
		return
	
	print("[WebSocketClient] Flushing ", message_queue.size(), " queued messages")
	
	for message in message_queue:
		send_message(message)
	
	message_queue.clear()

# Public API methods
func send_game_state_update(game_data: Dictionary):
	"""Send game state update to server"""
	var message = {
		"type": "game_state_update",
		"data": game_data
	}
	send_message(message)

func send_stats_update(stats_data: Dictionary):
	"""Send game statistics to server"""
	var message = {
		"type": "stats_update", 
		"data": stats_data
	}
	send_message(message)

func send_ping():
	"""Send ping to server"""
	var message = {
		"type": "ping",
		"data": {
			"timestamp": Time.get_time_dict_from_system()["unix"]
		}
	}
	send_message(message)

func disconnect_from_server():
	"""Disconnect from server"""
	connection_url = ""
	
	if websocket and is_connected:
		websocket.close(1000, "Client disconnecting")
	
	is_connected = false
	connection_changed.emit(false)
	print("[WebSocketClient] Disconnected from server")

func get_connection_status() -> Dictionary:
	"""Get current connection status"""
	return {
		"connected": is_connected,
		"url": connection_url,
		"state": websocket.get_ready_state() if websocket else -1,
		"queued_messages": message_queue.size()
	}

func clear_message_queue():
	"""Clear the message queue"""
	message_queue.clear()
	print("[WebSocketClient] Message queue cleared")

func send_game_reset():
	"""Send game reset notification to backend"""
	var message = {
		"type": "game_reset",
		"timestamp": Time.get_time_dict_from_system()["unix"]
	}
	send_message(message)