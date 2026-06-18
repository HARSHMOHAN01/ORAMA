from flask import Blueprint, request, jsonify, render_template, redirect, url_for
from models import Pothole
from socket_server import broadcast_pothole, broadcast_update
import random
import os

# Define blueprints
api_bp = Blueprint('api', __name__)

# Admin blueprint configured to look for templates and static files in the root admin/ folder
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
admin_template_dir = os.path.join(base_dir, 'admin', 'templates')
admin_static_dir = os.path.join(base_dir, 'admin', 'static')

admin_bp = Blueprint('admin', __name__,
                     template_folder=admin_template_dir,
                     static_folder=admin_static_dir,
                     static_url_path='/admin/static')

# Base coordinates for Roorkee, India
BASE_LAT = 29.865
BASE_LNG = 77.896

# Define REST API Routes

@api_bp.route('/pothole', methods=['POST'])
def add_pothole():
    """
    POST /pothole
    Accepts: { "device_id": "A001", "status": "POTHOLE" }
    Generates GPS, stores in DB, broadcasts to WebSockets, and returns success response.
    """
    data = request.get_json() or {}
    device_id = data.get('device_id')
    status = data.get('status')

    if not device_id or not status:
        return jsonify({"success": False, "error": "Missing device_id or status"}), 400

    # Generate mock GPS coordinates with small random offset (within ~2km)
    lat_offset = random.uniform(-0.015, 0.015)
    lng_offset = random.uniform(-0.015, 0.015)
    latitude = round(BASE_LAT + lat_offset, 5)
    longitude = round(BASE_LNG + lng_offset, 5)

    # Save to SQLite DB
    pothole = Pothole.create(device_id, latitude, longitude, status)

    if pothole:
        # Broadcast the new pothole event to all connected WebSocket clients
        broadcast_pothole(pothole)
        return jsonify({"success": True, "data": pothole}), 201
    else:
        return jsonify({"success": False, "error": "Failed to create database record"}), 500


@api_bp.route('/potholes', methods=['GET'])
def get_potholes():
    """
    GET /potholes
    Returns list of all pothole records.
    """
    records = Pothole.get_all()
    return jsonify(records), 200


@api_bp.route('/pothole/<int:pothole_id>', methods=['DELETE'])
def delete_pothole(pothole_id):
    """
    DELETE /pothole/<id>
    Deletes the pothole record from SQLite.
    """
    success = Pothole.delete(pothole_id)
    if success:
        return jsonify({"success": True, "message": f"Pothole record {pothole_id} deleted."}), 200
    else:
        return jsonify({"success": False, "error": "Record not found"}), 404


@api_bp.route('/pothole/<int:pothole_id>/status', methods=['PUT'])
def update_pothole_status(pothole_id):
    """
    PUT /pothole/<id>/status
    Updates the status of a pothole (e.g. to 'FILLED').
    """
    data = request.get_json() or {}
    status = data.get('status')
    if not status:
        return jsonify({"success": False, "error": "Status is required"}), 400
    
    updated = Pothole.update_status(pothole_id, status)
    if updated:
        broadcast_update(updated)
        return jsonify({"success": True, "data": updated}), 200
    else:
        return jsonify({"success": False, "error": "Pothole not found"}), 404


@api_bp.route('/potholes/stats', methods=['GET'])
def get_stats():
    """
    GET /potholes/stats
    Returns current analytics summary.
    """
    stats = Pothole.get_stats()
    return jsonify(stats), 200


@api_bp.route('/potholes/routes', methods=['GET'])
def get_pothole_routes():
    """
    GET /potholes/routes
    Groups potholes into 3 crew regions and calculates optimized routes.
    """
    records = Pothole.get_all(limit=50) # Get latest 50 to keep route calculations real-time and fast
    # Filter out resolved/filled potholes so crews only focus on active tasks
    records = [r for r in records if r['status'] != 'FILLED']
    
    # Define crew depots (based on different zones of Roorkee)
    crews = [
        {
            "id": "crew_alpha",
            "name": "Crew Alpha (North)",
            "color": "#3b82f6", # Blue
            "depot": [29.8650, 77.8860],
            "potholes": [],
            "total_distance_km": 0.0
        },
        {
            "id": "crew_beta",
            "name": "Crew Beta (South)",
            "color": "#10b981", # Green
            "depot": [29.8510, 77.8920],
            "potholes": [],
            "total_distance_km": 0.0
        },
        {
            "id": "crew_gamma",
            "name": "Crew Gamma (East)",
            "color": "#f59e0b", # Amber
            "depot": [29.8590, 77.9050],
            "potholes": [],
            "total_distance_km": 0.0
        }
    ]
    
    def get_distance_km(lat1, lon1, lat2, lon2):
        # Euclidean distance scaled for latitude/longitude in Roorkee
        dx = (lon1 - lon2) * 96.48
        dy = (lat1 - lat2) * 111.13
        return (dx**2 + dy**2)**0.5

    # 1. Spatial Clustering: Assign each pothole to closest crew depot
    for r in records:
        lat = r['latitude']
        lng = r['longitude']
        
        best_crew = None
        min_dist = float('inf')
        for c in crews:
            dist = get_distance_km(lat, lng, c['depot'][0], c['depot'][1])
            if dist < min_dist:
                min_dist = dist
                best_crew = c
        if best_crew:
            best_crew['potholes'].append(r)
            
    # 2. TSP Optimization: Nearest-Neighbor route sort for each crew
    for c in crews:
        unvisited = list(c['potholes'])
        route = []
        current_loc = c['depot']
        total_dist = 0.0
        
        while unvisited:
            nearest_idx = -1
            min_dist = float('inf')
            for i, p in enumerate(unvisited):
                dist = get_distance_km(current_loc[0], current_loc[1], p['latitude'], p['longitude'])
                if dist < min_dist:
                    min_dist = dist
                    nearest_idx = i
            
            if nearest_idx != -1:
                pothole = unvisited.pop(nearest_idx)
                # Assign severity mock parameter based on id (High, Medium, Low)
                severity_options = ["High", "Medium", "Low"]
                pothole["severity"] = severity_options[pothole["id"] % len(severity_options)]
                
                total_dist += min_dist
                route.append(pothole)
                current_loc = [pothole['latitude'], pothole['longitude']]
                
        # Return trip to depot
        if route:
            total_dist += get_distance_km(current_loc[0], current_loc[1], c['depot'][0], c['depot'][1])
            
        c['potholes'] = route
        c['total_distance_km'] = round(total_dist, 2)
        
    return jsonify({"crews": crews}), 200



# Define Admin Blueprint Routes for Python Server-Rendered Panel

@admin_bp.route('/')
def admin_dashboard():
    """Renders the admin panel record list with database-driven stats."""
    records = Pothole.get_all()
    stats = Pothole.get_stats()
    return render_template('dashboard.html', records=records, stats=stats)


@admin_bp.route('/delete/<int:pothole_id>', methods=['POST'])
def admin_delete(pothole_id):
    """Allows deletion of a record directly from the admin panel."""
    Pothole.delete(pothole_id)
    return redirect(url_for('admin.admin_dashboard'))


@admin_bp.route('/resolve/<int:pothole_id>', methods=['POST'])
def admin_resolve(pothole_id):
    """Allows the municipal corporation department to mark a pothole as resolved/filled."""
    updated = Pothole.update_status(pothole_id, "FILLED")
    if updated:
        broadcast_update(updated)
    return redirect(url_for('admin.admin_dashboard'))


@admin_bp.route('/analytics')
def admin_analytics():
    """Renders visual analytical charts of the pothole records."""
    records = Pothole.get_all(limit=None)
    stats = Pothole.get_stats()
    
    # Process data for charts: potholes per device, potholes per hour
    device_data = {}
    hour_data = [0] * 24
    
    for r in records:
        # Potholes per device
        device_id = r['device_id']
        device_data[device_id] = device_data.get(device_id, 0) + 1
        
        # Potholes per hour (based on SQLite timestamp, e.g., '2026-06-12 22:30:15')
        try:
            # Timestamp format usually: YYYY-MM-DD HH:MM:SS
            hour = int(r['timestamp'].split(' ')[1].split(':')[0])
            hour_data[hour] += 1
        except Exception:
            pass

    return render_template(
        'analytics.html',
        stats=stats,
        device_data=device_data,
        hour_data=hour_data
    )
