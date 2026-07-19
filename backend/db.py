import os
import sqlite3
import datetime
import logging
from typing import List, Dict, Any, Optional
from contextlib import contextmanager

# Setup logger for database operations
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("db")

# Local SQLite DB path
SQLITE_DB_PATH = "fifa_local.db"

@contextmanager
def get_db_connection():
    """
    Context manager to safely retrieve and clean up SQLite connections.
    Configures row_factory for dict-like rows and enables auto-commit/rollback transactions.
    """
    conn = sqlite3.connect(SQLITE_DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        with conn:  # Auto-commit transactions on exit, rollback on error
            yield conn
    finally:
        conn.close()

def init_sqlite_db() -> None:
    """
    Initializes the local SQLite database. Creates tables for gate statuses,
    SOS emergency alerts, and audience chat logs if they do not exist.
    Additionally, seeds default gates metadata if the gate status table is empty.
    """
    try:
        with get_db_connection() as conn:
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
                now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
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
                logger.info("Successfully initialized and seeded SQLite database.")
    except Exception as e:
        logger.error(f"Error during SQLite DB initialization: {e}")
        raise

# Always initialize SQLite database on module import
init_sqlite_db()

# Database API wrappers

def get_gate_status() -> List[Dict[str, Any]]:
    """
    Retrieves the statuses and metrics of all gates in the stadium.
    
    Returns:
        List[Dict[str, Any]]: A list of dictionaries representing the gate statuses.
    """
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM gate_status")
            return [dict(row) for row in cursor.fetchall()]
    except Exception as e:
        logger.error(f"Error executing get_gate_status: {e}")
        return []

def update_gate_status(gate_id: str, status: str, crowd_count: int) -> Dict[str, Any]:
    """
    Updates the crowd count and operational status of a specific gate.
    
    Args:
        gate_id (str): The unique identifier of the gate.
        status (str): The new status of the gate ('Open', 'Crowded', 'Closed').
        crowd_count (int): The current estimated crowd size.
        
    Returns:
        Dict[str, Any]: The updated gate database row as a dictionary.
    """
    try:
        now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            UPDATE gate_status 
            SET status = ?, crowd_count = ?, updated_at = ? 
            WHERE gate_id = ?
            """, (status, crowd_count, now_str, gate_id))
            
            # Retrieve updated row
            cursor.execute("SELECT * FROM gate_status WHERE gate_id = ?", (gate_id,))
            row = cursor.fetchone()
            if row is None:
                raise ValueError(f"Gate {gate_id} not found after update.")
            return dict(row)
    except Exception as e:
        logger.error(f"Error executing update_gate_status for gate {gate_id}: {e}")
        raise

def create_sos_alert(seat: str, block: str, gate: str, message: Optional[str]) -> Dict[str, Any]:
    """
    Creates a new high-priority SOS emergency alert from a spectator.
    
    Args:
        seat (str): The spectator's seat number.
        block (str): The block section where the spectator is located.
        gate (str): The nearest gate.
        message (Optional[str]): An optional message describing the emergency.
        
    Returns:
        Dict[str, Any]: The created SOS alert database row.
    """
    try:
        now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT INTO sos_alerts (seat, block, gate, message, status, created_at)
            VALUES (?, ?, ?, ?, 'Active', ?)
            """, (seat, block, gate, message or "", now_str))
            alert_id = cursor.lastrowid
            
            # Retrieve created row
            cursor.execute("SELECT * FROM sos_alerts WHERE id = ?", (alert_id,))
            row = cursor.fetchone()
            if row is None:
                raise ValueError("SOS alert not found after creation.")
            return dict(row)
    except Exception as e:
        logger.error(f"Error executing create_sos_alert at Block {block}: {e}")
        raise

def get_sos_alerts() -> List[Dict[str, Any]]:
    """
    Retrieves all SOS alerts sorted in descending order by ID (latest alerts first).
    
    Returns:
        List[Dict[str, Any]]: A list of SOS alerts.
    """
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM sos_alerts ORDER BY id DESC")
            return [dict(row) for row in cursor.fetchall()]
    except Exception as e:
        logger.error(f"Error executing get_sos_alerts: {e}")
        return []

def resolve_sos_alert(alert_id: int) -> Dict[str, Any]:
    """
    Marks an SOS alert as 'Resolved'.
    
    Args:
        alert_id (int): The database primary key of the SOS alert.
        
    Returns:
        Dict[str, Any]: The updated SOS alert database row.
    """
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE sos_alerts SET status = 'Resolved' WHERE id = ?", (alert_id,))
            
            cursor.execute("SELECT * FROM sos_alerts WHERE id = ?", (alert_id,))
            row = cursor.fetchone()
            if row is None:
                raise ValueError(f"SOS alert with ID {alert_id} not found after resolving.")
            return dict(row)
    except Exception as e:
        logger.error(f"Error executing resolve_sos_alert for ID {alert_id}: {e}")
        raise

def unresolve_sos_alert(alert_id: int) -> Dict[str, Any]:
    """
    Reopens a resolved SOS alert back to 'Active' status.
    
    Args:
        alert_id (int): The database primary key of the SOS alert.
        
    Returns:
        Dict[str, Any]: The updated SOS alert database row.
    """
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE sos_alerts SET status = 'Active' WHERE id = ?", (alert_id,))
            
            cursor.execute("SELECT * FROM sos_alerts WHERE id = ?", (alert_id,))
            row = cursor.fetchone()
            if row is None:
                raise ValueError(f"SOS alert with ID {alert_id} not found after unresolving.")
            return dict(row)
    except Exception as e:
        logger.error(f"Error executing unresolve_sos_alert for ID {alert_id}: {e}")
        raise

def add_chat_log(session_id: str, message: str, sender: str) -> Dict[str, Any]:
    """
    Logs a chat message exchanged during a session.
    
    Args:
        session_id (str): The session token/identifier.
        message (str): The body of the message.
        sender (str): The sender entity ('Audience' or 'AI').
        
    Returns:
        Dict[str, Any]: The logged chat record.
    """
    try:
        now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT INTO chat_logs (session_id, message, sender, created_at)
            VALUES (?, ?, ?, ?)
            """, (session_id, message, sender, now_str))
            log_id = cursor.lastrowid
            
            cursor.execute("SELECT * FROM chat_logs WHERE id = ?", (log_id,))
            row = cursor.fetchone()
            if row is None:
                raise ValueError("Chat log not found after creation.")
            return dict(row)
    except Exception as e:
        logger.error(f"Error executing add_chat_log for session {session_id}: {e}")
        raise

def get_chat_logs(session_id: str) -> List[Dict[str, Any]]:
    """
    Retrieves all chat logs for a specific session sorted by date.
    
    Args:
        session_id (str): The session token/identifier.
        
    Returns:
        List[Dict[str, Any]]: The list of messages in this session.
    """
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM chat_logs WHERE session_id = ? ORDER BY id ASC", (session_id,))
            return [dict(row) for row in cursor.fetchall()]
    except Exception as e:
        logger.error(f"Error executing get_chat_logs for session {session_id}: {e}")
        return []

def get_recent_audience_chats(limit: int = 50) -> List[Dict[str, Any]]:
    """
    Retrieves the most recent chat logs from the audience across all sessions.
    
    Args:
        limit (int): The maximum number of chat logs to retrieve. Defaults to 50.
        
    Returns:
        List[Dict[str, Any]]: A list of recent chat logs from the audience.
    """
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            SELECT * FROM chat_logs 
            WHERE sender = 'Audience' 
            ORDER BY id DESC 
            LIMIT ?
            """, (limit,))
            return [dict(row) for row in cursor.fetchall()]
    except Exception as e:
        logger.error(f"Error executing get_recent_audience_chats: {e}")
        return []
