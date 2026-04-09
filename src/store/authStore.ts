import { invoke } from '@tauri-apps/api/core';

const STORAGE_KEY = 'coda_auth_tokens';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  userId: number;
  username: string;
  accessExpiresAt: number;
  refreshExpiresAt: number;
  rememberMe: boolean;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  refresh_token?: string;
  user_id?: number;
  username?: string;
  access_expires_at?: number;
  refresh_expires_at?: number;
  message: string;
}

export interface RefreshResponse {
  success: boolean;
  access_token?: string;
  access_expires_at?: number;
  message: string;
}

// Secure storage using localStorage (will be migrated to Stronghold in future)
export const authStorage = {
  saveTokens: (tokens: AuthTokens): void => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
    } catch (e) {
      console.error('Failed to save auth tokens:', e);
    }
  },

  getTokens: (): AuthTokens | null => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return null;
      return JSON.parse(stored) as AuthTokens;
    } catch (e) {
      console.error('Failed to get auth tokens:', e);
      return null;
    }
  },

  clearTokens: (): void => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error('Failed to clear auth tokens:', e);
    }
  },

  isTokenExpired: (expiresAt: number): boolean => {
    // Add 5 minute buffer before actual expiry
    const bufferMs = 5 * 60 * 1000;
    return Date.now() >= (expiresAt * 1000) - bufferMs;
  },
};

// API functions
export const authApi = {
  login: async (
    username: string,
    password: string,
    rememberMe: boolean
  ): Promise<AuthResponse> => {
    return await invoke('login', { username, password, rememberMe });
  },

  refreshAccessToken: async (refreshToken: string): Promise<RefreshResponse> => {
    return await invoke('refresh_access_token', { refreshToken });
  },

  logout: async (
    accessToken: string,
    refreshToken: string | undefined,
    userId: number
  ): Promise<boolean> => {
    return await invoke('logout', { accessToken, refreshToken, userId });
  },

  validateToken: async (token: string, tokenType: 'access' | 'refresh'): Promise<boolean> => {
    return await invoke('validate_token', { token, tokenType });
  },
};

// Session management for in-memory only sessions
let memorySession: AuthTokens | null = null;

export const sessionManager = {
  setSession: (tokens: AuthTokens, rememberMe: boolean): void => {
    if (rememberMe) {
      authStorage.saveTokens(tokens);
      memorySession = null;
    } else {
      memorySession = tokens;
      authStorage.clearTokens();
    }
  },

  getSession: (): AuthTokens | null => {
    // First check memory session (non-remember-me)
    if (memorySession) {
      return memorySession;
    }
    // Then check persistent storage (remember-me)
    return authStorage.getTokens();
  },

  clearSession: (): void => {
    memorySession = null;
    authStorage.clearTokens();
  },

  isSessionValid: (): boolean => {
    const session = sessionManager.getSession();
    if (!session) return false;

    // Check if access token is expired but refresh token is still valid
    if (authStorage.isTokenExpired(session.accessExpiresAt)) {
      return !authStorage.isTokenExpired(session.refreshExpiresAt);
    }

    return true;
  },

  refreshIfNeeded: async (): Promise<boolean> => {
    const session = sessionManager.getSession();
    if (!session) return false;

    // If access token is expired but refresh token is valid, refresh
    if (authStorage.isTokenExpired(session.accessExpiresAt)) {
      if (!authStorage.isTokenExpired(session.refreshExpiresAt)) {
        try {
          const response = await authApi.refreshAccessToken(session.refreshToken);
          if (response.success && response.access_token) {
            const newSession: AuthTokens = {
              ...session,
              accessToken: response.access_token,
              accessExpiresAt: response.access_expires_at || Math.floor(Date.now() / 1000) + 24 * 60 * 60,
            };
            sessionManager.setSession(newSession, session.rememberMe);
            return true;
          }
        } catch (e) {
          console.error('Failed to refresh token:', e);
        }
        return false;
      }
      return false;
    }

    return true;
  },
};
