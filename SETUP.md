# Setup Guide: FIFA 2026 Crowd Management Web Application

Welcome to the FIFA 2026 Crowd Management App setup guide! This document provides step-by-step instructions so anyone cloning this repository can get the full stack (Next.js frontend, FastAPI backend, and OpenCV CCTV simulation) running locally on their machine with ease.

---

## Prerequisites

Before you begin, ensure you have the following installed on your machine:

1. **Node.js** (v18 or higher) and **npm**
   - Verify installation: `node -v` and `npm -v`
2. **Python** (v3.9 or higher) and **pip**
   - Verify installation: `python --version` and `pip --version`
3. **Git**
   - Verify installation: `git --version`

---

## Step 1: Clone the Repository

First, clone the project to your local machine and navigate into the project directory:

```bash
git clone https://github.com/AkashChaman/FIFA.git
cd FIFA
```

---

## Step 2: Configure Environment Variables

The backend requires a few environment variables for AI and Cloud features. 

Navigate into the `backend/` directory and create a `.env` file:
```env
# .env file (inside backend folder)
GEMINI_API_KEY="your_gemini_api_key_here"
SUPABASE_URL="your_supabase_url_here"
SUPABASE_KEY="your_supabase_key_here"
```
- **Gemini API Key**: Powers the GenAI chat assistant. If omitted, the app will gracefully fallback to a rules-based mock engine.
- **Supabase Credentials**: Used for cloud database syncing. If omitted, the app automatically initializes a local SQLite database (`fifa_local.db`) so you can run entirely offline.

---

## Step 3: Start the Application

### Option A: The 1-Click Method (Windows Only - Recommended)

We have provided a convenient batch script that automatically installs all dependencies and starts both servers.

1. Double-click the `run_local.bat` file located in the root of the project.
2. The script will automatically:
   - Install Python dependencies (`pip install -r requirements.txt`)
   - Install Node.js dependencies (`npm install`)
   - Start the FastAPI backend on `http://localhost:8000`
   - Start the Next.js frontend on `http://localhost:3000`
3. Skip to **Step 4**.

### Option B: Manual Setup (macOS / Linux / Windows)

If you prefer to start the servers manually, follow these steps:

**Terminal 1 (Backend):**
```bash
cd backend
pip install -r requirements.txt
python main.py
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm install
npm run dev
```

---

## Step 4: Access the Application

Open your web browser and explore the different modules:

- **Landing Page**: [http://localhost:3000](http://localhost:3000)
- **Audience Portal**: [http://localhost:3000/audience](http://localhost:3000/audience)
- **Organizer Command Center**: [http://localhost:3000/organizer](http://localhost:3000/organizer)
- **Etihad Stadium Model**: [http://localhost:3000/model](http://localhost:3000/model)

---

## Step 5: Running the CCTV Computer Vision Simulator

The CCTV Simulator uses OpenCV and YOLOv8 to simulate a camera feed monitoring crowd levels, automatically updating Gate congestion statuses in real-time.

1. Ensure your **FastAPI Backend** is running (from Step 3).
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
