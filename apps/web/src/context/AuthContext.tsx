import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, User } from '../lib/api';

const AUTH_USER_KEY = 'proofchain_current_user';
const AUTH_TOKEN_KEY = 'proofchain_auth_token';

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, password?: string) => Promise<User>;
  register: (data: {
    username: string;
    email: string;
    name: string;
    password?: string;
    role?: 'issuer' | 'creator' | 'auditor';
    organization?: string;
  }) => Promise<User>;
  loginWithDemoUser: (user: User) => void;
  logout: () => void;
  switchUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Restore cached user from localStorage on initial load
  useEffect(() => {
    try {
      const stored = localStorage.getItem(AUTH_USER_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.id) {
          setCurrentUser(parsed);
        }
      }
    } catch (e) {
      console.warn('Failed to parse cached user:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveUserSession = (user: User, token?: string) => {
    setCurrentUser(user);
    try {
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
      if (token) {
        localStorage.setItem(AUTH_TOKEN_KEY, token);
      }
    } catch (e) {
      console.warn('Failed to store session:', e);
    }
  };

  const login = async (identifier: string, password?: string): Promise<User> => {
    const res = await api.login({ identifier, password });
    saveUserSession(res.user, res.token);
    return res.user;
  };

  const register = async (data: {
    username: string;
    email: string;
    name: string;
    password?: string;
    role?: 'issuer' | 'creator' | 'auditor';
    organization?: string;
  }): Promise<User> => {
    const res = await api.registerUser(data);
    saveUserSession(res.user, res.token);
    return res.user;
  };

  const loginWithDemoUser = (user: User) => {
    const dummyToken = `tok_${user.id}_demo_${Date.now()}`;
    saveUserSession(user, dummyToken);
  };

  const switchUser = (user: User) => {
    loginWithDemoUser(user);
  };

  const logout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem(AUTH_USER_KEY);
      localStorage.removeItem(AUTH_TOKEN_KEY);
    } catch {}
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser,
        isLoading,
        login,
        register,
        loginWithDemoUser,
        logout,
        switchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
