import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'database.db')

def get_db_connection():
    """Establish a connection to the SQLite database with row factory for dictionary-like results."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initialize the SQLite database schema if tables do not exist."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS pothole (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            device_id TEXT NOT NULL,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            address TEXT,
            status TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    try:
        cursor.execute('ALTER TABLE pothole ADD COLUMN address TEXT')
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE pothole ADD COLUMN severity TEXT DEFAULT 'MEDIUM'")
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE pothole ADD COLUMN assigned_crew TEXT DEFAULT NULL")
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE pothole ADD COLUMN image_url TEXT DEFAULT NULL")
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE pothole ADD COLUMN priority TEXT DEFAULT 'NORMAL'")
    except sqlite3.OperationalError:
        pass
    conn.commit()
    conn.close()
    print("Database initialized successfully at", DB_PATH)
