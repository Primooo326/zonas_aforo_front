'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { PorteriaProvider, usePorteria } from '@/contexts/PorteriaContext';

function PorteriaLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { puesto, vigilanteActivo, vigilantes, setVigilanteActivo, logout, isLoading } = usePorteria();
  const [horaActual, setHoraActual] = useState('');

  const isLoginPage = pathname === '/porteria/login';

  // Reloj en tiempo real con números tabulares
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setHoraActual(
        now.toLocaleTimeString('es-CO', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        }),
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isLoading && !puesto && !isLoginPage) {
      router.replace('/porteria/login');
    }
  }, [isLoading, puesto, isLoginPage, router]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (isLoading || !puesto) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200 text-base-content">
        <div className="flex flex-col items-center gap-3">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="text-sm font-semibold tracking-wide text-base-content/70">
            Conectando con la Consola de Vigilancia...
          </p>
        </div>
      </div>
    );
  }

  const navItems = [
    { href: '/porteria', label: 'Operaciones', icon: 'icon-[tabler--search]' },
    { href: '/porteria/casillero', label: 'Casillero', icon: 'icon-[tabler--package]' },
    { href: '/porteria/minuta', label: 'Minuta Digital', icon: 'icon-[tabler--notebook]' },
    { href: '/porteria/visitas', label: 'Control de Visitas', icon: 'icon-[tabler--users]' },
    { href: '/porteria/reservas-hoy', label: 'Reservas Hoy', icon: 'icon-[tabler--calendar-event]' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-base-200 text-base-content selection:bg-primary selection:text-primary-content">
      {/* Header Operativo Arquitectónico */}
      <header className="sticky top-0 z-40 bg-base-100/95 backdrop-blur border-b arch-border shadow-xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 py-3">
            {/* Logo y Nombre del Puesto */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center text-xl shrink-0">
                  <span className="icon-[tabler--shield-check] text-xl" aria-hidden="true"></span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base tracking-tight text-base-content leading-tight">
                      Portería Digital
                    </span>
                    <span className="badge badge-xs badge-outline border-primary/30 text-primary font-bold uppercase text-[9px] px-1.5 py-0.5">
                      Operativo 24/7
                    </span>
                  </div>
                  <span className="text-xs text-base-content/60 block font-medium">
                    {puesto.nombreEdificio}
                  </span>
                </div>
              </div>

              {/* Reloj Digital en móvil */}
              <div className="md:hidden font-mono font-bold text-xs bg-base-200 px-2.5 py-1 rounded-md border arch-border text-base-content tabular-nums">
                {horaActual}
              </div>
            </div>

            {/* Controles de Turno y Guardia Activo */}
            <div className="flex items-center flex-wrap gap-2.5 justify-between md:justify-end">
              {/* Reloj Digital Desktop */}
              <div className="hidden md:flex items-center gap-1.5 font-mono font-bold text-xs bg-base-200 px-3 py-1.5 rounded-md border arch-border text-base-content tabular-nums">
                <span className="icon-[tabler--clock] text-sm text-primary" aria-hidden="true"></span>
                {horaActual}
              </div>

              {/* Selector del Vigilante Responsable */}
              <div className="flex items-center gap-2 bg-base-200 border arch-border rounded-md px-2.5 py-1">
                <span className="text-2xs font-semibold text-base-content/70 flex items-center gap-1">
                  <span className="icon-[tabler--user-check] text-primary" aria-hidden="true"></span>
                  Guardia:
                </span>
                <select
                  className="bg-transparent text-xs font-bold text-base-content outline-none cursor-pointer max-w-[150px] sm:max-w-[200px]"
                  value={vigilanteActivo?._id || ''}
                  onChange={(e) => {
                    const found = vigilantes.find((v) => v._id === e.target.value);
                    setVigilanteActivo(found || null);
                  }}
                >
                  {vigilantes.length === 0 ? (
                    <option value="" className="bg-base-100 text-base-content/60">
                      Sin vigilantes registrados
                    </option>
                  ) : (
                    vigilantes.map((v) => (
                      <option key={v._id} value={v._id} className="bg-base-100 text-base-content">
                        {v.nombreCompleto}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Botón Salir */}
              <button
                onClick={logout}
                title="Cerrar sesión de portería"
                className="btn btn-sm btn-outline btn-ghost arch-border text-base-content/75 hover:text-error hover:border-error/30 hover:bg-error/10"
              >
                <span className="icon-[tabler--logout] text-base" aria-hidden="true"></span>
                <span className="hidden sm:inline text-xs font-medium">Salir</span>
              </button>
            </div>
          </div>

          {/* Menú de Navegación de Pestañas */}
          <nav className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none border-t arch-border pt-1.5">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-bold whitespace-nowrap transition-colors ${
                    active
                      ? 'bg-primary text-primary-content shadow-xs'
                      : 'text-base-content/70 hover:text-base-content hover:bg-base-200'
                  }`}
                >
                  <span className={`${item.icon} text-base`} aria-hidden="true"></span>
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Contenido Dinámico */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3.5 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
}

export default function PorteriaLayout({ children }: { children: React.ReactNode }) {
  return (
    <PorteriaProvider>
      <PorteriaLayoutContent>{children}</PorteriaLayoutContent>
    </PorteriaProvider>
  );
}
