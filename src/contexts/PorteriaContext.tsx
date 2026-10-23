'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { porteriaApiFetch } from '@/lib/api';

export interface VigilanteItem {
  _id: string;
  nombreCompleto: string;
  cedula: string;
  empresaSeguridad?: string;
}

export interface PuestoInfo {
  edificioId: string;
  nombreEdificio: string;
  usuario: string;
  role: string;
}

interface PorteriaContextType {
  puesto: PuestoInfo | null;
  token: string | null;
  vigilanteActivo: VigilanteItem | null;
  vigilantes: VigilanteItem[];
  isLoading: boolean;
  login: (usuario: string, password: string) => Promise<void>;
  logout: () => void;
  setVigilanteActivo: (vigilante: VigilanteItem | null) => void;
  refreshVigilantes: () => Promise<void>;
}

const PorteriaContext = createContext<PorteriaContextType | undefined>(undefined);

export function PorteriaProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [puesto, setPuesto] = useState<PuestoInfo | null>(null);
  const [vigilanteActivo, setVigilanteActivoState] = useState<VigilanteItem | null>(null);
  const [vigilantes, setVigilantes] = useState<VigilanteItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const setVigilanteActivo = (v: VigilanteItem | null) => {
    setVigilanteActivoState(v);
    if (v) {
      localStorage.setItem('porteria_vigilante_activo', JSON.stringify(v));
    } else {
      localStorage.removeItem('porteria_vigilante_activo');
    }
  };

  const refreshVigilantes = async () => {
    try {
      const data = await porteriaApiFetch('/vigilantes/activos');
      setVigilantes(data || []);
      // Si hay un vigilante activo guardado, verificar que siga en la lista
      const savedV = localStorage.getItem('porteria_vigilante_activo');
      if (savedV) {
        try {
          const parsed = JSON.parse(savedV);
          const stillActive = (data || []).find((v: VigilanteItem) => v._id === parsed._id);
          if (stillActive) {
            setVigilanteActivoState(stillActive);
          } else if (data && data.length > 0) {
            setVigilanteActivo(data[0]);
          }
        } catch {
          // ignore parse error
        }
      } else if (data && data.length > 0) {
        setVigilanteActivo(data[0]);
      }
    } catch (err) {
      console.error('Error cargando vigilantes activos:', err);
    }
  };

  useEffect(() => {
    const savedToken = localStorage.getItem('porteria_token');
    const savedPuesto = localStorage.getItem('porteria_puesto');
    const savedVigilante = localStorage.getItem('porteria_vigilante_activo');

    if (savedToken && savedPuesto) {
      try {
        setToken(savedToken);
        setPuesto(JSON.parse(savedPuesto));
        if (savedVigilante) {
          setVigilanteActivoState(JSON.parse(savedVigilante));
        }
      } catch (e) {
        console.error('Error parsing saved porteria data:', e);
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (token) {
      refreshVigilantes();
    }
  }, [token]);

  const login = async (usuario: string, password: string) => {
    const res = await porteriaApiFetch('/vigilantes/login-puesto', {
      method: 'POST',
      body: JSON.stringify({ usuario, password }),
    });

    localStorage.setItem('porteria_token', res.access_token);
    localStorage.setItem('porteria_puesto', JSON.stringify(res.puesto));
    setToken(res.access_token);
    setPuesto(res.puesto);

    // Cargar vigilantes
    const vigs = await porteriaApiFetch('/vigilantes/activos', {
      headers: { Authorization: `Bearer ${res.access_token}` },
    });
    setVigilantes(vigs || []);
    if (vigs && vigs.length > 0) {
      setVigilanteActivo(vigs[0]);
    }

    router.push('/porteria');
  };

  const logout = () => {
    localStorage.removeItem('porteria_token');
    localStorage.removeItem('porteria_puesto');
    localStorage.removeItem('porteria_vigilante_activo');
    setToken(null);
    setPuesto(null);
    setVigilanteActivoState(null);
    setVigilantes([]);
    router.push('/porteria/login');
  };

  return (
    <PorteriaContext.Provider
      value={{
        puesto,
        token,
        vigilanteActivo,
        vigilantes,
        isLoading,
        login,
        logout,
        setVigilanteActivo,
        refreshVigilantes,
      }}
    >
      {children}
    </PorteriaContext.Provider>
  );
}

export function usePorteria() {
  const context = useContext(PorteriaContext);
  if (!context) {
    throw new Error('usePorteria debe ser usado dentro de un PorteriaProvider');
  }
  return context;
}
