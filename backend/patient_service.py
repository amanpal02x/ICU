from motor.motor_asyncio import AsyncIOMotorCollection
import mongo_config
from models import Patient, PatientCreate
from datetime import datetime
from typing import List, Dict, Any, Optional
from bson import ObjectId

async def get_patients_collection() -> AsyncIOMotorCollection:
    """Get patients collection"""
    db = mongo_config.get_database()
    return db.patients

async def create_patient(patient: PatientCreate) -> Dict[str, Any]:
    """Create a new patient"""
    try:
        collection = await get_patients_collection()

        # Generate custom patient ID (IRN-XXXXX format)
        # Find the highest existing patient ID number
        pipeline = [
            {"$match": {"id": {"$regex": "^IRN-"}}},
            {"$project": {"id_num": {"$toInt": {"$substr": ["$id", 4, 5]}}}},
            {"$sort": {"id_num": -1}},
            {"$limit": 1}
        ]
        result = await collection.aggregate(pipeline).to_list(length=1)
        if result:
            next_patient_number = result[0]["id_num"] + 1
        else:
            next_patient_number = 1
        custom_patient_id = f"IRN-{next_patient_number:05d}"

        # Ensure date_of_birth is a datetime object
        date_of_birth = patient.date_of_birth
        if isinstance(date_of_birth, str):
            # Parse ISO string to datetime if needed
            date_of_birth = datetime.fromisoformat(date_of_birth.replace('Z', '+00:00'))

        patient_data = {
            'id': custom_patient_id,  # Custom formatted ID
            'hospital_id': patient.hospital_id,
            'department_id': patient.department_id,
            'first_name': patient.first_name,
            'last_name': patient.last_name,
            'date_of_birth': date_of_birth,
            'gender': patient.gender,
            'phone': patient.phone,
            'email': patient.email,
            'address': patient.address,
            'medical_record_number': patient.medical_record_number,
            'blood_type': patient.blood_type,
            'allergies': patient.allergies,
            'emergency_contact_name': patient.emergency_contact_name,
            'emergency_contact_phone': patient.emergency_contact_phone,
            'room_number': patient.room_number,
            'bed_number': patient.bed_number,
            'is_active': True,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        }

        # Insert patient document
        result = await collection.insert_one(patient_data)

        # Get the inserted document and convert ObjectId to string
        inserted_patient = await collection.find_one({"_id": result.inserted_id})
        if inserted_patient:
            # Convert ObjectId to string for JSON serialization
            inserted_patient['_id'] = str(inserted_patient['_id'])
            return inserted_patient

        return patient_data
    except Exception as e:
        print(f"Error creating patient: {e}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        raise

async def get_patient_by_id(patient_id: str) -> Optional[Dict[str, Any]]:
    """Get patient by MongoDB document ID"""
    collection = await get_patients_collection()
    patient = await collection.find_one({"_id": ObjectId(patient_id)})
    return patient

async def get_patients_by_hospital(hospital_id: str) -> List[Dict[str, Any]]:
    """Get all patients for a hospital (both active and discharged)"""
    collection = await get_patients_collection()
    cursor = collection.find({
        "hospital_id": hospital_id
    }).sort("is_active", -1)  # Active patients first
    patients = await cursor.to_list(length=None)
    # Convert ObjectId _id to string for JSON serialization, but keep custom id field
    for patient in patients:
        patient['_id'] = str(patient['_id'])
    return patients

async def get_patients_by_department(department_id: str) -> List[Dict[str, Any]]:
    """Get all patients for a department"""
    collection = await get_patients_collection()
    cursor = collection.find({
        "department_id": department_id,
        "is_active": True
    })
    return await cursor.to_list(length=None)

async def update_patient(patient_id: str, patient_update: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Update patient information"""
    collection = await get_patients_collection()

    # Check if patient exists
    existing_patient = await collection.find_one({"_id": ObjectId(patient_id)})
    if not existing_patient:
        return None

    # Update data
    update_data = {k: v for k, v in patient_update.items() if v is not None}
    update_data['updated_at'] = datetime.utcnow()

    await collection.update_one(
        {"_id": ObjectId(patient_id)},
        {"$set": update_data}
    )

    # Return updated document
    updated_patient = await collection.find_one({"_id": ObjectId(patient_id)})
    if updated_patient:
        # Convert ObjectId to string for JSON serialization
        updated_patient['_id'] = str(updated_patient['_id'])
    return updated_patient

async def discharge_patient(patient_id: str, discharge_date: datetime = None) -> Optional[Dict[str, Any]]:
    """Discharge a patient"""
    if discharge_date is None:
        discharge_date = datetime.utcnow()

    collection = await get_patients_collection()

    result = await collection.update_one(
        {"_id": ObjectId(patient_id)},
        {"$set": {
            "discharge_date": discharge_date,
            "is_active": False,  # Mark as inactive
            "updated_at": datetime.utcnow()
        }}
    )

    if result.modified_count > 0:
        # Return updated document
        updated_patient = await collection.find_one({"_id": ObjectId(patient_id)})
        if updated_patient:
            # Convert ObjectId to string for JSON serialization
            updated_patient['_id'] = str(updated_patient['_id'])
        return updated_patient

    return None

async def admit_patient(patient_id: str, admission_date: datetime = None) -> Optional[Dict[str, Any]]:
    """Admit a patient"""
    if admission_date is None:
        admission_date = datetime.utcnow()

    collection = await get_patients_collection()

    result = await collection.update_one(
        {"_id": ObjectId(patient_id)},
        {"$set": {
            "admission_date": admission_date,
            "discharge_date": None,  # Clear discharge date
            "is_active": True,  # Mark as active
            "updated_at": datetime.utcnow()
        }}
    )

    if result.modified_count > 0:
        # Return updated document
        updated_patient = await collection.find_one({"_id": ObjectId(patient_id)})
        if updated_patient:
            # Convert ObjectId to string for JSON serialization
            updated_patient['_id'] = str(updated_patient['_id'])
        return updated_patient

    return None

async def assign_patient_to_department(patient_id: str, department_id: str) -> Optional[Dict[str, Any]]:
    """Assign a patient to a department"""
    collection = await get_patients_collection()

    result = await collection.update_one(
        {"_id": ObjectId(patient_id)},
        {"$set": {
            "department_id": department_id,
            "updated_at": datetime.utcnow()
        }}
    )

    if result.modified_count > 0:
        # Return updated document
        updated_patient = await collection.find_one({"_id": ObjectId(patient_id)})
        if updated_patient:
            # Convert ObjectId to string for JSON serialization
            updated_patient['_id'] = str(updated_patient['_id'])
        return updated_patient

    return None

async def assign_patient_room(patient_id: str, room_number: str, bed_number: str) -> Optional[Dict[str, Any]]:
    """Assign a patient to a room and bed"""
    collection = await get_patients_collection()

    result = await collection.update_one(
        {"_id": ObjectId(patient_id)},
        {"$set": {
            "room_number": room_number,
            "bed_number": bed_number,
            "updated_at": datetime.utcnow()
        }}
    )

    if result.modified_count > 0:
        # Return updated document
        updated_patient = await collection.find_one({"_id": ObjectId(patient_id)})
        if updated_patient:
            # Convert ObjectId to string for JSON serialization
            updated_patient['_id'] = str(updated_patient['_id'])
        return updated_patient

    return None

async def delete_patient(patient_id: str) -> bool:
    """Delete a patient permanently"""
    collection = await get_patients_collection()

    result = await collection.delete_one({"_id": ObjectId(patient_id)})

    return result.deleted_count > 0
