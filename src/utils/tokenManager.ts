import type { TokenStorage } from '../types/auth';

const TOKEN_STORAGE_KEY = 'omninet_auth_tokens';

export class TokenManager {
  private static instance: TokenManager;

  static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager();
    }
    return TokenManager.instance;
  }

  // Store tokens securely
  setTokens(tokens: {
    accessToken: string;
    refreshToken: string;
    tokenType: string;
    expiresIn: number;
  }): void {
    const tokenData: TokenStorage = {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenType: tokens.tokenType,
      expiresAt: Date.now() + tokens.expiresIn
    };

    localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokenData));
  }

  // Get stored tokens
  getTokens(): TokenStorage {
    const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!stored) {
      return {
        accessToken: null,
        refreshToken: null,
        tokenType: 'Bearer',
        expiresAt: null
      };
    }

    try {
      return JSON.parse(stored);
    } catch {
      this.clearTokens();
      return {
        accessToken: null,
        refreshToken: null,
        tokenType: 'Bearer',
        expiresAt: null
      };
    }
  }

  // Get access token if valid
  getAccessToken(): string | null {
    const tokens = this.getTokens();
    if (!tokens.accessToken || !tokens.expiresAt) {
      return null;
    }

    // Check if token is expired (with 5 minute buffer)
    const fiveMinutes = 5 * 60 * 1000;
    if (Date.now() + fiveMinutes >= tokens.expiresAt) {
      return null;
    }

    return tokens.accessToken;
  }

  // Get refresh token
  getRefreshToken(): string | null {
    const tokens = this.getTokens();
    return tokens.refreshToken;
  }

  // Check if access token is expired
  isAccessTokenExpired(): boolean {
    const tokens = this.getTokens();
    if (!tokens.expiresAt) return true;

    // Consider expired if less than 5 minutes remaining
    const fiveMinutes = 5 * 60 * 1000;
    return Date.now() + fiveMinutes >= tokens.expiresAt;
  }

  // Update only access token (for refresh)
  updateAccessToken(accessToken: string, expiresIn: number): void {
    const tokens = this.getTokens();
    tokens.accessToken = accessToken;
    tokens.expiresAt = Date.now() + expiresIn;
    localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
  }

  // Clear all tokens
  clearTokens(): void {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    const accessToken = this.getAccessToken();
    const refreshToken = this.getRefreshToken();
    return !!(accessToken || refreshToken);
  }
}

export const tokenManager = TokenManager.getInstance();
