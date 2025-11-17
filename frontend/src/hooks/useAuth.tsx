import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { UserRole } from "@/hooks/useRole";
import { HospitalRegistrationData, StaffRegistrationData, HospitalRegistrationResponse, StaffRegistrationResponse } from "@/types/hospital";

// Define the shape of your context
interface User {
  id: string;
  email: string;
  display_name: string;
  role: UserRole;
  hospital_id: string;
  department_id?: string;
  phone?: string;
  is_active: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  registerHospital: (data: HospitalRegistrationData) => Promise<HospitalRegistrationResponse>;
  registerStaff: (data: StaffRegistrationData, hospitalId: string) => Promise<StaffRegistrationResponse>;
  logout: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  enableBypass: () => void;
  disableBypass: () => void;
  isBypassEnabled: boolean;
}

interface RegisterData {
  email: string;
  password: string;
  display_name: string;
  role: UserRole;
  hospital_id?: string;
  phone?: string;
}

interface LoginResponse {
  access_token: string;
  token_type: string;
}

interface RegisterResponse {
  message: string;
  user: User;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// API base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:10000';

// Auth bypass configuration
const AUTH_BYPASS_MODE = true; // Set to true in development to bypass authentication

// Create the AuthProvider component
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBypassEnabled, setIsBypassEnabled] = useState(AUTH_BYPASS_MODE);

  // Dummy bypass user (doctor role)
  const bypassUser: User = {
    id: 'bypass-doctor-123',
    email: 'doctor@bypass.com',
    display_name: 'Bypass Doctor',
    role: 'doctor',
    hospital_id: 'bypass-hospital',
    department_id: undefined,
    phone: '123-456-7890',
    is_active: true
  };

  useEffect(() => {
    if (isBypassEnabled) {
      // AUTH BYPASS: Skip token validation and set bypass user
      console.log("🔓 FRONTEND AUTH BYPASS: Setting dummy doctor user");
      setUser(bypassUser);
      setLoading(false);
      return;
    }

    // Check for stored token on app start
    const token = localStorage.getItem('access_token');
    if (token) {
      // Validate token and get user info
      fetchUserInfo(token);
    } else {
      setLoading(false);
    }
  }, [isBypassEnabled]);

  const fetchUserInfo = async (token: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        // Token is invalid, remove it
        localStorage.removeItem('access_token');
      }
    } catch (error) {
      console.error('Error fetching user info:', error);
      localStorage.removeItem('access_token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          username: email,
          password: password,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Login failed');
      }

      const data: LoginResponse = await response.json();
      localStorage.setItem('access_token', data.access_token);

      // Fetch user info
      await fetchUserInfo(data.access_token);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const register = async (userData: RegisterData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Registration failed');
      }

      const data: RegisterResponse = await response.json();
      console.log('Registration successful:', data.message);
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const registerHospital = async (data: HospitalRegistrationData): Promise<HospitalRegistrationResponse> => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register-hospital`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Hospital registration failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Hospital registration error:', error);
      throw error;
    }
  };

  const registerStaff = async (data: StaffRegistrationData, hospitalId: string): Promise<StaffRegistrationResponse> => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register-staff`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...data, hospital_id: hospitalId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Staff registration failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Staff registration error:', error);
      throw error;
    }
  };

  const enableBypass = () => {
    console.log("🔓 FRONTEND: Enabling auth bypass");
    setIsBypassEnabled(true);
    setUser(bypassUser);
  };

  const disableBypass = () => {
    console.log("🔒 FRONTEND: Disabling auth bypass");
    setIsBypassEnabled(false);
    setUser(null);
    localStorage.removeItem('access_token');
  };

  const logout = async () => {
    localStorage.removeItem('access_token');
    setUser(null);
  };

  const sendPasswordReset = async (email: string) => {
    // For now, just log - password reset would need backend implementation
    console.log('Password reset requested for:', email);
  };

  const value = {
    user,
    loading,
    login,
    register,
    registerHospital,
    registerStaff,
    logout,
    sendPasswordReset,
    enableBypass,
    disableBypass,
    isBypassEnabled,
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        Loading application...
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
