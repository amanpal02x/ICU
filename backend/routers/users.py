from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any

# Import with absolute imports
from models import UserCreate
import user_service

router = APIRouter(prefix="/users", tags=["users"])

@router.post("/", response_model=Dict[str, Any])
async def create_user(user: UserCreate):
    """Create a new user"""
    # Check if user already exists
    existing_user = await user_service.get_user_by_email(user.email)
    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists")

    return await user_service.create_user(user)

@router.get("/{firebase_uid}", response_model=Dict[str, Any])
async def get_user(firebase_uid: str):
    """Get user by Firebase UID"""
    user = await user_service.get_user_by_firebase_uid(firebase_uid)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.get("/id/{user_id}", response_model=Dict[str, Any])
async def get_user_by_id(user_id: str):
    """Get user by MongoDB document ID"""
    user = await user_service.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.put("/{firebase_uid}", response_model=Dict[str, Any])
async def update_user(
    firebase_uid: str,
    user_update: Dict[str, Any]
):
    """Update user information"""
    user = await user_service.update_user(firebase_uid, user_update)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.delete("/{firebase_uid}")
async def deactivate_user(firebase_uid: str):
    """Deactivate a user (soft delete)"""
    success = await user_service.deactivate_user(firebase_uid)
    if not success:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deactivated successfully"}

@router.get("/hospital/{hospital_id}/role/{role}", response_model=List[Dict[str, Any]])
async def get_users_by_hospital_and_role(hospital_id: str, role: str):
    """Get users by hospital and role"""
    return await user_service.get_users_by_hospital_and_role(hospital_id, role)

@router.get("/hospital/{hospital_id}/staff", response_model=List[Dict[str, Any]])
async def get_hospital_staff(hospital_id: str):
    """Get all staff (doctors and nurses) for a hospital"""
    return await user_service.get_hospital_staff(hospital_id)

@router.put("/{firebase_uid}/department/{department_id}", response_model=Dict[str, Any])
async def assign_user_to_department(
    firebase_uid: str,
    department_id: str
):
    """Assign a user to a department"""
    user = await user_service.assign_user_to_department(firebase_uid, department_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
