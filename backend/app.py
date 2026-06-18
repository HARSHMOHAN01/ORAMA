from flask import Flask
from flask_cors import CORS
from database import init_db
from socket_server import init_socketio, socketio
from routes import api_bp, admin_bp

def create_app():
    """Application factory for the Smart Pothole Detection backend."""
    app = Flask(__name__)
    app.config['SECRET_KEY'] = 'pothole_secret_key_123!'
    
    # Configure CORS to allow access from frontend development server (typically port 5173 for Vite)
    CORS(app, resources={r"/*": {"origins": "*"}})
    
    # Initialize SQLite database
    init_db()
    
    # Initialize Socket.IO
    init_socketio(app)
    
    # Register blueprints
    # REST API is mounted at root / for exact route compliance: /pothole, /potholes, /potholes/stats
    app.register_blueprint(api_bp, url_prefix='/')
    
    # Admin template-based dashboard is mounted at /admin
    app.register_blueprint(admin_bp, url_prefix='/admin')
    
    return app

if __name__ == '__main__':
    app = create_app()
    # Run the socket server on port 5000
    print("Starting Flask-SocketIO server on http://localhost:5000")
    socketio.run(app, debug=True, host='0.0.0.0', port=5000, allow_unsafe_werkzeug=True)
