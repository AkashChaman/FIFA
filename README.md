# FIFA 2026 Crowd Management Web Application (Etihad Stadium Model)

This is a comprehensive, real-time web application designed for FIFA 2026 crowd management and spectator safety, using the Etihad Stadium as our architectural model.

It comprises two primary interfaces:
1. **Audience Portal (Mobile-First)**: Allows spectators to enter their ticket details, display seat wayfinding paths, receive real-time gate rerouting notifications (persisted locally with a 3-hour TTL), access a GenAI concourse safety chatbot assistant, and trigger emergency SOS pings.
2. **Organizer Control Center (Desktop)**: Features a real-time crowd density heatmap, an **exact landscape replica of Etihad stadium geometry**, manual gate override controls (which instantly updates spectator paths), a mass broadcast tool, and a GenAI inbox command center that groups and aggregates active alarms. Includes a persistent SOS incident board and a resolved log with "Unresolve" capabilities.

---

## Folder Structure

```
fifa-crowd-management/
├── README.md               # Overview of the project
├── SETUP.md                # Step-by-step setup and installation guide
├── run_local.bat           # 1-click Windows runner script
├── frontend/               # Next.js React application
│   ├── src/
│   │   ├── app/            # App Router routes (Audience, Organizer, Landing)
│   │   ├── components/     # UI components (StadiumMap, AlertBanner, SOSButton, ChatAssistant)
│   │   └── utils/          # WebSocket client utility
│   ├── package.json
│   └── tailwind.config.ts
└── backend/                # FastAPI application
    ├── main.py             # FastAPI REST & WebSocket server
    ├── supabase_db.py      # Database wrapper (Supabase / local SQLite fallback)
    ├── cv_detector.py      # OpenCV + YOLOv8 CCTV camera simulation
    ├── mock_data.py        # Etihad stadium coordinates & block configurations
    ├── requirements.txt    # Python packages
    └── .env                # Local configuration keys (Gemini & Supabase)
```

---

## Setup Instructions

Please refer to the detailed, step-by-step setup guide: **[SETUP.md](SETUP.md)**.

## Core Features

- **Exact Replica Interactive Map**: SVG stadium map correctly mirroring Etihad's elliptical landscape dimensions, with detailed Pitch & Stands.
- **Dynamic Wayfinding**: Beziér curved pathfinding from gates to precise seat blocks.
- **Live Notifications System**: Persistent, unread-badged notifications stored locally (3-hour auto-expiry) so fans don't miss gate changes or broadcasts.
- **Live CCTV Integration**: Uses Python OpenCV & YOLOv8 bounding box detection to simulate camera crowds and update gate status thresholds.
- **Advanced SOS Management**: 
    - Real-time pulsing SOS beacons pinging on the exact seat map.
    - Active SOS Incident Board keeping alerts alive until explicitly resolved.
    - Resolved log for accountability, featuring an "Unresolve" function to return issues to active priority.
