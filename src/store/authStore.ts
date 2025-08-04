import { create } from 'zustand';
import type {AuthState, User} from '../types/auth';
import { authAPI } from '../services/api';

interface AuthStore extends AuthState {
  checkAuthStatus: () => Promise<void>;
  login: (provider: 'github' | 'google') => void;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  checkAuthStatus: async () => {
    try {
      set({ isLoading: true, error: null });
      console.log('Checking auth status...');

      const response = await authAPI.getCurrentUser();
      console.log('Auth response:', response.data);

      // Based on backend docs, /api/auth/user returns user data directly
      const userData = response.data;
      if (userData && userData.id) {
        set({
          user: userData,
          isAuthenticated: true,
          isLoading: false
        });
        console.log('User authenticated:', userData);
      } else {
        console.log('No valid user data in response');
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
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null // Don't set error for unauthenticated state
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

  logout: async () => {
    try {
      console.log('Logging out...');
      set({ isLoading: true });

      await authAPI.logout();
      console.log('Logout successful');

      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      });

      // Use window.location.replace to prevent back button issues
      window.location.replace('/login');
    } catch (error: unknown) {
      console.error('Logout error:', error);
      // Force logout on client side even if server call fails
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      });
      window.location.replace('/login');
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
