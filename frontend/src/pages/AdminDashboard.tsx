import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { getAllActiveUsers, deactivateUser, updateUserProfile, UserProfile } from '@/lib/userService';
import { hospitalService } from '@/lib/hospitalService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AlertCircle, Users, UserCheck, UserX, Shield, Stethoscope, BriefcaseMedical, Building, Calendar as CalendarIcon, UserPlus, Plus, Edit, Trash2, Eye, Settings, ActivityIcon, MonitorSpeaker } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import { Hospital, User, Department, Patient, Appointment, HospitalStats, StaffRegistrationData, PatientFormData, AppointmentFormData, DepartmentFormData } from '@/types/hospital';

const AdminDashboard: React.FC = () => {
  const { user, registerStaff } = useAuth();
  const { role } = useRole();

  // State management
  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [stats, setStats] = useState<HospitalStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [activeTab, setActiveTab] = useState('staff');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog states
  const [showStaffDialog, setShowStaffDialog] = useState(false);
  const [showPatientDialog, setShowPatientDialog] = useState(false);
  const [showAppointmentDialog, setShowAppointmentDialog] = useState(false);
  const [showDepartmentDialog, setShowDepartmentDialog] = useState(false);
  const [showHospitalEditDialog, setShowHospitalEditDialog] = useState(false);
  const [showEditUserDialog, setShowEditUserDialog] = useState(false);
  const [showDeleteUserDialog, setShowDeleteUserDialog] = useState(false);
  const [showEditPatientDialog, setShowEditPatientDialog] = useState(false);
  const [showDeletePatientDialog, setShowDeletePatientDialog] = useState(false);
  const [showPatientStatusDialog, setShowPatientStatusDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // Form states
  const [staffForm, setStaffForm] = useState<StaffRegistrationData>({
    email: '',
    display_name: '',
    role: 'doctor',
    phone: '',
    department_id: undefined,
  });

  const [patientForm, setPatientForm] = useState<PatientFormData>({
    first_name: '',
    last_name: '',
    date_of_birth: undefined,
    gender: '',
    phone: '',
    email: '',
    address: '',
    medical_record_number: '',
    blood_type: '',
    allergies: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    department_id: undefined,
    room_number: '',
    bed_number: '',
  });

  const [appointmentForm, setAppointmentForm] = useState<AppointmentFormData>({
    patient_id: '',
    user_id: '',
    title: '',
    description: '',
    appointment_date: new Date(),
    duration_minutes: 30,
    room: '',
    notes: '',
  });

  const [departmentForm, setDepartmentForm] = useState<DepartmentFormData>({
    name: '',
    description: '',
    head_uid: '',
  });

  useEffect(() => {
    if (user) {
      loadHospitalData();
    }
  }, [user]);

  // Load saved tab from localStorage
  useEffect(() => {
    const savedTab = localStorage.getItem('adminDashboardActiveTab');
    if (savedTab) {
      setActiveTab(savedTab);
    }
  }, []);

  // Save active tab to localStorage whenever it changes
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    localStorage.setItem('adminDashboardActiveTab', value);
  };

  const loadHospitalData = async () => {
    try {
      setLoading(true);

      // Get hospital info - for admin users, use firebase_uid to get hospital
      let hospitalData;
      if (user!.role === 'admin') {
        hospitalData = await hospitalService.getHospitalByAdmin(user!.id);
      } else {
        hospitalData = await hospitalService.getHospital(user!.hospital_id);
      }
      setHospital(hospitalData);

      // Load all data in parallel
      const [hospitalStats, hospitalUsers, hospitalDepartments, hospitalPatients, hospitalAppointments] = await Promise.all([
        hospitalService.getHospitalStats(hospitalData.id),
        hospitalService.getHospitalUsers(hospitalData.id),
        hospitalService.getHospitalDepartments(hospitalData.id),
        hospitalService.getHospitalPatients(hospitalData.id),
        hospitalService.getHospitalAppointments(hospitalData.id),
      ]);

      setStats(hospitalStats);
      setUsers(hospitalUsers);
      setDepartments(hospitalDepartments);
      setPatients(hospitalPatients);
      setAppointments(hospitalAppointments);

    } catch (err) {
      console.error('Error loading hospital data:', err);
      setError(`Failed to load hospital data: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Partial refresh functions for specific data sections
  const loadHospitalStats = async () => {
    if (!hospital) return;
    try {
      const hospitalStats = await hospitalService.getHospitalStats(hospital.id);
      setStats(hospitalStats);
    } catch (err) {
      console.error('Error loading hospital stats:', err);
    }
  };

  const loadHospitalUsers = async () => {
    if (!hospital) return;
    try {
      const hospitalUsers = await hospitalService.getHospitalUsers(hospital.id);
      setUsers(hospitalUsers);
    } catch (err) {
      console.error('Error loading hospital users:', err);
    }
  };

  const loadHospitalDepartments = async () => {
    if (!hospital) return;
    try {
      const hospitalDepartments = await hospitalService.getHospitalDepartments(hospital.id);
      setDepartments(hospitalDepartments);
    } catch (err) {
      console.error('Error loading hospital departments:', err);
    }
  };

  const loadHospitalPatients = async () => {
    if (!hospital) return;
    try {
      const hospitalPatients = await hospitalService.getHospitalPatients(hospital.id);
      setPatients(hospitalPatients);
    } catch (err) {
      console.error('Error loading hospital patients:', err);
    }
  };

  const loadHospitalAppointments = async () => {
    if (!hospital) return;
    try {
      const hospitalAppointments = await hospitalService.getHospitalAppointments(hospital.id);
      setAppointments(hospitalAppointments);
    } catch (err) {
      console.error('Error loading hospital appointments:', err);
    }
  };

  const handleRegisterStaff = async () => {
    if (!hospital) return;

    try {
      await registerStaff(staffForm, hospital.id);
      toast('Staff member registered successfully');
      setShowStaffDialog(false);
      setStaffForm({
        email: '',
        display_name: '',
        role: 'doctor',
        phone: '',
        department_id: undefined,
      });
      // Partial refresh: only reload users and stats
      await Promise.all([loadHospitalUsers(), loadHospitalStats()]);
    } catch (err) {
      console.error('Error registering staff:', err);
      toast('Failed to register staff member');
    }
  };

  const validatePatientForm = () => {
    if (!patientForm.first_name.trim()) {
      toast('First name is required');
      return false;
    }
    if (!patientForm.last_name.trim()) {
      toast('Last name is required');
      return false;
    }
    if (!patientForm.date_of_birth) {
      toast('Date of birth is required');
      return false;
    }

    // Check if date of birth is not in the future
    const today = new Date();
    if (patientForm.date_of_birth > today) {
      toast('Date of birth cannot be in the future');
      return false;
    }

    // Basic email validation if provided
    if (patientForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(patientForm.email)) {
      toast('Please enter a valid email address');
      return false;
    }

    return true;
  };

  const handleCreatePatient = async () => {
    if (!hospital) return;

    if (!validatePatientForm()) return;

    try {
      await hospitalService.createPatient({
        ...patientForm,
        hospital_id: hospital.id,
        date_of_birth: patientForm.date_of_birth.toISOString(),
      });
      toast('Patient created successfully');
      setShowPatientDialog(false);
      setPatientForm({
        first_name: '',
        last_name: '',
        date_of_birth: undefined,
        gender: '',
        phone: '',
        email: '',
        address: '',
        medical_record_number: '',
        blood_type: '',
        allergies: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        department_id: undefined,
        room_number: '',
        bed_number: '',
      });
      // Partial refresh: only reload patients and stats
      await Promise.all([loadHospitalPatients(), loadHospitalStats()]);
    } catch (err) {
      console.error('Error creating patient:', err);
      toast('Failed to create patient');
    }
  };

  const handleCreateAppointment = async () => {
    if (!hospital) return;

    try {
      await hospitalService.createAppointment({
        ...appointmentForm,
        hospital_id: hospital.id,
      });
      toast('Appointment created successfully');
      setShowAppointmentDialog(false);
      setAppointmentForm({
        patient_id: '',
        user_id: '',
        title: '',
        description: '',
        appointment_date: new Date(),
        duration_minutes: 30,
        room: '',
        notes: '',
      });
      // Partial refresh: only reload appointments and stats
      await Promise.all([loadHospitalAppointments(), loadHospitalStats()]);
    } catch (err) {
      console.error('Error creating appointment:', err);
      toast('Failed to create appointment');
    }
  };

  const handleCreateDepartment = async () => {
    if (!hospital) return;

    try {
      await hospitalService.createDepartment({
        ...departmentForm,
        hospital_id: hospital.id,
      });
      toast('Department created successfully');
      setShowDepartmentDialog(false);
      setDepartmentForm({
        name: '',
        description: '',
        head_uid: '',
      });
      // Partial refresh: only reload departments and stats
      await Promise.all([loadHospitalDepartments(), loadHospitalStats()]);
    } catch (err) {
      console.error('Error creating department:', err);
      toast('Failed to create department');
    }
  };

  const handleUpdateHospital = async () => {
    if (!hospital) return;

    try {
      await hospitalService.updateHospital(hospital.id, {
        name: hospital.name,
        address: hospital.address,
        phone: hospital.phone,
        email: hospital.email,
      });
      toast('Hospital information updated successfully');
      setShowHospitalEditDialog(false);
      // Hospital info doesn't need refresh since it's already updated in state
      // But we could refresh if needed for consistency
    } catch (err) {
      console.error('Error updating hospital:', err);
      toast('Failed to update hospital information');
    }
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setShowEditUserDialog(true);
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    try {
      await updateUserProfile(selectedUser.firebase_uid, {
        display_name: selectedUser.display_name,
        email: selectedUser.email,
        phone: selectedUser.phone,
        department_id: selectedUser.department_id,
      });
      toast('User updated successfully');
      setShowEditUserDialog(false);
      setSelectedUser(null);
      // Partial refresh: only reload users
      await loadHospitalUsers();
    } catch (err) {
      console.error('Error updating user:', err);
      toast('Failed to update user');
    }
  };

  const handleDeleteUser = (user: User) => {
    setSelectedUser(user);
    setShowDeleteUserDialog(true);
  };

  const handleConfirmDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      await deactivateUser(selectedUser.firebase_uid);
      toast('User deactivated successfully');
      setShowDeleteUserDialog(false);
      setSelectedUser(null);
      // Partial refresh: only reload users and stats
      await Promise.all([loadHospitalUsers(), loadHospitalStats()]);
    } catch (err) {
      console.error('Error deactivating user:', err);
      toast('Failed to deactivate user');
    }
  };

  // Patient action handlers
  const handleViewPatient = (patient: Patient) => {
    console.log('View patient clicked:', patient);
    setSelectedPatient(patient);
    // For now, just show an alert with patient details
    alert(`Patient Details:\nName: ${patient.first_name} ${patient.last_name}\nID: ${patient.id}\nStatus: ${patient.is_active ? 'Active' : 'Discharged'}`);
  };

  const handleEditPatient = (patient: Patient) => {
    console.log('Edit patient clicked:', patient);
    setSelectedPatient(patient);
    setShowEditPatientDialog(true);
  };

  const handleDeletePatient = (patient: Patient) => {
    console.log('Delete patient clicked:', patient);
    setSelectedPatient(patient);
    setShowDeletePatientDialog(true);
  };

  const handlePatientStatusChange = (patient: Patient) => {
    console.log('Status change clicked:', patient);
    setSelectedPatient(patient);
    setShowPatientStatusDialog(true);
  };

  const handleUpdatePatient = async () => {
    if (!selectedPatient) return;

    try {
      // Prepare update data, ensuring date_of_birth is properly formatted
      const updateData: Partial<Patient> = {
        first_name: selectedPatient.first_name,
        last_name: selectedPatient.last_name,
        date_of_birth: selectedPatient.date_of_birth instanceof Date
          ? selectedPatient.date_of_birth.toISOString()
          : selectedPatient.date_of_birth,
        gender: selectedPatient.gender,
        phone: selectedPatient.phone,
        email: selectedPatient.email,
        address: selectedPatient.address,
        medical_record_number: selectedPatient.medical_record_number,
        blood_type: selectedPatient.blood_type,
        allergies: selectedPatient.allergies,
        emergency_contact_name: selectedPatient.emergency_contact_name,
        emergency_contact_phone: selectedPatient.emergency_contact_phone,
        department_id: selectedPatient.department_id,
        room_number: selectedPatient.room_number,
        bed_number: selectedPatient.bed_number,
      };

      await hospitalService.updatePatient(selectedPatient._id || selectedPatient.id, updateData);
      toast('Patient updated successfully');
      setShowEditPatientDialog(false);
      setSelectedPatient(null);
      // Partial refresh: only reload patients
      await loadHospitalPatients();
    } catch (err) {
      console.error('Error updating patient:', err);
      toast('Failed to update patient');
    }
  };

  const handleConfirmDeletePatient = async () => {
    if (!selectedPatient) return;

    try {
      await hospitalService.deletePatient(selectedPatient._id || selectedPatient.id);
      toast('Patient deleted successfully');
      setShowDeletePatientDialog(false);
      setSelectedPatient(null);
      // Partial refresh: only reload patients and stats
      await Promise.all([loadHospitalPatients(), loadHospitalStats()]);
    } catch (err) {
      console.error('Error deleting patient:', err);
      toast('Failed to delete patient');
    }
  };

  const handlePatientStatusUpdate = async () => {
    if (!selectedPatient) return;

    try {
      if (selectedPatient.is_active) {
        await hospitalService.dischargePatient(selectedPatient._id || selectedPatient.id);
        toast('Patient discharged successfully');
      } else {
        await hospitalService.admitPatient(selectedPatient._id || selectedPatient.id);
        toast('Patient admitted successfully');
      }
      setShowPatientStatusDialog(false);
      setSelectedPatient(null);
      // Partial refresh: only reload patients and stats
      await Promise.all([loadHospitalPatients(), loadHospitalStats()]);
    } catch (err) {
      console.error('Error updating patient status:', err);
      toast('Failed to update patient status');
    }
  };

  const getRoleIcon = (userRole: string) => {
    switch (userRole) {
      case 'admin':
        return <Shield className="h-4 w-4" />;
      case 'doctor':
        return <Stethoscope className="h-4 w-4" />;
      case 'nurse':
        return <BriefcaseMedical className="h-4 w-4" />;
      default:
        return <UserCheck className="h-4 w-4" />;
    }
  };

  const getRoleBadgeVariant = (userRole: string) => {
    switch (userRole) {
      case 'admin':
        return 'destructive';
      case 'doctor':
        return 'default';
      case 'nurse':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to access the admin dashboard.</p>
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
    <div className="h-screen flex flex-col bg-background text-foreground">
      <Header showAlarms={false} />

      <div className="flex-1 overflow-auto">
        <div className="container mx-auto p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-gray-600">
               {hospital?.name || 'Loading...'} - ID: {hospital?.id || 'Loading...'}
            </p>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.total_users}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Patients</CardTitle>
                  <UserCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.active_patients}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Departments</CardTitle>
                  <Building className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.total_departments}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Today's Appointments</CardTitle>
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.today_appointments}</div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Main Content Tabs */}
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="staff">Staff</TabsTrigger>
              <TabsTrigger value="patients">Patients</TabsTrigger>
              <TabsTrigger value="appointments">Appointments</TabsTrigger>
              <TabsTrigger value="departments">Departments</TabsTrigger>
              <TabsTrigger value="device-mappings">Monitor Setup</TabsTrigger>
              <TabsTrigger value="overview">Overview</TabsTrigger>
            </TabsList>

            {/* Staff Tab */}
            <TabsContent value="staff" className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Staff Management</h2>
                <Dialog open={showStaffDialog} onOpenChange={setShowStaffDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add Staff
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Register New Staff Member</DialogTitle>
                      <DialogDescription>
                        Add a doctor or nurse to your hospital. They will receive login credentials.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="staff-name" className="text-right">Name</Label>
                        <Input
                          id="staff-name"
                          value={staffForm.display_name}
                          onChange={(e) => setStaffForm({...staffForm, display_name: e.target.value})}
                          className="col-span-3"
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="staff-email" className="text-right">Email</Label>
                        <Input
                          id="staff-email"
                          type="email"
                          value={staffForm.email}
                          onChange={(e) => setStaffForm({...staffForm, email: e.target.value})}
                          className="col-span-3"
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="staff-role" className="text-right">Role</Label>
                        <Select value={staffForm.role} onValueChange={(value: 'doctor' | 'nurse') => setStaffForm({...staffForm, role: value})}>
                          <SelectTrigger className="col-span-3">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="doctor">Doctor</SelectItem>
                            <SelectItem value="nurse">Nurse</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="staff-phone" className="text-right">Phone</Label>
                        <Input
                          id="staff-phone"
                          value={staffForm.phone}
                          onChange={(e) => setStaffForm({...staffForm, phone: e.target.value})}
                          className="col-span-3"
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="staff-dept" className="text-right">Department</Label>
                        <Select value={staffForm.department_id || "none"} onValueChange={(value) => setStaffForm({...staffForm, department_id: value !== "none" ? value : undefined})}>
                          <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none" disabled>
                              Departments temporarily unavailable
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowStaffDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleRegisterStaff}>
                        Register Staff
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-4">Name</th>
                          <th className="text-left p-4">Email</th>
                          <th className="text-left p-4">Role</th>
                          <th className="text-left p-4">Department</th>
                          <th className="text-left p-4">Phone</th>
                          <th className="text-left p-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.filter(user => user.role !== 'admin').map((user) => (
                          <tr key={user.firebase_uid} className="border-b">
                            <td className="p-4">{user.display_name || 'N/A'}</td>
                            <td className="p-4">{user.email || 'N/A'}</td>
                            <td className="p-4">
                              <Badge variant={getRoleBadgeVariant(user.role)} className="flex items-center gap-1 w-fit">
                                {getRoleIcon(user.role)}
                                {user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Unknown'}
                              </Badge>
                            </td>
                            <td className="p-4">
                              {departments.find(d => d.id === user.department_id)?.name || 'Not Assigned'}
                            </td>
                            <td className="p-4">{user.phone || 'N/A'}</td>
                            <td className="p-4">
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditUser(user)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDeleteUser(user)}
                                >
                                  <UserX className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Patients Tab */}
            <TabsContent value="patients" className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Patient Management</h2>
                <Dialog open={showPatientDialog} onOpenChange={setShowPatientDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Patient
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Add New Patient</DialogTitle>
                      <DialogDescription>
                        Register a new patient in the hospital system with complete medical information.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                      {/* Personal Information Section */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold border-b pb-2">Personal Information</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="patient-first-name">First Name *</Label>
                            <Input
                              id="patient-first-name"
                              value={patientForm.first_name}
                              onChange={(e) => setPatientForm({...patientForm, first_name: e.target.value})}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="patient-last-name">Last Name *</Label>
                            <Input
                              id="patient-last-name"
                              value={patientForm.last_name}
                              onChange={(e) => setPatientForm({...patientForm, last_name: e.target.value})}
                              required
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="patient-dob">Date of Birth *</Label>
                            <Input
                              id="patient-dob"
                              type="date"
                              value={patientForm.date_of_birth ? format(patientForm.date_of_birth, 'yyyy-MM-dd') : ''}
                              onChange={(e) => setPatientForm({...patientForm, date_of_birth: e.target.value ? new Date(e.target.value) : undefined})}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="patient-gender">Gender</Label>
                            <Select value={patientForm.gender || ""} onValueChange={(value) => setPatientForm({...patientForm, gender: value})}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select gender" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="male">Male</SelectItem>
                                <SelectItem value="female">Female</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="patient-phone">Phone</Label>
                            <Input
                              id="patient-phone"
                              value={patientForm.phone}
                              onChange={(e) => setPatientForm({...patientForm, phone: e.target.value})}
                            />
                          </div>
                          <div>
                            <Label htmlFor="patient-email">Email</Label>
                            <Input
                              id="patient-email"
                              type="email"
                              value={patientForm.email}
                              onChange={(e) => setPatientForm({...patientForm, email: e.target.value})}
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="patient-address">Address</Label>
                          <Textarea
                            id="patient-address"
                            value={patientForm.address}
                            onChange={(e) => setPatientForm({...patientForm, address: e.target.value})}
                          />
                        </div>
                      </div>

                      {/* Medical Information Section */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold border-b pb-2">Medical Information</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="patient-medical-record">Medical Record Number</Label>
                            <Input
                              id="patient-medical-record"
                              value={patientForm.medical_record_number}
                              onChange={(e) => setPatientForm({...patientForm, medical_record_number: e.target.value})}
                            />
                          </div>
                          <div>
                            <Label htmlFor="patient-blood-type">Blood Type</Label>
                            <Select value={patientForm.blood_type || ""} onValueChange={(value) => setPatientForm({...patientForm, blood_type: value})}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select blood type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="A+">A+</SelectItem>
                                <SelectItem value="A-">A-</SelectItem>
                                <SelectItem value="B+">B+</SelectItem>
                                <SelectItem value="B-">B-</SelectItem>
                                <SelectItem value="AB+">AB+</SelectItem>
                                <SelectItem value="AB-">AB-</SelectItem>
                                <SelectItem value="O+">O+</SelectItem>
                                <SelectItem value="O-">O-</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="patient-allergies">Allergies</Label>
                          <Textarea
                            id="patient-allergies"
                            value={patientForm.allergies}
                            onChange={(e) => setPatientForm({...patientForm, allergies: e.target.value})}
                            placeholder="List any known allergies..."
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="patient-emergency-name">Emergency Contact Name</Label>
                            <Input
                              id="patient-emergency-name"
                              value={patientForm.emergency_contact_name}
                              onChange={(e) => setPatientForm({...patientForm, emergency_contact_name: e.target.value})}
                            />
                          </div>
                          <div>
                            <Label htmlFor="patient-emergency-phone">Emergency Contact Phone</Label>
                            <Input
                              id="patient-emergency-phone"
                              value={patientForm.emergency_contact_phone}
                              onChange={(e) => setPatientForm({...patientForm, emergency_contact_phone: e.target.value})}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Assignment Section */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold border-b pb-2">Assignment</h3>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <Label htmlFor="patient-department">Department</Label>
                            <Select value={patientForm.department_id || "none"} onValueChange={(value) => setPatientForm({...patientForm, department_id: value !== "none" ? value : undefined})}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select department" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none" disabled>
                                  Departments temporarily unavailable
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="patient-room">Room Number</Label>
                            <Input
                              id="patient-room"
                              value={patientForm.room_number}
                              onChange={(e) => setPatientForm({...patientForm, room_number: e.target.value})}
                            />
                          </div>
                          <div>
                            <Label htmlFor="patient-bed">Bed Number</Label>
                            <Input
                              id="patient-bed"
                              value={patientForm.bed_number}
                              onChange={(e) => setPatientForm({...patientForm, bed_number: e.target.value})}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowPatientDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreatePatient} disabled={!patientForm.first_name || !patientForm.last_name}>
                        Create Patient
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-4">Patient ID</th>
                          <th className="text-left p-4">Name</th>
                          <th className="text-left p-4">Date of Birth</th>
                          <th className="text-left p-4">Phone</th>
                          <th className="text-left p-4">Room/Bed</th>
                          <th className="text-left p-4">Status</th>
                          <th className="text-left p-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {patients.map((patient) => (
                          <tr key={patient.id} className="border-b">
                            <td className="p-4 font-mono text-sm">{patient.id || 'N/A'}</td>
                            <td className="p-4">{`${patient.first_name || 'N/A'} ${patient.last_name || 'N/A'}`}</td>
                            <td className="p-4">{patient.date_of_birth ? format(new Date(patient.date_of_birth), 'PP') : 'N/A'}</td>
                            <td className="p-4">{patient.phone || 'N/A'}</td>
                            <td className="p-4">{patient.room_number && patient.bed_number ? `${patient.room_number}/${patient.bed_number}` : 'Not Assigned'}</td>
                            <td className="p-4">
                              <Badge variant={patient.is_active ? 'default' : 'secondary'}>
                                {patient.is_active ? 'Active' : 'Discharged'}
                              </Badge>
                            </td>
                            <td className="p-4">
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewPatient(patient)}
                                  title="View Patient Details"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditPatient(patient)}
                                  title="Edit Patient"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant={patient.is_active ? "secondary" : "default"}
                                  size="sm"
                                  onClick={() => handlePatientStatusChange(patient)}
                                  title={patient.is_active ? "Discharge Patient" : "Admit Patient"}
                                >
                                  {patient.is_active ? "Discharge" : "Admit"}
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDeletePatient(patient)}
                                  title="Delete Patient"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Appointments Tab */}
            <TabsContent value="appointments" className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Appointment Management</h2>
                <Dialog open={showAppointmentDialog} onOpenChange={setShowAppointmentDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      Schedule Appointment
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Schedule New Appointment</DialogTitle>
                      <DialogDescription>
                        Create a new appointment for a patient.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div>
                        <Label htmlFor="appointment-title">Title</Label>
                        <Input
                          id="appointment-title"
                          value={appointmentForm.title}
                          onChange={(e) => setAppointmentForm({...appointmentForm, title: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="appointment-patient">Patient</Label>
                        <Select value={appointmentForm.patient_id || "none"} onValueChange={(value) => setAppointmentForm({...appointmentForm, patient_id: value !== "none" ? value : ''})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select patient" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none" disabled>
                              Patients temporarily unavailable
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="appointment-staff">Staff Member</Label>
                        <Select value={appointmentForm.user_id || "none"} onValueChange={(value) => setAppointmentForm({...appointmentForm, user_id: value !== "none" ? value : ''})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select staff member" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none" disabled>
                              Staff temporarily unavailable
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="appointment-date">Date & Time</Label>
                          <Input
                            id="appointment-date"
                            type="datetime-local"
                            value={appointmentForm.appointment_date ? format(appointmentForm.appointment_date, "yyyy-MM-dd'T'HH:mm") : ''}
                            onChange={(e) => setAppointmentForm({...appointmentForm, appointment_date: new Date(e.target.value)})}
                          />
                        </div>
                        <div>
                          <Label htmlFor="appointment-duration">Duration (minutes)</Label>
                          <Input
                            id="appointment-duration"
                            type="number"
                            value={appointmentForm.duration_minutes}
                            onChange={(e) => setAppointmentForm({...appointmentForm, duration_minutes: parseInt(e.target.value)})}
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="appointment-room">Room</Label>
                        <Input
                          id="appointment-room"
                          value={appointmentForm.room}
                          onChange={(e) => setAppointmentForm({...appointmentForm, room: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="appointment-notes">Notes</Label>
                        <Textarea
                          id="appointment-notes"
                          value={appointmentForm.notes}
                          onChange={(e) => setAppointmentForm({...appointmentForm, notes: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowAppointmentDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateAppointment}>
                        Schedule Appointment
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-4">Title</th>
                          <th className="text-left p-4">Patient</th>
                          <th className="text-left p-4">Staff</th>
                          <th className="text-left p-4">Date & Time</th>
                          <th className="text-left p-4">Status</th>
                          <th className="text-left p-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b">
                          <td className="p-4 text-center text-gray-500" colSpan={6}>
                            Appointments table temporarily disabled
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Departments Tab */}
            <TabsContent value="departments" className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Department Management</h2>
                <Dialog open={showDepartmentDialog} onOpenChange={setShowDepartmentDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <Building className="h-4 w-4 mr-2" />
                      Add Department
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Department</DialogTitle>
                      <DialogDescription>
                        Add a new department to your hospital.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div>
                        <Label htmlFor="department-name">Department Name</Label>
                        <Input
                          id="department-name"
                          value={departmentForm.name}
                          onChange={(e) => setDepartmentForm({...departmentForm, name: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="department-description">Description</Label>
                        <Textarea
                          id="department-description"
                          value={departmentForm.description}
                          onChange={(e) => setDepartmentForm({...departmentForm, description: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="department-head">Department Head</Label>
                        <Select value={departmentForm.head_uid || "none"} onValueChange={(value) => setDepartmentForm({...departmentForm, head_uid: value !== "none" ? value : ''})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select department head" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none" disabled>
                              Department heads temporarily unavailable
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowDepartmentDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateDepartment}>
                        Create Department
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="text-center text-gray-500 py-8">
                <Building className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Departments grid temporarily disabled</p>
              </div>
            </TabsContent>

            {/* Device Mappings Tab */}
            <TabsContent value="device-mappings" className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">ICU Monitor Setup</h2>
                <Button>
                  <ActivityIcon className="h-4 w-4 mr-2" />
                  Add Monitor
                </Button>
              </div>

              <div className="text-center text-gray-500 py-8">
                <ActivityIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Monitor setup interface coming soon</p>
                <p className="text-sm">Configure field mappings for different ICU monitor brands</p>
              </div>
            </TabsContent>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              <h2 className="text-2xl font-bold">Hospital Overview</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      Hospital Information
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowHospitalEditDialog(true)}
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p><strong>Name:</strong> {hospital?.name}</p>
                    <p><strong>Hospital ID:</strong> {hospital?.id}</p>
                    <p><strong>Phone:</strong> {user?.phone || hospital?.phone || 'Not provided'}</p>
                    <p><strong>Email:</strong> {user?.email || hospital?.email || 'Not provided'}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                  </CardHeader>
                <CardContent className="space-y-2">
                    <Button className="w-full" variant="outline" onClick={() => setShowStaffDialog(true)}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Register Staff Member
                    </Button>
                    <Button className="w-full" variant="outline" onClick={() => setShowPatientDialog(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Admit New Patient
                    </Button>
                    <Button className="w-full" variant="outline" onClick={() => setShowAppointmentDialog(true)}>
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      Schedule Appointment
                    </Button>
                    <Button className="w-full" variant="outline" onClick={() => setShowDepartmentDialog(true)}>
                      <Building className="h-4 w-4 mr-2" />
                      Create Department
                    </Button>
                    <Link to="/admin/icu-monitors" className="block">
                      <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                        <MonitorSpeaker className="h-4 w-4 mr-2" />
                        ICU Monitor Management
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center text-gray-500 py-8">
                      <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Recent appointments will appear here</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Edit Hospital Dialog */}
          <Dialog open={showHospitalEditDialog} onOpenChange={setShowHospitalEditDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Hospital Information</DialogTitle>
                <DialogDescription>
                  Update your hospital's contact information and details.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div>
                  <Label htmlFor="hospital-name">Hospital Name</Label>
                  <Input
                    id="hospital-name"
                    value={hospital?.name || ''}
                    onChange={(e) => setHospital(prev => prev ? {...prev, name: e.target.value} : null)}
                  />
                </div>
                <div>
                  <Label htmlFor="hospital-address">Address</Label>
                  <Textarea
                    id="hospital-address"
                    value={hospital?.address || ''}
                    onChange={(e) => setHospital(prev => prev ? {...prev, address: e.target.value} : null)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="hospital-phone">Phone</Label>
                    <Input
                      id="hospital-phone"
                      value={hospital?.phone || ''}
                      onChange={(e) => setHospital(prev => prev ? {...prev, phone: e.target.value} : null)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="hospital-email">Email</Label>
                    <Input
                      id="hospital-email"
                      type="email"
                      value={hospital?.email || ''}
                      onChange={(e) => setHospital(prev => prev ? {...prev, email: e.target.value} : null)}
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowHospitalEditDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateHospital}>
                  Save Changes
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Edit User Dialog */}
          <Dialog open={showEditUserDialog} onOpenChange={setShowEditUserDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit User</DialogTitle>
                <DialogDescription>
                  Update user information and department assignment.
                </DialogDescription>
              </DialogHeader>
              {selectedUser && (
                <div className="grid gap-4 py-4">
                  <div>
                    <Label htmlFor="edit-user-name">Display Name</Label>
                    <Input
                      id="edit-user-name"
                      value={selectedUser.display_name}
                      onChange={(e) => setSelectedUser({...selectedUser, display_name: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-user-email">Email</Label>
                    <Input
                      id="edit-user-email"
                      type="email"
                      value={selectedUser.email}
                      onChange={(e) => setSelectedUser({...selectedUser, email: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-user-phone">Phone</Label>
                    <Input
                      id="edit-user-phone"
                      value={selectedUser.phone || ''}
                      onChange={(e) => setSelectedUser({...selectedUser, phone: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-user-department">Department</Label>
                    <Select
                      value={selectedUser.department_id || "none"}
                      onValueChange={(value) => setSelectedUser({...selectedUser, department_id: value === "none" ? undefined : value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Not Assigned</SelectItem>
                        <SelectItem value="unavailable" disabled>
                          Departments temporarily unavailable
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowEditUserDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateUser}>
                  Save Changes
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Delete User Dialog */}
          <Dialog open={showDeleteUserDialog} onOpenChange={setShowDeleteUserDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Deactivate User</DialogTitle>
                <DialogDescription>
                  Are you sure you want to deactivate this user? This action cannot be undone.
                  The user will lose access to the system but their data will be preserved.
                </DialogDescription>
              </DialogHeader>
              {selectedUser && (
                <div className="py-4">
                  <div className="bg-muted p-4 rounded-lg">
                    <p><strong>Name:</strong> {selectedUser.display_name}</p>
                    <p><strong>Email:</strong> {selectedUser.email}</p>
                    <p><strong>Role:</strong> {selectedUser.role}</p>
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowDeleteUserDialog(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleConfirmDeleteUser}>
                  Deactivate User
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Edit Patient Dialog */}
          <Dialog open={showEditPatientDialog} onOpenChange={setShowEditPatientDialog}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Patient</DialogTitle>
                <DialogDescription>
                  Update patient information and medical details.
                </DialogDescription>
              </DialogHeader>
              {selectedPatient && (
                <div className="space-y-6 py-4">
                  {/* Personal Information Section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Personal Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="edit-patient-first-name">First Name *</Label>
                        <Input
                          id="edit-patient-first-name"
                          value={selectedPatient.first_name}
                          onChange={(e) => setSelectedPatient({...selectedPatient, first_name: e.target.value})}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-patient-last-name">Last Name *</Label>
                        <Input
                          id="edit-patient-last-name"
                          value={selectedPatient.last_name}
                          onChange={(e) => setSelectedPatient({...selectedPatient, last_name: e.target.value})}
                          required
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="edit-patient-dob">Date of Birth *</Label>
                        <Input
                          id="edit-patient-dob"
                          type="date"
                          value={selectedPatient.date_of_birth ? new Date(selectedPatient.date_of_birth).toISOString().split('T')[0] : ''}
                          onChange={(e) => setSelectedPatient({...selectedPatient, date_of_birth: e.target.value ? new Date(e.target.value) : new Date()})}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-patient-gender">Gender</Label>
                        <Select value={selectedPatient.gender || ""} onValueChange={(value) => setSelectedPatient({...selectedPatient, gender: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="edit-patient-phone">Phone</Label>
                        <Input
                          id="edit-patient-phone"
                          value={selectedPatient.phone || ''}
                          onChange={(e) => setSelectedPatient({...selectedPatient, phone: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-patient-email">Email</Label>
                        <Input
                          id="edit-patient-email"
                          type="email"
                          value={selectedPatient.email || ''}
                          onChange={(e) => setSelectedPatient({...selectedPatient, email: e.target.value})}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="edit-patient-address">Address</Label>
                      <Textarea
                        id="edit-patient-address"
                        value={selectedPatient.address || ''}
                        onChange={(e) => setSelectedPatient({...selectedPatient, address: e.target.value})}
                      />
                    </div>
                  </div>

                  {/* Medical Information Section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Medical Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="edit-patient-medical-record">Medical Record Number</Label>
                        <Input
                          id="edit-patient-medical-record"
                          value={selectedPatient.medical_record_number || ''}
                          onChange={(e) => setSelectedPatient({...selectedPatient, medical_record_number: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-patient-blood-type">Blood Type</Label>
                        <Select value={selectedPatient.blood_type || ""} onValueChange={(value) => setSelectedPatient({...selectedPatient, blood_type: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select blood type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="A+">A+</SelectItem>
                            <SelectItem value="A-">A-</SelectItem>
                            <SelectItem value="B+">B+</SelectItem>
                            <SelectItem value="B-">B-</SelectItem>
                            <SelectItem value="AB+">AB+</SelectItem>
                            <SelectItem value="AB-">AB-</SelectItem>
                            <SelectItem value="O+">O+</SelectItem>
                            <SelectItem value="O-">O-</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="edit-patient-allergies">Allergies</Label>
                      <Textarea
                        id="edit-patient-allergies"
                        value={selectedPatient.allergies || ''}
                        onChange={(e) => setSelectedPatient({...selectedPatient, allergies: e.target.value})}
                        placeholder="List any known allergies..."
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="edit-patient-emergency-name">Emergency Contact Name</Label>
                        <Input
                          id="edit-patient-emergency-name"
                          value={selectedPatient.emergency_contact_name || ''}
                          onChange={(e) => setSelectedPatient({...selectedPatient, emergency_contact_name: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-patient-emergency-phone">Emergency Contact Phone</Label>
                        <Input
                          id="edit-patient-emergency-phone"
                          value={selectedPatient.emergency_contact_phone || ''}
                          onChange={(e) => setSelectedPatient({...selectedPatient, emergency_contact_phone: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Assignment Section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Assignment</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="edit-patient-department">Department</Label>
                        <Select value={selectedPatient.department_id || "none"} onValueChange={(value) => setSelectedPatient({...selectedPatient, department_id: value !== "none" ? value : undefined})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none" disabled>
                              Departments temporarily unavailable
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="edit-patient-room">Room Number</Label>
                        <Input
                          id="edit-patient-room"
                          value={selectedPatient.room_number || ''}
                          onChange={(e) => setSelectedPatient({...selectedPatient, room_number: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-patient-bed">Bed Number</Label>
                        <Input
                          id="edit-patient-bed"
                          value={selectedPatient.bed_number || ''}
                          onChange={(e) => setSelectedPatient({...selectedPatient, bed_number: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowEditPatientDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdatePatient}>
                  Save Changes
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Delete Patient Dialog */}
          <Dialog open={showDeletePatientDialog} onOpenChange={setShowDeletePatientDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Patient</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete this patient? This action cannot be undone.
                  All patient data will be permanently removed from the system.
                </DialogDescription>
              </DialogHeader>
              {selectedPatient && (
                <div className="py-4">
                  <div className="bg-muted p-4 rounded-lg">
                    <p><strong>Name:</strong> {selectedPatient.first_name} {selectedPatient.last_name}</p>
                    <p><strong>ID:</strong> {selectedPatient.id}</p>
                    <p><strong>Status:</strong> {selectedPatient.is_active ? 'Active' : 'Discharged'}</p>
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowDeletePatientDialog(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleConfirmDeletePatient}>
                  Delete Patient
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Patient Status Change Dialog */}
          <Dialog open={showPatientStatusDialog} onOpenChange={setShowPatientStatusDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{selectedPatient?.is_active ? 'Discharge Patient' : 'Admit Patient'}</DialogTitle>
                <DialogDescription>
                  {selectedPatient?.is_active
                    ? 'Are you sure you want to discharge this patient? They will be marked as inactive.'
                    : 'Are you sure you want to admit this patient? They will be marked as active.'
                  }
                </DialogDescription>
              </DialogHeader>
              {selectedPatient && (
                <div className="py-4">
                  <div className="bg-muted p-4 rounded-lg">
                    <p><strong>Name:</strong> {selectedPatient.first_name} {selectedPatient.last_name}</p>
                    <p><strong>ID:</strong> {selectedPatient.id}</p>
                    <p><strong>Current Status:</strong> {selectedPatient.is_active ? 'Active' : 'Discharged'}</p>
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowPatientStatusDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handlePatientStatusUpdate}>
                  {selectedPatient?.is_active ? 'Discharge Patient' : 'Admit Patient'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
