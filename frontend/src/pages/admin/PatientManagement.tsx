import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { UserCheck, UserPlus, Edit, Trash2, Search, Filter, Eye, MapPin, Phone, Mail, CalendarIcon, Activity, Bed, Building, Clock, TrendingUp } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { useAuth } from '@/hooks/useAuth';
import { hospitalService } from '@/lib/hospitalService';
import { Patient, Hospital, Department, PatientFormData } from '@/types/hospital';
import { format } from 'date-fns';

const PatientManagement: React.FC = () => {
  const { user } = useAuth();

  // State management
  const [patients, setPatients] = useState<Patient[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Form states
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

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Get hospital and data in parallel
      const [hospitalData, hospitalPatients, hospitalDepartments] = await Promise.all([
        hospitalService.getHospital(user!.hospital_id),
        hospitalService.getHospitalPatients(user!.hospital_id),
        hospitalService.getHospitalDepartments(user!.hospital_id)
      ]);

      setHospital(hospitalData);
      setPatients(hospitalPatients);
      setDepartments(hospitalDepartments);
    } catch (error) {
      console.error('Error loading patient data:', error);
      toast('Failed to load patient data');
    } finally {
      setLoading(false);
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
    if (patientForm.date_of_birth && patientForm.date_of_birth > today) {
      toast('Date of birth cannot be in the future');
      return false;
    }

    return true;
  };

  const handleCreatePatient = async () => {
    if (!hospital) {
      toast('Hospital information not loaded. Please refresh the page.');
      return;
    }

    if (!validatePatientForm()) return;

    try {
      await hospitalService.createPatient({
        ...patientForm,
        hospital_id: hospital.id,
        date_of_birth: patientForm.date_of_birth!.toISOString(),
      });

      toast('Patient admitted successfully');
      setShowCreateDialog(false);
      resetPatientForm();
      await loadData();
    } catch (error) {
      console.error('Error creating patient:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to admit patient';
      toast(`Error: ${errorMessage}`);
    }
  };

  const handleUpdatePatient = async () => {
    if (!selectedPatient) return;

    try {
      const updateData: Partial<Patient> = {
        first_name: selectedPatient.first_name,
        last_name: selectedPatient.last_name,
        date_of_birth: typeof selectedPatient.date_of_birth === 'string'
          ? selectedPatient.date_of_birth
          : selectedPatient.date_of_birth.toISOString(),
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
      toast('Patient information updated');
      setShowEditDialog(false);
      setSelectedPatient(null);
      await loadData();
    } catch (error) {
      console.error('Error updating patient:', error);
      toast('Failed to update patient information');
    }
  };

  const handlePatientStatusChange = async (patient: Patient) => {
    try {
      if (patient.is_active) {
        await hospitalService.dischargePatient(patient._id || patient.id);
        toast('Patient discharged');
      } else {
        await hospitalService.admitPatient(patient._id || patient.id);
        toast('Patient re-admitted');
      }
      await loadData();
    } catch (error) {
      console.error('Error changing patient status:', error);
      toast('Failed to change patient status');
    }
  };

  const handleDeletePatient = async (patient: Patient) => {
    try {
      await hospitalService.deletePatient(patient._id || patient.id);
      toast('Patient record deleted');
      await loadData();
    } catch (error) {
      console.error('Error deleting patient:', error);
      toast('Failed to delete patient record');
    }
  };

  const handleViewPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setShowViewDialog(true);
  };

  const handleEditPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setShowEditDialog(true);
  };

  const resetPatientForm = () => {
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
  };

  // Filter and search logic
  const filteredPatients = patients.filter(patient => {
    const matchesSearch = searchQuery === '' ||
      `${patient.first_name} ${patient.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.email?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = filterStatus === 'all' ||
      (filterStatus === 'active' && patient.is_active) ||
      (filterStatus === 'discharged' && !patient.is_active);

    return matchesSearch && matchesStatus;
  });

  const stats = {
    totalPatients: patients.length,
    activePatients: patients.filter(p => p.is_active).length,
    dischargedPatients: patients.filter(p => !p.is_active).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 rounded-3xl p-10 shadow-xl">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5" />
        <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-emerald-200 to-teal-200 rounded-full opacity-30 -mt-16 -ml-16" />

        <div className="relative">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl shadow-lg">
                <UserCheck className="h-10 w-10 text-white" />
              </div>
              <div>
                <h1 className="text-5xl font-bold bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-700 bg-clip-text text-transparent mb-2">
                  Patient Management
                </h1>
                <p className="text-xl text-slate-600 font-medium">Monitor patient admissions, records, and care status</p>
              </div>
            </div>

            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 px-6 py-3">
                  <UserPlus className="h-5 w-5 mr-2" />
                  Admit New Patient
                </Button>
              </DialogTrigger>
            </Dialog>
          </div>

          <div className="flex flex-wrap gap-6">
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 border border-emerald-100/50 shadow-xl">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-emerald-200 to-green-200 rounded-xl">
                  <Clock className="h-8 w-8 text-emerald-700" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-1">Current Time</p>
                  <p className="font-bold text-slate-900 text-lg">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 border border-teal-100/50 shadow-xl">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-teal-200 to-blue-200 rounded-xl">
                  <TrendingUp className="h-8 w-8 text-teal-700" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-1">Recovery Rate</p>
                  <p className="font-bold text-teal-900 text-lg">87.3%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Plain Merged Layout */}
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200/50">
        <h2 className="text-2xl font-semibold text-slate-900 mb-6 flex items-center gap-3">
          <Activity className="h-6 w-6 text-slate-600" />
          Patient Overview & Directory
        </h2>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="text-center p-6 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200/50">
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg">
                <UserCheck className="h-5 w-5 text-white" />
              </div>
              <span className="text-sm font-medium text-slate-700">Total Patients</span>
            </div>
            <div className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-2">{stats.totalPatients}</div>
            <p className="text-xs text-slate-600">Registered patients</p>
          </div>

          <div className="text-center p-6 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200/50">
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="p-2 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg">
                <Activity className="h-5 w-5 text-white" />
              </div>
              <span className="text-sm font-medium text-slate-700">Active Patients</span>
            </div>
            <div className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent mb-2">{stats.activePatients}</div>
            <p className="text-xs text-slate-600">Currently admitted</p>
          </div>

          <div className="text-center p-6 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200/50">
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="p-2 bg-gradient-to-br from-slate-500 to-gray-600 rounded-lg">
                <CalendarIcon className="h-5 w-5 text-white" />
              </div>
              <span className="text-sm font-medium text-slate-700">Discharged</span>
            </div>
            <div className="text-3xl font-bold bg-gradient-to-r from-slate-600 to-gray-600 bg-clip-text text-transparent mb-2">{stats.dischargedPatients}</div>
            <p className="text-xs text-slate-600">Successfully treated</p>
          </div>
        </div>

        {/* Patient Charts & Filters */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Occupancy Rate Chart */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-6 border border-emerald-200/50">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Bed Occupancy Rate</h3>

            <div className="space-y-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-slate-700">Current Occupancy</span>
                <span className="text-sm text-emerald-600 font-semibold">{stats.totalPatients > 0 ? Math.round((stats.activePatients / Math.max(stats.totalPatients, 100)) * 100) : 0}%</span>
              </div>
              <div className="w-full bg-emerald-100 rounded-full h-3 mb-4">
                <div className="bg-gradient-to-r from-emerald-400 to-emerald-600 h-3 rounded-full" style={{width: `${stats.totalPatients > 0 ? Math.round((stats.activePatients / Math.max(stats.totalPatients, 100)) * 100) : 0}%`}}></div>
              </div>

              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-slate-700">ICU Capacity</span>
                <span className="text-sm text-teal-600 font-semibold">78%</span>
              </div>
              <div className="w-full bg-teal-100 rounded-full h-3 mb-4">
                <div className="bg-gradient-to-r from-teal-400 to-teal-600 h-3 rounded-full" style={{width: '78%'}}></div>
              </div>

              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-slate-700">General Ward</span>
                <span className="text-sm text-cyan-600 font-semibold">65%</span>
              </div>
              <div className="w-full bg-cyan-100 rounded-full h-3">
                <div className="bg-gradient-to-r from-cyan-400 to-cyan-600 h-3 rounded-full" style={{width: '65%'}}></div>
              </div>
            </div>
          </div>

          {/* Department Breakdown */}
          <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-xl p-6 border border-slate-200/50">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Department Breakdown</h3>

            <div className="space-y-4">
              {departments.slice(0, 6).map((dept) => {
                const deptCount = patients.filter(p =>
                  p.department_id === dept.id &&
                  p.is_active
                ).length;
                const percentage = stats.activePatients > 0 ? Math.round((deptCount / stats.activePatients) * 100) : 0;

                return (
                  <div key={dept.id}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-slate-700">{dept.name}</span>
                      <span className="text-sm text-slate-600">{deptCount} active</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div className="bg-gradient-to-r from-slate-400 to-slate-600 h-2 rounded-full" style={{width: `${percentage}%`}}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Search & Filter Panel */}
          <div className="bg-white rounded-xl p-6 border border-slate-200/50">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Search & Filter</h3>

            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search patients by name, ID, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Patients</SelectItem>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="discharged">Discharged Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Patient Directory Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredPatients.map((patient) => (
            <div key={patient.id} className={`p-6 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200/50 hover:shadow-md transition-all duration-200 ${patient.is_active ? 'border-emerald-200' : 'border-slate-300'}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-full flex items-center justify-center">
                    <UserCheck className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{patient.first_name} {patient.last_name}</h3>
                    <p className="text-sm font-mono text-slate-500">{patient.id}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleViewPatient(patient)}
                    className="h-8 w-8 p-0 hover:bg-emerald-50"
                  >
                    <Eye className="h-4 w-4 text-emerald-600" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditPatient(patient)}
                    className="h-8 w-8 p-0 hover:bg-blue-50"
                  >
                    <Edit className="h-4 w-4 text-blue-600" />
                  </Button>
                  <Button
                    variant={patient.is_active ? "secondary" : "default"}
                    size="sm"
                    onClick={() => handlePatientStatusChange(patient)}
                    className="h-8 text-xs px-2"
                    title={patient.is_active ? "Discharge" : "Re-admit"}
                  >
                    {patient.is_active ? "Discharge" : "Admit"}
                  </Button>
                  {patient.is_active && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Patient Record</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to permanently delete {patient.first_name} {patient.last_name}'s record? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeletePatient(patient)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-slate-500">Date of Birth:</span>
                  <span className="text-slate-900 font-medium">
                    {patient.date_of_birth ? format(new Date(patient.date_of_birth), 'PP') : 'N/A'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-slate-500">Gender:</span>
                  <span className="text-slate-900 font-medium capitalize">{patient.gender || 'Not specified'}</span>
                </div>

                {patient.phone && (
                  <div className="flex items-center text-sm text-slate-600">
                    <Phone className="h-4 w-4 mr-2" />
                    {patient.phone}
                  </div>
                )}

                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Department:</span>
                  <span className="text-slate-900 font-medium">
                    {departments.find(d => d.id === patient.department_id)?.name || 'No Department'}
                  </span>
                </div>

                <div className="pt-4 border-t border-slate-200">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-slate-500">Status</span>
                    <Badge variant={patient.is_active ? 'default' : 'secondary'}>
                      {patient.is_active ? 'Active' : 'Discharged'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Room/Bed:</span>
                    <span className="text-slate-900">
                      {patient.room_number && patient.bed_number ? `${patient.room_number}-${patient.bed_number}` : 'Not assigned'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500 mt-2">
                    <span>Admitted: {patient.admission_date ? format(new Date(patient.admission_date), 'PP') : 'N/A'}</span>
                    {patient.discharge_date && (
                      <span>Discharged: {format(new Date(patient.discharge_date), 'PP')}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {filteredPatients.length === 0 && (
            <div className="col-span-full text-center py-12">
              <UserCheck className="h-16 w-16 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No patients found</h3>
              <p className="text-slate-500">
                {searchQuery || filterStatus !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Get started by admitting your first patient'
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create Patient Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Admit New Patient</DialogTitle>
            <DialogDescription>
              Complete patient information for hospital admission and care management.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Personal Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first-name">First Name *</Label>
                  <Input
                    id="first-name"
                    value={patientForm.first_name}
                    onChange={(e) => setPatientForm({...patientForm, first_name: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="last-name">Last Name *</Label>
                  <Input
                    id="last-name"
                    value={patientForm.last_name}
                    onChange={(e) => setPatientForm({...patientForm, last_name: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dob">Date of Birth *</Label>
                  <Input
                    id="dob"
                    type="date"
                    value={patientForm.date_of_birth ? patientForm.date_of_birth.toISOString().split('T')[0] : ''}
                    onChange={(e) => setPatientForm({...patientForm, date_of_birth: e.target.value ? new Date(e.target.value) : undefined})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="gender">Gender</Label>
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
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Contact Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={patientForm.phone}
                    onChange={(e) => setPatientForm({...patientForm, phone: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={patientForm.email}
                    onChange={(e) => setPatientForm({...patientForm, email: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={patientForm.address}
                  onChange={(e) => setPatientForm({...patientForm, address: e.target.value})}
                />
              </div>
            </div>

            {/* Medical Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Medical Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="mrn">Medical Record Number</Label>
                  <Input
                    id="mrn"
                    value={patientForm.medical_record_number}
                    onChange={(e) => setPatientForm({...patientForm, medical_record_number: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="blood-type">Blood Type</Label>
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
                <Label htmlFor="allergies">Allergies</Label>
                <Input
                  id="allergies"
                  value={patientForm.allergies}
                  onChange={(e) => setPatientForm({...patientForm, allergies: e.target.value})}
                  placeholder="List any known allergies"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="emergency-name">Emergency Contact Name</Label>
                  <Input
                    id="emergency-name"
                    value={patientForm.emergency_contact_name}
                    onChange={(e) => setPatientForm({...patientForm, emergency_contact_name: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="emergency-phone">Emergency Contact Phone</Label>
                  <Input
                    id="emergency-phone"
                    value={patientForm.emergency_contact_phone}
                    onChange={(e) => setPatientForm({...patientForm, emergency_contact_phone: e.target.value})}
                  />
                </div>
              </div>
            </div>

            {/* Assignment */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Hospital Assignment</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="department">Department</Label>
                  <Select value={patientForm.department_id || "none"} onValueChange={(value) => setPatientForm({...patientForm, department_id: value === "none" ? undefined : value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Department</SelectItem>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="room">Room Number</Label>
                  <Input
                    id="room"
                    value={patientForm.room_number}
                    onChange={(e) => setPatientForm({...patientForm, room_number: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="bed">Bed Number</Label>
                  <Input
                    id="bed"
                    value={patientForm.bed_number}
                    onChange={(e) => setPatientForm({...patientForm, bed_number: e.target.value})}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePatient} className="bg-green-600 hover:bg-green-700">
              Admit Patient
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Patient Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Patient Information</DialogTitle>
            <DialogDescription>
              Update patient details and medical information.
            </DialogDescription>
          </DialogHeader>

          {selectedPatient && (
            <div className="space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-first-name">First Name</Label>
                  <Input
                    id="edit-first-name"
                    value={selectedPatient.first_name}
                    onChange={(e) => setSelectedPatient({...selectedPatient, first_name: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-last-name">Last Name</Label>
                  <Input
                    id="edit-last-name"
                    value={selectedPatient.last_name}
                    onChange={(e) => setSelectedPatient({...selectedPatient, last_name: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-dob">Date of Birth</Label>
                  <Input
                    id="edit-dob"
                    type="date"
                    value={selectedPatient.date_of_birth ? new Date(selectedPatient.date_of_birth).toISOString().split('T')[0] : ''}
                    onChange={(e) => setSelectedPatient({...selectedPatient, date_of_birth: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-gender">Gender</Label>
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
                  <Label htmlFor="edit-phone">Phone</Label>
                  <Input
                    id="edit-phone"
                    value={selectedPatient.phone || ''}
                    onChange={(e) => setSelectedPatient({...selectedPatient, phone: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-mrn">Medical Record #</Label>
                  <Input
                    id="edit-mrn"
                    value={selectedPatient.medical_record_number || ''}
                    onChange={(e) => setSelectedPatient({...selectedPatient, medical_record_number: e.target.value})}
                  />
                </div>
              </div>

              {/* Assignment */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="edit-department">Department</Label>
                  <Select value={selectedPatient.department_id || "none"} onValueChange={(value) => setSelectedPatient({...selectedPatient, department_id: value === "none" ? undefined : value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Department</SelectItem>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-room">Room</Label>
                  <Input
                    id="edit-room"
                    value={selectedPatient.room_number || ''}
                    onChange={(e) => setSelectedPatient({...selectedPatient, room_number: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-bed">Bed</Label>
                  <Input
                    id="edit-bed"
                    value={selectedPatient.bed_number || ''}
                    onChange={(e) => setSelectedPatient({...selectedPatient, bed_number: e.target.value})}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdatePatient} className="bg-green-600 hover:bg-green-700">
              Update Patient
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Patient Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Patient Details</DialogTitle>
            <DialogDescription>
              Complete patient information and medical history.
            </DialogDescription>
          </DialogHeader>

          {selectedPatient && (
            <div className="space-y-6">
              {/* Personal Info */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-gray-500">Full Name</Label>
                    <p className="font-medium">{selectedPatient.first_name} {selectedPatient.last_name}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">Patient ID</Label>
                    <p className="font-medium font-mono">{selectedPatient.id}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">Date of Birth</Label>
                    <p className="font-medium">
                      {selectedPatient.date_of_birth ? format(new Date(selectedPatient.date_of_birth), 'PP') : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">Gender</Label>
                    <p className="font-medium capitalize">{selectedPatient.gender || 'Not specified'}</p>
                  </div>
                </div>
                {selectedPatient.phone && (
                  <div className="mt-4">
                    <Label className="text-sm text-gray-500">Phone</Label>
                    <p className="font-medium">{selectedPatient.phone}</p>
                  </div>
                )}
                {selectedPatient.email && (
                  <div className="mt-2">
                    <Label className="text-sm text-gray-500">Email</Label>
                    <p className="font-medium">{selectedPatient.email}</p>
                  </div>
                )}
                {selectedPatient.address && (
                  <div className="mt-2">
                    <Label className="text-sm text-gray-500">Address</Label>
                    <p className="font-medium">{selectedPatient.address}</p>
                  </div>
                )}
              </div>

              {/* Medical Info */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Medical Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-gray-500">Medical Record Number</Label>
                    <p className="font-medium">{selectedPatient.medical_record_number || 'Not available'}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">Blood Type</Label>
                    <p className="font-medium">{selectedPatient.blood_type || 'Not specified'}</p>
                  </div>
                </div>
                {selectedPatient.allergies && (
                  <div className="mt-4">
                    <Label className="text-sm text-gray-500">Allergies</Label>
                    <p className="font-medium">{selectedPatient.allergies}</p>
                  </div>
                )}
                {selectedPatient.emergency_contact_name && (
                  <div className="mt-2">
                    <Label className="text-sm text-gray-500">Emergency Contact</Label>
                    <p className="font-medium">
                      {selectedPatient.emergency_contact_name}
                      {selectedPatient.emergency_contact_phone && ` (${selectedPatient.emergency_contact_phone})`}
                    </p>
                  </div>
                )}
              </div>

              {/* Hospital Assignment */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Hospital Assignment</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm text-gray-500">Department</Label>
                    <p className="font-medium">
                      {departments.find(d => d.id === selectedPatient.department_id)?.name || 'Not assigned'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">Room</Label>
                    <p className="font-medium">{selectedPatient.room_number || 'Not assigned'}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">Bed</Label>
                    <p className="font-medium">{selectedPatient.bed_number || 'Not assigned'}</p>
                  </div>
                </div>
              </div>

              {/* Status & Dates */}
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm text-gray-500">Status</Label>
                    <div className="mt-1">
                      <Badge variant={selectedPatient.is_active ? 'default' : 'secondary'}>
                        {selectedPatient.is_active ? 'Active' : 'Discharged'}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <Label className="text-sm text-gray-500">Admission Date</Label>
                    <p className="font-medium text-sm">
                      {selectedPatient.admission_date ? format(new Date(selectedPatient.admission_date), 'PP') : 'N/A'}
                    </p>
                    {selectedPatient.discharge_date && (
                      <>
                        <Label className="text-sm text-gray-500 block mt-2">Discharge Date</Label>
                        <p className="font-medium text-sm">
                          {format(new Date(selectedPatient.discharge_date), 'PP')}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PatientManagement;
