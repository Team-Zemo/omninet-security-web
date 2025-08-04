export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  provider: 'github' | 'google';
  primaryProvider?: string;
  linkedProviders?: string;
  accountMerged: boolean;
  createdAt: string;
  lastLoginAt: string;
  attributes?: Record<string, any>;
}

export interface UserProfile {
  user: User;
  attributes: Record<string, any>;
  authorities: string[];
}

export interface DashboardStats {
  totalUsers: number;
  githubUsers: number;
  googleUsers: number;
  mergedAccounts: number;
  otherProviders: number;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}
