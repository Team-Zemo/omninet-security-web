import axios from 'axios';
import { tokenManager } from '../utils/tokenManager';

const API_BASE_URL = 'http://localhost:8080';

// Configure axios with base URL and content type
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Flag to prevent infinite refresh loops
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });

  failedQueue = [];
};

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = tokenManager.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = tokenManager.getRefreshToken();

      if (!refreshToken) {
        // No refresh token available, redirect to login
        tokenManager.clearTokens();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const response = await refreshAccessToken(refreshToken);
        const { accessToken, expiresIn } = response.data;

        tokenManager.updateAccessToken(accessToken, expiresIn);
        processQueue(null, accessToken);

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        tokenManager.clearTokens();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Helper function to refresh token
const refreshAccessToken = async (refreshToken) => {
  const response = await axios.post(
    `${API_BASE_URL}/api/auth/refresh-token`,
    { refreshToken },
    { headers: { 'Content-Type': 'application/json' } }
  );
  return response.data;
};

export const authAPI = {
  // Get current authenticated user
  getCurrentUser: async () => {
    const response = await api.get('/api/auth/user');
    return response.data;
  },

  // Email/Password Login with JWT
  loginWithEmail: async (data) => {
    const response = await api.post('/api/auth/login/email', data);
    return response.data;
  },

  // Refresh access token
  refreshToken: async (refreshToken) => {
    const response = await api.post('/api/auth/refresh-token', {
      refreshToken
    });
    return response.data;
  },

  // Logout current session
  logout: async () => {
    const refreshToken = tokenManager.getRefreshToken();
    if (!refreshToken) {
      return { success: true, message: 'Already logged out', data: { message: 'No active session' } };
    }

    const response = await api.post('/api/auth/logout', {
      refreshToken
    });
    return response.data;
  },

  // Logout from all devices
  logoutAll: async () => {
    const response = await api.post('/api/auth/logout-all', {});
    return response.data;
  },

  // Merge accounts after conflict
  mergeAccounts: () => api.post('/api/auth/merge-accounts?confirm=true'),

  // Get dashboard statistics
  getDashboardStats: () => api.get('/api/dashboard/stats'),

  // Email Registration Flow
  // Step 1: Initiate email registration
  initiateEmailRegistration: (data) =>
    api.post('/api/auth/register/initiate', data),

  // Step 2: Verify OTP code
  verifyEmailOtp: (data) =>
    api.post('/api/auth/register/verify-otp', data),

  // Step 3: Complete registration
  completeEmailRegistration: (data) => {
    return api.post(
      `/api/auth/register/complete`,
      {
        email: data.email,
        name: data.name,
        password: data.password,
        verificationToken: data.verificationToken
      }
    );
  },

  // Resend OTP code
  resendOtp: (data) =>
    api.post('/api/auth/register/resend-otp', data),

  // Check if email exists
  checkEmail: (email) =>
    api.get(`/api/auth/register/check-email?email=${encodeURIComponent(email)}`),

  // Check available authentication methods for email
  checkAuthMethods: (email) =>
    api.get(`/api/auth/check-methods?email=${encodeURIComponent(email)}`),

  // Add password to existing OAuth account
  addPassword: (email, password) =>
    api.post(`/api/auth/add-password`,
      `email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    ),
};

// Category API

export const categoryAPI = {
  // Create a new category
  createCategory: async (data) => {
    const response = await api.post('/api/v1/category/save', data);
    return response.data;
  },

  // Get all categories for the user
  getCategory: async () => {
    const response = await api.get('/api/v1/category/active-category');
    return response.data;
  },

  // Get a specific category by ID
  getCategoryById: async (id) => {
    const response = await api.get(`/api/v1/category/${id}`);
    return response.data;
  },

  // Delete a category by ID
  deleteCategory: async (id) => {
    const response = await api.delete(`/api/v1/category/${id}`);
    return response.data;
  },
};

// Notes api

export const notesAPI = {
  getNotes: async (pageNo = 0, pageSize = 10) => {
    const response = await api.get(`/api/v1/notes/user-notes?pageNo=${pageNo}&pageSize=${pageSize}`);
    return response.data;
  },

  getRecycledNotes: async (pageNo = 0, pageSize = 10) => {
    const response = await api.get(`/api/v1/notes/recycle-bin`);
    return response.data;
  },

  createNote: async (data) => {
    const formData = new FormData();
    const notesData = {
      title: data.title,
      description: data.description,
      category: {
        id: data.category.id,
        name: data.category.name
      }
    };
    
    formData.append('notes', JSON.stringify(notesData));
    
    if (data.file) {
      formData.append('file', data.file);
    }

    const response = await api.post('/api/v1/notes/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });


    return response.data;
  },
};

export const oauthUrls = {
  github: `${API_BASE_URL}/oauth2/authorization/github`,
  google: `${API_BASE_URL}/oauth2/authorization/google`,
};

export default api;
