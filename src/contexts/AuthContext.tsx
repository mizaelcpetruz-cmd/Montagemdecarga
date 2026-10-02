import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { authService } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<{ mustChangePassword?: boolean; token?: string; user?: User }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('montagem_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('montagem_token');
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('montagem_token');
      if (savedToken) {
        try {
          const res = await authService.me();
          if (res.data) {
            setUser(res.data);
            localStorage.setItem('montagem_user', JSON.stringify(res.data));
          }
        } catch (err) {
          localStorage.removeItem('montagem_token');
          localStorage.removeItem('montagem_user');
          setUser(null);
          setToken(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, pass: string): Promise<{ mustChangePassword?: boolean; token?: string; user?: User }> => {
    const res = await authService.login(email, pass);
    if (res.success && res.data) {
      setToken(res.data.token);
      setUser(res.data.user);
      localStorage.setItem('montagem_token', res.data.token);
      localStorage.setItem('montagem_user', JSON.stringify(res.data.user));
      return res.data;
    }
    return {};
  };

  const logout = () => {
    localStorage.removeItem('montagem_token');
    localStorage.removeItem('montagem_user');
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de AuthProvider');
  }
  return context;
};
