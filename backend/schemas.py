from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

# Hospital Schemas
class HospitalBase(BaseModel):
    name: str
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None

class HospitalCreate(HospitalBase):
    admin_uid: str

class Hospital(HospitalBase):
    id: str
    admin_uid: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    display_name: str
    role: str
    phone: Optional[str] = None

class UserCreate(UserBase):
    firebase_uid: str
    hospital_id: str
    department_id: Optional[int] = None

class User(UserBase):
    id: int
    firebase_uid: str
    hospital_id: str
    department_id: Optional[int] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Department Schemas
class DepartmentBase(BaseModel):
    name: str
    description: Optional[str] = None
    head_uid: Optional[str] = None

class DepartmentCreate(DepartmentBase):
    hospital_id: str

class Department(DepartmentBase):
    id: int
    hospital_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Patient Schemas
class PatientBase(BaseModel):
    first_name: str
    last_name: str
    date_of_birth: datetime
    gender: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    medical_record_number: Optional[str] = None
    blood_type: Optional[str] = None
    allergies: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    admission_date: Optional[datetime] = None
    discharge_date: Optional[datetime] = None
    room_number: Optional[str] = None
    bed_number: Optional[str] = None

class PatientCreate(PatientBase):
    hospital_id: str
    department_id: Optional[int] = None

class Patient(PatientBase):
    id: int
    hospital_id: str
    department_id: Optional[int] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Appointment Schemas
class AppointmentBase(BaseModel):
    patient_id: int
    user_id: str
    title: str
    description: Optional[str] = None
    appointment_date: datetime
    duration_minutes: Optional[int] = 30
    status: Optional[str] = "scheduled"
    room: Optional[str] = None
    notes: Optional[str] = None

class AppointmentCreate(AppointmentBase):
    hospital_id: str

class Appointment(AppointmentBase):
    id: int
    hospital_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Patient Vital Schemas
class PatientVitalBase(BaseModel):
    heart_rate: Optional[float] = None
    blood_pressure_systolic: Optional[float] = None
    blood_pressure_diastolic: Optional[float] = None
    temperature: Optional[float] = None
    respiratory_rate: Optional[float] = None
    oxygen_saturation: Optional[float] = None
    weight: Optional[float] = None
    height: Optional[float] = None
    pain_level: Optional[int] = None
    consciousness_level: Optional[str] = None

class PatientVitalCreate(PatientVitalBase):
    patient_id: int
    recorded_by: str

class PatientVital(PatientVitalBase):
    id: int
    patient_id: int
    recorded_at: datetime
    recorded_by: str

    class Config:
        from_attributes = True

# Authentication Schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    firebase_uid: Optional[str] = None

# Hospital Registration Schemas
class HospitalRegistration(BaseModel):
    hospital_name: str
    admin_email: EmailStr
    admin_display_name: str
    admin_phone: Optional[str] = None

class HospitalRegistrationResponse(BaseModel):
    hospital_id: str
    hospital_name: str
    admin_uid: str
    message: str

# Staff Registration Schemas
class StaffRegistration(BaseModel):
    email: EmailStr
    display_name: str
    role: str
    phone: Optional[str] = None
    department_id: Optional[int] = None

class StaffRegistrationResponse(BaseModel):
    user_id: int
    firebase_uid: str
    message: str
