import os
import sqlite3
import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# Check if Supabase credentials are provided and valid
USE_SUPABASE = bool(SUPABASE_URL and SUPABASE_KEY and SUPABASE_URL != "your-supabase-url" and SUPABASE_KEY != "your-supabase-anon-key")

# We will define a local SQLite fallback DB path
SQLITE_DB_PATH = "fifa_local.db"

# Initialize local SQLite DB (always run to ensure it is ready if fallback is triggered)
def init_sqlite_db():
    conn = sqlite3.connect(SQLITE_DB_PATH)
    cursor = conn.cursor()
    
    # Gate status table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS gate_status (
        gate_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        status TEXT DEFAULT 'Open',
        crowd_count INTEGER DEFAULT 0,
        capacity INTEGER DEFAULT 100,
        alternative_gate TEXT,
        updated_at TEXT NOT NULL
    )
    """)
    
    # SOS Alerts table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sos_alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        seat TEXT NOT NULL,
        block TEXT NOT NULL,
        gate TEXT NOT NULL,
        message TEXT,
        status TEXT DEFAULT 'Active',
        created_at TEXT NOT NULL
    )
    """)
    
    # Chat logs table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS chat_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        message TEXT NOT NULL,
        sender TEXT NOT NULL,
        created_at TEXT NOT NULL
    )
    """)
    
    # Seed initial gate data if empty
    cursor.execute("SELECT COUNT(*) FROM gate_status")
    if cursor.fetchone()[0] == 0:
        now_str = datetime.datetime.utcnow().isoformat()
        gates_data = [
            ('Gate A', 'Gate A (North Stand)', 'Open', 15, 100, 'Gate B', now_str),
            ('Gate B', 'Gate B (North Stand)', 'Open', 12, 100, 'Gate A', now_str),
            ('Gate C', 'Gate C (North-East)', 'Open', 8, 80, 'Gate D', now_str),
            ('Gate D', 'Gate D (East Stand)', 'Open', 10, 80, 'Gate C', now_str),
            ('Gate E', 'Gate E (South Stand)', 'Open', 20, 120, 'Gate F', now_str),
            ('Gate F', 'Gate F (West Stand)', 'Open', 18, 120, 'Gate E', now_str)
        ]
        cursor.executemany("""
        INSERT INTO gate_status (gate_id, name, status, crowd_count, capacity, alternative_gate, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """, gates_data)
        conn.commit()
        
    conn.close()

# Always initialize SQLite database
init_sqlite_db()

# If using Supabase, try to import supabase client
supabase_client = None
if USE_SUPABASE:
    try:
        from supabase import create_client
        supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("Successfully connected to Supabase.")
    except Exception as e:
        print(f"Failed to initialize Supabase client: {e}. Falling back to SQLite.")
        USE_SUPABASE = False

# Database API wrappers

def get_gate_status():
    if USE_SUPABASE and supabase_client:
        try:
            response = supabase_client.table("gate_status").select("*").execute()
            # Supabase response data is in response.data
            return response.data
        except Exception as e:
            print(f"Supabase get_gate_status failed: {e}. Falling back to SQLite.")
            
    # SQLite Fallback
    conn = sqlite3.connect(SQLITE_DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM gate_status")
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows

def update_gate_status(gate_id: str, status: str, crowd_count: int):
    now_str = datetime.datetime.utcnow().isoformat()
    if USE_SUPABASE and supabase_client:
        try:
            supabase_client.table("gate_status").update({
                "status": status,
                "crowd_count": crowd_count,
                "updated_at": now_str
            }).eq("gate_id", gate_id).execute()
            # Read back updated gate to return it
            response = supabase_client.table("gate_status").select("*").eq("gate_id", gate_id).execute()
            if response.data:
                return response.data[0]
        except Exception as e:
            print(f"Supabase update_gate_status failed: {e}. Falling back to SQLite.")

    # SQLite Fallback
    conn = sqlite3.connect(SQLITE_DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
    UPDATE gate_status 
    SET status = ?, crowd_count = ?, updated_at = ? 
    WHERE gate_id = ?
    """, (status, crowd_count, now_str, gate_id))
    conn.commit()
    
    # Retrieve updated row
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM gate_status WHERE gate_id = ?", (gate_id,))
    row = dict(cursor.fetchone())
    conn.close()
    return row

def create_sos_alert(seat: str, block: str, gate: str, message: str):
    now_str = datetime.datetime.utcnow().isoformat()
    if USE_SUPABASE and supabase_client:
        try:
            response = supabase_client.table("sos_alerts").insert({
                "seat": seat,
                "block": block,
                "gate": gate,
                "message": message,
                "status": "Active",
                "created_at": now_str
            }).execute()
            if response.data:
                return response.data[0]
        except Exception as e:
            print(f"Supabase create_sos_alert failed: {e}. Falling back to SQLite.")

    # SQLite Fallback
    conn = sqlite3.connect(SQLITE_DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO sos_alerts (seat, block, gate, message, status, created_at)
    VALUES (?, ?, ?, ?, 'Active', ?)
    """, (seat, block, gate, message, now_str))
    alert_id = cursor.lastrowid
    conn.commit()
    
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM sos_alerts WHERE id = ?", (alert_id,))
    row = dict(cursor.fetchone())
    conn.close()
    return row

def get_sos_alerts():
    if USE_SUPABASE and supabase_client:
        try:
            response = supabase_client.table("sos_alerts").select("*").execute()
            return response.data
        except Exception as e:
            print(f"Supabase get_sos_alerts failed: {e}. Falling back to SQLite.")
            
    # SQLite Fallback
    conn = sqlite3.connect(SQLITE_DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM sos_alerts ORDER BY id DESC")
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows

def resolve_sos_alert(alert_id: int):
    if USE_SUPABASE and supabase_client:
        try:
            response = supabase_client.table("sos_alerts").update({
                "status": "Resolved"
            }).eq("id", alert_id).execute()
            if response.data:
                return response.data[0]
        except Exception as e:
            print(f"Supabase resolve_sos_alert failed: {e}. Falling back to SQLite.")

    # SQLite Fallback
    conn = sqlite3.connect(SQLITE_DB_PATH)
    cursor = conn.cursor()
    cursor.execute("UPDATE sos_alerts SET status = 'Resolved' WHERE id = ?", (alert_id,))
    conn.commit()
    
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM sos_alerts WHERE id = ?", (alert_id,))
    row = dict(cursor.fetchone())
    conn.close()
    return row

def unresolve_sos_alert(alert_id: int):
    if USE_SUPABASE and supabase_client:
        try:
            response = supabase_client.table("sos_alerts").update({
                "status": "Active"
            }).eq("id", alert_id).execute()
            if response.data:
                return response.data[0]
        except Exception as e:
            print(f"Supabase unresolve_sos_alert failed: {e}. Falling back to SQLite.")

    # SQLite Fallback
    conn = sqlite3.connect(SQLITE_DB_PATH)
    cursor = conn.cursor()
    cursor.execute("UPDATE sos_alerts SET status = 'Active' WHERE id = ?", (alert_id,))
    conn.commit()
    
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM sos_alerts WHERE id = ?", (alert_id,))
    row = dict(cursor.fetchone())
    conn.close()
    return row


def add_chat_log(session_id: str, message: str, sender: str):
    now_str = datetime.datetime.utcnow().isoformat()
    if USE_SUPABASE and supabase_client:
        try:
            response = supabase_client.table("chat_logs").insert({
                "session_id": session_id,
                "message": message,
                "sender": sender,
                "created_at": now_str
            }).execute()
            if response.data:
                return response.data[0]
        except Exception as e:
            print(f"Supabase add_chat_log failed: {e}. Falling back to SQLite.")

    # SQLite Fallback
    conn = sqlite3.connect(SQLITE_DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO chat_logs (session_id, message, sender, created_at)
    VALUES (?, ?, ?, ?)
    """, (session_id, message, sender, now_str))
    log_id = cursor.lastrowid
    conn.commit()
    
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM chat_logs WHERE id = ?", (log_id,))
    row = dict(cursor.fetchone())
    conn.close()
    return row

def get_chat_logs(session_id: str):
    if USE_SUPABASE and supabase_client:
        try:
            response = supabase_client.table("chat_logs").select("*").eq("session_id", session_id).order("id").execute()
            return response.data
        except Exception as e:
            print(f"Supabase get_chat_logs failed: {e}. Falling back to SQLite.")
            
    # SQLite Fallback
    conn = sqlite3.connect(SQLITE_DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM chat_logs WHERE session_id = ? ORDER BY id ASC", (session_id,))
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows
