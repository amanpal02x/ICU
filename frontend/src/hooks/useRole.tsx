import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";

// Define the possible roles
export type UserRole = "admin" | "doctor" | "nurse" | null;

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

interface RoleContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  loading: boolean;
  userProfile: User | null;
}

// Create the context
const RoleContext = createContext<RoleContextType | undefined>(undefined);

// Create the provider component
export const RoleProvider = ({ children }: { children: ReactNode }) => {
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    console.log("Loading user role for user:", user);
    if (!authLoading) {
      if (user) {
        setRole(user.role);
        setUserProfile(user); // Use the user data from auth context
        console.log("Role set to:", user.role);
      } else {
        setRole(null);
        setUserProfile(null);
        console.log("No user, role set to null");
      }
      setLoading(false);
    }
  }, [user, authLoading]);

  return (
    <RoleContext.Provider value={{ role, setRole, loading, userProfile }}>
      {children}
    </RoleContext.Provider>
  );
};

// Create the custom hook
export const useRole = () => {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error("useRole must be used within a RoleProvider");
  }
  return context;
};
