import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Users, UserPlus, Shield, Stethoscope, BriefcaseMedical, Edit, Trash2, Search, Filter, Activity, Building, Mail, Phone, Clock, TrendingUp } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { useAuth } from '@/hooks/useAuth';
import { getAllActiveUsers, deactivateUser, updateUserProfile } from '@/lib/userService';
import { hospitalService } from '@/lib/hospitalService';
import { User, StaffRegistrationData, Hospital, Department } from '@/types/hospital';

const StaffManagement: React.FC = () => {
  const { user, registerStaff } = useAuth();

  // State management
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');

  // Form states
  const [staffForm, setStaffForm] = useState<StaffRegistrationData>({
    email: '',
    display_name: '',
    role: 'doctor',
    phone: '',
    department_id: undefined,
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
      const [hospitalData, hospitalUsers, hospitalDepartments] = await Promise.all([
        hospitalService.getHospital(user!.hospital_id),
        hospitalService.getHospitalUsers(user!.hospital_id),
        hospitalService.getHospitalDepartments(user!.hospital_id)
      ]);

      setHospital(hospitalData);
      setUsers(hospitalUsers);
      setDepartments(hospitalDepartments);
    } catch (error) {
      console.error('Error loading staff data:', error);
      toast('Failed to load staff data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStaff = async () => {
    if (!hospital) return;

    try {
      await registerStaff(staffForm, hospital.id);
      toast('Staff member registered successfully');

      setShowCreateDialog(false);
      setStaffForm({
        email: '',
        display_name: '',
        role: 'doctor',
        phone: '',
        department_id: undefined,
      });

      await loadData(); // Refresh data
    } catch (error) {
      console.error('Error creating staff:', error);
      toast('Failed to register staff member');
    }
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setShowEditDialog(true);
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

      toast('Staff member updated successfully');
      setShowEditDialog(false);
      setSelectedUser(null);
      await loadData(); // Refresh data
    } catch (error) {
      console.error('Error updating staff:', error);
      toast('Failed to update staff member');
    }
  };

  const handleDeleteUser = async (user: User) => {
    try {
      await deactivateUser(user.firebase_uid);
      toast('Staff member deactivated successfully');
      await loadData(); // Refresh data
    } catch (error) {
      console.error('Error deactivating staff:', error);
      toast('Failed to deactivate staff member');
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="h-5 w-5" />;
      case 'doctor':
        return <Stethoscope className="h-5 w-5" />;
      case 'nurse':
        return <BriefcaseMedical className="h-5 w-5" />;
      default:
        return <Users className="h-5 w-5" />;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
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

  // Filter and search logic
  const filteredUsers = users
    .filter(user => user.role !== 'admin') // Exclude admin users
    .filter(user => {
      const matchesSearch = searchQuery === '' ||
        user.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRole = filterRole === 'all' || user.role === filterRole;

      return matchesSearch && matchesRole;
    });

  const stats = {
    totalStaff: users.filter(u => u.role !== 'admin').length,
    doctors: users.filter(u => u.role === 'doctor').length,
    nurses: users.filter(u => u.role === 'nurse').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-3xl p-10 shadow-xl">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5" />
        <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-indigo-200 to-purple-200 rounded-full opacity-30 -mt-16 -ml-16" />

        <div className="relative">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl shadow-lg">
                <Users className="h-10 w-10 text-white" />
              </div>
              <div>
                <h1 className="text-5xl font-bold bg-gradient-to-r from-indigo-700 via-purple-700 to-pink-700 bg-clip-text text-transparent mb-2">
                  Staff Management
                </h1>
                <p className="text-xl text-slate-600 font-medium">Manage doctors, nurses, and medical personnel</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-6">
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 border border-indigo-100/50 shadow-xl">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-indigo-200 to-purple-200 rounded-xl">
                  <Clock className="h-8 w-8 text-indigo-700" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-1">Current Time</p>
                  <p className="font-bold text-slate-900 text-lg">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 border border-emerald-100/50 shadow-xl">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-emerald-200 to-green-200 rounded-xl">
                  <TrendingUp className="h-8 w-8 text-emerald-700" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-1">System Efficiency</p>
                  <p className="font-bold text-emerald-900 text-lg">94.2%</p>
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
          Staff Overview & Directory
        </h2>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="text-center p-6 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200/50">
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="p-2 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg">
                <Users className="h-5 w-5 text-white" />
              </div>
              <span className="text-sm font-medium text-slate-700">Total Staff</span>
            </div>
            <div className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent mb-2">{stats.totalStaff}</div>
            <p className="text-xs text-slate-600">Medical personnel</p>
          </div>

          <div className="text-center p-6 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200/50">
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg">
                <Stethoscope className="h-5 w-5 text-white" />
              </div>
              <span className="text-sm font-medium text-slate-700">Doctors</span>
            </div>
            <div className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-2">{stats.doctors}</div>
            <p className="text-xs text-slate-600">Specialists & physicians</p>
          </div>

          <div className="text-center p-6 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200/50">
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg">
                <BriefcaseMedical className="h-5 w-5 text-white" />
              </div>
              <span className="text-sm font-medium text-slate-700">Nurses</span>
            </div>
            <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">{stats.nurses}</div>
            <p className="text-xs text-slate-600">Nursing staff</p>
          </div>
        </div>

        {/* Enhanced Search & Control Panel */}
        <div className="bg-gradient-to-br from-slate-50 to-white rounded-2xl p-8 border border-slate-200/50 shadow-lg mb-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl shadow-lg">
              <Filter className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-slate-900">Find & Filter Staff</h3>
              <p className="text-slate-600 text-sm">Quickly locate and manage your medical team</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label htmlFor="search" className="text-sm font-semibold text-slate-700">Search Staff</Label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
                <Input
                  id="search"
                  placeholder="Search by name, email, or department..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 h-12 border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="role-filter" className="text-sm font-semibold text-slate-700">Filter by Role</Label>
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="h-12 border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-xl">
                  <SelectValue placeholder="Select role to filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Staff Members</SelectItem>
                  <SelectItem value="doctor">Doctors Only</SelectItem>
                  <SelectItem value="nurse">Nurses Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>


        </div>

        {/* Staff Directory Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredUsers.map((staff) => (
            <div key={staff.firebase_uid} className="p-6 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200/50 hover:shadow-md transition-all duration-200">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center">
                    {getRoleIcon(staff.role)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{staff.display_name || 'Unnamed Staff'}</h3>
                    <Badge variant={getRoleBadgeVariant(staff.role)} className="mt-1 capitalize">
                      {staff.role}
                    </Badge>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditUser(staff)}
                    className="h-8 w-8 p-0 hover:bg-indigo-50"
                  >
                    <Edit className="h-4 w-4 text-indigo-600" />
                  </Button>
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
                        <AlertDialogTitle>Deactivate Staff Member</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to deactivate {staff.display_name}? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteUser(staff)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Deactivate
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center text-sm text-slate-600">
                  <Mail className="h-4 w-4 mr-2" />
                  {staff.email}
                </div>

                {staff.phone && (
                  <div className="flex items-center text-sm text-slate-600">
                    <Phone className="h-4 w-4 mr-2" />
                    {staff.phone}
                  </div>
                )}

                <div className="flex items-center text-sm text-slate-600">
                  <Building className="h-4 w-4 mr-2" />
                  {departments.find(d => d.id === staff.department_id)?.name || 'No Department'}
                </div>

                <div className="pt-4 border-t border-slate-200">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-slate-500">Status</span>
                    <Badge variant={staff.is_active ? 'default' : 'secondary'}>
                      {staff.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Joined</span>
                    <span className="text-slate-900">
                      {new Date(staff.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {filteredUsers.length === 0 && (
            <div className="col-span-full text-center py-12">
              <Users className="h-16 w-16 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No staff found</h3>
              <p className="text-slate-500">
                {searchQuery || filterRole !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Get started by adding your first staff member'
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create Staff Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Staff Member</DialogTitle>
            <DialogDescription>
              Create a new doctor or nurse account. They will receive login credentials via email.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={staffForm.display_name}
                onChange={(e) => setStaffForm({...staffForm, display_name: e.target.value})}
                placeholder="Dr. John Smith"
              />
            </div>

            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={staffForm.email}
                onChange={(e) => setStaffForm({...staffForm, email: e.target.value})}
                placeholder="doctor@hospital.com"
              />
            </div>

            <div>
              <Label htmlFor="role">Role</Label>
              <Select value={staffForm.role} onValueChange={(value: 'doctor' | 'nurse') => setStaffForm({...staffForm, role: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="doctor">Doctor</SelectItem>
                  <SelectItem value="nurse">Nurse</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="phone">Phone (Optional)</Label>
              <Input
                id="phone"
                value={staffForm.phone}
                onChange={(e) => setStaffForm({...staffForm, phone: e.target.value})}
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <div>
              <Label htmlFor="department">Department (Optional)</Label>
              <Select value={staffForm.department_id || ""} onValueChange={(value) => setStaffForm({...staffForm, department_id: value || undefined})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No Department</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateStaff} className="bg-blue-600 hover:bg-blue-700">
              Create Staff Member
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Staff Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Staff Member</DialogTitle>
            <DialogDescription>
              Update staff member information and department assignment.
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Full Name</Label>
                <Input
                  id="edit-name"
                  value={selectedUser.display_name}
                  onChange={(e) => setSelectedUser({...selectedUser, display_name: e.target.value})}
                />
              </div>

              <div>
                <Label htmlFor="edit-email">Email Address</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={selectedUser.email}
                  onChange={(e) => setSelectedUser({...selectedUser, email: e.target.value})}
                />
              </div>

              <div>
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  value={selectedUser.phone || ''}
                  onChange={(e) => setSelectedUser({...selectedUser, phone: e.target.value})}
                />
              </div>

              <div>
                <Label htmlFor="edit-department">Department</Label>
                <Select value={selectedUser.department_id || ""} onValueChange={(value) => setSelectedUser({...selectedUser, department_id: value || undefined})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No Department</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateUser} className="bg-blue-600 hover:bg-blue-700">
              Update Staff Member
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StaffManagement;
