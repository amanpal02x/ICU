from motor.motor_asyncio import AsyncIOMotorCollection
import mongo_config
from models import Department, DepartmentCreate
from datetime import datetime
from typing import List, Dict, Any, Optional
from bson import ObjectId

async def get_departments_collection() -> AsyncIOMotorCollection:
    """Get departments collection"""
    db = mongo_config.get_database()
    return db.departments

async def create_department(department: DepartmentCreate) -> Dict[str, Any]:
    """Create a new department"""
    collection = await get_departments_collection()

    department_data = {
        'name': department.name,
        'description': department.description,
        'hospital_id': department.hospital_id,
        'head_uid': department.head_uid,
        'created_at': datetime.utcnow(),
        'updated_at': datetime.utcnow()
    }

    # Insert department document
    result = await collection.insert_one(department_data)
    department_data['_id'] = result.inserted_id

    return department_data

async def get_department_by_id(department_id: str) -> Optional[Dict[str, Any]]:
    """Get department by MongoDB document ID"""
    collection = await get_departments_collection()
    department = await collection.find_one({"_id": ObjectId(department_id)})
    return department

async def get_departments_by_hospital(hospital_id: str) -> List[Dict[str, Any]]:
    """Get all departments for a hospital"""
    collection = await get_departments_collection()
    cursor = collection.find({"hospital_id": hospital_id})
    departments = await cursor.to_list(length=None)
    # Convert ObjectId to string for JSON serialization
    for department in departments:
        department['_id'] = str(department['_id'])
    return departments

async def update_department(department_id: str, department_update: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Update department information"""
    collection = await get_departments_collection()

    # Check if department exists
    existing_department = await collection.find_one({"_id": ObjectId(department_id)})
    if not existing_department:
        return None

    # Update data
    update_data = {k: v for k, v in department_update.items() if v is not None}
    update_data['updated_at'] = datetime.utcnow()

    await collection.update_one(
        {"_id": ObjectId(department_id)},
        {"$set": update_data}
    )

    # Return updated document
    updated_department = await collection.find_one({"_id": ObjectId(department_id)})
    return updated_department

async def assign_department_head(department_id: str, head_uid: str) -> Optional[Dict[str, Any]]:
    """Assign a department head"""
    collection = await get_departments_collection()

    result = await collection.update_one(
        {"_id": ObjectId(department_id)},
        {"$set": {
            "head_uid": head_uid,
            "updated_at": datetime.utcnow()
        }}
    )

    if result.modified_count > 0:
        # Return updated document
        updated_department = await collection.find_one({"_id": ObjectId(department_id)})
        return updated_department

    return None

async def get_department_users(department_id: str) -> List[Dict[str, Any]]:
    """Get all users assigned to a department"""
    from user_service import get_users_collection
    collection = await get_users_collection()
    cursor = collection.find({
        "department_id": department_id,
        "is_active": True
    })
    return await cursor.to_list(length=None)

async def get_department_patients(department_id: str) -> List[Dict[str, Any]]:
    """Get all patients assigned to a department"""
    from patient_service import get_patients_collection
    collection = await get_patients_collection()
    cursor = collection.find({
        "department_id": department_id,
        "is_active": True
    })
    return await cursor.to_list(length=None)
