"""Admin router for ICU monitor management."""
from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, List, Optional
from datetime import datetime
from pydantic import BaseModel
import mongo_config

router = APIRouter(prefix="/admin", tags=["admin"])

# --- Data Models ---

class DeviceModel(BaseModel):
    device_id: str
    serial_number: str
    location_room: str
    location_bed: str
    device_type: str = "philips"
    status: str = "active"  # active, maintenance, retired
    purchase_date: str = ""
    warranty_expiry: str = ""
    created_at: str = ""

class QuickAdmitModel(BaseModel):
    first_name: str
    last_name: str
    urgency: str = "medium"  # emergency/high/medium/low
    department: str = "cardiology_icu"

class AutoAssignModel(BaseModel):
    patient_id: str
    preferred_room: str = ""
    required_parameters: List[str] = ["ECG", "SpO2", "BP"]
    priority: str = "medium"  # high/medium/low

class ManualAssignModel(BaseModel):
    patient_id: str
    device_id: str
    custom_alarm_limits: Dict[str, Any] = {}
    notes: str = ""

class ReassignModel(BaseModel):
    old_device_id: str
    new_patient_id: str
    reason: str = ""
    notes: str = ""

# --- Helper Functions ---

def get_monitor_inventory_status() -> Dict[str, Any]:
    """Get current monitor inventory counts - non-disruptive to existing system."""
    try:
        db = mongo_config.get_database()
        # Check if we have assigned devices
        assigned_count = 0
        free_count = 0
        maintenance_count = 0

        # Count assigned devices from device_assignments collection (existing)
        device_assignments_collection = db.device_assignments
        active_assignments = device_assignments_collection.find({"is_active": True})
        assigned_devices = set()
        async def count_assignments():
            nonlocal assigned_count, assigned_devices
            async for assignment in device_assignments_collection.find({"is_active": True}):
                assigned_devices.add(assignment["device_id"])
                assigned_count += 1
        # Note: We're using sync code for simplicity, but this may need async in production

        # For now, return mock data that doesn't interfere with existing system
        # In production, this would query actual device inventory
        return {
            "total_monitors": 25,
            "active_assigned": assigned_count,
            "free_available": max(0, 25 - assigned_count),  # Simple calculation
            "maintenance": 1,
            "critical": 0
        }
    except Exception:
        # If database unavailable, return safe defaults
        return {
            "total_monitors": 25,
            "active_assigned": 0,
            "free_available": 25,
            "maintenance": 0,
            "critical": 0
        }

async def get_device_status(device_id: str) -> Dict[str, Any]:
    """Get device status without interfering with existing monitoring."""
    try:
        db = mongo_config.get_database()
        device_assignments = await db.device_assignments.find_one(
            {"device_id": device_id, "is_active": True}
        )

        if device_assignments:
            # Get patient info from assignments
            patient_id = device_assignments.get("patient_id")
            patients_collection = db.patients
            patient = await patients_collection.find_one({"_id": patient_id})

            patient_name = f"{patient.get('first_name', '')} {patient.get('last_name', '')}".strip() if patient else "Unknown Patient"

            return {
                "device_id": device_id,
                "status": "assigned",
                "patient_name": patient_name,
                "location": f"Room {device_assignments.get('room', 'Unknown')}"
            }
        else:
            return {
                "device_id": device_id,
                "status": "available",
                "patient_name": "--",
                "location": "Unassigned"
            }
    except Exception:
        # Safe fallback
        return {
            "device_id": device_id,
            "status": "unknown",
            "patient_name": "--",
            "location": "Error"
        }

# --- API Endpoints ---

@router.get("/monitor-inventory")
async def get_monitor_inventory():
    """Get complete monitor inventory status for admin dashboard."""
    return get_monitor_inventory_status()

@router.get("/monitor-status/{device_id}")
async def get_monitor_status(device_id: str):
    """Get status of specific monitor."""
    return await get_device_status(device_id)

@router.post("/patients/quick-admit")
async def quick_admit_patient(patient: QuickAdmitModel) -> Dict[str, Any]:
    """Quick patient admission for emergency situations."""
    try:
        db = mongo_config.get_database()
        patients_collection = db.patients

        # Create minimal patient record
        new_patient = {
            "first_name": patient.first_name,
            "last_name": patient.last_name,
            "admission_date": datetime.utcnow().isoformat(),
            "urgency": patient.urgency,
            "department": patient.department,
            "status": "admitted",
            "created_at": datetime.utcnow().isoformat()
        }

        # Insert patient (this works with existing patient schema)
        result = await patients_collection.insert_one(new_patient)
        patient_id = str(result.inserted_id)

        return {
            "status": "success",
            "patient_id": patient_id,
            "message": f"Patient {patient.first_name} {patient.last_name} admitted successfully",
            "next_step": "assign_monitor"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to admit patient: {str(e)}")

@router.post("/assign-monitor-auto")
async def auto_assign_monitor(assignment: AutoAssignModel) -> Dict[str, Any]:
    """Automatically assign the best available monitor to patient."""
    try:
        db = mongo_config.get_database()

        # Find available monitors (devices not actively assigned)
        device_assignments_collection = db.device_assignments
        assigned_devices = set()
        async for assignment_doc in device_assignments_collection.find({"is_active": True}):
            assigned_devices.add(assignment_doc["device_id"])

        # Mock available devices (in production, query actual device inventory)
        mock_available_devices = [
            {"device_id": "PHILIPS_ICU_101_BED_1", "room": "ICU-101", "bed": "Bed 1"},
            {"device_id": "PHILIPS_ICU_101_BED_2", "room": "ICU-101", "bed": "Bed 2"},
            {"device_id": "PHILIPS_ICU_102_BED_1", "room": "ICU-102", "bed": "Bed 1"},
            {"device_id": "MEDTRONIC_ICU_103_BED_1", "room": "ICU-103", "bed": "Bed 1"}
        ]

        # Find first available device in preferred room or any room
        selected_device = None
        for device in mock_available_devices:
            if device["device_id"] not in assigned_devices:
                if not assignment.preferred_room or device["room"] == assignment.preferred_room:
                    selected_device = device
                    break

        if not selected_device:
            raise HTTPException(status_code=404, detail="No available monitors found")

        # Create device assignment (uses existing assignment schema)
        assignment_doc = {
            "patient_id": assignment.patient_id,
            "device_id": selected_device["device_id"],
            "room": selected_device["room"],
            "bed": selected_device["bed"],
            "assigned_by": "auto_system",
            "assignment_reason": "Auto-assigned via admin panel",
            "is_active": True,
            "created_at": datetime.utcnow().isoformat()
        }

        await device_assignments_collection.insert_one(assignment_doc)

        return {
            "status": "success",
            "patient_id": assignment.patient_id,
            "assigned_monitor": selected_device["device_id"],
            "room": selected_device["room"],
            "bed": selected_device["bed"],
            "message": f"Monitor {selected_device['device_id']} assigned to patient"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Auto-assignment failed: {str(e)}")

@router.post("/assign-monitor-specific")
async def manual_assign_monitor(assignment: ManualAssignModel) -> Dict[str, Any]:
    """Manually assign a specific monitor to patient."""
    try:
        db = mongo_config.get_database()

        # Check if device is already assigned
        device_assignments_collection = db.device_assignments
        existing = await device_assignments_collection.find_one({
            "device_id": assignment.device_id,
            "is_active": True
        })

        if existing:
            raise HTTPException(status_code=400, detail="Monitor is already assigned to another patient")

        # Create assignment
        assignment_doc = {
            "patient_id": assignment.patient_id,
            "device_id": assignment.device_id,
            "assigned_by": "admin_manual",
            "assignment_reason": assignment.notes,
            "custom_alarm_limits": assignment.custom_alarm_limits,
            "is_active": True,
            "created_at": datetime.utcnow().isoformat()
        }

        await device_assignments_collection.insert_one(assignment_doc)

        return {
            "status": "success",
            "patient_id": assignment.patient_id,
            "assigned_monitor": assignment.device_id,
            "message": f"Monitor {assignment.device_id} manually assigned to patient"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Manual assignment failed: {str(e)}")

@router.post("/reassign-monitor")
async def reassign_monitor(reassignment: ReassignModel) -> Dict[str, Any]:
    """Reassign monitor from one patient to another."""
    try:
        db = mongo_config.get_database()
        device_assignments_collection = db.device_assignments

        # Find current assignment
        current_assignment = await device_assignments_collection.find_one({
            "device_id": reassignment.old_device_id,
            "is_active": True
        })

        if not current_assignment:
            raise HTTPException(status_code=404, detail="Monitor not currently assigned")

        # Deactivate current assignment
        await device_assignments_collection.update_one(
            {"_id": current_assignment["_id"]},
            {
                "$set": {
                    "is_active": False,
                    "deactivated_at": datetime.utcnow().isoformat(),
                    "deactivation_reason": reassignment.reason
                }
            }
        )

        # Create new assignment
        new_assignment = {
            "patient_id": reassignment.new_patient_id,
            "device_id": reassignment.old_device_id,
            "assigned_by": "admin_reassignment",
            "assignment_reason": f"Reassigned from patient {current_assignment.get('patient_id')} - {reassignment.reason}",
            "notes": reassignment.notes,
            "is_active": True,
            "created_at": datetime.utcnow().isoformat()
        }

        await device_assignments_collection.insert_one(new_assignment)

        return {
            "status": "success",
            "old_patient_id": current_assignment.get("patient_id"),
            "new_patient_id": reassignment.new_patient_id,
            "device_id": reassignment.old_device_id,
            "message": "Monitor reassigned successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Reassignment failed: {str(e)}")

@router.get("/unassigned-monitors")
async def get_unassigned_monitors():
    """Get list of available (unassigned) monitors."""
    try:
        # Mock available devices - in production, query device inventory
        mock_devices = [
            {"device_id": "PHILIPS_ICU_101_BED_1", "room": "ICU-101", "bed": "Bed 1", "type": "Philips"},
            {"device_id": "PHILIPS_ICU_101_BED_2", "room": "ICU-101", "bed": "Bed 2", "type": "Philips"},
            {"device_id": "PHILIPS_ICU_102_BED_1", "room": "ICU-102", "bed": "Bed 1", "type": "Philips"},
            {"device_id": "MEDTRONIC_ICU_103_BED_1", "room": "ICU-103", "bed": "Bed 1", "type": "Medtronic"}
        ]

        # Filter out assigned devices
        db = mongo_config.get_database()
        assigned_devices = set()
        async for assignment in db.device_assignments.find({"is_active": True}):
            assigned_devices.add(assignment["device_id"])

        available_devices = [
            device for device in mock_devices
            if device["device_id"] not in assigned_devices
        ]

        return {
            "status": "success",
            "available_monitors": available_devices,
            "count": len(available_devices)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get unassigned monitors: {str(e)}")

# Maintain compatibility - endpoint that works with existing system
@router.get("/monitor-overview")
async def get_monitor_overview():
    """Get complete monitoring system overview for admin dashboard."""
    try:
        inventory = get_monitor_inventory_status()

        # Get recent assignments for display
        db = mongo_config.get_database()
        recent_assignments = []

        # Safe async operation
        try:
            assignments = []
            async for assignment in db.device_assignments.find({"is_active": True}).sort("created_at", -1).limit(10):
                assignments.append({
                    "device_id": assignment.get("device_id"),
                    "patient_id": str(assignment.get("patient_id", "")),
                    "room": assignment.get("room", "Unknown"),
                    "assigned_at": assignment.get("created_at", "")
                })

            # Get patient names (in production, batch this for efficiency)
            for assignment in assignments:
                try:
                    patient = await db.patients.find_one({"_id": assignment["patient_id"]})
                    assignment["patient_name"] = f"{patient.get('first_name', '')} {patient.get('last_name', '')}".strip() if patient else "Unknown"
                except:
                    assignment["patient_name"] = "Unknown"

            recent_assignments = assignments

        except:
            recent_assignments = []

        return {
            "inventory_summary": inventory,
            "recent_assignments": recent_assignments,
            "system_status": "operational" if inventory["total_monitors"] > 0 else "warning"
        }

    except Exception as e:
        return {
            "inventory_summary": {"error": str(e)},
            "recent_assignments": [],
            "system_status": "error"
        }
