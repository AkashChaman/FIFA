# Installation & Setup Guide: FIFA 2026 Crowd Management

This guide provides step-by-step instructions to install, configure, and run the FIFA 2026 Crowd Management stack locally on your machine.

---

## 📋 Prerequisites

Before proceeding, verify that you have the following requirements installed:

1. **Python (v3.9 or higher)**
   * Check version: `python --version` or `py --version`
   * *Note: Ensure Python is added to your system's Environment Variables (PATH).*
2. **Node.js (v18.0.0 or higher)** & **npm**
   * Check versions: `node -v` and `npm -v`
3. **Git**
   * Check version: `git --version`

---

## 🛠️ Step-by-Step Setup

### Step 1: Clone the Repository
Open a terminal and clone the project repository:
```bash
git clone https://github.com/AkashChaman/FIFA.git
cd FIFA
```

---

### Step 2: Configure Environment Variables
The backend uses environment variables to power GenAI capabilities.

1. Navigate into the `backend/` directory:
   ```bash
   cd backend
   ```
2. Create a file named `.env` and configure your API keys (you can copy `.env.example` as a template):
   ```env
   # .env Configuration File
   GROQ_API_KEY="your-groq-api-key-here"
   ```
   > [!NOTE]  
   > **Groq API Key:** Required to power the GenAI Chat Assistant and command summaries. If left blank, the application will gracefully use a rules-based fallback script so you can still test all chatbot interactions.
   > 
   > **Database:** The application connects to **Google Firebase Firestore**. You must place your Firebase service account key file named `serviceAccountKey.json` inside the `backend/` directory for local development, or set the `FIREBASE_SERVICE_ACCOUNT_JSON` environment variable for cloud hosting.

---

### Step 3: Launch the Stack

You can launch the stack using either of the two methods below:

#### Option A: One-Click Startup (Windows Only - Recommended)
A convenience batch file is provided in the root directory. It automatically installs necessary packages and starts both servers.
1. Navigate to the project root directory.
2. Double-click the **`run_local.bat`** file.
3. The script will open two separate terminal windows:
   * **Window 1 (Backend):** Installs Python dependencies (`requirements.txt`) and launches the FastAPI server on `http://localhost:8000`.
   * **Window 2 (Frontend):** Installs npm packages (`npm install`) and boots the Next.js dev server on `http://localhost:3000`.

#### Option B: Manual Startup (macOS / Linux / Windows)
If you prefer running the commands manually, open two terminal windows:

* **Terminal 1: FastAPI Backend**
  ```bash
  cd backend
  # Create a virtual environment (optional but recommended)
  python -m venv venv
  source venv/bin/activate  # On Windows, use: venv\Scripts\activate
  
  # Install packages & run
  pip install -r requirements.txt
  python main.py
  ```

* **Terminal 2: Next.js Frontend**
  ```bash
  cd frontend
  npm install
  npm run dev
  ```

---

## 🖥️ Accessing the Portals

Once both servers are running, access the portals using your browser:

* **🏠 Home / Landing Page:** [http://localhost:3000](http://localhost:3000)
* **📱 Spectator Audience Portal:** [http://localhost:3000/audience](http://localhost:3000/audience)
* **📊 Organizer Command Center:** [http://localhost:3000/organizer](http://localhost:3000/organizer)
* **🏟️ Etihad Stadium Geometry Model:** [http://localhost:3000/model](http://localhost:3000/model)

---

## 📹 Running the CCTV Simulation

The CCTV simulation uses OpenCV and YOLOv8 to count individuals and update gate statuses dynamically in the database.

1. Ensure the **FastAPI Backend** is running (from Step 3).
2. Open a new terminal window and navigate to the `backend/` directory.
3. Run the detector script:
   ```bash
   python cv_detector.py
   ```
   > [!TIP]  
   > **YOLOv8 Nano Model:** On the first execution, this script automatically downloads the lightweight YOLOv8 weights (`yolov8n.pt`, ~6MB) from Ultralytics.
   
4. ** Rerouting Test:**
   * A camera simulation window will pop up showing moving shapes with detected green bounding boxes.
   * As the crowd count fluctuates, when it crosses **`18`**, the status of `Gate A` changes to `Crowded` in the database.
   * If you have the Audience Portal open and selected a seat using `Gate A`, you will receive a real-time notification, and the stadium route path will instantly update to bypass Gate A and use Gate B instead.

---

## 🔍 Troubleshooting

* **Port 8000 or 3000 is already in use:**
  Verify that no other local processes are listening on these ports. You can find and terminate them, or modify the ports in `backend/main.py` and the frontend settings.
* **ModuleNotFoundError on Backend Run:**
  Ensure you have activated your virtual environment and successfully executed `pip install -r requirements.txt` inside the `backend/` directory.
* **OpenCV Window Doesn't Open:**
  If your environment lacks GUI support (e.g. Docker container or headless Linux), the script will print telemetry directly to your terminal screen instead:
  ```text
  [CCTV Terminal Simulation] Gate A Crowd: 12 | Status: Open
  ```
