import { create } from 'zustand';
import type {
  AuthState,
  User,
  EmailLoginRequest,
  EmailRegistrationInitiateRequest,
  EmailVerificationRequest,
  EmailRegistrationCompleteRequest,
} from '../types/auth';
import { authAPI } from '../services/api';
import { tokenManager } from '../utils/tokenManager';

interface AuthStore extends AuthState {
  checkAuthStatus: () => Promise<void>;
  login: (provider: 'github' | 'google') => void;
  loginWithEmail: (data: EmailLoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  handleOAuthCallback: (urlParams: URLSearchParams) => Promise<void>;

  // Email Registration Flow
  initiateEmailRegistration: (data: EmailRegistrationInitiateRequest) => Promise<any>;
  verifyEmailOtp: (data: EmailVerificationRequest) => Promise<any>;
  completeEmailRegistration: (data: EmailRegistrationCompleteRequest) => Promise<any>;
  resendOtp: (email: string) => Promise<void>;
  checkEmail: (email: string) => Promise<any>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  checkAuthStatus: async () => {
    try {
      set({ isLoading: true, error: null });
      console.log('Checking auth status...');

      // Check if we have valid tokens
      if (!tokenManager.isAuthenticated()) {
        console.log('No valid tokens found');
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null
        });
        return;
      }

      // Get user data from backend
      const response = await authAPI.getCurrentUser();
      console.log('Auth response:', response);

      if (response.success && response.data) {
        set({
          user: response.data,
          isAuthenticated: true,
          isLoading: false
        });
        console.log('User authenticated:', response.data);
      } else {
        console.log('Failed to get user data');
        tokenManager.clearTokens();
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null
        });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStatus = (error as any)?.response?.status;
      console.log('Auth check failed:', errorStatus, errorMessage);

      // Clear tokens on auth failure
      tokenManager.clearTokens();
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      });
    }
  },

  login: (provider: 'github' | 'google') => {
    const urls = {
      github: 'http://localhost:8080/oauth2/authorization/github',
      google: 'http://localhost:8080/oauth2/authorization/google'
    };
    window.location.href = urls[provider];
  },

  loginWithEmail: async (data: EmailLoginRequest) => {
    try {
      set({ isLoading: true, error: null });
      console.log('Logging in with email...');

      const response = await authAPI.loginWithEmail(data);
      console.log('Email login response:', response);

      if (response.success && response.data) {
        // Store JWT tokens
        tokenManager.setTokens({
          accessToken: response.data.accessToken,
          refreshToken: response.data.refreshToken,
          tokenType: response.data.tokenType,
          expiresIn: response.data.expiresIn
        });

        // Set user data
        set({
          user: response.data.user,
          isAuthenticated: true,
          isLoading: false
        });
        console.log('User authenticated:', response.data.user);

      } else {
        throw new Error(response.error || 'Login failed');
      }
    } catch (error: any) {
      console.error('Email login error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Login failed';
      set({
        isLoading: false,
        error: errorMessage
      });
      throw error;
    }
  },

  handleOAuthCallback: async (urlParams: URLSearchParams) => {
    try {
      set({ isLoading: true, error: null });
      console.log('Handling OAuth callback...');

      const accessToken = urlParams.get('access_token');
      const refreshToken = urlParams.get('refresh_token');
      const tokenType = urlParams.get('token_type') || 'Bearer';
      const expiresIn = parseInt(urlParams.get('expires_in') || '3600000');

      if (!accessToken || !refreshToken) {
        throw new Error('Missing tokens in OAuth callback');
      }

      // Store tokens
      tokenManager.setTokens({
        accessToken,
        refreshToken,
        tokenType,
        expiresIn
      });

      // Get user data
      await get().checkAuthStatus();

      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);

      console.log('OAuth login successful');
    } catch (error: any) {
      console.error('OAuth callback error:', error);
      set({
        isLoading: false,
        error: error.message || 'OAuth authentication failed'
      });
      throw error;
    }
  },

  logout: async () => {
    try {
      console.log('Logging out...');
      set({ isLoading: true });

      // Call logout API to revoke refresh token
      await authAPI.logout();
      console.log('Logout API call successful');
    } catch (error: unknown) {
      console.error('Logout API error:', error);
      // Continue with local logout even if API call fails
    } finally {
      // Always clear local tokens and state
      tokenManager.clearTokens();
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      });

      // Redirect to login
      window.location.replace('/login');
    }
  },

  logoutAll: async () => {
    try {
      console.log('Logging out from all devices...');
      set({ isLoading: true });

      await authAPI.logoutAll();
      console.log('Logout all successful');
    } catch (error: unknown) {
      console.error('Logout all error:', error);
    } finally {
      // Clear local tokens and state
      tokenManager.clearTokens();
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      });

      window.location.replace('/login');
    }
  },

  // Email Registration Methods
  initiateEmailRegistration: async (data: EmailRegistrationInitiateRequest) => {
    try {
      set({ error: null });
      const response = await authAPI.initiateEmailRegistration(data);
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Registration initiation failed';
      set({ error: errorMessage });
      throw error;
    }
  },

  verifyEmailOtp: async (data: EmailVerificationRequest) => {
    try {
      set({ error: null });
      const response = await authAPI.verifyEmailOtp(data);
      return response.data;
    } catch (error: any) {
      console.error('OTP verification error details:', error);

      let errorMessage = 'OTP verification failed';
      if (error.response?.data) {
        if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        } else if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        }
      }

      set({ error: errorMessage });
      throw error;
    }
  },

  completeEmailRegistration: async (data: EmailRegistrationCompleteRequest) => {
    try {
      set({ isLoading: true, error: null });
      const response = await authAPI.completeEmailRegistration(data);

      if (response.data.success) {
        // After successful registration, check auth status to get user data
        await get().checkAuthStatus();
      }

      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Registration completion failed';
      set({
        isLoading: false,
        error: errorMessage
      });
      throw error;
    }
  },

  resendOtp: async (email: string) => {
    try {
      set({ error: null });
      await authAPI.resendOtp({ email });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to resend OTP';
      set({ error: errorMessage });
      throw error;
    }
  },

  checkEmail: async (email: string) => {
    try {
      set({ error: null });
      const response = await authAPI.checkEmail(email);
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Email check failed';
      set({ error: errorMessage });
      throw error;
    }
  },

  setUser: (user: User | null) => {
    set({
      user,
      isAuthenticated: !!user
    });
  },

  setLoading: (isLoading: boolean) => {
    set({ isLoading });
  },

  setError: (error: string | null) => {
    set({ error });
  },

  clearError: () => {
    set({ error: null });
  },
}));
