from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any

# Import with absolute imports
from models import HospitalCreate
import hospital_service

router = APIRouter(prefix="/hospitals", tags=["hospitals"])

@router.post("/", response_model=Dict[str, Any])
async def create_hospital(hospital: HospitalCreate):
    """Create a new hospital (called when admin registers)"""
    # Check if admin already has a hospital
    existing_hospital = await hospital_service.get_hospital_by_admin_uid(hospital.admin_uid)
    if existing_hospital:
        raise HTTPException(status_code=400, detail="Admin already has a hospital")

    return await hospital_service.create_hospital(hospital)

@router.get("/{hospital_id}", response_model=Dict[str, Any])
async def get_hospital(hospital_id: str):
    """Get hospital by ID"""
    hospital = await hospital_service.get_hospital_by_id(hospital_id)
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found")
    return hospital

@router.get("/admin/{admin_uid}", response_model=Dict[str, Any])
async def get_hospital_by_admin(admin_uid: str):
    """Get hospital by admin Firebase UID"""
    hospital = await hospital_service.get_hospital_by_admin_uid(admin_uid)
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found")
    return hospital

@router.put("/{hospital_id}", response_model=Dict[str, Any])
async def update_hospital(
    hospital_id: str,
    hospital_update: Dict[str, Any]
):
    """Update hospital information"""
    hospital = await hospital_service.update_hospital(hospital_id, hospital_update)
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found")
    return hospital

@router.get("/{hospital_id}/users", response_model=List[Dict[str, Any]])
async def get_hospital_users(hospital_id: str):
    """Get all users for a hospital"""
    return await hospital_service.get_hospital_users(hospital_id)

@router.get("/{hospital_id}/patients", response_model=List[Dict[str, Any]])
async def get_hospital_patients(hospital_id: str):
    """Get all patients for a hospital"""
    return await hospital_service.get_hospital_patients(hospital_id)

@router.get("/{hospital_id}/departments", response_model=List[Dict[str, Any]])
async def get_hospital_departments(hospital_id: str):
    """Get all departments for a hospital"""
    return await hospital_service.get_hospital_departments(hospital_id)

@router.get("/{hospital_id}/appointments", response_model=List[Dict[str, Any]])
async def get_hospital_appointments(hospital_id: str):
    """Get all appointments for a hospital"""
    return await hospital_service.get_hospital_appointments(hospital_id)
