// Admin service for ICU monitor management
const API_BASE = '/admin';

export interface QuickAdmitData {
  first_name: string;
  last_name: string;
  urgency: 'emergency' | 'high' | 'medium' | 'low';
  department: string;
}

export interface AutoAssignData {
  patient_id: string;
  preferred_room?: string;
  required_parameters?: string[];
  priority?: 'high' | 'medium' | 'low';
}

export interface AlarmLimits {
  hr_min?: number;
  hr_max?: number;
  spo2_min?: number;
  sbp_min?: number;
  sbp_max?: number;
  dbp_min?: number;
  dbp_max?: number;
}

export interface ManualAssignData {
  patient_id: string;
  device_id: string;
  custom_alarm_limits?: AlarmLimits;
  notes?: string;
}

export interface ReassignData {
  old_device_id: string;
  new_patient_id: string;
  reason?: string;
  notes?: string;
}

export interface MonitorInventory {
  total_monitors: number;
  active_assigned: number;
  free_available: number;
  maintenance: number;
  critical: number;
}

export interface MonitorDevice {
  device_id: string;
  status: 'assigned' | 'available' | 'maintenance' | 'offline';
  patient_name?: string;
  location: string;
  type: string;
}

export interface MonitorAssignment {
  device_id: string;
  patient_id: string;
  patient_name: string;
  room?: string;
  assigned_at?: string;
}

export interface AdminOverview {
  inventory_summary: MonitorInventory;
  recent_assignments: MonitorAssignment[];
  system_status: 'operational' | 'warning' | 'error';
}

class AdminService {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${API_BASE}${endpoint}`;

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Monitor inventory management
  async getMonitorInventory(): Promise<MonitorInventory> {
    return this.request<MonitorInventory>('/monitor-inventory');
  }

  async getMonitorStatus(deviceId: string): Promise<MonitorDevice> {
    return this.request<MonitorDevice>(`/monitor-status/${deviceId}`);
  }

  async getMonitorOverview(): Promise<AdminOverview> {
    return this.request<AdminOverview>('/monitor-overview');
  }

  // Patient management
  async quickAdmitPatient(data: QuickAdmitData): Promise<{
    status: string;
    patient_id: string;
    message: string;
    next_step: string;
  }> {
    return this.request('/patients/quick-admit', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Monitor assignment
  async autoAssignMonitor(data: AutoAssignData): Promise<{
    status: string;
    patient_id: string;
    assigned_monitor: string;
    room: string;
    bed: string;
    message: string;
  }> {
    return this.request('/assign-monitor-auto', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async manualAssignMonitor(data: ManualAssignData): Promise<{
    status: string;
    patient_id: string;
    assigned_monitor: string;
    message: string;
  }> {
    return this.request('/assign-monitor-specific', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getUnassignedMonitors(): Promise<{
    status: string;
    available_monitors: MonitorDevice[];
    count: number;
  }> {
    return this.request('/unassigned-monitors');
  }

  // Monitor reassignment
  async reassignMonitor(data: ReassignData): Promise<{
    status: string;
    old_patient_id: string;
    new_patient_id: string;
    device_id: string;
    message: string;
  }> {
    return this.request('/reassign-monitor', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

// Export singleton instance
export const adminService = new AdminService();
export default adminService;
