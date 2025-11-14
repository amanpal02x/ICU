from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any

# Import with absolute imports
from models import DepartmentCreate
import department_service

router = APIRouter(prefix="/departments", tags=["departments"])

@router.post("/", response_model=Dict[str, Any])
async def create_department(department: DepartmentCreate):
    """Create a new department"""
    return await department_service.create_department(department)

@router.get("/{department_id}", response_model=Dict[str, Any])
async def get_department(department_id: str):
    """Get department by MongoDB document ID"""
    department = await department_service.get_department_by_id(department_id)
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")
    return department

@router.get("/hospital/{hospital_id}", response_model=List[Dict[str, Any]])
async def get_departments_by_hospital(hospital_id: str):
    """Get all departments for a hospital"""
    return await department_service.get_departments_by_hospital(hospital_id)

@router.put("/{department_id}", response_model=Dict[str, Any])
async def update_department(
    department_id: str,
    department_update: Dict[str, Any]
):
    """Update department information"""
    department = await department_service.update_department(department_id, department_update)
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")
    return department

@router.put("/{department_id}/head/{head_uid}", response_model=Dict[str, Any])
async def assign_department_head(
    department_id: str,
    head_uid: str
):
    """Assign a department head"""
    department = await department_service.assign_department_head(department_id, head_uid)
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")
    return department

@router.get("/{department_id}/users", response_model=List[Dict[str, Any]])
async def get_department_users(department_id: str):
    """Get all users assigned to a department"""
    return await department_service.get_department_users(department_id)

@router.get("/{department_id}/patients", response_model=List[Dict[str, Any]])
async def get_department_patients(department_id: str):
    """Get all patients assigned to a department"""
    return await department_service.get_department_patients(department_id)
