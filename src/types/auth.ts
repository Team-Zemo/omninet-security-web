export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  provider: 'github' | 'google' | 'email';
  primaryProvider?: string;
  linkedProviders?: string;
  accountMerged: boolean;
  createdAt: string;
  lastLoginAt: string;
  attributes?: Record<string, any>;
  emailVerified?: boolean;
  registrationSource?: string;
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

// Email Registration Types
export interface EmailRegistrationInitiateRequest {
  email: string;
  name: string;
}

export interface EmailRegistrationInitiateResponse {
  success: boolean;
  message: string;
  hasExistingOAuth: boolean;
  existingProviders?: string[];
}

export interface EmailVerificationRequest {
  email: string;
  otpCode: string;
}

export interface EmailVerificationResponse {
  success: boolean;
  message: string;
  verificationToken: string;
  hasConflict: boolean;
  conflictDetails?: {
    existingProviders: string[];
    requiresConfirmation: boolean;
  };
}

export interface EmailRegistrationCompleteRequest {
  email: string;
  name: string;
  password: string;
  verificationToken: string;
}

export interface EmailRegistrationCompleteResponse {
  success: boolean;
  message: string;
  user?: User;
  merged?: boolean;
  mergedProviders?: string;
}

export interface EmailLoginRequest {
  email: string;
  password: string;
}

// JWT Authentication Types
export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    accessToken: string;
    refreshToken: string;
    tokenType: string;
    expiresIn: number;
    authMethod: string;
    hasMultipleProviders: boolean;
  } | null;
  error?: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  success: boolean;
  message: string;
  data: {
    accessToken: string;
    tokenType: string;
    expiresIn: number;
  } | null;
}

export interface LogoutRequest {
  refreshToken: string;
}

export interface LogoutResponse {
  success: boolean;
  message: string;
  data: {
    message: string;
  } | null;
}

export interface UserResponse {
  success: boolean;
  message: string;
  data: User | null;
}

// Updated Auth Methods Response
export interface AuthMethodsResponse {
  success: boolean;
  message: string;
  data: {
    emailPassword: boolean;
    oauth: boolean;
    providers: string[];
    canRegister: boolean;
    accountExists: boolean;
  };
}

// Updated Check Email Response
export interface CheckEmailResponse {
  available: boolean;
  message: string;
}

// Token storage interface
export interface TokenStorage {
  accessToken: string | null;
  refreshToken: string | null;
  tokenType: string;
  expiresAt: number | null;
}
