from flask_socketio import SocketIO, emit

socketio = SocketIO()

def init_socketio(app):
    """Initialize Flask-SocketIO with the app and enable CORS."""
    socketio.init_app(app, cors_allowed_origins="*")
    return socketio

@socketio.on('connect')
def handle_connect():
    """Handle a new WebSocket connection client."""
    print("Client connected to Socket.IO")
    emit('status', {'connected': True, 'message': 'Successfully connected to Flask Socket.IO server'})

@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection."""
    print("Client disconnected from Socket.IO")

def broadcast_pothole(pothole_data):
    """Broadcast details of a new pothole detection to all clients in real-time."""
    socketio.emit('new_pothole', pothole_data)
    print(f"Broadcasted new pothole event: {pothole_data}")

def broadcast_update(pothole_data):
    """Broadcast details of an updated pothole record (e.g. status change) to all clients."""
    socketio.emit('update_pothole', pothole_data)
    print(f"Broadcasted updated pothole event: {pothole_data}")
