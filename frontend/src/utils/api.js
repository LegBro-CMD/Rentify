import axios from 'axios';

const api = axios.create({
  baseURL:
    process.env.NODE_ENV === 'production'
      ? 'https://rentify-m636.onrender.com/api' // Render will serve the backend API under this path
      : 'http://localhost:5000/api', // Local dev mode
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// ✅ Example function: Fetch all users
export const fetchAllUsers = async () => {
  const response = await api.get('/auth/users');
  return response.data.data;
};

// ✅ Update user profile
export const updateProfile = async (userData) => {
  const response = await api.put('/auth/me', userData);
  return response;
};

// ✅ Get user profile
export const getProfile = async () => {
  const response = await api.get('/users/profile');
  return response.data;
};

// ✅ Update password
export const updatePassword = async (passwordData) => {
  const response = await api.put('/users/update-password', passwordData);
  return response.data;
};

// 🔒 Interceptors stay the same
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// ✅ BOOKINGS API
export const updateBookingStatus = async ({ bookingId, status }) => {
  const response = await api.put(`/bookings/${bookingId}`, { status });
  return response.data;
};

export const fetchAllBookings = async () => {
  const response = await api.get('/bookings');
  return response.data;
};

export default api;
