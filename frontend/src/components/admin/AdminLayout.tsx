import React, { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Building,
  CalendarIcon,
  MonitorSpeaker,
  Settings,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Activity,
  Menu,
  Heart
} from 'lucide-react';

const navigation = [
  {
    name: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard,
    current: true,
    description: 'Overview & Stats'
  },
  {
    name: 'ICU Dashboard',
    href: '/admin/icu-monitors',
    icon: Heart,
    description: 'Monitor ICU Patients'
  },
  {
    name: 'Staff Management',
    href: '/admin/staff',
    icon: Users,
    description: 'Doctors & Nurses'
  },
  {
    name: 'Patient Management',
    href: '/admin/patients',
    icon: UserCheck,
    description: 'Patient Records'
  },
  {
    name: 'Departments',
    href: '/admin/departments',
    icon: Building,
    description: 'Hospital Units'
  },
  {
    name: 'Appointments',
    href: '/admin/appointments',
    icon: CalendarIcon,
    description: 'Scheduling'
  }
];

const AdminLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();

  const handleCollapseSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden bg-gray-600 bg-opacity-75"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 flex flex-col transform bg-gradient-to-b from-slate-50 to-slate-100 border-r border-slate-200/60 transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 shadow-xl",
        sidebarOpen ? "translate-x-0" : "-translate-x-full",
        sidebarCollapsed ? "lg:w-16" : "lg:w-72"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between flex-shrink-0 px-6 py-6 border-b border-slate-200/50 bg-gradient-to-r from-slate-50 to-slate-100">
          {!sidebarCollapsed && (
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
              </div>
              <div>
                <h2 className="text-xl font-bold bg-gradient-to-r from-slate-700 to-slate-600 bg-clip-text text-transparent">
                  Admin Panel
                </h2>
                <p className="text-sm text-slate-500 font-medium">Hospital Management</p>
              </div>
            </div>
          )}

          {/* Collapse button - only visible on lg screens */}
          <button
            onClick={handleCollapseSidebar}
            className="hidden lg:block p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>

          {/* Mobile close button */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "group flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200 hover:bg-gray-100",
                  isActive
                    ? "bg-blue-50 text-blue-700 border-r-2 border-blue-500"
                    : "text-gray-700 hover:text-gray-900",
                  sidebarCollapsed && "lg:justify-center lg:px-0"
                )}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon
                  className={cn(
                    "flex-shrink-0 w-5 h-5",
                    isActive ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600",
                    sidebarCollapsed && "lg:w-6 lg:h-6"
                  )}
                />
                {!sidebarCollapsed && (
                  <span className="ml-3">{item.name}</span>
                )}
                {!sidebarCollapsed && isActive && (
                  <div className="ml-auto w-2 h-2 bg-blue-500 rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        {!sidebarCollapsed && (
          <div className="flex-shrink-0 border-t border-gray-200 p-4">
            <div className="text-xs text-gray-500 text-center">
              <p>© 2024 Hospital Admin</p>
              <p>Version 2.0</p>
            </div>
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top navigation */}
        <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center space-x-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Admin Panel</h1>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
