import {
  Hospital,
  User,
  Department,
  Patient,
  Appointment,
  PatientVital,
  HospitalRegistrationData,
  HospitalRegistrationResponse,
  StaffRegistrationData,
  StaffRegistrationResponse,
  PatientFormData,
  AppointmentFormData,
  DepartmentFormData,
  HospitalStats,
  DashboardData
} from '@/types/hospital';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class HospitalService {
  /**
   * Get authorization headers with JWT token
   */
  private getAuthHeaders() {
    const token = localStorage.getItem('access_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  }

  // Hospital Management
  async createHospital(hospitalData: { name: string; admin_uid: string; address?: string; phone?: string; email?: string }): Promise<Hospital> {
    try {
      const response = await fetch(`${API_BASE_URL}/hospitals/`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(hospitalData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API error in createHospital:', error);
      throw error;
    }
  }

  async getHospital(hospitalId: string): Promise<Hospital> {
    try {
      const response = await fetch(`${API_BASE_URL}/hospitals/${hospitalId}`, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API error in getHospital:', error);
      throw error;
    }
  }

  async getHospitalByAdmin(adminUid: string): Promise<Hospital> {
    try {
      const response = await fetch(`${API_BASE_URL}/hospitals/admin/${adminUid}`, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API error in getHospitalByAdmin:', error);
      throw error;
    }
  }

  async updateHospital(hospitalId: string, updates: Partial<Hospital>): Promise<Hospital> {
    try {
      const response = await fetch(`${API_BASE_URL}/hospitals/${hospitalId}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API error in updateHospital:', error);
      throw error;
    }
  }

  // User Management
  async createUser(userData: {
    firebase_uid: string;
    email: string;
    display_name: string;
    role: string;
    hospital_id: string;
    department_id?: string;
    phone?: string;
  }): Promise<User> {
    try {
      const response = await fetch(`${API_BASE_URL}/users/`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API error in createUser:', error);
      throw error;
    }
  }

  async getUser(firebaseUid: string): Promise<User> {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${firebaseUid}`, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API error in getUser:', error);
      throw error;
    }
  }

  async updateUser(firebaseUid: string, updates: Partial<User>): Promise<User> {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${firebaseUid}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API error in updateUser:', error);
      throw error;
    }
  }

  async deactivateUser(firebaseUid: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${firebaseUid}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('API error in deactivateUser:', error);
      throw error;
    }
  }

  async getHospitalUsers(hospitalId: string): Promise<User[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/hospitals/${hospitalId}/users`, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API error in getHospitalUsers:', error);
      throw error;
    }
  }

  async getHospitalStaff(hospitalId: string): Promise<User[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/users/hospital/${hospitalId}/staff`, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API error in getHospitalStaff:', error);
      throw error;
    }
  }

  async assignUserToDepartment(firebaseUid: string, departmentId: string): Promise<User> {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${firebaseUid}/department/${departmentId}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API error in assignUserToDepartment:', error);
      throw error;
    }
  }

  // Department Management
  async createDepartment(departmentData: { name: string; description?: string; hospital_id: string; head_uid?: string }): Promise<Department> {
    try {
      const response = await fetch(`${API_BASE_URL}/departments/`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(departmentData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API error in createDepartment:', error);
      throw error;
    }
  }

  async getHospitalDepartments(hospitalId: string): Promise<Department[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/departments/hospital/${hospitalId}`, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API error in getHospitalDepartments:', error);
      throw error;
    }
  }

  // Patient Management
  async createPatient(patientData: PatientFormData & { hospital_id: string }): Promise<Patient> {
    try {
      const response = await fetch(`${API_BASE_URL}/patients/`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(patientData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API error in createPatient:', error);
      throw error;
    }
  }

  async getHospitalPatients(hospitalId: string): Promise<Patient[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/patients/hospital/${hospitalId}`, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API error in getHospitalPatients:', error);
      throw error;
    }
  }

  async updatePatient(patientId: string, patientData: Partial<Patient>): Promise<Patient> {
    try {
      const response = await fetch(`${API_BASE_URL}/patients/${patientId}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(patientData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API error in updatePatient:', error);
      throw error;
    }
  }

  async deletePatient(patientId: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/patients/${patientId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('API error in deletePatient:', error);
      throw error;
    }
  }

  async dischargePatient(patientId: string): Promise<{ message: string; patient: Patient }> {
    try {
      const response = await fetch(`${API_BASE_URL}/patients/${patientId}/discharge`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API error in dischargePatient:', error);
      throw error;
    }
  }

  async admitPatient(patientId: string): Promise<{ message: string; patient: Patient }> {
    try {
      const response = await fetch(`${API_BASE_URL}/patients/${patientId}/admit`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API error in admitPatient:', error);
      throw error;
    }
  }

  // Appointment Management
  async createAppointment(appointmentData: AppointmentFormData & { hospital_id: string }): Promise<Appointment> {
    try {
      const response = await fetch(`${API_BASE_URL}/appointments/`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(appointmentData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API error in createAppointment:', error);
      throw error;
    }
  }

  async getHospitalAppointments(hospitalId: string): Promise<Appointment[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/appointments/hospital/${hospitalId}`, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API error in getHospitalAppointments:', error);
      throw error;
    }
  }

  // Dashboard and Analytics
  async getHospitalStats(hospitalId: string): Promise<HospitalStats> {
    // This would be a custom endpoint that aggregates data
    const [users, patients, departments, appointments] = await Promise.all([
      this.getHospitalUsers(hospitalId),
      this.getHospitalPatients(hospitalId),
      this.getHospitalDepartments(hospitalId),
      this.getHospitalAppointments(hospitalId),
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayAppointments = appointments.filter(apt => {
      const aptDate = new Date(apt.appointment_date);
      return aptDate >= today && aptDate < tomorrow;
    });

    return {
      total_users: users.length,
      total_patients: patients.length,
      total_departments: departments.length,
      total_appointments: appointments.length,
      active_patients: patients.filter(p => p.is_active).length,
      today_appointments: todayAppointments.length,
    };
  }

  async getDashboardData(hospitalId: string): Promise<DashboardData> {
    const [hospital, stats, appointments, patients, departments] = await Promise.all([
      this.getHospital(hospitalId),
      this.getHospitalStats(hospitalId),
      this.getHospitalAppointments(hospitalId),
      this.getHospitalPatients(hospitalId),
      this.getHospitalDepartments(hospitalId),
    ]);

    // Get recent appointments (last 10)
    const recentAppointments = appointments
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10);

    // Get active patients
    const activePatients = patients.filter(p => p.is_active);

    return {
      hospital,
      stats,
      recent_appointments: recentAppointments,
      active_patients: activePatients,
      departments,
    };
  }
}

export const hospitalService = new HospitalService();
