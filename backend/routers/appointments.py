from fastapi import APIRouter, HTTPException, Query
from typing import List, Dict, Any
from datetime import datetime

# Import with absolute imports
from models import AppointmentCreate
import appointment_service

router = APIRouter(prefix="/appointments", tags=["appointments"])

@router.post("/", response_model=Dict[str, Any])
async def create_appointment(appointment: AppointmentCreate):
    """Create a new appointment"""
    return await appointment_service.create_appointment(appointment)

@router.get("/{appointment_id}", response_model=Dict[str, Any])
async def get_appointment(appointment_id: str):
    """Get appointment by MongoDB document ID"""
    appointment = await appointment_service.get_appointment_by_id(appointment_id)
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return appointment

@router.get("/hospital/{hospital_id}", response_model=List[Dict[str, Any]])
async def get_appointments_by_hospital(hospital_id: str):
    """Get all appointments for a hospital"""
    return await appointment_service.get_appointments_by_hospital(hospital_id)

@router.get("/patient/{patient_id}", response_model=List[Dict[str, Any]])
async def get_appointments_by_patient(patient_id: str):
    """Get all appointments for a patient"""
    return await appointment_service.get_appointments_by_patient(patient_id)

@router.get("/user/{user_id}", response_model=List[Dict[str, Any]])
async def get_appointments_by_user(user_id: str):
    """Get all appointments for a user (doctor/nurse)"""
    return await appointment_service.get_appointments_by_user(user_id)

@router.get("/hospital/{hospital_id}/date-range", response_model=List[Dict[str, Any]])
async def get_appointments_by_date_range(
    hospital_id: str,
    start_date: datetime = Query(..., description="Start date for the range"),
    end_date: datetime = Query(..., description="End date for the range")
):
    """Get appointments within a date range for a hospital"""
    return await appointment_service.get_appointments_by_date_range(hospital_id, start_date, end_date)

@router.put("/{appointment_id}", response_model=Dict[str, Any])
async def update_appointment(
    appointment_id: str,
    appointment_update: Dict[str, Any]
):
    """Update appointment information"""
    appointment = await appointment_service.update_appointment(appointment_id, appointment_update)
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return appointment

@router.put("/{appointment_id}/status/{status}", response_model=Dict[str, Any])
async def update_appointment_status(
    appointment_id: str,
    status: str
):
    """Update appointment status"""
    valid_statuses = ["scheduled", "completed", "cancelled", "no-show"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")

    appointment = await appointment_service.update_appointment_status(appointment_id, status)
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return appointment

@router.put("/{appointment_id}/cancel", response_model=Dict[str, Any])
async def cancel_appointment(appointment_id: str):
    """Cancel an appointment"""
    appointment = await appointment_service.cancel_appointment(appointment_id)
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return appointment

@router.put("/{appointment_id}/complete", response_model=Dict[str, Any])
async def complete_appointment(appointment_id: str):
    """Mark an appointment as completed"""
    appointment = await appointment_service.complete_appointment(appointment_id)
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return appointment
