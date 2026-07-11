import os
import json
import asyncio
import datetime
import requests
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional
from dotenv import load_dotenv

import supabase_db as db
import mock_data

load_dotenv()

app = FastAPI(title="FIFA 2026 Crowd Management API")

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify frontend origin e.g. ["http://localhost:3000"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# WebSocket Connection Manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"Client connected. Total active connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            print(f"Client disconnected. Total active connections: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        print(f"Broadcasting message: {message}")
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                print(f"Error broadcasting to connection: {e}")
                # We'll clean up dead connections later during disconnects

manager = ConnectionManager()

# Pydantic models
class GateOverridePayload(BaseModel):
    gate_id: str
    status: str  # 'Open', 'Crowded', 'Closed'
    crowd_count: int

class SOSAlertPayload(BaseModel):
    seat: str
    block: str
    gate: str
    message: Optional[str] = ""

class ChatPayload(BaseModel):
    session_id: str
    message: str

# Helper to query Gemini API
def query_gemini_api(prompt: str, system_instruction: str = "") -> str:
    gemini_key = os.getenv("GEMINI_API_KEY")
    if not gemini_key or gemini_key == "your-gemini-api-key":
        return "[MOCK AI] (Add GEMINI_API_KEY to .env to enable live GenAI) "
        
    try:
        # We use a direct HTTP request to Gemini API to be highly robust and avoid library version mismatch issues.
        # This calls Gemini 1.5 Flash or 2.5 Flash. Let's use gemini-1.5-flash as the standard.
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={gemini_key}"
        headers = {"Content-Type": "application/json"}
        
        # Combine system instruction and prompt if present
        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": f"{system_instruction}\n\nUser Question/Report: {prompt}"}
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": 400
            }
        }
        
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        if response.status_code == 200:
            res_json = response.json()
            try:
                text_response = res_json['candidates'][0]['content']['parts'][0]['text']
                return text_response.strip()
            except (KeyError, IndexError):
                return "Error parsing Gemini response."
        else:
            return f"Gemini API returned error code {response.status_code}: {response.text}"
    except Exception as e:
        return f"Exception occurred while calling Gemini API: {str(e)}"

# REST Endpoints

@app.get("/api/gate-status")
def get_all_gates():
    try:
        gates = db.get_gate_status()
        # Merge static metadata (like coordinates, description, alternative gates)
        merged_gates = []
        for g in gates:
            gate_id = g.get("gate_id")
            static_info = mock_data.GATES.get(gate_id, {})
            merged = {**static_info, **g}
            merged_gates.append(merged)
        return merged_gates
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/gate-status/override")
async def override_gate_status(payload: GateOverridePayload):
    if payload.gate_id not in mock_data.GATES:
        raise HTTPException(status_code=400, detail=f"Invalid Gate ID: {payload.gate_id}")
    if payload.status not in ["Open", "Crowded", "Closed"]:
        raise HTTPException(status_code=400, detail="Invalid status. Must be Open, Crowded, or Closed.")
        
    try:
        updated_gate = db.update_gate_status(
            gate_id=payload.gate_id,
            status=payload.status,
            crowd_count=payload.crowd_count
        )
        # Merge static details
        static_info = mock_data.GATES.get(payload.gate_id, {})
        full_gate_data = {**static_info, **updated_gate}
        
        # Broadcast the gate update via WebSockets
        await manager.broadcast({
            "type": "GATE_UPDATE",
            "data": full_gate_data
        })
        
        return full_gate_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/sos")
async def trigger_sos(payload: SOSAlertPayload):
    try:
        alert = db.create_sos_alert(
            seat=payload.seat,
            block=payload.block,
            gate=payload.gate,
            message=payload.message
        )
        
        # Broadcast SOS alert to all active clients (specifically organizer dashboards)
        await manager.broadcast({
            "type": "SOS_ALERT",
            "data": alert
        })
        
        return {"status": "Success", "alert": alert}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/sos")
def get_sos_alerts():
    try:
        return db.get_sos_alerts()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/sos/resolve/{alert_id}")
async def resolve_sos(alert_id: int):
    try:
        resolved_alert = db.resolve_sos_alert(alert_id)
        
        # Broadcast resolve update
        await manager.broadcast({
            "type": "SOS_RESOLVED",
            "data": resolved_alert
        })
        
        return {"status": "Success", "alert": resolved_alert}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/sos/unresolve/{alert_id}")
async def unresolve_sos(alert_id: int):
    try:
        reopened_alert = db.unresolve_sos_alert(alert_id)
        
        # Broadcast as a new SOS_ALERT so organizer dashboards move it back to the active inbox
        await manager.broadcast({
            "type": "SOS_ALERT",
            "data": reopened_alert
        })
        
        return {"status": "Success", "alert": reopened_alert}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/chat")
async def chat_assistant(payload: ChatPayload):
    # Log user message
    db.add_chat_log(payload.session_id, payload.message, "Audience")
    
    # Compile Stadium context for Gemini
    gates = db.get_gate_status()
    gate_context_list = []
    for g in gates:
        gate_context_list.append(f"{g['gate_id']} ({mock_data.GATES[g['gate_id']]['name']}): Status={g['status']}, Crowd={g['crowd_count']}/{g['capacity']}")
    gate_context = "\n".join(gate_context_list)
    
    system_instruction = f"""
    You are the GenAI Safety & Crowd Assistant for Etihad Stadium during the FIFA 2026 World Cup.
    Your job is to provide natural language guidance, safety tips, directions, and log safety hazards.
    
    Real-Time Gate Statuses:
    {gate_context}
    
    Ethad Stadium layout:
    - Seating levels: Level 1 (Blocks 1xx), Level 2 (Blocks 2xx), Level 3 (Blocks 3xx).
    - North Stand (Blocks 136-142): served by Gate A (primary) or Gate B (alternative).
    - East Stand (Blocks 101-109): served by Gate C (primary, 101-105) or Gate D (primary, 106-109).
    - South Stand (Blocks 114-120): served by Gate E (primary).
    - West Stand (Blocks 122-132): served by Gate F (primary).
    
    Guidelines:
    1. If the user asks where the medical tent, food court, or bathrooms are:
       - Medical tent: Located behind North Stand (Level 1, block 136) and South Stand (Level 1, block 118).
       - Food courts: Located on all concourses (Level 1, 2, 3) near blocks 105, 117, 125, and 139.
       - Restrooms: Located near every seating block.
    2. If the user reports an emergency (e.g. fire, injury, fight, crowd crush):
       - Advise them to stay calm.
       - Urgent: Tell them to tap the red 'SOS' button in the app immediately to broadcast their seat location to the control center.
       - Provide clear directions to the nearest exit or medical tent.
    3. If the user asks about entering or exiting, and their recommended gate is 'Closed' or 'Crowded', direct them to their alternative gate. For example: "Gate A is crowded; please use Gate B."
    4. Keep answers concise, helpful, and highly professional. Limit to 3 sentences maximum.
    """
    
    # If API key is missing, use a rules-based fallback
    gemini_key = os.getenv("GEMINI_API_KEY")
    if not gemini_key or gemini_key == "your-gemini-api-key":
        response_text = get_rules_based_mock_response(payload.message, gates)
    else:
        response_text = query_gemini_api(payload.message, system_instruction)
        # Check if the fallback tag was returned
        if response_text.startswith("[MOCK AI]"):
            response_text = response_text + get_rules_based_mock_response(payload.message, gates)
            
    # Log AI response
    db.add_chat_log(payload.session_id, response_text, "AI")
    
    return {"response": response_text}

@app.get("/api/alerts/summary")
def get_alerts_summary():
    """
    GenAI Alert Command Center Endpoint:
    Fetches all active SOS alerts and audience chat messages, then calls Gemini
    to group, categorize, and summarize the data for the organizers.
    """
    # Get active SOS alerts
    sos_list = db.get_sos_alerts()
    active_sos = [s for s in sos_list if s['status'] == 'Active']
    
    # Get recent audience chat logs (last 50 messages)
    conn = db.sqlite3.connect(db.SQLITE_DB_PATH)
    conn.row_factory = db.sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM chat_logs WHERE sender = 'Audience' ORDER BY id DESC LIMIT 50")
    recent_chats = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    # Construct input text for analysis
    reports_text = []
    reports_text.append("--- ACTIVE SOS ALERTS ---")
    for s in active_sos:
        reports_text.append(f"- Block {s['block']}, Seat {s['seat']} (Gate: {s['gate']}): '{s['message']}' (Time: {s['created_at']})")
        
    reports_text.append("\n--- RECENT AUDIENCE CHAT REPORTS ---")
    for c in recent_chats:
        reports_text.append(f"- Chat: '{c['message']}' (Time: {c['created_at']})")
        
    data_to_analyze = "\n".join(reports_text)
    
    system_instruction = """
    You are the FIFA 2026 Crowd Management Command Center Analyzer.
    Analyze the incoming SOS alerts and user chat transcripts for Etihad Stadium.
    
    Your job is to:
    1. Identify critical, high-risk clusters (e.g. 3 mentions of a crush hazard at Gate C, multiple fights, or medical emergencies).
    2. Categorize the incidents (Medical, Safety, Security, Congestion).
    3. Generate a bullet-point executive summary highlighting immediate action items for organizers.
    4. Group alerts intelligently (e.g., group multiple pings near the same block).
    
    Keep the report structured, clear, and actionable. Do not make up facts.
    If there are no active alerts or messages, state: "All sectors clear. No incidents reported."
    """
    
    gemini_key = os.getenv("GEMINI_API_KEY")
    if not gemini_key or gemini_key == "your-gemini-api-key":
        # Rules-based organizer report fallback
        summary_text = get_mock_organizer_summary(active_sos, recent_chats)
    else:
        summary_text = query_gemini_api(data_to_analyze, system_instruction)
        if summary_text.startswith("[MOCK AI]"):
            summary_text = summary_text + get_mock_organizer_summary(active_sos, recent_chats)
            
    return {"summary": summary_text}

@app.post("/api/notifications/broadcast")
async def broadcast_notification(payload: Dict = Body(...)):
    message = payload.get("message", "Attention: Please follow stadium signage and volunteer guidance.")
    
    # Broadcast mass notification
    await manager.broadcast({
        "type": "MASS_NOTIFICATION",
        "data": {
            "message": message,
            "timestamp": datetime.datetime.utcnow().isoformat()
        }
    })
    return {"status": "Success", "message": "Broadcast sent."}

# WebSockets Endpoint
@app.websocket("/api/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        # Keep connection alive, listen for any client messages if needed
        while True:
            data = await websocket.receive_text()
            # Parse client heartbeat or client-sent command if applicable
            try:
                message_json = json.loads(data)
                print(f"Received WebSocket message from client: {message_json}")
            except Exception:
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket)

# Helper fallback functions for when GEMINI_API_KEY is not configured

def get_rules_based_mock_response(message: str, gates: List[Dict]) -> str:
    msg_lower = message.lower()
    
    # Check for medical
    if "medical" in msg_lower or "doctor" in msg_lower or "injured" in msg_lower or "hurt" in msg_lower or "faint" in msg_lower:
        return "A medical team has been alerted. First Aid tents are located behind North Stand (Block 136) and South Stand (Block 118). If you are in immediate danger, please press the RED 'SOS' button in the app."
        
    # Check for fire or danger
    if "fire" in msg_lower or "smoke" in msg_lower or "danger" in msg_lower or "fight" in msg_lower or "police" in msg_lower:
        return "Security personnel have been notified. Please stay calm, move away from the hazard, and follow volunteer instructions. Press the RED 'SOS' button to send your exact seat coordinates."

    # Check for gates or crowd
    if "gate" in msg_lower or "crowd" in msg_lower or "congestion" in msg_lower or "jam" in msg_lower:
        # Check if Gate A is crowded
        gate_a_status = next((g['status'] for g in gates if g['gate_id'] == 'Gate A'), 'Open')
        if gate_a_status == 'Crowded' or gate_a_status == 'Closed':
            return "Gate A is currently crowded or closed. Seating block 136-142 can be accessed via Gate B (2 min walk). Please follow detour signage."
        return "All stadium gates are operating normally. Please check the Wayfinding tab to view your route."
        
    # Check for food / bathrooms
    if "food" in msg_lower or "eat" in msg_lower or "drink" in msg_lower or "beer" in msg_lower:
        return "Food concessions and beverage hubs are located on the main concourse near Blocks 105, 117, 125, and 139."
    if "toilet" in msg_lower or "bathroom" in msg_lower or "restroom" in msg_lower or "wc" in msg_lower:
        return "Restrooms are available on all levels and are located adjacent to the entrance corridors of every seating block."
        
    return "Welcome to Etihad Stadium! I am your FIFA 2026 Assistant. I can help with gate directions, locating medical tents, food stalls, restrooms, or logging safety hazards. How can I help you?"

def get_mock_organizer_summary(active_sos: List[Dict], recent_chats: List[Dict]) -> str:
    if not active_sos and not recent_chats:
        return "### Live Crowd Analysis\nAll sectors clear. No incidents reported."
        
    # Count alerts by block and message content
    crush_count = 0
    medical_count = 0
    gate_c_congestion = 0
    
    # Process SOS
    for s in active_sos:
        msg = s.get('message', '').lower()
        block = s.get('block', '')
        gate = s.get('gate', '')
        if "crush" in msg or "crowded" in msg or "push" in msg:
            crush_count += 1
        if "medical" in msg or "faint" in msg or "hurt" in msg or "breath" in msg:
            medical_count += 1
        if gate == "Gate C" or "gate c" in msg:
            gate_c_congestion += 1
            
    # Process chats
    for c in recent_chats:
        msg = c.get('message', '').lower()
        if "crush" in msg or "crowded" in msg or "push" in msg:
            crush_count += 1
        if "medical" in msg or "faint" in msg or "hurt" in msg or "breath" in msg:
            medical_count += 1
        if "gate c" in msg:
            gate_c_congestion += 1
            
    summary = ["### GenAI Live Command Report"]
    
    # Build alerts
    if crush_count >= 2 or gate_c_congestion >= 2:
        summary.append(f"- ⚠️ **CONGESTION HAZARD**: Detected {crush_count + gate_c_congestion} mentions of overcrowding/crushing near Gate C/North-East stand. *Recommended action: Direct volunteers to Gate C and initiate Gate D override.*")
    if medical_count > 0:
        summary.append(f"- 🩺 **MEDICAL ALERTS**: {medical_count} medical assistance requests active. *Recommended action: Dispatch local first-aid response team to designated seating blocks.*")
        
    if len(active_sos) > 0:
        summary.append(f"\n#### Active SOS Emergency Pings ({len(active_sos)}):")
        for s in active_sos:
            summary.append(f"  - **Block {s['block']}**, Seat {s['seat']}: \"{s['message']}\"")
            
    if not summary or len(summary) == 1:
        summary.append("- Minor queries logged (e.g. food locations, ticketing details). No urgent action required.")
        
    return "\n".join(summary)

# Main entry point for uvicorn running
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
