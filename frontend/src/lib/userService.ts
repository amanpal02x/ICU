import { UserRole } from "@/hooks/useRole";

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface UserProfile {
  id: string;
  firebase_uid: string;
  email: string;
  display_name: string;
  role: UserRole;
  hospital_id: string;
  department_id?: string;
  phone?: string;
  address?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserProfileInput {
  email: string;
  display_name: string;
  role: UserRole;
  hospital_id: string;
  department_id?: string;
  phone?: string;
  address?: string;
}

/**
 * Get authorization headers with JWT token
 */
const getAuthHeaders = () => {
  const token = localStorage.getItem('access_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

/**
 * Get user profile by Firebase UID
 */
export const getUserProfile = async (firebaseUid: string): Promise<UserProfile | null> => {
  try {
    console.log("Fetching user profile for Firebase UID:", firebaseUid);
    const response = await fetch(`${API_BASE_URL}/users/${firebaseUid}`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.log("No user profile found");
        return null;
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("User profile data:", data);
    return data;
  } catch (error) {
    console.error("API error in getUserProfile:", error);
    throw error;
  }
};

/**
 * Update user profile
 */
export const updateUserProfile = async (
  firebaseUid: string,
  updates: Partial<UserProfileInput>
): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/users/${firebaseUid}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.error("API error in updateUserProfile:", error);
    throw error;
  }
};

/**
 * Get all users by role and hospital (for admin management)
 */
export const getUsersByRole = async (hospitalId: string, role: UserRole): Promise<UserProfile[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/users/hospital/${hospitalId}/role/${role}`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("API error in getUsersByRole:", error);
    throw error;
  }
};

/**
 * Get all staff for a hospital
 */
export const getAllActiveUsers = async (hospitalId: string): Promise<UserProfile[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/users/hospital/${hospitalId}/staff`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("API error in getAllActiveUsers:", error);
    throw error;
  }
};

/**
 * Deactivate user (soft delete for admin)
 */
export const deactivateUser = async (firebaseUid: string): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/users/${firebaseUid}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.error("API error in deactivateUser:", error);
    throw error;
  }
};

/**
 * Check if user exists
 */
export const userExists = async (firebaseUid: string): Promise<boolean> => {
  try {
    const user = await getUserProfile(firebaseUid);
    return user !== null;
  } catch (error) {
    console.error("API error in userExists:", error);
    return false;
  }
};

/**
 * Assign patients to a user (legacy function - may not be needed with new structure)
 */
export const assignPatientsToUser = async (
  firebaseUid: string,
  patientIds: string[]
): Promise<void> => {
  // This function may not be needed with the new MongoDB structure
  // Keeping for backward compatibility
  console.log("assignPatientsToUser called - this may need backend implementation");
};

/**
 * Get users by hospital
 */
export const getUsersByHospital = async (hospitalId: string): Promise<UserProfile[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/hospitals/${hospitalId}/users`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("API error in getUsersByHospital:", error);
    throw error;
  }
};

/**
 * Assign user to department
 */
export const assignUserToDepartment = async (
  firebaseUid: string,
  departmentId: string
): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/users/${firebaseUid}/department/${departmentId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.error("API error in assignUserToDepartment:", error);
    throw error;
  }
};
