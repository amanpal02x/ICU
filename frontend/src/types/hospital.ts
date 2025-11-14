export interface Hospital {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  admin_uid: string;
  created_at: Date;
  updated_at: Date;
}

export interface User {
  id: number;
  firebase_uid: string;
  email: string;
  display_name: string;
  role: 'admin' | 'doctor' | 'nurse' | 'patient';
  hospital_id: string;
  department_id?: string;
  phone?: string;
  address?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Department {
  id: string;
  name: string;
  description?: string;
  hospital_id: string;
  head_uid?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Patient {
  _id?: string; // MongoDB ObjectId
  id: string; // Custom patient ID (IRN-XXXXX)
  hospital_id: string;
  department_id?: string;
  first_name: string;
  last_name: string;
  date_of_birth: Date | string; // Can be Date object or ISO string from backend
  gender?: string;
  phone?: string;
  email?: string;
  address?: string;
  medical_record_number?: string;
  blood_type?: string;
  allergies?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  admission_date?: Date;
  discharge_date?: Date;
  room_number?: string;
  bed_number?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Appointment {
  id: number;
  hospital_id: string;
  patient_id: string;
  user_id: string;
  title: string;
  description?: string;
  appointment_date: Date;
  duration_minutes: number;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
  room?: string;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface PatientVital {
  id: number;
  patient_id: string;
  heart_rate?: number;
  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
  temperature?: number;
  respiratory_rate?: number;
  oxygen_saturation?: number;
  weight?: number;
  height?: number;
  pain_level?: number;
  consciousness_level?: string;
  recorded_at: Date;
  recorded_by: string;
}

// Form interfaces
export interface HospitalRegistrationData {
  hospital_name: string;
  admin_email: string;
  admin_display_name: string;
  admin_phone?: string;
}

export interface StaffRegistrationData {
  email: string;
  display_name: string;
  role: 'doctor' | 'nurse';
  phone?: string;
  department_id?: string;
}

export interface PatientFormData {
  first_name: string;
  last_name: string;
  date_of_birth?: Date;
  gender?: string;
  phone?: string;
  email?: string;
  address?: string;
  medical_record_number?: string;
  blood_type?: string;
  allergies?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  department_id?: string;
  room_number?: string;
  bed_number?: string;
}

export interface AppointmentFormData {
  patient_id: string;
  user_id: string;
  title: string;
  description?: string;
  appointment_date: Date;
  duration_minutes: number;
  room?: string;
  notes?: string;
}

export interface DepartmentFormData {
  name: string;
  description?: string;
  head_uid?: string;
}

// API Response interfaces
export interface HospitalRegistrationResponse {
  hospital_id: string;
  hospital_name: string;
  admin_uid: string;
  message: string;
}

export interface StaffRegistrationResponse {
  user_id: number;
  firebase_uid: string;
  message: string;
}

// Dashboard data interfaces
export interface HospitalStats {
  total_users: number;
  total_patients: number;
  total_departments: number;
  total_appointments: number;
  active_patients: number;
  today_appointments: number;
  total_monitors?: number; // ICU monitors
  active_monitors?: number; // Currently active ICU monitors
}

export interface DashboardData {
  hospital: Hospital;
  stats: HospitalStats;
  recent_appointments: Appointment[];
  active_patients: Patient[];
  departments: Department[];
}
