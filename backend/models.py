from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from bson import ObjectId

# Custom ObjectId field for MongoDB
class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

    @classmethod
    def __get_pydantic_json_schema__(cls, core_schema, handler):
        return {"type": "string"}

# Base models with common fields
class MongoBaseModel(BaseModel):
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

# User model
class User(MongoBaseModel):
    firebase_uid: str  # Keeping this for backward compatibility during transition
    email: str
    display_name: str
    role: str  # admin, doctor, nurse, patient
    hospital_id: str
    department_id: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    is_active: bool = True
    hashed_password: Optional[str] = None  # For JWT auth

# Hospital model
class Hospital(MongoBaseModel):
    id: str = Field(...)  # Custom ID like HOSP001
    name: str
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    admin_uid: str

# Department model
class Department(MongoBaseModel):
    name: str
    description: Optional[str] = None
    hospital_id: str
    head_uid: Optional[str] = None

# Patient model
class Patient(MongoBaseModel):
    hospital_id: str
    department_id: Optional[str] = None

    # Personal Information
    first_name: str
    last_name: str
    date_of_birth: datetime
    gender: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None

    # Medical Information
    medical_record_number: Optional[str] = None
    blood_type: Optional[str] = None
    allergies: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None

    # Status
    is_active: bool = True
    admission_date: Optional[datetime] = None
    discharge_date: Optional[datetime] = None
    room_number: Optional[str] = None
    bed_number: Optional[str] = None

# Appointment model
class Appointment(MongoBaseModel):
    hospital_id: str
    patient_id: str
    user_id: str  # doctor/nurse uid

    title: str
    description: Optional[str] = None
    appointment_date: datetime
    duration_minutes: int = 30
    status: str = "scheduled"  # scheduled, completed, cancelled, no-show

    room: Optional[str] = None
    notes: Optional[str] = None

# Patient Vital model
class PatientVital(MongoBaseModel):
    patient_id: str

    # Vital Signs
    heart_rate: Optional[float] = None
    blood_pressure_systolic: Optional[float] = None
    blood_pressure_diastolic: Optional[float] = None
    temperature: Optional[float] = None
    respiratory_rate: Optional[float] = None
    oxygen_saturation: Optional[float] = None
    weight: Optional[float] = None
    height: Optional[float] = None

    # Additional metrics
    pain_level: Optional[int] = None  # 0-10 scale
    consciousness_level: Optional[str] = None  # alert, drowsy, unconscious, etc.

    recorded_at: datetime = Field(default_factory=datetime.utcnow)
    recorded_by: str

# Authentication models
class UserCreate(BaseModel):
    email: str
    password: str
    display_name: str
    role: str
    hospital_id: str
    department_id: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# Hospital models
class HospitalCreate(BaseModel):
    name: str
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    admin_uid: str

class HospitalUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None

# Department models
class DepartmentCreate(BaseModel):
    name: str
    description: Optional[str] = None
    hospital_id: str
    head_uid: Optional[str] = None

class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    head_uid: Optional[str] = None

# Patient models
class PatientCreate(BaseModel):
    hospital_id: str
    department_id: Optional[str] = None
    first_name: str
    last_name: str
    date_of_birth: datetime
    gender: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    medical_record_number: Optional[str] = None
    blood_type: Optional[str] = None
    allergies: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    room_number: Optional[str] = None
    bed_number: Optional[str] = None

class PatientUpdate(BaseModel):
    department_id: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    date_of_birth: Optional[datetime] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    medical_record_number: Optional[str] = None
    blood_type: Optional[str] = None
    allergies: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    is_active: Optional[bool] = None
    admission_date: Optional[datetime] = None
    discharge_date: Optional[datetime] = None
    room_number: Optional[str] = None
    bed_number: Optional[str] = None

# Appointment models
class AppointmentCreate(BaseModel):
    hospital_id: str
    patient_id: str
    user_id: str
    title: str
    description: Optional[str] = None
    appointment_date: datetime
    duration_minutes: Optional[int] = 30
    room: Optional[str] = None
    notes: Optional[str] = None

class AppointmentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    appointment_date: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    status: Optional[str] = None
    room: Optional[str] = None
    notes: Optional[str] = None

# Patient Vital models
class PatientVitalCreate(BaseModel):
    patient_id: str
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
    recorded_by: str

class PatientVitalUpdate(BaseModel):
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
