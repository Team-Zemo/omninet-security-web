import axios from 'axios';
import type {UserProfile, DashboardStats} from '../types/auth';

const API_BASE_URL = 'http://localhost:8080';

// Configure axios with credentials for session-based authentication
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// API response interceptor for error handling - only redirect on non-auth endpoints
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Don't redirect to login for auth check endpoints to avoid infinite loops
    const isAuthEndpoint = error.config?.url?.includes('/api/auth/user') ||
                          error.config?.url?.includes('/api/auth/profile');

    if (error.response?.status === 401 && !isAuthEndpoint) {
      // Only redirect to login for non-auth endpoints
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  // Get current authenticated user - based on backend docs, this returns the user directly
  getCurrentUser: () => api.get('/api/auth/user'),

  // Get detailed user profile - this returns the full profile with user, attributes, authorities
  getProfile: () => api.get<UserProfile>('/api/auth/profile'),

  // Logout current user - use the backend logout endpoint
  logout: () => {
    // Use the direct logout endpoint instead of the API route
    return fetch(`${API_BASE_URL}/logout`, {
      method: 'POST',
      credentials: 'include'
    });
  },

  // Merge accounts after conflict
  mergeAccounts: () => api.post('/api/auth/merge-accounts?confirm=true'),

  // Get dashboard statistics
  getDashboardStats: () => api.get<DashboardStats>('/api/dashboard/stats'),

  // Get all users (admin view)
  getAllUsers: () => api.get('/api/dashboard/users'),
};

export const oauthUrls = {
  github: `${API_BASE_URL}/oauth2/authorization/github`,
  google: `${API_BASE_URL}/oauth2/authorization/google`,
  logout: `${API_BASE_URL}/logout`,
};

export default api;
