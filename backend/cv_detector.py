import os
import time
import random
import logging
import requests
import numpy as np
from typing import List, Dict, Any, Tuple, Optional

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("cv_detector")

# Try to import cv2 and ultralytics
CV2_AVAILABLE = False
YOLO_AVAILABLE = False

try:
    import cv2
    CV2_AVAILABLE = True
except ImportError:
    logger.warning("opencv-python is not installed. Using terminal-only simulation.")

try:
    from ultralytics import YOLO
    YOLO_AVAILABLE = True
except ImportError:
    logger.warning("ultralytics is not installed. YOLOv8 object detection will be mocked.")

# API settings
API_URL = "http://127.0.0.1:8000/api/gate-status/override"
GATE_ID = "Gate A"
THRESHOLD = 18

# Initialize YOLO model if available
model = None
if YOLO_AVAILABLE:
    try:
        # Load a small pre-trained YOLOv8 nano model (downloads automatically if missing, ~6MB)
        model = YOLO("yolov8n.pt")
        logger.info("Loaded YOLOv8 nano successfully.")
    except Exception as e:
        logger.error(f"Failed to initialize YOLO model: {e}. Falling back to mocking.")
        YOLO_AVAILABLE = False


class CrowdSimulator:
    """
    Simulates a virtual crowd flow of people moving within a CCTV coordinate area.
    """
    def __init__(self, width: int = 640, height: int = 480) -> None:
        self.width = width
        self.height = height
        self.people: List[Dict[str, Any]] = []
        self.cycle_time = 0.0
        self.status = "Open"
        
    def update(self) -> int:
        """
        Updates the positions of simulated individuals and shifts crowd targets
        based on a sinusoidal pattern to simulate fluctuations over time.
        
        Returns:
            int: The current count of people in the coordinate field.
        """
        self.cycle_time += 0.05
        # Generate target crowd count fluctuating over time in a sine wave
        # Fluctuates between 4 and 26 people
        target_count = int(15 + 11 * np.sin(self.cycle_time * 0.2))
        
        # Adjust current list of people to match target count
        while len(self.people) < target_count:
            # Spawn a new person with random coordinates and velocity
            self.people.append({
                "x": random.randint(100, self.width - 100),
                "y": random.randint(100, self.height - 100),
                "vx": random.uniform(-2.0, 2.0),
                "vy": random.uniform(-2.0, 2.0),
                "color": (random.randint(50, 150), random.randint(100, 255), random.randint(50, 150)),
                "size": random.randint(10, 15)
            })
            
        while len(self.people) > target_count:
            self.people.pop()
            
        # Move people around
        for person in self.people:
            person["x"] += person["vx"]
            person["y"] += person["vy"]
            
            # Boundary collision
            if person["x"] < 50 or person["x"] > self.width - 50:
                person["vx"] *= -1
            if person["y"] < 50 or person["y"] > self.height - 50:
                person["vy"] *= -1
                
        return target_count

    def draw_frame(self) -> np.ndarray:
        """
        Renders a simulated frame containing visual representation of people
        and bounding boxes representing CCTV telemetry.
        
        Returns:
            np.ndarray: The generated visual frame as a NumPy array (BGR image).
        """
        # Create dark background representing the camera feed of the gate concourse
        frame = np.zeros((self.height, self.width, 3), dtype=np.uint8)
        
        # Gradient background
        for y in range(self.height):
            # Hex color of FIFA Navy: (RGB: 10, 25, 47) -> (BGR: 47, 25, 10)
            frame[y, :] = [25 + int(y * 0.05), 18 + int(y * 0.02), 8]
            
        # Draw concourse entrance lines
        if CV2_AVAILABLE:
            cv2.line(frame, (100, 0), (100, self.height), (50, 50, 50), 2)
            cv2.line(frame, (self.width - 100, 0), (self.width - 100, self.height), (50, 50, 50), 2)
            
            # Draw Gate Banner
            cv2.rectangle(frame, (0, 0), (self.width, 50), (20, 20, 20), -1)
            cv2.putText(frame, "FIFA 2026 CROWD MONITORING - CCTV 08 [ETIHAD NORTH - GATE A]", (15, 30),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1, cv2.LINE_AA)
            
            # Draw simulated people
            for idx, p in enumerate(self.people):
                x, y = int(p["x"]), int(p["y"])
                size = p["size"]
                color = p["color"]
                
                # Draw head
                cv2.circle(frame, (x, y), size, color, -1)
                # Draw shoulders/body
                cv2.ellipse(frame, (x, y + size + 5), (size + 5, size - 2), 0, 0, 180, color, -1)
                
                # Draw a simulated bounding box
                cv2.rectangle(frame, (x - size - 5, y - size - 2), (x + size + 5, y + size * 2 + 10), (0, 255, 0), 1)
                cv2.putText(frame, f"person {idx+1}", (x - size - 5, y - size - 8),
                             cv2.FONT_HERSHEY_SIMPLEX, 0.3, (0, 255, 0), 1, cv2.LINE_AA)
                
        return frame


def send_update_to_backend(count: int, status: str) -> None:
    """
    Pushes crowd count and status update to the FastAPI backend API.
    
    Args:
        count (int): The current crowd count.
        status (str): The operational status of the gate ('Open' or 'Crowded').
    """
    payload = {
        "gate_id": GATE_ID,
        "status": status,
        "crowd_count": count
    }
    try:
        response = requests.post(API_URL, json=payload, timeout=2)
        if response.status_code == 200:
            logger.info(f"Synced Gate A status to backend: Count={count}, Status={status}")
        else:
            logger.error(f"Backend responded with status code {response.status_code}: {response.text}")
    except requests.exceptions.RequestException as e:
        logger.error(f"Could not connect to API server: {e}. Ensure backend is running on port 8000.")


def main() -> None:
    """
    Entry point for running the OpenCV/YOLOv8 CCTV crowd simulation loop.
    """
    print("==========================================================")
    print("FIFA 2026 Crowd Management - OpenCV & YOLOv8 CCTV Simulator")
    print("==========================================================")
    print(f"CCTV Gate: {GATE_ID}")
    print(f"Crowded Threshold: {THRESHOLD} people")
    print(f"Backend Sync URL: {API_URL}")
    print("==========================================================")
    
    sim = CrowdSimulator()
    last_backend_update_time = 0.0
    last_status = None
    
    while True:
        # Update simulation coordinates and get crowd count
        crowd_count = sim.update()
        
        # Decide status based on threshold
        if crowd_count >= THRESHOLD:
            current_status = "Crowded"
        else:
            current_status = "Open"
            
        # Draw the frame (GUI or Mock)
        frame = sim.draw_frame()
        
        # If YOLO is available, run it on the frame to show YOLOv8 execution in feed
        yolo_count = 0
        if YOLO_AVAILABLE and CV2_AVAILABLE and model:
            results = model(frame, verbose=False)
            for r in results:
                # Class 0 in COCO dataset represents 'person'
                boxes = r.boxes
                for box in boxes:
                    if int(box.cls[0]) == 0:
                        yolo_count += 1
            
            # Display YOLO count on frame
            cv2.putText(frame, f"YOLOv8 Detect: {yolo_count} people", (20, 90),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 180, 255), 2, cv2.LINE_AA)
                        
        # Display overlay telemetry
        if CV2_AVAILABLE:
            color = (0, 255, 0) if current_status == "Open" else (0, 120, 255) # Green / Amber
            cv2.putText(frame, f"Simulated Count: {crowd_count} people", (20, 420),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2, cv2.LINE_AA)
            cv2.putText(frame, f"Threshold: {THRESHOLD}", (20, 445),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1, cv2.LINE_AA)
            
            # Telemetry rect
            rect_x = 420
            rect_y = 390
            cv2.rectangle(frame, (rect_x, rect_y), (sim.width - 20, 455), (15, 15, 15), -1)
            cv2.putText(frame, f"STATUS: {current_status.upper()}", (rect_x + 15, rect_y + 40),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2, cv2.LINE_AA)
            
            # Display frame in OpenCV Window
            cv2.imshow("FIFA 2026 Crowd Management - CCTV Feed Simulation", frame)
            
        # Sync with backend if status changes or every 3 seconds
        current_time = time.time()
        if current_status != last_status or (current_time - last_backend_update_time) > 3.0:
            send_update_to_backend(crowd_count, current_status)
            last_status = current_status
            last_backend_update_time = current_time
            
        # Break loop if OpenCV window closed or 'q' is pressed
        if CV2_AVAILABLE:
            if cv2.waitKey(30) & 0xFF == ord('q'):
                break
        else:
            # Command line output if CV2 is missing
            logger.info(f"[CCTV Terminal Simulation] Gate A Crowd: {crowd_count} | Status: {current_status}")
            time.sleep(1)
            
    if CV2_AVAILABLE:
        cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
