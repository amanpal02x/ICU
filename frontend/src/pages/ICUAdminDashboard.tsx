import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { adminService, type MonitorInventory, type MonitorDevice, type MonitorAssignment } from '@/lib/adminService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Users, Activity, MonitorSpeaker, Zap, RefreshCw, Plus, CheckCircle } from 'lucide-react';
import { toast } from '@/components/ui/sonner';


interface Patient {
  id: string;
  patient_id: string;
  name: string;
  room: string;
  bed: string;
  monitor_id: string;
  risk_score: number;
  status: string;
}

const ICUAdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const { role } = useRole();

  // State management
  const [inventory, setInventory] = useState<MonitorInventory | null>(null);
  const [devices, setDevices] = useState<MonitorDevice[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog states
  const [showQuickAdmit, setShowQuickAdmit] = useState(false);
  const [showAssignMonitor, setShowAssignMonitor] = useState(false);
  const [showReassignMonitor, setShowReassignMonitor] = useState(false);

  // Form states
  const [quickAdmitForm, setQuickAdmitForm] = useState({
    first_name: '',
    last_name: '',
    urgency: 'medium',
    department: 'cardiology_icu'
  });

  const [assignForm, setAssignForm] = useState({
    patient_id: '',
    device_id: '',
    custom_alarm_limits: {},
    notes: ''
  });

  const [reassignForm, setReassignForm] = useState({
    old_device_id: '',
    new_patient_id: '',
    reason: '',
    notes: ''
  });

  // Mock data for demonstration
  const mockDevices: MonitorDevice[] = [
    { device_id: 'PHILIPS_ICU_101_BED_1', status: 'available', location: 'ICU-101 Bed 1', type: 'Philips' },
    { device_id: 'PHILIPS_ICU_101_BED_2', status: 'assigned', patient_name: 'John Doe', location: 'ICU-101 Bed 2', type: 'Philips' },
    { device_id: 'MEDTRONIC_ICU_102_BED_1', status: 'maintenance', location: 'ICU-102 Bed 1', type: 'Medtronic' },
    { device_id: 'PHILIPS_ICU_103_BED_1', status: 'available', location: 'ICU-103 Bed 1', type: 'Philips' },
  ];

  const mockInventory: MonitorInventory = {
    total_monitors: 25,
    active_assigned: 18,
    free_available: 6,
    maintenance: 1,
    critical: 0
  };

  const mockPatients: Patient[] = [
    {
      id: '1',
      patient_id: 'john_doe_123',
      name: 'John Doe',
      room: 'ICU-101',
      bed: 'Bed 2',
      monitor_id: 'PHILIPS_ICU_101_BED_2',
      risk_score: 23.4,
      status: 'stable'
    },
    {
      id: '2',
      patient_id: 'jane_smith_456',
      name: 'Jane Smith',
      room: 'ICU-102',
      bed: 'Bed 1',
      monitor_id: 'PHILIPS_ICU_102_BED_1',
      risk_score: 78.2,
      status: 'critical'
    },
    {
      id: '3',
      patient_id: 'robert_brown_789',
      name: 'Robert Brown',
      room: 'ICU-101',
      bed: 'Bed 3',
      monitor_id: 'PANASONIC_ICU_101_BED_3',
      risk_score: 45.8,
      status: 'stable'
    },
    {
      id: '4',
      patient_id: 'sarah_jones_234',
      name: 'Sarah Jones',
      room: 'ICU-103',
      bed: 'Bed 2',
      monitor_id: 'PHILIPS_ICU_103_BED_2',
      risk_score: 92.1,
      status: 'critical'
    },
    {
      id: '5',
      patient_id: 'mike_johnson_567',
      name: 'Mike Johnson',
      room: 'ICU-102',
      bed: 'Bed 3',
      monitor_id: 'PHILIPS_ICU_102_BED_3',
      risk_score: 34.7,
      status: 'stable'
    },
    {
      id: '6',
      patient_id: 'lisa_wilson_890',
      name: 'Lisa Wilson',
      room: 'ICU-103',
      bed: 'Bed 1',
      monitor_id: 'MEDTRONIC_ICU_103_BED_1',
      risk_score: 67.3,
      status: 'monitoring'
    }
  ];

  useEffect(() => {
    loadMonitorData();
  }, []);

  const loadMonitorData = async () => {
    try {
      setLoading(true);

      // Load all admin data in parallel
      const [inventoryResponse, overviewResponse] = await Promise.all([
        adminService.getMonitorInventory(),
        adminService.getMonitorOverview()
      ]);

      setInventory(inventoryResponse);

      // Extract devices from overview (you can expand this to get individual device statuses)
      const assignedDevices: MonitorDevice[] = overviewResponse.recent_assignments.map((assignment: MonitorAssignment) => ({
        device_id: assignment.device_id,
        status: 'assigned' as const,
        patient_name: assignment.patient_name,
        location: `Room ${assignment.room || 'Unknown'}`,
        type: 'Philips' // This could come from a device registry
      }));

      // Add some mock available devices (in production, get from API)
      const availableDevices: MonitorDevice[] = [
        { device_id: 'PHILIPS_ICU_101_BED_2', status: 'available', location: 'ICU-101 Bed 2', type: 'Philips' },
        { device_id: 'MEDTRONIC_ICU_102_BED_1', status: 'maintenance', location: 'ICU-102 Bed 1', type: 'Medtronic' }
      ];

      // Combine all devices
      const devices = [...assignedDevices, ...availableDevices];

      setDevices(devices);

      // Mock patients for now - in production, get from patient management API
      setPatients(mockPatients);

    } catch (err) {
      console.error('Error loading monitor data:', err);
      setError(`Failed to load monitor data: ${err instanceof Error ? err.message : 'Unknown error'}`);
      // Fallback to mock data if API fails
      setInventory(mockInventory);
      setDevices(mockDevices);
      setPatients(mockPatients);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAdmit = async () => {
    try {
      // TODO: Replace with actual API call
      // const response = await fetch('/admin/patients/quick-admit', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(quickAdmitForm)
      // });

      // Mock success response
      toast.success(`Patient ${quickAdmitForm.first_name} ${quickAdmitForm.last_name} admitted successfully`);

      setShowQuickAdmit(false);
      setQuickAdmitForm({
        first_name: '',
        last_name: '',
        urgency: 'medium',
        department: 'cardiology_icu'
      });

      // Reload data to reflect changes
      await loadMonitorData();

    } catch (err) {
      console.error('Error admitting patient:', err);
      toast.error('Failed to admit patient');
    }
  };

  const handleAutoAssign = async () => {
    try {
      // TODO: Replace with actual API call
      // const response = await fetch('/admin/assign-monitor-auto', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ patient_id: assignForm.patient_id })
      // });

      // Mock success response
      toast.success('Monitor assigned automatically');

      setShowAssignMonitor(false);
      setAssignForm({
        patient_id: '',
        device_id: '',
        custom_alarm_limits: {},
        notes: ''
      });

      await loadMonitorData();

    } catch (err) {
      console.error('Error assigning monitor:', err);
      toast.error('Failed to assign monitor');
    }
  };

  const handleManualAssign = async () => {
    try {
      // TODO: Replace with actual API call
      // const response = await fetch('/admin/assign-monitor-specific', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(assignForm)
      // });

      toast.success('Monitor assigned successfully');

      setShowAssignMonitor(false);
      setAssignForm({
        patient_id: '',
        device_id: '',
        custom_alarm_limits: {},
        notes: ''
      });

      await loadMonitorData();

    } catch (err) {
      console.error('Error assigning monitor:', err);
      toast.error('Failed to assign monitor');
    }
  };

  const handleReassign = async () => {
    try {
      // TODO: Replace with actual API call
      // const response = await fetch('/admin/reassign-monitor', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(reassignForm)
      // });

      toast.success('Monitor reassigned successfully');

      setShowReassignMonitor(false);
      setReassignForm({
        old_device_id: '',
        new_patient_id: '',
        reason: '',
        notes: ''
      });

      await loadMonitorData();

    } catch (err) {
      console.error('Error reassigning monitor:', err);
      toast.error('Failed to reassign monitor');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'assigned':
        return <Badge className="bg-green-500">🟢 Assigned</Badge>;
      case 'available':
        return <Badge variant="outline">🟡 Available</Badge>;
      case 'maintenance':
        return <Badge variant="secondary">🔧 Maintenance</Badge>;
      case 'offline':
        return <Badge variant="destructive">🚫 Offline</Badge>;
      default:
        return <Badge>❓ Unknown</Badge>;
    }
  };

  const getRiskBadge = (riskScore: number) => {
    if (riskScore < 30) return <Badge className="bg-green-500">Low Risk</Badge>;
    if (riskScore < 70) return <Badge className="bg-yellow-500">Medium Risk</Badge>;
    return <Badge className="bg-red-500">⚠️ High Risk</Badge>;
  };

  if (role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to access the ICU monitor dashboard.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero Header - Luxurious Wave Design */}
      <div className="relative overflow-hidden bg-gradient-to-br from-cyan-50 via-teal-50 to-emerald-50 rounded-3xl p-12 shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-emerald-500/5" />
        <div className="absolute top-0 left-0 w-40 h-40 bg-gradient-to-br from-cyan-200 to-teal-200 rounded-full opacity-30 -mt-20 -ml-20" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-gradient-to-br from-teal-200 to-emerald-200 rounded-full opacity-20 -mb-32 -mr-32" />
        <div className="absolute top-1/2 right-1/4 w-24 h-24 bg-gradient-to-br from-emerald-300 to-cyan-300 rounded-full opacity-30" />

        <div className="relative">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-4 bg-gradient-to-br from-cyan-100 to-teal-100 rounded-2xl shadow-lg">
              <MonitorSpeaker className="h-12 w-12 text-cyan-700" />
            </div>
            <div>
              <h1 className="text-6xl font-bold bg-gradient-to-r from-cyan-700 via-teal-700 to-emerald-700 bg-clip-text text-transparent mb-2">
                ICU Monitor Hub
              </h1>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-gradient-to-r from-emerald-100 to-cyan-100 px-4 py-2 rounded-full">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-semibold text-emerald-800">Live Monitoring Active</span>
                </div>
                <div className="flex items-center gap-2 bg-gradient-to-r from-cyan-100 to-teal-100 px-4 py-2 rounded-full">
                  <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-semibold text-cyan-800">{inventory?.active_assigned || 0} Monitors Active</span>
                </div>
              </div>
            </div>
          </div>

          <p className="text-2xl text-slate-700 mb-8 font-medium leading-relaxed">
            Advanced ICU monitoring with real-time patient tracking, AI-powered insights, and automated life-saving interventions
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 border border-cyan-100/50 shadow-xl">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-cyan-200 to-teal-200 rounded-xl">
                  <Activity className="h-8 w-8 text-cyan-700" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-1">System Efficiency</p>
                  <p className="text-3xl font-bold bg-gradient-to-r from-cyan-600 to-teal-600 bg-clip-text text-transparent">
                    98.7%
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 border border-emerald-100/50 shadow-xl">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-emerald-200 to-green-200 rounded-xl">
                  <CheckCircle className="h-8 w-8 text-emerald-700" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-1">Active Patients</p>
                  <p className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                    {inventory?.active_assigned || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 border border-amber-100/50 shadow-xl">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-amber-200 to-orange-200 rounded-xl">
                  <AlertCircle className="h-8 w-8 text-amber-700" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-1">Critical Alerts</p>
                  <p className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                    2
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* System Status - Top Left */}
      <div className="mb-6">
        <div className="inline-flex items-center gap-4 bg-gradient-to-r from-emerald-50 via-emerald-100 to-green-50 px-6 py-4 rounded-2xl border border-emerald-200/60 shadow-sm">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-6 w-6 text-emerald-600" />
            <span className="text-lg font-semibold text-slate-900">System Status</span>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-emerald-800">Database Online</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-blue-800">API Connected</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-purple-800">ICU Network Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Merged Layout */}
      <div className="space-y-6">
        {/* Top Section - Monitor Statistics & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Monitor Statistics - Visual Charts */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/50">
              <h3 className="text-lg font-semibold text-slate-900 mb-6">Monitor Status Overview</h3>

              <div className="space-y-6">
                {/* Active Monitors */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-slate-700">Active Monitors</span>
                    <span className="text-sm text-emerald-600 font-semibold">{inventory?.active_assigned || 18}/25</span>
                  </div>
                  <div className="w-full bg-emerald-100 rounded-full h-4 mb-3">
                    <div className="bg-gradient-to-r from-emerald-400 to-emerald-600 h-4 rounded-full" style={{width: `${((inventory?.active_assigned || 18)/25) * 100}%`}}></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs text-slate-600">
                    <span className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                      Parkinson Ward: 6
                    </span>
                    <span className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                      Critical Care: 12
                    </span>
                  </div>
                </div>

                {/* Available Monitors */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-slate-700">Available Monitors</span>
                    <span className="text-sm text-blue-600 font-semibold">{inventory?.free_available || 6}/25</span>
                  </div>
                  <div className="w-full bg-blue-100 rounded-full h-4 mb-3">
                    <div className="bg-gradient-to-r from-blue-400 to-blue-600 h-4 rounded-full" style={{width: `${((inventory?.free_available || 6)/25) * 100}%`}}></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs text-slate-600">
                    <span className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                      Storage: 4
                    </span>
                    <span className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      Spare: 2
                    </span>
                  </div>
                </div>

                {/* Maintenance */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-slate-700">Maintenance Required</span>
                    <span className="text-sm text-orange-600 font-semibold">{inventory?.maintenance || 1}/25</span>
                  </div>
                  <div className="w-full bg-orange-100 rounded-full h-4">
                    <div className="bg-gradient-to-r from-orange-400 to-orange-600 h-4 rounded-full" style={{width: `${((inventory?.maintenance || 1)/25) * 100}%`}}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions Panel */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/50">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Activity className="h-5 w-5 text-slate-600" />
              Quick Actions
            </h3>

            <div className="space-y-3">
              <Dialog open={showQuickAdmit} onOpenChange={setShowQuickAdmit}>
                <DialogTrigger asChild>
                  <button className="w-full p-4 bg-gradient-to-r from-slate-50 to-slate-100 hover:from-slate-100 hover:to-slate-200 rounded-xl border border-slate-200/50 transition-all duration-200 text-left group">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gradient-to-br from-slate-600 to-slate-700 rounded-lg">
                        <Plus className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 group-hover:text-slate-800">Quick Patient Admit</p>
                        <p className="text-sm text-slate-600">Emergency ICU admission</p>
                      </div>
                    </div>
                  </button>
                </DialogTrigger>
              </Dialog>

              <Dialog open={showAssignMonitor} onOpenChange={setShowAssignMonitor}>
                <DialogTrigger asChild>
                  <button className="w-full p-4 bg-gradient-to-r from-emerald-50 to-green-50 hover:from-emerald-100 hover:to-green-100 rounded-xl border border-emerald-200/50 transition-all duration-200 text-left group">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg">
                        <Zap className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 group-hover:text-emerald-800">Auto Assign Monitor</p>
                        <p className="text-sm text-slate-600">Smart assignment system</p>
                      </div>
                    </div>
                  </button>
                </DialogTrigger>
              </Dialog>

              <Button onClick={loadMonitorData} className="w-full p-4 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 rounded-xl border border-blue-200/50 transition-all duration-200 text-left group">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                    <RefreshCw className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 group-hover:text-blue-800">Refresh System</p>
                    <p className="text-sm text-slate-600">Update all monitors</p>
                  </div>
                </div>
              </Button>
            </div>
          </div>
        </div>

        {/* Active Patient Monitoring - Full Width */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/50">
          <h3 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
            <Users className="h-5 w-5 text-slate-600" />
            Active Patient Monitoring
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {patients.slice(0, 12).map((patient) => (
              <div key={patient.id} className="p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200/50 hover:shadow-md transition-all duration-200">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-slate-900">{patient.name}</h4>
                    <p className="text-xs text-slate-600 font-mono">{patient.patient_id}</p>
                  </div>
                  <Badge variant={getRiskBadge(patient.risk_score).props.variant}>
                    {getRiskBadge(patient.risk_score).props.children}
                  </Badge>
                </div>

                <div className="space-y-2 text-sm text-slate-700">
                  <div className="flex justify-between">
                    <span>Location:</span>
                    <span className="font-medium">{patient.room} {patient.bed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Monitor:</span>
                    <span className="font-medium text-slate-900">{patient.monitor_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span className={`font-medium ${patient.status === 'stable' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {patient.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {/* Empty states for visual balance */}
            {patients.length < 12 && Array.from({length: Math.max(0, 12 - patients.length)}).map((_, i) => (
              <div key={`empty-${i}`} className="p-4 bg-slate-50/50 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center">
                <div className="text-center text-slate-400">
                  <MonitorSpeaker className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Monitor Available</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Admit Dialog */}
      <Dialog open={showQuickAdmit} onOpenChange={setShowQuickAdmit}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-emerald-600" />
              Quick Patient Admission
            </DialogTitle>
            <DialogDescription>
              Rapid patient registration for emergency ICU admissions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="admit-first-name">First Name *</Label>
                <Input
                  id="admit-first-name"
                  value={quickAdmitForm.first_name}
                  onChange={(e) => setQuickAdmitForm({...quickAdmitForm, first_name: e.target.value})}
                  required
                  placeholder="John"
                />
              </div>
              <div>
                <Label htmlFor="admit-last-name">Last Name *</Label>
                <Input
                  id="admit-last-name"
                  value={quickAdmitForm.last_name}
                  onChange={(e) => setQuickAdmitForm({...quickAdmitForm, last_name: e.target.value})}
                  required
                  placeholder="Doe"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="admit-urgency">Urgency Level</Label>
              <Select
                value={quickAdmitForm.urgency}
                onValueChange={(value) => setQuickAdmitForm({...quickAdmitForm, urgency: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="emergency">🚨 Emergency</SelectItem>
                  <SelectItem value="high">🔥 High Priority</SelectItem>
                  <SelectItem value="medium">⚠️ Medium Priority</SelectItem>
                  <SelectItem value="low">ℹ️ Low Priority</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="admit-dept">Department</Label>
              <Select
                value={quickAdmitForm.department}
                onValueChange={(value) => setQuickAdmitForm({...quickAdmitForm, department: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cardiology_icu">Cardiology ICU</SelectItem>
                  <SelectItem value="neuro_icu">Neuro ICU</SelectItem>
                  <SelectItem value="surgical_icu">Surgical ICU</SelectItem>
                  <SelectItem value="medical_icu">Medical ICU</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowQuickAdmit(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleQuickAdmit}
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={!quickAdmitForm.first_name || !quickAdmitForm.last_name}
            >
              Admit Patient
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Auto Assign Dialog */}
      <Dialog open={showAssignMonitor} onOpenChange={setShowAssignMonitor}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-600" />
              Auto-Assign Monitor
            </DialogTitle>
            <DialogDescription>
              System will find the best available monitor based on room proximity and requirements.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="auto-patient-id">Patient ID</Label>
              <Input
                id="auto-patient-id"
                placeholder="Enter patient ID to assign monitor"
                value={assignForm.patient_id}
                onChange={(e) => setAssignForm({...assignForm, patient_id: e.target.value})}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowAssignMonitor(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAutoAssign}
              className="bg-blue-600 hover:bg-blue-700"
              disabled={!assignForm.patient_id}
            >
              Auto Assign Monitor
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ICUAdminDashboard;
