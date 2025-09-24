// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export const API_CONFIG = {
  BASE_URL: API_BASE_URL,
  ENDPOINTS: {
    AUTH: {
      LOGIN: `${API_BASE_URL}/api/auth/login`,
      LOGOUT: `${API_BASE_URL}/api/auth/logout`,
      PROFILE: `${API_BASE_URL}/api/auth/profile`,
      UPLOAD_PROFILE_PICTURE: `${API_BASE_URL}/api/auth/upload-profile-picture`,
      DELETE_PROFILE_PICTURE: `${API_BASE_URL}/api/auth/profile-picture`,
      CHANGE_PASSWORD: `${API_BASE_URL}/api/auth/change-password`,
    },
    UNIVERSITIES: {
      LIST: `${API_BASE_URL}/api/universities`,
      REGIONS_LIST: `${API_BASE_URL}/api/universities/regions/list`,
    },
    STUDENTS: {
      LIST: `${API_BASE_URL}/api/students`,
      CREATE: `${API_BASE_URL}/api/students`,
      DELETE: `${API_BASE_URL}/api/students`,
      NOTIFY: `${API_BASE_URL}/api/students/notify`,
    },
    PAYMENTS: {
      LIST: `${API_BASE_URL}/api/payments`,
      CREATE: `${API_BASE_URL}/api/payments`,
      SUMMARY: `${API_BASE_URL}/api/payments/summary`,
    },
    ROOMS: {
      LIST: `${API_BASE_URL}/api/rooms`,
      CREATE: `${API_BASE_URL}/api/rooms`,
      UPDATE: `${API_BASE_URL}/api/rooms`,
      DELETE: `${API_BASE_URL}/api/rooms`,
    },
    EXPENSES: {
      LIST: `${API_BASE_URL}/api/expenses`,
      CREATE: `${API_BASE_URL}/api/expenses`,
      SUMMARY: `${API_BASE_URL}/api/expenses/summary`,
    },
    INVENTORY: {
      LIST: `${API_BASE_URL}/api/inventory`,
      CREATE: `${API_BASE_URL}/api/inventory`,
      UPDATE: `${API_BASE_URL}/api/inventory`,
      DELETE: `${API_BASE_URL}/api/inventory`,
    },
    HOSTELS: {
      LIST: `${API_BASE_URL}/api/hostels`,
      CREATE: `${API_BASE_URL}/api/hostels`,
      GET: `${API_BASE_URL}/api/hostels`,
      ADMIN_SUMMARY: `${API_BASE_URL}/api/hostels`,
    },
    ANALYTICS: {
      PLATFORM_OVERVIEW: `${API_BASE_URL}/api/multi-tenant/platform/overview`,
      HOSTEL_OVERVIEW: `${API_BASE_URL}/api/multi-tenant/hostel`,
    },
    SUBSCRIPTION_PLANS: {
      LIST: `${API_BASE_URL}/api/subscription-plans`,
      GET: `${API_BASE_URL}/api/subscription-plans`,
      CREATE: `${API_BASE_URL}/api/subscription-plans`,
      UPDATE: `${API_BASE_URL}/api/subscription-plans`,
      DELETE: `${API_BASE_URL}/api/subscription-plans`,
      HOSTEL_SUBSCRIPTIONS: `${API_BASE_URL}/api/subscription-plans/hostel`,
                SUBSCRIBE_HOSTEL: `${API_BASE_URL}/api/subscription-plans/hostel`,
                RENEW_HOSTEL: `${API_BASE_URL}/api/subscription-plans/hostel`,
      EXPIRED: `${API_BASE_URL}/api/subscription-plans/expired/all`,
    },
  },
};

// Helper function to get full URL
export const getApiUrl = (endpoint: string): string => {
  return `${API_BASE_URL}${endpoint}`;
};

// Helper function to get auth headers
export const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem('auth_token');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

// Helper function to get auth headers for file uploads
export const getAuthHeadersForUpload = (): HeadersInit => {
  const token = localStorage.getItem('auth_token');
  return {
    'Authorization': `Bearer ${token}`,
  };
};
