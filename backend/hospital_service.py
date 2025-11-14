import string
import random
from motor.motor_asyncio import AsyncIOMotorCollection
import mongo_config
from models import Hospital, HospitalCreate
from datetime import datetime
from typing import List, Dict, Any, Optional

async def get_hospitals_collection() -> AsyncIOMotorCollection:
    """Get hospitals collection"""
    db = mongo_config.get_database()
    return db.hospitals

def generate_hospital_id() -> str:
    """Generate a unique hospital ID like HOSP001, HOSP002, etc."""
    # Generate a random 3-digit number
    number = random.randint(1, 999)
    hospital_id = f"HOSP{number:03d}"
    return hospital_id  # MongoDB will handle uniqueness through indexing

async def create_hospital(hospital: HospitalCreate) -> Dict[str, Any]:
    """Create a new hospital with generated ID"""
    collection = await get_hospitals_collection()
    hospital_id = generate_hospital_id()

    hospital_data = {
        'id': hospital_id,
        'name': hospital.name,
        'address': hospital.address,
        'phone': hospital.phone,
        'email': hospital.email,
        'admin_uid': hospital.admin_uid,
        'created_at': datetime.utcnow(),
        'updated_at': datetime.utcnow()
    }

    # Insert hospital document
    result = await collection.insert_one(hospital_data)
    hospital_data['_id'] = result.inserted_id

    return hospital_data

async def get_hospital_by_id(hospital_id: str) -> Optional[Dict[str, Any]]:
    """Get hospital by ID"""
    collection = await get_hospitals_collection()
    hospital = await collection.find_one({"id": hospital_id})
    if hospital:
        # Convert ObjectId to string for JSON serialization
        hospital['_id'] = str(hospital['_id'])
    return hospital

async def get_hospital_by_admin_uid(admin_uid: str) -> Optional[Dict[str, Any]]:
    """Get hospital by admin Firebase UID"""
    collection = await get_hospitals_collection()
    hospital = await collection.find_one({"admin_uid": admin_uid})
    if hospital:
        # Convert ObjectId to string for JSON serialization
        hospital['_id'] = str(hospital['_id'])
    return hospital

async def update_hospital(hospital_id: str, hospital_update: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Update hospital information"""
    collection = await get_hospitals_collection()

    # Check if hospital exists
    existing_hospital = await collection.find_one({"id": hospital_id})
    if not existing_hospital:
        return None

    # Update data
    update_data = {k: v for k, v in hospital_update.items() if v is not None}
    update_data['updated_at'] = datetime.utcnow()

    await collection.update_one(
        {"id": hospital_id},
        {"$set": update_data}
    )

    # Return updated document
    updated_hospital = await collection.find_one({"id": hospital_id})
    if updated_hospital:
        # Convert ObjectId to string for JSON serialization
        updated_hospital['_id'] = str(updated_hospital['_id'])
    return updated_hospital

async def get_hospital_users(hospital_id: str) -> List[Dict[str, Any]]:
    """Get all users for a hospital"""
    from user_service import get_users_collection
    collection = await get_users_collection()
    cursor = collection.find({
        "hospital_id": hospital_id,
        "is_active": True
    })
    users = await cursor.to_list(length=None)
    # Convert ObjectId to string for JSON serialization
    for user in users:
        user['_id'] = str(user['_id'])
    return users

async def get_hospital_patients(hospital_id: str) -> List[Dict[str, Any]]:
    """Get all patients for a hospital"""
    from patient_service import get_patients_collection
    collection = await get_patients_collection()
    cursor = collection.find({
        "hospital_id": hospital_id,
        "is_active": True
    })
    return await cursor.to_list(length=None)

async def get_hospital_departments(hospital_id: str) -> List[Dict[str, Any]]:
    """Get all departments for a hospital"""
    from department_service import get_departments_collection
    collection = await get_departments_collection()
    cursor = collection.find({"hospital_id": hospital_id})
    return await cursor.to_list(length=None)

async def get_hospital_appointments(hospital_id: str) -> List[Dict[str, Any]]:
    """Get all appointments for a hospital"""
    from appointment_service import get_appointments_collection
    collection = await get_appointments_collection()
    cursor = collection.find({"hospital_id": hospital_id})
    return await cursor.to_list(length=None)
