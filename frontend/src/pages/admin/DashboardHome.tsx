import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, Users, UserCheck, Building, CalendarIcon, MonitorSpeaker, Activity, TrendingUp, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { hospitalService } from '@/lib/hospitalService';
import { Hospital, HospitalStats } from '@/types/hospital';

const DashboardHome: React.FC = () => {
  const { user } = useAuth();
  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [stats, setStats] = useState<HospitalStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        if (user?.role === 'admin') {
          const hospitalData = await hospitalService.getHospitalByAdmin(user.id);
          setHospital(hospitalData);

          const hospitalStats = await hospitalService.getHospitalStats(hospitalData.id);
          setStats(hospitalStats);
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header - Sophisticated warm gradient */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-amber-50 to-orange-50 rounded-3xl p-10 shadow-lg">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-500/5" />
        <div className="absolute -top-4 -right-4 w-20 h-20 bg-gradient-to-br from-amber-200 to-orange-200 rounded-full opacity-20" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-gradient-to-br from-yellow-200 to-amber-200 rounded-full opacity-30" />
        <div className="relative">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 bg-clip-text text-transparent mb-3">
            Welcome back, {user?.display_name || 'Admin'}!
          </h1>
          <p className="text-xl text-slate-600 mb-8 font-medium">
            Managing {hospital?.name || 'your hospital'} with excellence and care
          </p>

          <div className="flex flex-wrap gap-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-amber-100/50 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl">
                  <Clock className="h-6 w-6 text-amber-700" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">Current Time</p>
                  <p className="font-bold text-slate-900 text-lg">
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-emerald-100/50 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-emerald-100 to-green-100 rounded-xl">
                  <TrendingUp className="h-6 w-6 text-emerald-700" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">System Status</p>
                  <p className="font-bold text-emerald-900 text-lg">All Systems Operational</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hospital Overview - Plain Merged Layout */}
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200/50">
        <h2 className="text-2xl font-semibold text-slate-900 mb-6 flex items-center gap-3">
          <Activity className="h-6 w-6 text-slate-600" />
          Hospital Overview
        </h2>

        {/* Stats Grid - Merged Plain Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Staff */}
          <div className="text-center p-6 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200/50">
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="p-2 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg">
                <Users className="h-5 w-5 text-white" />
              </div>
              <span className="text-sm font-medium text-slate-700">Total Staff</span>
            </div>
            <div className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent mb-2">{stats?.total_users || 0}</div>
            <p className="text-xs text-slate-600">Medical personnel</p>
          </div>

          {/* Active Patients */}
          <div className="text-center p-6 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200/50">
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="p-2 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg">
                <UserCheck className="h-5 w-5 text-white" />
              </div>
              <span className="text-sm font-medium text-slate-700">Active Patients</span>
            </div>
            <div className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent mb-2">{stats?.active_patients || 0}</div>
            <p className="text-xs text-slate-600">Currently admitted</p>
          </div>

          {/* Departments */}
          <div className="text-center p-6 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200/50">
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg">
                <Building className="h-5 w-5 text-white" />
              </div>
              <span className="text-sm font-medium text-slate-700">Departments</span>
            </div>
            <div className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent mb-2">{stats?.total_departments || 0}</div>
            <p className="text-xs text-slate-600">Medical departments</p>
          </div>

          {/* Today's Appointments */}
          <div className="text-center p-6 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200/50">
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="p-2 bg-gradient-to-br from-rose-500 to-pink-600 rounded-lg">
                <CalendarIcon className="h-5 w-5 text-white" />
              </div>
              <span className="text-sm font-medium text-slate-700">Today's Appointments</span>
            </div>
            <div className="text-3xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent mb-2">{stats?.today_appointments || 0}</div>
            <p className="text-xs text-slate-600">Scheduled today</p>
          </div>
        </div>

        {/* Hospital Charts & ICU Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Hospital Operations Chart */}
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-6 border border-slate-200/50">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Operations Overview</h3>

            <div className="space-y-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-slate-700">Staff Utilization</span>
                <span className="text-sm text-indigo-600 font-semibold">87%</span>
              </div>
              <div className="w-full bg-indigo-100 rounded-full h-3 mb-4">
                <div className="bg-gradient-to-r from-indigo-400 to-indigo-600 h-3 rounded-full" style={{width: '87%'}}></div>
              </div>

              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-slate-700">ICU Capacity</span>
                <span className="text-sm text-emerald-600 font-semibold">72%</span>
              </div>
              <div className="w-full bg-emerald-100 rounded-full h-3 mb-4">
                <div className="bg-gradient-to-r from-emerald-400 to-emerald-600 h-3 rounded-full" style={{width: '72%'}}></div>
              </div>

              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-slate-700">System Performance</span>
                <span className="text-sm text-purple-600 font-semibold">98%</span>
              </div>
              <div className="w-full bg-purple-100 rounded-full h-3">
                <div className="bg-gradient-to-r from-purple-400 to-purple-600 h-3 rounded-full" style={{width: '98%'}}></div>
              </div>
            </div>
          </div>

          {/* ICU Monitoring Integration */}
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-200/50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">ICU Monitor Integration</h3>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-green-600">Active</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-3 bg-white/60 backdrop-blur-sm rounded-lg border border-purple-100">
                <p className="text-xl font-bold text-purple-700">18</p>
                <p className="text-xs text-purple-600 font-medium">Active Monitors</p>
              </div>
              <div className="text-center p-3 bg-white/60 backdrop-blur-sm rounded-lg border border-indigo-100">
                <p className="text-xl font-bold text-indigo-700">2</p>
                <p className="text-xs text-indigo-600 font-medium">Alerts</p>
              </div>
              <div className="text-center p-3 bg-white/60 backdrop-blur-sm rounded-lg border border-blue-100">
                <p className="text-xl font-bold text-blue-700">99%</p>
                <p className="text-xs text-blue-600 font-medium">Uptime</p>
              </div>
            </div>

            <div className="flex justify-center">
              <Link to="/admin/icu-monitors">
                <Button className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300">
                  <MonitorSpeaker className="h-4 w-4 mr-2" />
                  Open ICU Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>


    </div>
  );
};

export default DashboardHome;
