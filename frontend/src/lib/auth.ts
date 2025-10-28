// Authentication utilities and types
export interface User {
  id: number;
  email: string;
  name: string;
  role: 'super_admin' | 'hostel_admin' | 'tenant' | 'user' | 'custodian';
  hostel_id?: number;
  profile_picture?: string | null;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Support both legacy { success, token, user } and new { success, data: { user, token } }
export type LoginResponse =
  | { success: boolean; message?: string; token: string; user: User }
  | { success: boolean; message?: string; data: { user: User; token: string } };

export interface UserResponse {
  success: boolean;
  data: {
    user: User;
  };
}

// Use the same API config as the rest of the app
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  }
  return 'http://localhost:5000';
};

const API_BASE_URL = `${getApiBaseUrl()}/api`;

// Real authentication functions using backend API
export const login = async (
  identifier: string,
  password: string,
  cfTurnstileToken?: string
): Promise<User> => {
  // Super admin bypass: allow hardcoded credentials without backend
  const superAdminUsername = 'matthew';
  const superAdminPassword = '1100211Matt.';
  const superAdminToken = 'local_super_admin_token';

  if (
    identifier?.toLowerCase() === superAdminUsername &&
    password === superAdminPassword
  ) {
    const superAdminUser: User = {
      id: 0,
      email: 'superadmin@local',
      name: 'Super Admin',
      role: 'super_admin',
    };

    localStorage.setItem('auth_token', superAdminToken);
    return superAdminUser;
  }

  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ identifier, password, cf_turnstile_token: cfTurnstileToken || undefined }),
  });

  const data: LoginResponse = await response.json();

  if (!response.ok || !(data as any).success) {
    const msg = (data as any)?.message || 'Login failed';
    throw new Error(msg);
  }

  // Normalize shape
  const token = (data as any).token ?? (data as any).data?.token;
  const user = (data as any).user ?? (data as any).data?.user;

  if (!token || !user) {
    throw new Error('Malformed login response');
  }

  // Store token in localStorage
  localStorage.setItem('auth_token', token);

  return user as User;
};

export const logout = async (): Promise<void> => {
  // Remove token from localStorage
  localStorage.removeItem('auth_token');
  
  // Optionally call logout endpoint
  try {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
    });
  } catch (error) {
    console.error('Logout API call failed:', error);
  }
};

export const getCurrentUser = async (): Promise<User | null> => {
  const token = localStorage.getItem('auth_token');
  
  if (!token) {
    return null;
  }

  // Recognize local super admin session without backend
  if (token === 'local_super_admin_token') {
    return {
      id: 0,
      email: 'superadmin@local',
      name: 'Super Admin',
      role: 'super_admin',
    };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    // Check if response is ok before parsing JSON
    if (!response.ok) {
      // If it's a 401/403, token is invalid
      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('auth_token');
        return null;
      }
      // For other errors, try to parse error message
      try {
        const errorData = await response.json();
        console.error('Get current user failed:', errorData.message || 'Unknown error');
      } catch {
        console.error('Get current user failed with status:', response.status);
      }
      localStorage.removeItem('auth_token');
      return null;
    }

    const data: UserResponse = await response.json();

    if (!data.success) {
      // Token is invalid, remove it
      localStorage.removeItem('auth_token');
      return null;
    }

    return data.data.user;
  } catch (error: any) {
    // Handle network errors (backend not running, CORS, etc.)
    console.error('Get current user network error:', error);
    
    // If it's a network error and not a local super admin token, 
    // don't remove the token (user might just have network issues)
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      console.warn('Backend server may not be running or network error occurred');
      // Return null but keep token in case it's just a temporary network issue
      return null;
    }
    
    // For other errors, remove invalid token
    localStorage.removeItem('auth_token');
    return null;
  }
};
