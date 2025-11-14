from motor.motor_asyncio import AsyncIOMotorCollection
import mongo_config
from models import Appointment, AppointmentCreate
from datetime import datetime
from typing import List, Dict, Any, Optional
from bson import ObjectId

async def get_appointments_collection() -> AsyncIOMotorCollection:
    """Get appointments collection"""
    db = mongo_config.get_database()
    return db.appointments

async def create_appointment(appointment: AppointmentCreate) -> Dict[str, Any]:
    """Create a new appointment"""
    collection = await get_appointments_collection()

    appointment_data = {
        'hospital_id': appointment.hospital_id,
        'patient_id': appointment.patient_id,
        'user_id': appointment.user_id,
        'title': appointment.title,
        'description': appointment.description,
        'appointment_date': appointment.appointment_date,
        'duration_minutes': appointment.duration_minutes or 30,
        'status': 'scheduled',
        'room': appointment.room,
        'notes': appointment.notes,
        'created_at': datetime.utcnow(),
        'updated_at': datetime.utcnow()
    }

    # Insert appointment document
    result = await collection.insert_one(appointment_data)
    appointment_data['_id'] = result.inserted_id

    return appointment_data

async def get_appointment_by_id(appointment_id: str) -> Optional[Dict[str, Any]]:
    """Get appointment by MongoDB document ID"""
    collection = await get_appointments_collection()
    appointment = await collection.find_one({"_id": ObjectId(appointment_id)})
    return appointment

async def get_appointments_by_hospital(hospital_id: str) -> List[Dict[str, Any]]:
    """Get all appointments for a hospital"""
    collection = await get_appointments_collection()
    cursor = collection.find({"hospital_id": hospital_id})
    appointments = await cursor.to_list(length=None)
    # Convert ObjectId to string for JSON serialization
    for appointment in appointments:
        appointment['_id'] = str(appointment['_id'])
    return appointments

async def get_appointments_by_patient(patient_id: str) -> List[Dict[str, Any]]:
    """Get all appointments for a patient"""
    collection = await get_appointments_collection()
    cursor = collection.find({"patient_id": patient_id})
    return await cursor.to_list(length=None)

async def get_appointments_by_user(user_id: str) -> List[Dict[str, Any]]:
    """Get all appointments for a user (doctor/nurse)"""
    collection = await get_appointments_collection()
    cursor = collection.find({"user_id": user_id})
    return await cursor.to_list(length=None)

async def get_appointments_by_date_range(
    hospital_id: str,
    start_date: datetime,
    end_date: datetime
) -> List[Dict[str, Any]]:
    """Get appointments within a date range for a hospital"""
    collection = await get_appointments_collection()
    cursor = collection.find({
        "hospital_id": hospital_id,
        "appointment_date": {"$gte": start_date, "$lte": end_date}
    })
    return await cursor.to_list(length=None)

async def update_appointment(
    appointment_id: str,
    appointment_update: Dict[str, Any]
) -> Optional[Dict[str, Any]]:
    """Update appointment information"""
    collection = await get_appointments_collection()

    # Check if appointment exists
    existing_appointment = await collection.find_one({"_id": ObjectId(appointment_id)})
    if not existing_appointment:
        return None

    # Update data
    update_data = {k: v for k, v in appointment_update.items() if v is not None}
    update_data['updated_at'] = datetime.utcnow()

    await collection.update_one(
        {"_id": ObjectId(appointment_id)},
        {"$set": update_data}
    )

    # Return updated document
    updated_appointment = await collection.find_one({"_id": ObjectId(appointment_id)})
    return updated_appointment

async def update_appointment_status(appointment_id: str, status: str) -> Optional[Dict[str, Any]]:
    """Update appointment status"""
    collection = await get_appointments_collection()

    result = await collection.update_one(
        {"_id": ObjectId(appointment_id)},
        {"$set": {
            "status": status,
            "updated_at": datetime.utcnow()
        }}
    )

    if result.modified_count > 0:
        # Return updated document
        updated_appointment = await collection.find_one({"_id": ObjectId(appointment_id)})
        return updated_appointment

    return None

async def cancel_appointment(appointment_id: str) -> Optional[Dict[str, Any]]:
    """Cancel an appointment"""
    return await update_appointment_status(appointment_id, "cancelled")

async def complete_appointment(appointment_id: str) -> Optional[Dict[str, Any]]:
    """Mark an appointment as completed"""
    return await update_appointment_status(appointment_id, "completed")
