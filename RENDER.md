# 🚀 Hosting & Deployment Guide: Render.com with Firebase Cloud Firestore

This guide provides step-by-step instructions to deploy your FastAPI Backend and Next.js Frontend to **Render.com** and connect them securely to your production **Firebase Firestore** instance.

---

## 🛠️ Step 1: Prepare Your Firebase Configuration

Render.com uses a stateless ephemeral file system for web services. Instead of committing your `serviceAccountKey.json` to GitHub (which is a major security risk and already ignored in `.gitignore`), you will use an environment variable to pass the service credentials.

1. Locate your **`serviceAccountKey.json`** file inside the `backend/` directory.
2. Open the file and copy its **entire JSON content** as a single text block.
   * *Example Format:*
     ```json
     {
       "type": "service_account",
       "project_id": "fifa-crowd-management",
       "private_key_id": "fb0bc2c22cc...",
       "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqh...",
       ...
     }
     ```
3. Keep this text ready to paste when configuring the Render Environment Variables.

---

## 🌎 Step 2: Deploy the FastAPI Backend on Render

1. Log in to your [Render Dashboard](https://dashboard.render.com/).
2. Click the **`New +`** button in the top navigation and select **`Web Service`**.
3. Connect your GitHub repository containing the project.
4. On the configuration page, configure the following settings:
   * **Name:** `fifa-crowd-backend` (or a similar name)
   * **Region:** Choose the region closest to your audience.
   * **Branch:** `master` (or your active branch, e.g., `main`)
   * **Language / Runtime:** `Python`
   * **Root Directory:** `backend` *(CRITICAL: This tells Render to run pip and start from the backend folder)*
   * **Build Command:** `pip install -r requirements.txt`
   * **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
   * **Instance Type:** Select the **Free** tier (or paid if higher throughput is required).

5. Scroll down and click the **`Advanced`** button, then click **`Add Environment Variable`**.
6. Add the following environment variables:

| Key | Value | Description |
| :--- | :--- | :--- |
| **`FIREBASE_SERVICE_ACCOUNT_JSON`** | *(Paste the entire JSON content from Step 1)* | Production Firestore credentials. |
| **`GROQ_API_KEY`** | `gsk_R2Xgn7AM...` | Your Groq API Key for the GenAI features. |

7. Click **`Create Web Service`**. Render will now pull your repository, install dependencies, initialize Firebase Firestore, and start your backend service.
8. Once deployed, note down your web service's public URL (e.g., `https://fifa-crowd-backend.onrender.com`).

---

## 🎨 Step 3: Deploy the Next.js Frontend on Render

You can host the Next.js frontend as a **Web Service** (if using Next.js Server-Side features) or a static site.

### Option A: Deploying as a Next.js Web Service (Recommended)

1. Click **`New +`** and select **`Web Service`** on Render.
2. Select your GitHub repository.
3. Configure the following settings:
   * **Name:** `fifa-crowd-frontend`
   * **Branch:** `master` (or `main`)
   * **Language / Runtime:** `Node`
   * **Root Directory:** `frontend`
   * **Build Command:** `npm install && npm run build`
   * **Start Command:** `npm run start`
   * **Instance Type:** Select the **Free** tier.

4. Click the **`Advanced`** button and add the environment variables:

| Key | Value | Description |
| :--- | :--- | :--- |
| **`NEXT_PUBLIC_API_URL`** | `https://fifa-crowd-backend.onrender.com` | Your deployed Render backend URL (no trailing slash). |
| **`NEXT_PUBLIC_WS_URL`** | `wss://fifa-crowd-backend.onrender.com/api/ws` | Your deployed Render WebSocket URL. |

5. Click **`Create Web Service`**.

---

## 🔍 Step 4: Verification & Smoke Test

1. Navigate to your deployed Frontend URL (e.g., `https://fifa-crowd-frontend.onrender.com`).
2. Go to the **Organizer Command Center** and verify that the heatmap data and live gate statuses load successfully (which means it's reading from Firestore).
3. Try sending an SOS Alert or submitting a chat message from the **Audience Portal**. The dashboard should receive the notification in real-time via WebSockets, and the logs will be written to Firebase.
