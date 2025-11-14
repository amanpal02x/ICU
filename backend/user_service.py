from motor.motor_asyncio import AsyncIOMotorCollection
import mongo_config
from models import User, UserCreate
from auth_utils import get_password_hash
from datetime import datetime
from typing import List, Dict, Any, Optional
from bson import ObjectId

async def get_users_collection() -> AsyncIOMotorCollection:
    """Get users collection"""
    db = mongo_config.get_database()
    return db.users

async def create_user(user: UserCreate) -> Dict[str, Any]:
    """Create a new user"""
    collection = await get_users_collection()

    # Hash the password
    hashed_password = get_password_hash(user.password)

    user_data = {
        'firebase_uid': f"legacy_{ObjectId()}",  # Generate a legacy UID for backward compatibility
        'email': user.email,
        'display_name': user.display_name,
        'role': user.role,
        'hospital_id': user.hospital_id,
        'department_id': user.department_id,
        'phone': user.phone,
        'address': user.address,
        'is_active': True,
        'hashed_password': hashed_password,
        'created_at': datetime.utcnow(),
        'updated_at': datetime.utcnow()
    }

    # Insert user document
    result = await collection.insert_one(user_data)
    user_data['_id'] = result.inserted_id
    return user_data

async def get_user_by_firebase_uid(firebase_uid: str) -> Optional[Dict[str, Any]]:
    """Get user by Firebase UID"""
    collection = await get_users_collection()
    user = await collection.find_one({"firebase_uid": firebase_uid})
    if user:
        # Convert ObjectId to string for JSON serialization
        user['_id'] = str(user['_id'])
    return user

async def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    """Get user by MongoDB document ID"""
    collection = await get_users_collection()
    user = await collection.find_one({"_id": ObjectId(user_id)})
    return user

async def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    """Get user by email"""
    collection = await get_users_collection()
    user = await collection.find_one({"email": email})
    return user

async def get_users_by_hospital_and_role(hospital_id: str, role: str) -> List[Dict[str, Any]]:
    """Get users by hospital and role"""
    collection = await get_users_collection()
    cursor = collection.find({
        "hospital_id": hospital_id,
        "role": role,
        "is_active": True
    })
    users = await cursor.to_list(length=None)
    # Convert ObjectId to string for JSON serialization
    for user in users:
        user['_id'] = str(user['_id'])
    return users

async def update_user(firebase_uid: str, user_update: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Update user information"""
    collection = await get_users_collection()

    # Check if user exists
    existing_user = await collection.find_one({"firebase_uid": firebase_uid})
    if not existing_user:
        return None

    # Update data
    update_data = {k: v for k, v in user_update.items() if v is not None}
    update_data['updated_at'] = datetime.utcnow()

    await collection.update_one(
        {"firebase_uid": firebase_uid},
        {"$set": update_data}
    )

    # Return updated document
    updated_user = await collection.find_one({"firebase_uid": firebase_uid})
    if updated_user:
        # Convert ObjectId to string for JSON serialization
        updated_user['_id'] = str(updated_user['_id'])
    return updated_user

async def deactivate_user(firebase_uid: str) -> bool:
    """Deactivate a user (soft delete)"""
    collection = await get_users_collection()

    # First check if user exists
    user = await collection.find_one({"firebase_uid": firebase_uid})
    if not user:
        print(f"User {firebase_uid} not found for deactivation")
        return False

    print(f"Deactivating user {firebase_uid}: {user.get('email', 'unknown email')}")

    result = await collection.update_one(
        {"firebase_uid": firebase_uid},
        {"$set": {"is_active": False, "updated_at": datetime.utcnow()}}
    )

    print(f"Deactivation result: modified_count = {result.modified_count}")

    # Verify the update
    updated_user = await collection.find_one({"firebase_uid": firebase_uid})
    if updated_user:
        print(f"User is_active after update: {updated_user.get('is_active', 'not set')}")

    return result.modified_count > 0

async def get_hospital_staff(hospital_id: str) -> List[Dict[str, Any]]:
    """Get all staff (doctors and nurses) for a hospital"""
    collection = await get_users_collection()
    cursor = collection.find({
        "hospital_id": hospital_id,
        "role": {"$in": ["doctor", "nurse"]},
        "is_active": True
    })
    users = await cursor.to_list(length=None)
    # Convert ObjectId to string for JSON serialization
    for user in users:
        user['_id'] = str(user['_id'])
    return users

async def assign_user_to_department(firebase_uid: str, department_id: str) -> Optional[Dict[str, Any]]:
    """Assign a user to a department"""
    collection = await get_users_collection()

    result = await collection.update_one(
        {"firebase_uid": firebase_uid},
        {"$set": {"department_id": department_id, "updated_at": datetime.utcnow()}}
    )

    if result.modified_count > 0:
        # Return updated document
        updated_user = await collection.find_one({"firebase_uid": firebase_uid})
        return updated_user

    return None
