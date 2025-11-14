import re
import os
from typing import Dict, Any, List, Optional
from datetime import datetime
import joblib
import numpy as np
import pandas as pd
from motor.motor_asyncio import AsyncIOMotorClient
import mongo_config
from bson import ObjectId

class UniversalMonitorProcessor:
    def __init__(self):
        self.mongo_client = None
        try:
            self.mongo_client = mongo_config.get_database()
        except Exception as e:
            print(f"Warning: MongoDB not available: {e}")
        self.model = None
        self.model_features = ["hr_mean", "spo2_mean", "sbp_mean", "dbp_mean"]
        self.load_model()

    def load_model(self):
        """Load the AI model for vital analysis"""
        try:
            BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            MODEL_FILE = os.path.join(BASE_DIR, "models/vitals_model_tuned.joblib")
            artifact = joblib.load(MODEL_FILE)
            self.model = artifact.get("model")
        except Exception as e:
            print(f"Warning: Could not load AI model: {e}")
            self.model = None

    async def process_monitor_data(self, raw_data) -> Dict[str, Any]:
        """Process any incoming monitor data"""

        # Handle both RawVitalData objects and plain dictionaries
        if hasattr(raw_data, 'device_id'):  # RawVitalData Pydantic object
            device_id = raw_data.device_id
            data = raw_data.data
            timestamp = raw_data.timestamp or datetime.utcnow()
        else:  # Plain dictionary
            device_id = raw_data["device_id"]
            data = raw_data["data"]
            timestamp = raw_data.get("timestamp", datetime.utcnow())

        # Create a standardized raw_data dict for processing
        standardized_raw_data = {
            "device_id": device_id,
            "data": data,
            "timestamp": timestamp
        }

        # If MongoDB is not available, do basic processing without database operations
        if self.mongo_client is None:
            return await self.process_without_database(standardized_raw_data)

        # Find patient assignment for this device
        assignment = await self.find_patient_assignment(device_id)

        if not assignment:
            # No assignment found - this is new/unconfigured device
            try:
                await self.store_unassigned_data(standardized_raw_data)
            except Exception:
                # Continue even if database storage fails
                pass
            return {
                "status": "unassigned_device",
                "device_id": device_id,
                "message": "Device not assigned to any patient"
            }

        # Get field mapping for this device type
        mapping = await self.get_device_mapping(assignment["mapping_id"])

        if not mapping:
            return {
                "status": "no_mapping",
                "device_id": device_id,
                "message": "No field mapping configured for device type"
            }

        # Transform raw data to model format
        standardized_data = self.transform_data(data, mapping["field_mappings"])

        # Add patient info
        patient_info = await self.get_patient_info(assignment["patient_id"])
        standardized_data.update({
            "patient_id": str(assignment["patient_id"]),
            "name": patient_info["name"],
            "room": patient_info.get("room", "Unknown"),
            "bed": patient_info.get("bed", "Unknown"),
            "timestamp": timestamp.isoformat()
        })

        # Run AI analysis
        ai_result = await self.analyze_vitals(standardized_data)
        standardized_data["ai_analysis"] = ai_result

        # Store for real-time display
        try:
            await self.store_real_time_data(standardized_data)
        except Exception:
            # Continue even if database storage fails
            pass

        return {
            "status": "success",
            "patient_id": standardized_data["patient_id"],
            "processed_vitals": standardized_data,
            "ai_result": ai_result
        }

    async def find_patient_assignment(self, device_id: str) -> Optional[Dict[str, Any]]:
        """Find which patient this device is assigned to"""
        if self.mongo_client is None:
            return None
        try:
            collection = self.mongo_client.device_assignments
            return await collection.find_one({"device_id": device_id, "is_active": True})
        except Exception:
            return None

    async def get_device_mapping(self, mapping_id: str) -> Optional[Dict[str, Any]]:
        """Get field mapping configuration"""
        if self.mongo_client is None:
            return None
        try:
            collection = self.mongo_client.device_mappings
            return await collection.find_one({"_id": ObjectId(mapping_id)})
        except Exception:
            return None

    async def get_patient_info(self, patient_id: str) -> Dict[str, Any]:
        """Get patient details for display"""
        if self.mongo_client is None:
            return {"name": f"Test Patient {patient_id}", "room": "Test Room", "bed": "Test Bed"}
        try:
            collection = self.mongo_client.patients
            patient = await collection.find_one({"_id": ObjectId(patient_id)})
            return {
                "name": f"{patient.get('first_name', '')} {patient.get('last_name', '')}".strip() if patient else f"Patient {patient_id}",
                "room": patient.get('room_number', 'Unknown') if patient else 'Unknown',
                "bed": patient.get('bed_number', 'Unknown') if patient else 'Unknown'
            }
        except Exception:
            return {"name": f"Test Patient {patient_id}", "room": "Test Room", "bed": "Test Bed"}

    def transform_data(self, raw_data: Dict[str, Any], field_mappings: Dict[str, str]) -> Dict[str, Any]:
        """Transform any monitor data format to what our model expects"""

        transformed = {}

        # Map configured fields
        for raw_field, model_field in field_mappings.items():
            if raw_field in raw_data:
                value = raw_data[raw_field]
                transformed[model_field] = self.parse_vital_value(value)

        # Ensure all model features exist (fill with None if missing)
        for feature in self.model_features:
            if feature not in transformed:
                transformed[feature] = None

        return transformed

    def parse_vital_value(self, value: Any) -> Optional[float]:
        """Parse vital sign value, handling different formats and units"""

        if value is None or value == "":
            return None

        try:
            # Handle string values with units
            if isinstance(value, str):
                # Remove common units: bpm, %, mmHg, /min, etc.
                cleaned = re.sub(r'[^\d.-]', '', value.strip())
                if cleaned:
                    return float(cleaned)
                return None

            # Handle numeric values
            elif isinstance(value, (int, float)):
                return float(value)

            # Handle other types
            else:
                return float(value)

        except (ValueError, TypeError):
            return None

    async def analyze_vitals(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Run AI analysis on the vitals"""

        if not self.model:
            return {"error": "AI model not loaded"}

        try:
            # Prepare data for model
            model_input = []
            for feature in self.model_features:
                value = data.get(feature)
                model_input.append(value if value is not None else 0)

            # Run prediction
            model_input_df = pd.DataFrame([model_input], columns=self.model_features)
            prediction_proba = self.model.predict_proba(model_input_df)[0]

            risk_score = round(prediction_proba[1] * 100, 2)

            return {
                "risk_score_percent": risk_score,
                "is_at_risk": risk_score > 70.0,
                "prediction_confidence": prediction_proba
            }

        except Exception as e:
            return {"error": f"Analysis failed: {str(e)}"}

    async def store_real_time_data(self, data: Dict[str, Any]):
        """Store processed data for real-time display"""
        collection = self.mongo_client.realtime_vitals

        # Keep only latest reading per patient
        await collection.replace_one(
            {"patient_id": data["patient_id"]},
            data,
            upsert=True
        )

    async def store_unassigned_data(self, raw_data: Dict[str, Any]):
        """Store data from unassigned devices for later configuration"""
        collection = self.mongo_client.unassigned_devices

        await collection.insert_one({
            "device_id": raw_data["device_id"],
            "device_type": raw_data.get("device_type", "unknown"),
            "raw_data": raw_data["data"],
            "timestamp": raw_data["timestamp"],
            "discovered_at": datetime.utcnow()
        })

    async def get_all_mappings(self) -> List[Dict[str, Any]]:
        """Get all configured device mappings"""
        collection = self.mongo_client.device_mappings
        mappings = []
        async for mapping in collection.find({"is_active": True}):
            mapping["_id"] = str(mapping["_id"])
            mappings.append(mapping)
        return mappings

    async def create_device_mapping(self, mapping_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new device mapping configuration"""
        collection = self.mongo_client.device_mappings
        mapping_data["created_at"] = datetime.utcnow()
        result = await collection.insert_one(mapping_data)
        return {"status": "success", "mapping_id": str(result.inserted_id)}

    async def create_device_assignment(self, assignment_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a device-to-patient assignment"""
        # Ensure patient_id and device_id combination is unique
        collection = self.mongo_client.device_assignments

        # Check if assignment already exists
        existing = await collection.find_one({
            "patient_id": ObjectId(assignment_data["patient_id"]),
            "device_id": assignment_data["device_id"],
            "is_active": True
        })

        if existing:
            return {"status": "error", "message": "Device already assigned to this patient"}

        assignment_data["patient_id"] = ObjectId(assignment_data["patient_id"])
        assignment_data["created_at"] = datetime.utcnow()

        result = await collection.insert_one(assignment_data)
        return {"status": "success", "assignment_id": str(result.inserted_id)}

    async def get_unassigned_devices(self) -> List[Dict[str, Any]]:
        """Get list of devices that sent data but aren't assigned"""
        collection = self.mongo_client.unassigned_devices

        # Group by device_id and get the latest data for each
        pipeline = [
            {"$sort": {"discovered_at": -1}},  # Most recent first
            {"$group": {
                "_id": "$device_id",
                "latest_data": {"$first": "$$ROOT"}
            }},
            {"$replaceRoot": {"newRoot": "$latest_data"}}
        ]

        devices = []
        async for device in collection.aggregate(pipeline):
            device["_id"] = str(device["_id"])
            devices.append(device)
        return devices

    async def get_monitored_patients(self) -> Dict[str, Any]:
        """Get mapping of patient_ids to their device info for real-time monitoring"""
        collection = self.mongo_client.device_assignments
        patients = {}
        async for assignment in collection.find({"is_active": True}):
            patient_id = str(assignment["patient_id"])
            patients[patient_id] = {
                "device_id": assignment["device_id"],
                "mapping_id": assignment["mapping_id"]
            }
        return patients

    async def get_latest_patient_vitals(self, patient_id: str) -> Optional[Dict[str, Any]]:
        """Get the most recent vital data for a specific patient"""
        collection = self.mongo_client.realtime_vitals
        vitals = await collection.find_one({"patient_id": patient_id})
        return vitals

    async def process_without_database(self, raw_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process monitor data without database operations - for testing purposes"""

        # Create a basic device mapping assuming common monitor format
        default_mapping = {
            "HR": "hr_mean",
            "SpO2": "spo2_mean",
            "NBP_SYS": "sbp_mean",
            "NBP_DIA": "dbp_mean",
            "RESP": "rr_mean"
        }

        # Transform raw data to model format
        standardized_data = self.transform_data(raw_data["data"], default_mapping)

        # Add basic patient info (assume test patient)
        test_patient_names = {
            "philips_bed_01": ("John Doe", "101-A", "Bed 1"),
            "medtronic_bed_02": ("Jane Smith", "101-B", "Bed 2"),
            "drager_bed_03": ("Bob Johnson", "102-A", "Bed 1"),
        }

        device_id = raw_data["device_id"]
        name, room, bed = test_patient_names.get(device_id, (f"Test Patient ({device_id})", "Test Room", "Test Bed"))

        standardized_data.update({
            "patient_id": device_id,  # Use device_id as patient_id for testing
            "name": name,
            "room": room,
            "bed": bed,
            "timestamp": raw_data["timestamp"].isoformat()
        })

        # Run AI analysis if model is available
        ai_result = await self.analyze_vitals(standardized_data)
        standardized_data["ai_analysis"] = ai_result

        return {
            "status": "test_success",
            "message": "Processed in test mode (no database)",
            "patient_id": standardized_data["patient_id"],
            "processed_vitals": standardized_data,
            "ai_result": ai_result,
            "original_data": raw_data
        }
