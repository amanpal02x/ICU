import asyncio
import json
import uvicorn
import pandas as pd
import itertools
import joblib
import numpy as np
import traceback
import os
import sys
from sklearn.base import BaseEstimator
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone

# Add the current directory to Python path for proper imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import monitor processor for real-time data support
from monitor_processor import UniversalMonitorProcessor

# Import our modules with absolute imports
import mongo_config
import routers.hospitals as hospitals
import routers.users as users
import routers.patients as patients
import routers.departments as departments
import routers.appointments as appointments
import routers.auth as auth
import routers.disease_prediction as disease_prediction
import routers.monitor_data as monitor_data
import routers.admin as admin

# ---
# 1. CONFIGURATION (Edit these!)
# ---

# --- File Paths ---
# Use dynamic paths to be safe
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_FILE = os.path.join(BASE_DIR, "models/vitals_model_tuned.joblib")
DATA_FILE = os.path.join(BASE_DIR, "data/summary_features_added_data.csv")

# --- Patient Config ---
# We will filter for these 16 patients
TARGET_PATIENTS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16']

# Hardcode their names for the UI
PATIENT_NAME_MAP = {
    '1': "J. Sonib",
    '2': "A. Patel",
    '3': "M. Dash",
    '4': "S. Choudhury",
    '5': "K. Chauhan",
    '6': "T. Sachdev",
    '7': "P. Singh",
    '8': "R. Sharma",
    '9': "H. Mehta",
    '10': "N. Khan",
    '11': "C. Shekhar",
    '12': "A. Das",
    '13': "E. Kumar",
    '14': "B. Verma",
    '15': "S. Pattnaik",
    '16': "T. Srivastava",

}

# --- Model Features (From train_model.py) ---
# This is the 4-course meal our "Brain" expects
MODEL_FEATURES = ["hr_mean", "sbp_mean", "dbp_mean", "spo2_mean"]

# --- Simple "Guard" Alarm Thresholds ---
# Keys MUST be lowercase to match our cleaned CSV column names
THRESHOLDS = {
    "hr_mean": {"min": 60, "max": 100, "name": "HR"},
    "rr_mean": {"min": 12, "max": 20, "name": "RR"},
    "spo2_mean": {"min": 94, "max": 100, "name": "SpO₂"},
    "sbp_mean": {"min": 90, "max": 140, "name": "SBP"},
    "dbp_mean": {"min": 60, "max": 90, "name": "DBP"},
}

# --- "Detective" AI Alarm Threshold ---
AI_RISK_THRESHOLD = 70.0  # Trigger alarm if risk score is > 70%

# ---
# 2. GLOBAL VARIABLES
# ---
app = FastAPI(title="Hospital Management System API")

# Add CORS middleware for WebSocket connections
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://icu-ruby.vercel.app",
        "https://icu-git-main-aman-pals-projects-57314315.vercel.app",
        "http://localhost:8080",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(auth.router)  # Re-enabling auth router
app.include_router(hospitals.router)
app.include_router(users.router)
app.include_router(patients.router)
app.include_router(departments.router)
app.include_router(appointments.router)
app.include_router(disease_prediction.router)
app.include_router(monitor_data.router)
app.include_router(admin.router)

model: Optional[BaseEstimator] = None
model_features: List[str] = []
patient_data_by_window: Dict[int, List[Dict]] = {}
max_window = 0
# cache last known broadcast object for each patient
last_known_by_patient: Dict[str, Dict[str, Any]] = {}

# Lazy loading flag for models
vitals_model_loaded = False

# Real-time monitoring variables
use_real_monitor_data = False
monitor_processor: Optional[UniversalMonitorProcessor] = None


# ---
# 3. SERVER LOGIC
# ---

def load_model():
    """Loads the trained 'vitals_model_tuned.joblib' artifact."""
    global model, model_features
    try:
        # Load the "Box" (artifact) which contains the "Brain" (model)
        artifact = joblib.load(MODEL_FILE)
        model = artifact.get("model")
        model_features = artifact.get("features", MODEL_FEATURES) # Get features from artifact

        if model is None:
             raise ValueError("Model artifact is corrupt or 'model' key is missing.")
        
        print(f"✅ Successfully loaded AI model from: {MODEL_FILE}")
        print(f"   Model features: {model_features}")

    except FileNotFoundError:
        print(f"❌ ERROR: Model file not found at {MODEL_FILE}")
        model = None
    except Exception as e:
        print(f"❌ CRITICAL ERROR: Failed to load model from {MODEL_FILE}.")
        print(f"   This is likely a Python/library version mismatch or a corrupt file.")
        print("\n" + "="*30 + " FULL ERROR " + "="*30)
        print(traceback.format_exc())
        print("="*62 + "\n")
        model = None

def load_and_prepare_data():
    """Loads, cleans, and filters the CSV data into our playback dictionary."""
    global patient_data_by_window, max_window
    try:
        df = pd.read_csv(DATA_FILE)

        # --- Data Cleaning ---
        # 1. Standardize column names (lowercase, strip spaces, etc.)
        df.columns = [c.strip().replace(" ", "_").lower() for c in df.columns]

        # 2. Check for required columns (warn if missing)
        required_cols = ['patientid', 'window'] + list(THRESHOLDS.keys()) + model_features
        for col in required_cols:
            if col not in df.columns:
                print(f"⚠️ WARNING: Missing expected column '{col}' in CSV. Skipping.")

        # 3. Normalize patientid to digits-only strings (e.g. '010' -> '10')
        if 'patientid' in df.columns:
            # extract digits and cast to int then back to str (safe normalization)
            df['patientid'] = df['patientid'].astype(str).str.extract(r'(\d+)', expand=False)
            df = df[df['patientid'].notna()]  # drop rows where no digits found
            df['patientid'] = df['patientid'].astype(int).astype(str)
        else:
            raise ValueError("Critical column 'patientid' not found in CSV.")

        # DEBUG: show unique ids
        all_ids = sorted(df['patientid'].unique(), key=lambda x: int(x))
        print(f"[DEBUG] Found {len(all_ids)} unique Patient IDs in CSV. First 20: {all_ids[:20]}")

        # 4. Filter the dataframe for the target patients
        df_filtered = df[df['patientid'].isin(TARGET_PATIENTS)].copy()

        if df_filtered.empty:
            raise ValueError(f"No data found for target patients: {TARGET_PATIENTS}")

        # 5. Ensure 'window' is numeric, and get max window
        df_filtered['window'] = df_filtered['window'].astype(int)
        max_window = int(df_filtered['window'].max())

        # 6. Convert to list-of-records for playback
        patient_data_by_window = df_filtered.to_dict('records')
        print(f"✅ Successfully loaded and filtered data for target patients.")
        print(f"   Total rows: {len(df_filtered)}, Max window: {max_window}")

    except FileNotFoundError:
        print(f"❌ CRITICAL ERROR: Data file not found at {DATA_FILE}")
    except ValueError as e:
        print(f"❌ CRITICAL ERROR: Failed to load or prepare data.")
        print(f"   {e}")
    except Exception as e:
        print(f"❌ CRITICAL ERROR: Could not process data file {DATA_FILE}.")
        print("\n" + "="*30 + " FULL ERROR " + "="*30)
        print(traceback.format_exc())
        print("="*62 + "\n")

def _now_iso():
    return datetime.now(timezone.utc).isoformat()

async def format_monitor_data_for_frontend(vital_data: Dict[str, Any], patient_info: Dict[str, Any]) -> Dict[str, Any]:
    """Format monitor data to match the frontend expectations."""
    vitals = {}
    alarms = []

    # Map the standardized fields to frontend format
    # Monitor processor stores: hr_mean, spo2_mean, sbp_mean, dbp_mean
    field_mappings = {
        "hr_mean": "HR",
        "spo2_mean": "SpO₂",
        "sbp_mean": "SBP",
        "dbp_mean": "DBP"
    }

    for field_key, display_name in field_mappings.items():
        value = vital_data.get(field_key)
        if value is not None:
            # Check thresholds for alarms
            if field_key in THRESHOLDS:
                rules = THRESHOLDS[field_key]
                status = "stable"
                if not (rules["min"] <= value <= rules["max"]):
                    status = "critical"
                    alarms.append({
                        "patient_id": vital_data["patient_id"],
                        "vital": rules["name"],
                        "level": "CRITICAL",
                        "value": str(round(float(value), 1)),
                    })
                vitals[display_name] = {
                    "value": str(round(float(value), 1)),
                    "status": status,
                }
        else:
            vitals[display_name] = {"value": None, "status": "stable"}

    # Add AI prediction data
    ai_prediction = vital_data.get("ai_analysis", {})
    if ai_prediction.get("is_at_risk"):
        alarms.append({
            "patient_id": vital_data["patient_id"],
            "vital": "AI Risk Score",
            "level": "CRITICAL",
            "value": f"{ai_prediction.get('risk_score_percent', 0):.0f}%",
        })

    return {
        "patient_id": vital_data["patient_id"],
        "name": vital_data.get("name", f"Patient {vital_data['patient_id']}"),
        "room": vital_data.get("room", "Unknown"),
        "bed": vital_data.get("bed", "Unknown"),
        "vitals": vitals,
        "alarms": alarms,
        "ai_prediction": ai_prediction,
        "last_seen_window": None,  # Not applicable for real-time data
        "last_update_ts": vital_data.get("timestamp", _now_iso())
    }

async def create_placeholder_patient(patient_id: str) -> Dict[str, Any]:
    """Create a placeholder patient object when no data is available."""
    return {
        "patient_id": patient_id,
        "name": PATIENT_NAME_MAP.get(patient_id, f"Patient {patient_id}"),
        "room": f"10{patient_id[-1]}-A" if patient_id.isdigit() else "Unknown",
        "bed": "Unknown",
        "vitals": {
            "HR": {"value": None, "status": "stable"},
            "SpO₂": {"value": None, "status": "stable"},
            "SBP": {"value": None, "status": "stable"},
            "DBP": {"value": None, "status": "stable"},
        },
        "alarms": [],
        "ai_prediction": {"risk_score_percent": 0, "is_at_risk": False},
        "last_seen_window": None,
        "last_update_ts": None
    }

def ensure_model_loaded():
    """Lazy load the vitals model only when needed."""
    global model, model_features, vitals_model_loaded

    if not vitals_model_loaded:
        print("🔄 Lazy loading vitals model...")
        load_model()
        vitals_model_loaded = True
        if model is not None:
            print("✅ Vitals model loaded successfully for AI predictions")
        else:
            print("⚠️ Vitals model failed to load, AI predictions disabled")

def get_data_for_window(window: int) -> List[Dict[str, Any]]:
    """
    Gets the data for all TARGET_PATIENTS at a specific window (time).
    Uses last_known_by_patient to fill-in missing patients (persist last known vitals).
    Adds last_seen_window and last_update_ts for frontend use.
    """
    global last_known_by_patient

    if not patient_data_by_window:
        return []

    # Find all rows matching the current window (ensure numeric compare)
    rows = [row for row in patient_data_by_window if int(row.get('window', -1)) == int(window)]
    broadcast_list = []

    for patient_id in TARGET_PATIENTS:
        # Find the specific row for this patient at this window
        patient_row = next((r for r in rows if str(int(r.get('patientid'))) == str(int(patient_id))), None)

        if patient_row:
            # Build patient object from row
            patient_vitals = {}
            threshold_alarms = []
            ai_prediction_data = None

            for csv_col, rules in THRESHOLDS.items():
                if csv_col in patient_row and pd.notna(patient_row[csv_col]):
                    try:
                        numeric = float(patient_row[csv_col])
                    except Exception:
                        numeric = patient_row[csv_col]

                    status = "stable"
                    if isinstance(numeric, (int, float)):
                        if not (rules["min"] <= numeric <= rules["max"]):
                            status = "critical"
                            threshold_alarms.append({
                                "patient_id": patient_id,
                                "vital": rules["name"],
                                "level": "CRITICAL",
                                "value": str(round(float(numeric), 1)),
                            })

                        patient_vitals[rules["name"]] = {
                            "value": str(round(float(numeric), 1)),
                            "status": status,
                        }
                    else:
                        # non-numeric value - still present it
                        patient_vitals[rules["name"]] = {
                            "value": str(numeric),
                            "status": status,
                        }

            # AI model prediction - lazy load model if needed
            ensure_model_loaded()
            if model is not None:
                try:
                    model_input_list = [patient_row.get(f, 0) for f in model_features]
                    # Convert to DataFrame with proper column names to avoid scikit-learn warnings
                    model_input_df = pd.DataFrame([model_input_list], columns=model_features)
                    prediction_proba = model.predict_proba(model_input_df)[0]
                    risk_score = round(prediction_proba[1] * 100, 2)
                    is_at_risk = bool(risk_score > AI_RISK_THRESHOLD)
                    ai_prediction_data = {
                        "risk_score_percent": risk_score,
                        "is_at_risk": is_at_risk
                    }
                    if is_at_risk:
                        threshold_alarms.append({
                            "patient_id": patient_id,
                            "vital": "AI Risk Score",
                            "level": "CRITICAL",
                            "value": f"{risk_score:.0f}%",
                        })
                except Exception as e:
                    print(f"❌ ERROR predicting for patient {patient_id}: {e}")
                    ai_prediction_data = {"error": "Prediction failed"}

            # Compose the patient object
            patient_obj = {
                "patient_id": str(int(patient_id)),
                "name": PATIENT_NAME_MAP.get(str(int(patient_id)), f"Patient {patient_id}"),
                "room": f"10{str(int(patient_id))[-1]}-A",
                "vitals": patient_vitals,
                "alarms": threshold_alarms,
                "ai_prediction": ai_prediction_data,
                "last_seen_window": int(window),
                "last_update_ts": _now_iso()
            }

            # Save as last known and append
            last_known_by_patient[str(int(patient_id))] = patient_obj
            broadcast_list.append(patient_obj)

        else:
            # No row this window — send cached object if available, else placeholder
            cached = last_known_by_patient.get(str(int(patient_id)))
            if cached:
                # update last_seen_window to the cached value (leave timestamp as-is)
                broadcast_list.append(cached)
            else:
                # create placeholder (frontend shows "never")
                placeholder = {
                    "patient_id": str(int(patient_id)),
                    "name": PATIENT_NAME_MAP.get(str(int(patient_id)), f"Patient {patient_id}"),
                    "room": f"10{str(int(patient_id))[-1]}-A",
                    "vitals": {
                        "HR": {"value": None, "status": "stable"},
                        "RR": {"value": None, "status": "stable"},
                        "SpO₂": {"value": None, "status": "stable"},
                        "SBP": {"value": None, "status": "stable"},
                        "DBP": {"value": None, "status": "stable"},
                    },
                    "alarms": [],
                    "ai_prediction": {"risk_score_percent": 0, "is_at_risk": False},
                    "last_seen_window": None,
                    "last_update_ts": None
                }
                # cache placeholder so we always have an object
                last_known_by_patient[str(int(patient_id))] = placeholder
                broadcast_list.append(placeholder)
            # helpful debug
            print(f"[INFO] No data for patient {patient_id} at window {window}; sending cached/placeholder.")

    return broadcast_list


# ---
# 4. WEBSOCKET & SERVER LIFECYCLE
# ---

class ConnectionManager:
    """Manages all active WebSocket connections."""
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"Client connected. Total clients: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
        print(f"Client disconnected. Total clients: {len(self.active_connections)}")

    async def broadcast(self, message: str):
        """Sends a message to all connected clients."""
        for connection in self.active_connections:
            await connection.send_text(message)

manager = ConnectionManager()

async def data_broadcast_loop():
    """The main server loop supporting both CSV mock data and real monitor data."""
    global use_real_monitor_data, monitor_processor

    print(f"--- Starting data broadcast loop ({'REAL MONITOR' if use_real_monitor_data else 'CSV MOCK'}) ---")

    if use_real_monitor_data and monitor_processor:
        # Real monitor data mode - get data from monitor processor
        while True:
            await asyncio.sleep(2)

            try:
                # Get active monitored patients
                active_patients = await monitor_processor.get_monitored_patients()
                broadcast_list = []

                for patient_id, patient_info in active_patients.items():
                    # Get latest vitals for this patient
                    vital_data = await monitor_processor.get_latest_patient_vitals(patient_id)

                    if vital_data:
                        # Format for frontend (similar structure to CSV data)
                        patient_obj = await format_monitor_data_for_frontend(vital_data, patient_info)
                        broadcast_list.append(patient_obj)
                    else:
                        # Create placeholder if no data available
                        patient_obj = await create_placeholder_patient(patient_id)
                        broadcast_list.append(patient_obj)

                if broadcast_list:
                    message = json.dumps(broadcast_list)
                    await manager.broadcast(message)

            except Exception as e:
                print(f"❌ ERROR in real monitor broadcast: {e}")
    else:
        # CSV mock data mode (existing functionality)
        current_window = 0
        while True:
            await asyncio.sleep(2)

            try:
                all_patient_data = get_data_for_window(current_window)

                if all_patient_data:
                    message = json.dumps(all_patient_data)
                    await manager.broadcast(message)

            except Exception as e:
                print(f"❌ ERROR broadcasting CSV data: {e}")

            # Loop the playback
            current_window += 1
            if current_window > max_window:
                current_window = 0

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """The WebSocket endpoint that clients connect to."""
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text() # Just listen
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket)

@app.on_event("startup")
async def on_startup():
    """Run this once when the server starts."""
    global use_real_monitor_data, monitor_processor

    print("--- Server starting up... ---")

    # Connect to MongoDB
    await mongo_config.connect_to_mongo()

    # Determine data source mode
    use_real_monitor_data = os.environ.get("USE_REAL_MONITOR_DATA", "false").lower() == "true"

    if use_real_monitor_data:
        print("🩺 Initializing REAL MONITOR data mode")
        # Initialize monitor processor instead of loading CSV data
        monitor_processor = UniversalMonitorProcessor()
    else:
        print("📄 Initializing CSV MOCK data mode")
        # Load ICU monitoring data (CSV)
        load_and_prepare_data()

    asyncio.create_task(data_broadcast_loop())
    print("--- Application startup complete. ---")


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000)) # Render-friendly port
    disable_reload = os.environ.get("DISABLE_DEV_RELOAD", "false").lower() == "true"

    print(f"--- Starting Uvicorn on 0.0.0.0:{port} ---")
    if disable_reload:
        print("⚙️ Production mode: reload disabled for better performance")
        uvicorn.run(
            "main:app",
            host="0.0.0.0",
            port=port,
            reload=False
        )
    else:
        print("🔄 Development mode: reload enabled for development")
        uvicorn.run(
            "main:app",
            host="0.0.0.0",
            port=port,
            reload=True # Keep reload for local dev
        )
