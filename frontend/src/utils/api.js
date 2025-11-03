import axios from 'axios';

// Configure axios defaults
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ✅ Example function: Fetch all users
export const fetchAllUsers = async () => {
  const response = await api.get('/auth/users');
  return response.data.data;
};

// ✅ NEW: Update user profile
export const updateProfile = async (userData) => {
  const response = await api.put('/api/auth/me', userData);
  return response; // Keep full response for flexibility
};

// ✅ (Optional) Get user profile
export const getProfile = async () => {
  const response = await api.get('/users/profile');
  return response.data;
};

// ✅ (Optional) Update password
export const updatePassword = async (passwordData) => {
  const response = await api.put('/users/update-password', passwordData);
  return response.data;
};

// 🔒 Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    console.log(`Making API request to: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    const token = localStorage.getItem('token');
    console.log('API Request - Token found:', token ? 'Yes' : 'No');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('API Request - Authorization header set');
    } else {
      console.log('API Request - No token in localStorage');
    }

    if (config.data && !(config.data instanceof FormData)) {
      console.log('Request data:', config.data);
    }

    return config;
  },
  (error) => {
    console.error('API Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// 🧩 Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log(`API response from: ${response.config.url}`, response.data);
    return response;
  },
  (error) => {
    console.error(`API error from: ${error.config?.url}`, error.response?.data || error.message);
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// ✅ -------------------- BOOKINGS API --------------------

// Update booking status (confirm, cancel, refund)
export const updateBookingStatus = async ({ bookingId, status }) => {
  const response = await api.put(`/api/bookings/${bookingId}`, { status });
  return response.data;
};

// Get all bookings (admin only or user-specific)
export const fetchAllBookings = async () => {
  const response = await api.get('/api/bookings');
  return response.data;
};


export default api;
