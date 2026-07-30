'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface Edificio {
  id: string;
  nombre: string;
  email: string;
}

interface AuthContextType {
  edificio: Edificio | null;
  token: string | null;
  login: (token: string, edificio: Edificio) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function setAuthCookie(token: string) {
  document.cookie = `auth_token=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Strict`;
}

function clearAuthCookie() {
  document.cookie = 'auth_token=; path=/; max-age=0';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [edificio, setEdificio] = useState<Edificio | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedEdificio = localStorage.getItem('edificio');
    if (storedToken && storedEdificio) {
      setToken(storedToken);
      setEdificio(JSON.parse(storedEdificio));
    }
    setIsLoading(false);
  }, []);

  const login = (newToken: string, newEdificio: Edificio) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('edificio', JSON.stringify(newEdificio));
    setAuthCookie(newToken);
    setToken(newToken);
    setEdificio(newEdificio);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('edificio');
    clearAuthCookie();
    setToken(null);
    setEdificio(null);
  };

  return (
    <AuthContext.Provider value={{ edificio, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
}
