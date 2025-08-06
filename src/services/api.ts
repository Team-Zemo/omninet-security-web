import axios from 'axios';
import type {
  DashboardStats,
  EmailRegistrationInitiateRequest,
  EmailRegistrationInitiateResponse,
  EmailVerificationRequest,
  EmailVerificationResponse,
  EmailRegistrationCompleteRequest,
  EmailRegistrationCompleteResponse,
  EmailLoginRequest,
  LoginResponse,
  RefreshTokenResponse,
  LogoutResponse,
  UserResponse,
  AuthMethodsResponse,
  CheckEmailResponse
} from '../types/auth';
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
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (error?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
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
const refreshAccessToken = async (refreshToken: string): Promise<RefreshTokenResponse> => {
  const response = await axios.post<RefreshTokenResponse>(
    `${API_BASE_URL}/api/auth/refresh-token`,
    { refreshToken },
    { headers: { 'Content-Type': 'application/json' } }
  );
  return response.data;
};

//@Data
// @NoArgsConstructor
// @AllArgsConstructor
// public class EmailRegistrationRequest {
//     @NotBlank(message = "Email is required")
//     @Email(message = "Invalid email format")
//     private String email;
// }
class ResendOtpRequest {
    email: string | undefined;
}

export const authAPI = {
  // Get current authenticated user
  getCurrentUser: async (): Promise<UserResponse> => {
    const response = await api.get<UserResponse>('/api/auth/user');
    return response.data;
  },

  // Email/Password Login with JWT
  loginWithEmail: async (data: EmailLoginRequest): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/api/auth/login/email', data);
    return response.data;
  },

  // Refresh access token
  refreshToken: async (refreshToken: string): Promise<RefreshTokenResponse> => {
    const response = await api.post<RefreshTokenResponse>('/api/auth/refresh-token', {
      refreshToken
    });
    return response.data;
  },

  // Logout current session
  logout: async (): Promise<LogoutResponse> => {
    const refreshToken = tokenManager.getRefreshToken();
    if (!refreshToken) {
      return { success: true, message: 'Already logged out', data: { message: 'No active session' } };
    }

    const response = await api.post<LogoutResponse>('/api/auth/logout', {
      refreshToken
    });
    return response.data;
  },

  // Logout from all devices
  logoutAll: async (): Promise<LogoutResponse> => {
    const response = await api.post<LogoutResponse>('/api/auth/logout-all', {});
    return response.data;
  },

  // Merge accounts after conflict
  mergeAccounts: () => api.post('/api/auth/merge-accounts?confirm=true'),

  // Get dashboard statistics
  getDashboardStats: () => api.get<DashboardStats>('/api/dashboard/stats'),

  // Email Registration Flow
  // Step 1: Initiate email registration
  initiateEmailRegistration: (data: EmailRegistrationInitiateRequest) =>
    api.post<EmailRegistrationInitiateResponse>('/api/auth/register/initiate', data),

  // Step 2: Verify OTP code
  verifyEmailOtp: (data: EmailVerificationRequest) =>
    api.post<EmailVerificationResponse>('/api/auth/register/verify-otp', data),

  // Step 3: Complete registration
  completeEmailRegistration: (data: EmailRegistrationCompleteRequest) => {
    return api.post<EmailRegistrationCompleteResponse>(
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
  resendOtp: (data: ResendOtpRequest) =>
    api.post('/api/auth/register/resend-otp', data),

  // Check if email exists
  checkEmail: (email: string) =>
    api.get<CheckEmailResponse>(`/api/auth/register/check-email?email=${encodeURIComponent(email)}`),

  // Check available authentication methods for email
  checkAuthMethods: (email: string) =>
    api.get<AuthMethodsResponse>(`/api/auth/check-methods?email=${encodeURIComponent(email)}`),

  // Add password to existing OAuth account
  addPassword: (email: string, password: string) =>
    api.post(`/api/auth/add-password`,
      `email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    ),
};

export const oauthUrls = {
  github: `${API_BASE_URL}/oauth2/authorization/github`,
  google: `${API_BASE_URL}/oauth2/authorization/google`,
};

export default api;
