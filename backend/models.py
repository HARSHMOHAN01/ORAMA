from database import get_db_connection
from datetime import datetime

def reverse_geocode(lat, lng):
    # Proximity checking to local landmarks in Roorkee, India
    landmarks = [
        {"name": "IIT Roorkee Main Gate, Civil Lines", "lat": 29.8644, "lng": 77.8964},
        {"name": "Civil Lines Road, Near Century Gate", "lat": 29.8690, "lng": 77.8930},
        {"name": "Haridwar Highway, Roorkee Cantonment", "lat": 29.8790, "lng": 77.9010},
        {"name": "Ganesh Pur Road, Roorkee South", "lat": 29.8540, "lng": 77.8820},
        {"name": "Railway Station Road, Roorkee East", "lat": 29.8590, "lng": 77.9050},
        {"name": "Malviya Chowk Market Area", "lat": 29.8650, "lng": 77.8860},
        {"name": "Solani River Bridge Path", "lat": 29.8750, "lng": 77.8960},
        {"name": "Roorkee Talkies Chowk", "lat": 29.8682, "lng": 77.8895},
        {"name": "Cantonment Board Hospital Area", "lat": 29.8720, "lng": 77.9075},
        {"name": "Pani ki Tanki Chowk, Ganeshpur", "lat": 29.8510, "lng": 77.8920}
    ]
    closest = None
    min_dist = float('inf')
    for l in landmarks:
        dist = ((l['lat'] - lat)**2 + (l['lng'] - lng)**2)**0.5
        if dist < min_dist:
            min_dist = dist
            closest = l
    streets = ["Main St", "Lane 2", "Link Rd", "Sector 3 Extension", "Chowk Crossing"]
    street = streets[int((lat + lng) * 1000) % len(streets)]
    return f"{street}, near {closest['name']}"

class Pothole:
    @staticmethod
    def create(device_id, latitude, longitude, status, severity=None, priority=None, image_url=None):
        """Insert a new pothole record into the database."""
        import random
        conn = get_db_connection()
        cursor = conn.cursor()
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        address = reverse_geocode(latitude, longitude)
        
        if not severity:
            severity = random.choice(['HIGH', 'MEDIUM', 'LOW'])
        if not priority:
            priority = 'CRITICAL' if severity == 'HIGH' else 'NORMAL'
        if not image_url:
            mock_images = [
                'https://images.unsplash.com/photo-1515162305285-0293e4767cc2?w=500',
                'https://images.unsplash.com/photo-1615569429711-4770e0b3c66f?w=500',
                'https://images.unsplash.com/photo-1599740831146-80f6276d031e?w=500',
                'https://images.unsplash.com/photo-1584467541268-b040f83be3fd?w=500'
            ]
            image_url = random.choice(mock_images)
            
        cursor.execute(
            'INSERT INTO pothole (device_id, latitude, longitude, address, status, timestamp, severity, priority, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            (device_id, latitude, longitude, address, status, timestamp, severity, priority, image_url)
        )
        conn.commit()
        last_id = cursor.lastrowid
        
        # Retrieve the inserted row
        cursor.execute('SELECT * FROM pothole WHERE id = ?', (last_id,))
        row = cursor.fetchone()
        conn.close()
        
        return dict(row) if row else None

    @staticmethod
    def get_all(limit=50):
        """Retrieve the latest pothole records from the database ordered by timestamp descending."""
        conn = get_db_connection()
        cursor = conn.cursor()
        if limit:
            cursor.execute('SELECT * FROM pothole ORDER BY timestamp DESC LIMIT ?', (limit,))
        else:
            cursor.execute('SELECT * FROM pothole ORDER BY timestamp DESC')
        rows = cursor.fetchall()
        conn.close()
        return [dict(row) for row in rows]

    @staticmethod
    def delete(pothole_id):
        """Delete a pothole record by ID. Returns True if successfully deleted."""
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('DELETE FROM pothole WHERE id = ?', (pothole_id,))
        conn.commit()
        changes = conn.total_changes
        conn.close()
        return changes > 0

    @staticmethod
    def get_stats():
        """Compute system analytics and return summary statistics."""
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Total potholes
        cursor.execute('SELECT COUNT(*) FROM pothole')
        total_potholes = cursor.fetchone()[0]
        
        # Unique active devices
        cursor.execute('SELECT COUNT(DISTINCT device_id) FROM pothole')
        active_devices = cursor.fetchone()[0]
        
        # Latest detection timestamp
        cursor.execute('SELECT timestamp FROM pothole ORDER BY timestamp DESC LIMIT 1')
        latest_row = cursor.fetchone()
        latest_detection = latest_row[0] if latest_row else None
        
        # Today's potholes
        today_str = datetime.now().strftime('%Y-%m-%d')
        cursor.execute('SELECT COUNT(*) FROM pothole WHERE timestamp LIKE ?', (today_str + '%',))
        today_potholes = cursor.fetchone()[0]
        
        # Week's potholes
        cursor.execute("SELECT COUNT(*) FROM pothole WHERE datetime(timestamp) >= datetime('now', '-7 days')")
        week_potholes = cursor.fetchone()[0]
        
        # Total resolved/filled potholes
        cursor.execute("SELECT COUNT(*) FROM pothole WHERE status = 'FILLED'")
        resolved_potholes = cursor.fetchone()[0]
        
        # Total unresolved potholes
        cursor.execute("SELECT COUNT(*) FROM pothole WHERE status != 'FILLED'")
        unresolved_potholes = cursor.fetchone()[0]
        
        # Severity breakdown
        cursor.execute("SELECT COUNT(*) FROM pothole WHERE severity = 'HIGH'")
        severity_high = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM pothole WHERE severity = 'MEDIUM'")
        severity_medium = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM pothole WHERE severity = 'LOW'")
        severity_low = cursor.fetchone()[0]
        
        # Recent Alerts (last 10 alerts)
        cursor.execute('SELECT * FROM pothole ORDER BY timestamp DESC LIMIT 10')
        recent_rows = cursor.fetchall()
        recent_alerts = [dict(row) for row in recent_rows]
        
        conn.close()
        
        return {
            "total_potholes": total_potholes,
            "active_devices": active_devices,
            "latest_detection": latest_detection,
            "today_potholes": today_potholes,
            "week_potholes": week_potholes,
            "resolved_potholes": resolved_potholes,
            "unresolved_potholes": unresolved_potholes,
            "severity_high": severity_high,
            "severity_medium": severity_medium,
            "severity_low": severity_low,
            "recent_alerts": recent_alerts,
            "avg_response_time": 45
        }

    @staticmethod
    def update_status(pothole_id, status):
        """Update the status of a pothole record in SQLite."""
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('UPDATE pothole SET status = ? WHERE id = ?', (status, pothole_id))
        conn.commit()
        changes = conn.total_changes
        
        # Retrieve the updated row
        cursor.execute('SELECT * FROM pothole WHERE id = ?', (pothole_id,))
        row = cursor.fetchone()
        conn.close()
        
        return dict(row) if row and changes > 0 else None
