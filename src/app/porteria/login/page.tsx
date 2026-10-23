'use client';

import React, { useState } from 'react';
import { usePorteria } from '@/contexts/PorteriaContext';
import Link from 'next/link';

export default function PorteriaLoginPage() {
  const { login } = usePorteria();
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!usuario.trim() || !password) {
      setError('Por favor ingresa usuario y contraseña de portería');
      return;
    }

    setLoading(true);
    try {
      await login(usuario.trim(), password);
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión de portería');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200 p-4 selection:bg-primary selection:text-primary-content">
      <div className="arch-panel bg-base-100 w-full max-w-md p-6 sm:p-8 shadow-xs">
        {/* Cabecera Arquitectónica */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center text-2xl font-black mb-3 shrink-0">
            <span className="icon-[tabler--shield-lock]" aria-hidden="true"></span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-base-content">
            Consola de Portería
          </h1>
          <p className="text-xs text-base-content/60 mt-1">
            Zonas Aforo &bull; Control Operativo 24/7 y Seguridad 360
          </p>
        </div>

        {error && (
          <div className="alert alert-error bg-error/10 border border-error/30 text-error text-xs py-2.5 px-3.5 rounded-md mb-6 flex items-center gap-2">
            <span className="icon-[tabler--alert-circle] text-lg text-error" aria-hidden="true"></span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-2xs font-bold text-base-content/70 uppercase tracking-wider mb-1.5">
              Puesto de Portería / Edificio
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-base-content/40">
                <span className="icon-[tabler--building] text-lg" aria-hidden="true"></span>
              </span>
              <input
                type="text"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                placeholder="ej: porteria_palma o correo del edificio"
                className="input input-bordered arch-border bg-base-100 text-base-content w-full rounded-md pl-10 pr-3.5 py-2.5 text-sm focus:border-primary font-medium"
                required
              />
            </div>
            <p className="text-3xs text-base-content/50 mt-1">
              Usuario de puesto configurado por la administración.
            </p>
          </div>

          <div>
            <label className="block text-2xs font-bold text-base-content/70 uppercase tracking-wider mb-1.5">
              Contraseña de Vigilancia
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-base-content/40">
                <span className="icon-[tabler--key] text-lg" aria-hidden="true"></span>
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input input-bordered arch-border bg-base-100 text-base-content w-full rounded-md pl-10 pr-3.5 py-2.5 text-sm focus:border-primary font-medium"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full gap-2 font-bold text-sm shadow-xs mt-4 cursor-pointer"
          >
            {loading ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                <span>Ingresando al puesto...</span>
              </>
            ) : (
              <>
                <span className="icon-[tabler--login-2] text-lg" aria-hidden="true"></span>
                <span>Acceder a la Consola</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t arch-border text-center">
          <p className="text-xs text-base-content/60">
            ¿Eres administrador de la copropiedad?{' '}
            <Link
              href="/auth/login"
              className="font-bold text-primary hover:underline transition-colors"
            >
              Ingresar al Panel Admin
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
