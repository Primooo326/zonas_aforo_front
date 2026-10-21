'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export interface ResidentUser {
  id: string;
  nombre: string;
  email: string;
  edificioId: string;
  censoUnidadId?: string;
  tipoResidente?: string;
}

interface ResidentAuthContextType {
  resident: ResidentUser | null;
  token: string | null;
  login: (token: string, resident: ResidentUser) => void;
  logout: () => void;
  isLoading: boolean;
}

const ResidentAuthContext = createContext<ResidentAuthContextType | undefined>(undefined);

function setResidentAuthCookie(token: string) {
  if (typeof document !== 'undefined') {
    document.cookie = `resident_auth_token=${token}; path=/portal; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
  }
}

function clearResidentAuthCookie() {
  if (typeof document !== 'undefined') {
    document.cookie = 'resident_auth_token=; path=/portal; max-age=0';
  }
}

export function ResidentAuthProvider({ children }: { children: ReactNode }) {
  const [resident, setResident] = useState<ResidentUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('resident_token');
      const storedResident = localStorage.getItem('resident_user');
      if (storedToken && storedResident) {
        setToken(storedToken);
        setResident(JSON.parse(storedResident));
      }
    } catch {
      // Ignore JSON parse errors
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = (newToken: string, newResident: ResidentUser) => {
    localStorage.setItem('resident_token', newToken);
    localStorage.setItem('resident_user', JSON.stringify(newResident));
    setResidentAuthCookie(newToken);
    setToken(newToken);
    setResident(newResident);
  };

  const logout = () => {
    localStorage.removeItem('resident_token');
    localStorage.removeItem('resident_user');
    clearResidentAuthCookie();
    setToken(null);
    setResident(null);
  };

  return (
    <ResidentAuthContext.Provider value={{ resident, token, login, logout, isLoading }}>
      {children}
    </ResidentAuthContext.Provider>
  );
}

export function useResidentAuth() {
  const context = useContext(ResidentAuthContext);
  if (!context) {
    throw new Error('useResidentAuth debe usarse dentro de ResidentAuthProvider');
  }
  return context;
}
