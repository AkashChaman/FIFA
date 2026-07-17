import os
import json
import datetime
import logging
import time
from typing import List, Dict, Any, Optional

import firebase_admin
from firebase_admin import credentials, firestore

# Setup logger for database operations
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("db")

# Initialize Firebase Admin SDK
db = None

def init_firebase() -> None:
    global db
    try:
        # Check if already initialized
        try:
            firebase_admin.get_app()
            db = firestore.client()
            logger.info("Firebase client retrieved active app instance.")
            return
        except ValueError:
            pass

        # Try to initialize from environment variable containing the service account JSON
        cred_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
        if cred_json:
            logger.info("Initializing Firebase using FIREBASE_SERVICE_ACCOUNT_JSON environment variable.")
            cred_dict = json.loads(cred_json)
            cred = credentials.Certificate(cred_dict)
            firebase_admin.initialize_app(cred)
        else:
            # Fallback to local serviceAccountKey.json file
            key_path = os.path.join(os.path.dirname(__file__), "serviceAccountKey.json")
            if os.path.exists(key_path):
                logger.info(f"Initializing Firebase using local key file: {key_path}")
                cred = credentials.Certificate(key_path)
                firebase_admin.initialize_app(cred)
            else:
                logger.warning("No service account credentials found. Attempting Application Default Credentials.")
                firebase_admin.initialize_app()
        
        db = firestore.client()
        logger.info("Firebase client initialized successfully.")
    except Exception as e:
        logger.error(f"Error initializing Firebase: {e}")

# Always initialize Firebase on module import
init_firebase()

def seed_gates_if_empty() -> None:
    """
    Seeds default gates metadata into Firestore if the gate_status collection is empty.
    """
    if not db:
        logger.error("Cannot seed gates: Firebase client is not initialized.")
        return
    try:
        gates_ref = db.collection("gate_status")
        # Check if any gates exist
        docs = list(gates_ref.limit(1).stream())
        if not docs:
            logger.info("Firestore 'gate_status' collection is empty. Seeding default gates...")
            now_str = datetime.datetime.utcnow().isoformat()
            gates_data = [
                {'gate_id': 'Gate A', 'name': 'Gate A (North Stand)', 'status': 'Open', 'crowd_count': 15, 'capacity': 100, 'alternative_gate': 'Gate B', 'updated_at': now_str},
                {'gate_id': 'Gate B', 'name': 'Gate B (North Stand)', 'status': 'Open', 'crowd_count': 12, 'capacity': 100, 'alternative_gate': 'Gate A', 'updated_at': now_str},
                {'gate_id': 'Gate C', 'name': 'Gate C (North-East)', 'status': 'Open', 'crowd_count': 8, 'capacity': 80, 'alternative_gate': 'Gate D', 'updated_at': now_str},
                {'gate_id': 'Gate D', 'name': 'Gate D (East Stand)', 'status': 'Open', 'crowd_count': 10, 'capacity': 80, 'alternative_gate': 'Gate C', 'updated_at': now_str},
                {'gate_id': 'Gate E', 'name': 'Gate E (South Stand)', 'status': 'Open', 'crowd_count': 20, 'capacity': 120, 'alternative_gate': 'Gate F', 'updated_at': now_str},
                {'gate_id': 'Gate F', 'name': 'Gate F (West Stand)', 'status': 'Open', 'crowd_count': 18, 'capacity': 120, 'alternative_gate': 'Gate E', 'updated_at': now_str}
            ]
            for gate in gates_data:
                gates_ref.document(gate['gate_id']).set(gate)
            logger.info("Firestore 'gate_status' collection seeded successfully.")
    except Exception as e:
        logger.error(f"Error seeding Firestore gates: {e}")

# Run seeding on import if client is available
if db:
    seed_gates_if_empty()

# Database API wrappers

def get_gate_status() -> List[Dict[str, Any]]:
    """
    Retrieves the statuses and metrics of all gates in the stadium from Firestore.
    
    Returns:
        List[Dict[str, Any]]: A list of dictionaries representing the gate statuses.
    """
    if not db:
        logger.error("get_gate_status failed: Firebase client not initialized.")
        return []
    try:
        gates_ref = db.collection("gate_status")
        docs = gates_ref.stream()
        return [doc.to_dict() for doc in docs]
    except Exception as e:
        logger.error(f"Error executing get_gate_status from Firestore: {e}")
        return []

def update_gate_status(gate_id: str, status: str, crowd_count: int) -> Dict[str, Any]:
    """
    Updates the crowd count and operational status of a specific gate in Firestore.
    
    Args:
        gate_id (str): The unique identifier of the gate.
        status (str): The new status of the gate ('Open', 'Crowded', 'Closed').
        crowd_count (int): The current estimated crowd size.
        
    Returns:
        Dict[str, Any]: The updated gate database document as a dictionary.
    """
    if not db:
        raise Exception("update_gate_status failed: Firebase client not initialized.")
    try:
        now_str = datetime.datetime.utcnow().isoformat()
        gate_ref = db.collection("gate_status").document(gate_id)
        
        gate_ref.update({
            "status": status,
            "crowd_count": crowd_count,
            "updated_at": now_str
        })
        
        doc = gate_ref.get()
        return doc.to_dict()
    except Exception as e:
        logger.error(f"Error executing update_gate_status for gate {gate_id} in Firestore: {e}")
        raise

def create_sos_alert(seat: str, block: str, gate: str, message: Optional[str]) -> Dict[str, Any]:
    """
    Creates a new high-priority SOS emergency alert from a spectator in Firestore.
    
    Args:
        seat (str): The spectator's seat number.
        block (str): The block section where the spectator is located.
        gate (str): The nearest gate.
        message (Optional[str]): An optional message describing the emergency.
        
    Returns:
        Dict[str, Any]: The created SOS alert document.
    """
    if not db:
        raise Exception("create_sos_alert failed: Firebase client not initialized.")
    try:
        now_str = datetime.datetime.utcnow().isoformat()
        alert_id = int(time.time() * 1000)  # Use ms timestamp to act as a unique sorted integer ID
        alert_data = {
            "id": alert_id,
            "seat": seat,
            "block": block,
            "gate": gate,
            "message": message or "",
            "status": "Active",
            "created_at": now_str
        }
        
        db.collection("sos_alerts").document(str(alert_id)).set(alert_data)
        return alert_data
    except Exception as e:
        logger.error(f"Error executing create_sos_alert at Block {block} in Firestore: {e}")
        raise

def get_sos_alerts() -> List[Dict[str, Any]]:
    """
    Retrieves all SOS alerts sorted in descending order by ID (latest alerts first).
    
    Returns:
        List[Dict[str, Any]]: A list of SOS alerts.
    """
    if not db:
        logger.error("get_sos_alerts failed: Firebase client not initialized.")
        return []
    try:
        alerts_ref = db.collection("sos_alerts").order_by("id", direction=firestore.Query.DESCENDING)
        docs = alerts_ref.stream()
        return [doc.to_dict() for doc in docs]
    except Exception as e:
        logger.warning(f"Failed query with ordering on Firestore: {e}. Falling back to in-memory sort.")
        try:
            # Fallback to local memory sort to avoid composite index requirement issues
            docs = db.collection("sos_alerts").stream()
            alerts = [doc.to_dict() for doc in docs]
            alerts.sort(key=lambda x: x.get("id", 0), reverse=True)
            return alerts
        except Exception as fallback_err:
            logger.error(f"Error executing get_sos_alerts fallback: {fallback_err}")
            return []

def resolve_sos_alert(alert_id: int) -> Dict[str, Any]:
    """
    Marks an SOS alert as 'Resolved' in Firestore.
    
    Args:
        alert_id (int): The ID of the SOS alert.
        
    Returns:
        Dict[str, Any]: The updated SOS alert document.
    """
    if not db:
        raise Exception("resolve_sos_alert failed: Firebase client not initialized.")
    try:
        alert_ref = db.collection("sos_alerts").document(str(alert_id))
        alert_ref.update({
            "status": "Resolved"
        })
        doc = alert_ref.get()
        return doc.to_dict()
    except Exception as e:
        logger.error(f"Error executing resolve_sos_alert for ID {alert_id} in Firestore: {e}")
        raise

def unresolve_sos_alert(alert_id: int) -> Dict[str, Any]:
    """
    Reopens a resolved SOS alert back to 'Active' status in Firestore.
    
    Args:
        alert_id (int): The ID of the SOS alert.
        
    Returns:
        Dict[str, Any]: The updated SOS alert document.
    """
    if not db:
        raise Exception("unresolve_sos_alert failed: Firebase client not initialized.")
    try:
        alert_ref = db.collection("sos_alerts").document(str(alert_id))
        alert_ref.update({
            "status": "Active"
        })
        doc = alert_ref.get()
        return doc.to_dict()
    except Exception as e:
        logger.error(f"Error executing unresolve_sos_alert for ID {alert_id} in Firestore: {e}")
        raise

def add_chat_log(session_id: str, message: str, sender: str) -> Dict[str, Any]:
    """
    Logs a chat message exchanged during a session in Firestore.
    
    Args:
        session_id (str): The session token/identifier.
        message (str): The body of the message.
        sender (str): The sender entity ('Audience' or 'AI').
        
    Returns:
        Dict[str, Any]: The logged chat record.
    """
    if not db:
        raise Exception("add_chat_log failed: Firebase client not initialized.")
    try:
        now_str = datetime.datetime.utcnow().isoformat()
        log_id = int(time.time() * 1000)
        log_data = {
            "id": log_id,
            "session_id": session_id,
            "message": message,
            "sender": sender,
            "created_at": now_str
        }
        db.collection("chat_logs").document(str(log_id)).set(log_data)
        return log_data
    except Exception as e:
        logger.error(f"Error executing add_chat_log for session {session_id} in Firestore: {e}")
        raise

def get_chat_logs(session_id: str) -> List[Dict[str, Any]]:
    """
    Retrieves all chat logs for a specific session sorted by date in Firestore.
    
    Args:
        session_id (str): The session token/identifier.
        
    Returns:
        List[Dict[str, Any]]: The list of messages in this session.
    """
    if not db:
        logger.error("get_chat_logs failed: Firebase client not initialized.")
        return []
    try:
        # In order to bypass composite index creation requirement on Firestore, 
        # we filter by session_id and sort in-memory in Python.
        logs_ref = db.collection("chat_logs").where("session_id", "==", session_id)
        docs = logs_ref.stream()
        logs = [doc.to_dict() for doc in docs]
        logs.sort(key=lambda x: x.get("id", 0))
        return logs
    except Exception as e:
        logger.error(f"Error executing get_chat_logs for session {session_id} from Firestore: {e}")
        return []

def get_recent_audience_chats(limit: int = 50) -> List[Dict[str, Any]]:
    """
    Retrieves the most recent chat logs from the audience across all sessions.
    
    Args:
        limit (int): The maximum number of chat logs to retrieve. Defaults to 50.
        
    Returns:
        List[Dict[str, Any]]: A list of recent chat logs from the audience.
    """
    if not db:
        logger.error("get_recent_audience_chats failed: Firebase client not initialized.")
        return []
    try:
        # Filter by sender = 'Audience' and sort in-memory to avoid Firestore composite index requirement
        logs_ref = db.collection("chat_logs").where("sender", "==", "Audience")
        docs = logs_ref.stream()
        logs = [doc.to_dict() for doc in docs]
        logs.sort(key=lambda x: x.get("id", 0), reverse=True)
        return logs[:limit]
    except Exception as e:
        logger.error(f"Error executing get_recent_audience_chats from Firestore: {e}")
        return []
