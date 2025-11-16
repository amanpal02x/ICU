from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from typing import Dict, Any
from datetime import timedelta

from models import UserCreate, UserLogin, Token, User, HospitalCreate
import user_service
import hospital_service
from auth_utils import create_access_token, get_password_hash, verify_password
from models import TokenData

router = APIRouter(prefix="/auth", tags=["authentication"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

async def authenticate_user(email: str, password: str):
    """Authenticate a user by email and password"""
    try:
        user = await user_service.get_user_by_email(email)
        if not user:
            return False
        if not verify_password(password, user.get("hashed_password", "")):
            return False
        return user
    except Exception as e:
        print(f"Authentication error for {email}: {e}")
        import traceback
        traceback.print_exc()
        return False

async def get_current_user(token: str = Depends(oauth2_scheme)):
    """Get current authenticated user"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        from auth_utils import verify_token
        payload = verify_token(token, credentials_exception)
        email: str = payload.email
        if email is None:
            raise credentials_exception
    except Exception:
        raise credentials_exception

    user = await user_service.get_user_by_email(email)
    if user is None:
        raise credentials_exception
    return user

async def get_current_active_user(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get current active user"""
    if not current_user.get("is_active"):
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

@router.post("/register", response_model=Dict[str, Any])
async def register_user(user: UserCreate):
    """Register a new user"""
    # Check if user already exists
    existing_user = await user_service.get_user_by_email(user.email)
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create the user
    created_user = await user_service.create_user(user)

    return {
        "message": "User registered successfully",
        "user": {
            "id": str(created_user["_id"]),
            "email": created_user["email"],
            "display_name": created_user["display_name"],
            "role": created_user["role"],
            "hospital_id": created_user["hospital_id"]
        }
    }

@router.post("/register-hospital", response_model=Dict[str, Any])
async def register_hospital_admin(admin_data: Dict[str, Any]):
    """Register a hospital admin and create hospital"""
    try:
        # Create admin user
        admin_user = UserCreate(
            email=admin_data["admin_email"],
            password=admin_data.get("admin_password") or "Pass123",
            display_name=admin_data["admin_display_name"],
            role="admin",
            hospital_id="",  # Will be set after hospital creation
            phone=admin_data.get("admin_phone")
        )

        # Create the admin user first
        created_admin = await user_service.create_user(admin_user)

        # Create hospital
        hospital_create = HospitalCreate(
            name=admin_data["hospital_name"],
            admin_uid=created_admin["firebase_uid"],
            address=admin_data.get("hospital_address"),
            phone=admin_data.get("admin_phone"),
            email=admin_data.get("admin_email")
        )
        hospital_data = await hospital_service.create_hospital(hospital_create)

        # Update admin user with hospital ID
        await user_service.update_user(created_admin["firebase_uid"], {"hospital_id": hospital_data["id"]})

        return {
            "hospital_id": hospital_data["id"],
            "hospital_name": hospital_data["name"],
            "admin_uid": created_admin["firebase_uid"],
            "message": "Hospital registered successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/register-staff", response_model=Dict[str, Any])
async def register_staff_member(staff_data: Dict[str, Any]):
    """Register a staff member"""
    try:
        # Create staff user
        staff_user = UserCreate(
            email=staff_data["email"],
            password=staff_data.get("password") or "Pass123",
            display_name=staff_data["display_name"],
            role=staff_data["role"],
            hospital_id=staff_data["hospital_id"],
            department_id=staff_data.get("department_id"),
            phone=staff_data.get("phone")
        )

        # Create the staff user
        created_staff = await user_service.create_user(staff_user)

        return {
            "user_id": str(created_staff["_id"]),
            "firebase_uid": created_staff["firebase_uid"],
            "message": f"{staff_data['role'].capitalize()} registered successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/login", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    """Login and get access token"""
    user = await authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=30)
    access_token = create_access_token(
        data={"sub": user["email"]}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=Dict[str, Any])
async def read_users_me(current_user: Dict[str, Any] = Depends(get_current_active_user)):
    """Get current user information"""
    return {
        "id": current_user["firebase_uid"],  # Use firebase_uid as the main identifier for compatibility
        "email": current_user["email"],
        "display_name": current_user["display_name"],
        "role": current_user["role"],
        "hospital_id": current_user["hospital_id"],
        "department_id": current_user.get("department_id"),
        "phone": current_user.get("phone"),
        "is_active": current_user["is_active"]
    }
