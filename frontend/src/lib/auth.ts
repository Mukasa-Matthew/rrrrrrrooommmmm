// Authentication utilities and types
export interface User {
  id: number;
  email: string;
  name: string;
  role: 'super_admin' | 'hostel_admin' | 'tenant' | 'user';
  hostel_id?: number;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    token: string;
  };
}

export interface UserResponse {
  success: boolean;
  data: {
    user: User;
  };
}

const API_BASE_URL = 'http://localhost:5000/api';

// Real authentication functions using backend API
export const login = async (email: string, password: string): Promise<User> => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  const data: LoginResponse = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Login failed');
  }

  // Store token in localStorage
  localStorage.setItem('auth_token', data.data.token);
  
  return data.data.user;
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

  try {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data: UserResponse = await response.json();

    if (!response.ok || !data.success) {
      // Token is invalid, remove it
      localStorage.removeItem('auth_token');
      return null;
    }

    return data.data.user;
  } catch (error) {
    console.error('Get current user failed:', error);
    localStorage.removeItem('auth_token');
    return null;
  }
};
