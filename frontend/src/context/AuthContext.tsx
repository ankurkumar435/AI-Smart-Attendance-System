import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '../types';
import { api } from '../services/api';
import { cryptoStorage } from '../utils/cryptoStorage';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<User>;
  register: (data: any) => Promise<User>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(cryptoStorage.getItem('attendance_token'));
  const [loading, setLoading] = useState<boolean>(true);

  const refreshProfile = async () => {
    try {
      const data = await api.auth.getProfile();
      setUser({
        id: data.id,
        username: data.username,
        role: data.role,
        name: data.name,
        require_password_change: data.require_password_change,
        profile_id: data.profile?.id || null,
        student_id: data.profile?.student_id || null,
        teacher_id: data.profile?.teacher_id || null,
      });
    } catch (err) {
      console.error('Failed to load user profile:', err);
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      refreshProfile();
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (username: string, password: string): Promise<User> => {
    const data = await api.auth.login({ username, password });
    cryptoStorage.setItem('attendance_token', data.access_token);
    setToken(data.access_token);
    const loggedInUser: User = {
      id: data.user_id,
      username: data.username,
      role: data.role,
      name: data.name,
      require_password_change: data.require_password_change,
      profile_id: data.profile_id,
      student_id: data.student_id,
      teacher_id: data.teacher_id,
    };
    setUser(loggedInUser);
    return loggedInUser;
  };

  const register = async (formData: any): Promise<User> => {
    const data = await api.auth.register(formData);
    cryptoStorage.setItem('attendance_token', data.access_token);
    setToken(data.access_token);
    const newUser: User = {
      id: data.user_id,
      username: data.username,
      role: data.role,
      name: data.name,
      require_password_change: false,
      profile_id: data.profile_id,
      student_id: data.student_id,
      teacher_id: data.teacher_id,
    };
    setUser(newUser);
    return newUser;
  };

  const logout = () => {
    cryptoStorage.removeItem('attendance_token');
    setToken(null);
    setUser(null);
  };

  const updateUser = (updates: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...updates });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        refreshProfile,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
