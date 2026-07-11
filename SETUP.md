# Setup Guide: FIFA 2026 Crowd Management Web Application

Welcome to the FIFA 2026 Crowd Management App setup guide. This document provides step-by-step instructions to get the full stack (Next.js frontend, FastAPI backend, and OpenCV CCTV simulation) running locally on your machine.

---

## Prerequisites

Before you begin, ensure you have the following installed on your machine:

1. **Node.js** (v18 or higher) and **npm**
   - Verify installation: `node -v` and `npm -v`
2. **Python** (v3.9 or higher) and **pip**
   - Verify installation: `python --version` and `pip --version`
3. **Git** (optional, for version control)

---

## 1. Quick Start (Windows Only)

If you are on Windows, we have provided a convenient 1-click batch script to start both the Frontend and Backend servers simultaneously.

1. Double-click the `run_local.bat` file located in the root of the project.
2. Two command prompt windows will open:
   - **Backend**: Starts FastAPI on `http://localhost:8000`
   - **Frontend**: Starts Next.js on `http://localhost:3000`
3. Skip to **Step 4** (Running the CCTV Simulator).

*If you are on macOS/Linux, or prefer to start the servers manually, proceed to Step 2.*

---

## 2. Backend Setup (FastAPI & Database)

The backend powers the real-time WebSocket communication, database interactions, and the GenAI integrations.

1. **Navigate to the Backend Directory**:
   ```bash
   cd backend
   ```

2. **Install Python Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```
   > *Note: This will install FastAPI, Uvicorn, Supabase, Google Generative AI, OpenCV, and Ultralytics (YOLOv8).*

3. **Configure Environment Variables**:
   Create or edit the `.env` file inside the `backend/` directory:
   ```env
   # .env file
   GEMINI_API_KEY="your_gemini_api_key_here"
   SUPABASE_URL="your_supabase_url_here"
   SUPABASE_KEY="your_supabase_key_here"
   ```
   - **Gemini API Key**: Powers the GenAI chat assistant and incident grouping. If omitted, the app will gracefully fallback to a rules-based mock engine.
   - **Supabase Credentials**: Used for cloud database syncing. If omitted, the app automatically initializes a local SQLite database (`fifa_local.db`) so you can run entirely offline.

4. **Start the Backend Server**:
   ```bash
   python main.py
   ```
   *Alternatively (using Uvicorn directly):*
   ```bash
   python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```
   The API will be available at `http://127.0.0.1:8000`.

---

## 3. Frontend Setup (Next.js & Tailwind CSS)

The frontend provides the Audience Portal (Mobile) and Organizer Control Center (Desktop).

1. **Navigate to the Frontend Directory** (in a new terminal):
   ```bash
   cd frontend
   ```

2. **Install Node Modules**:
   ```bash
   npm install
   ```

3. **Start the Development Server**:
   ```bash
   npm run dev
   ```

4. **Access the Application**:
   Open your web browser and navigate to:
   - **Landing Page**: [http://localhost:3000](http://localhost:3000)
   - **Audience Portal**: [http://localhost:3000/audience](http://localhost:3000/audience)
   - **Organizer Command Center**: [http://localhost:3000/organizer](http://localhost:3000/organizer)

---

## 4. Running the CCTV Computer Vision Simulator

The CCTV Simulator uses OpenCV and YOLOv8 to simulate a camera feed monitoring crowd levels, automatically updating Gate congestion statuses in real-time.

1. Ensure your **FastAPI Backend** is running (Step 2).
2. Open a new terminal and navigate to the `backend/` directory:
   ```bash
   cd backend
   ```
3. Run the simulator script:
   ```bash
   python cv_detector.py
   ```
   > *Note: Upon first execution, this script will download a small `yolov8n.pt` model weights file (~6MB).*

4. **Testing the Rerouting Logic**:
   - A GUI window will pop up showing the simulated CCTV feed with bounding boxes.
   - The script simulates fluctuating crowd sizes at Gate A.
   - When the crowd count exceeds `18`, the status of Gate A is pushed to the database as **Crowded**.
   - **View the magic**: Open the Audience Portal ([http://localhost:3000/audience](http://localhost:3000/audience)). If your selected seat uses Gate A, a live notification will pop up, and the dynamic wayfinding map will instantly reroute your path to the alternative gate (Gate B). 

---

## Troubleshooting

- **Port 8000 / 3000 is already in use**: 
  Ensure no other applications are using these ports. You can kill existing processes or change the ports in the respective start commands and update the WebSocket URLs in the frontend code.
- **Python `pip` not recognized**: 
  Make sure Python is added to your system's PATH. On Windows, you can select "Add Python to PATH" during installation.
- **ModuleNotFoundError in Python**: 
  Ensure you ran `pip install -r requirements.txt` in the exact directory where the `requirements.txt` file is located (`backend/`). Using a Virtual Environment (`python -m venv venv`) is recommended.
