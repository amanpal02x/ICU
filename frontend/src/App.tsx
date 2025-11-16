import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { RoleProvider, useRole } from "./hooks/useRole";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import Index from "./pages/Index";
import LoginPage from "./pages/Login";
import SignupPage from "./pages/Signup";
import AdminDashboard from "./pages/AdminDashboard";
import ICUAdminDashboard from "./pages/ICUAdminDashboard";
import Profile from "./pages/Profile";
import UploadPage from "./pages/UploadPage";
import WoundResultPage from "./pages/WoundResultPage";
import ProtectedRoute from "./components/ProtectedRoute";
import ForgotPasswordPage from "./pages/ForgotPassword";
import VerifyEmailPage from "./pages/VerifyEmail";
import NotFound from "./pages/NotFound";
import Support from "./pages/Support";

// New Admin Components
import AdminLayout from "./components/admin/AdminLayout";
import DashboardHome from "./pages/admin/DashboardHome";
import StaffManagement from "./pages/admin/StaffManagement";
import PatientManagement from "./pages/admin/PatientManagement";

const queryClient = new QueryClient();

// Role-based redirect component
const RoleBasedRedirect = () => {
  const { user } = useAuth();
  const { role, loading } = useRole();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading user role...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // Clear localStorage to ensure clean state
    console.log('Redirecting to login - no user found');
    return <Navigate to="/login" replace />;
  }

  // Redirect based on role
  if (role === 'admin') {
    return <Navigate to="/admin" replace />;
  } else if (role === 'doctor' || role === 'nurse') {
    return <Navigate to="/" replace />;
  }

  // Default fallback for unknown roles
  return <Navigate to="/" replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <RoleProvider>
          <BrowserRouter future={{ v7_relativeSplatPath: true }}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />

              {/* Role-based redirect after login */}
              <Route path="/redirect" element={<RoleBasedRedirect />} />

              {/* Admin routes - only accessible by admins */}
              <Route element={<ProtectedRoute allowedRoles={['admin']} />}>

                {/* New Admin Dashboard with separate pages - nested within AdminLayout */}
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<DashboardHome />} />
                  <Route path="staff" element={<StaffManagement />} />
                  <Route path="patients" element={<PatientManagement />} />
                  <Route path="departments" element={<div className="p-8"><h2 className="text-2xl font-bold">Departments Coming Soon</h2></div>} />
                  <Route path="appointments" element={<div className="p-8"><h2 className="text-2xl font-bold">Appointments Coming Soon</h2></div>} />
                  <Route path="icu-monitors" element={<ICUAdminDashboard />} />
                </Route>

                {/* Legacy admin route for backward compatibility */}
                <Route path="/admin-dashboard" element={<AdminDashboard />} />

              </Route>

              {/* Profile and Support routes - accessible by all authenticated users */}
              <Route element={<ProtectedRoute allowedRoles={['admin', 'doctor', 'nurse']} />}>
                <Route path="/profile" element={<Profile />} />
                <Route path="/support" element={<Support />} />
              </Route>

              {/* Doctor/Nurse dashboard routes */}
              <Route element={<ProtectedRoute allowedRoles={['doctor', 'nurse']} />}>
                <Route path="/" element={<Index />} />
                <Route path="/dashboard" element={<Index />} />
                <Route path="/dashboard/:role" element={<Index />} />
                <Route path="/upload" element={<UploadPage />} />
                <Route path="/wound-result" element={<WoundResultPage />} />
              </Route>

              {/* Catch all route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </RoleProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
