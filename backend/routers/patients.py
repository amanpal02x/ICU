from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from datetime import datetime

# Import with absolute imports
from models import PatientCreate
import patient_service

router = APIRouter(prefix="/patients", tags=["patients"])

@router.post("/", response_model=Dict[str, Any])
async def create_patient(patient: PatientCreate):
    """Create a new patient"""
    return await patient_service.create_patient(patient)

@router.get("/{patient_id}", response_model=Dict[str, Any])
async def get_patient(patient_id: str):
    """Get patient by MongoDB document ID"""
    patient = await patient_service.get_patient_by_id(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient

@router.get("/hospital/{hospital_id}", response_model=List[Dict[str, Any]])
async def get_patients_by_hospital(hospital_id: str):
    """Get all patients for a hospital"""
    return await patient_service.get_patients_by_hospital(hospital_id)

@router.get("/department/{department_id}", response_model=List[Dict[str, Any]])
async def get_patients_by_department(department_id: str):
    """Get all patients for a department"""
    return await patient_service.get_patients_by_department(department_id)

@router.put("/{patient_id}", response_model=Dict[str, Any])
async def update_patient(
    patient_id: str,
    patient_update: Dict[str, Any]
):
    """Update patient information"""
    patient = await patient_service.update_patient(patient_id, patient_update)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient

@router.put("/{patient_id}/discharge")
async def discharge_patient(
    patient_id: str,
    discharge_date: datetime = None
):
    """Discharge a patient"""
    patient = await patient_service.discharge_patient(patient_id, discharge_date)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return {"message": "Patient discharged successfully", "patient": patient}

@router.put("/{patient_id}/admit")
async def admit_patient(
    patient_id: str,
    admission_date: datetime = None
):
    """Admit a patient"""
    patient = await patient_service.admit_patient(patient_id, admission_date)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return {"message": "Patient admitted successfully", "patient": patient}

@router.put("/{patient_id}/department/{department_id}", response_model=Dict[str, Any])
async def assign_patient_to_department(
    patient_id: str,
    department_id: str
):
    """Assign a patient to a department"""
    patient = await patient_service.assign_patient_to_department(patient_id, department_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient

@router.put("/{patient_id}/room")
async def assign_patient_room(
    patient_id: str,
    room_number: str,
    bed_number: str
):
    """Assign a patient to a room and bed"""
    patient = await patient_service.assign_patient_room(patient_id, room_number, bed_number)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return {"message": "Patient room assigned successfully", "patient": patient}

@router.delete("/{patient_id}")
async def delete_patient(patient_id: str):
    """Delete a patient permanently"""
    deleted = await patient_service.delete_patient(patient_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Patient not found")
    return {"message": "Patient deleted successfully"}
