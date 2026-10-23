'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

declare global {
  interface Window {
    HSOverlay?: {
      close: (el: HTMLElement) => void;
    };
  }
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { edificio, logout, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !edificio) {
      router.push('/auth/login');
    }
  }, [isLoading, edificio, router]);

  const links = [
    { href: '/dashboard', label: 'Panel de Control', icon: 'icon-[tabler--layout-dashboard]' },
    { href: '/dashboard/zonas', label: 'Zonas Comunes & Reservas', icon: 'icon-[tabler--calendar-event]' },
    { href: '/dashboard/censo', label: 'Censo e Inmuebles', icon: 'icon-[tabler--building-community]' },
    { href: '/dashboard/vigilantes', label: 'Vigilancia & Portería', icon: 'icon-[tabler--shield-check]' },
    { href: '/dashboard/inmuebles', label: 'Venta y Arriendo', icon: 'icon-[tabler--home-dollar]' },
  ];

  const closeDrawer = () => {
    const el = document.getElementById('dashboard-drawer');
    if (el) {
      try {
        if (window.HSOverlay && typeof window.HSOverlay.close === 'function') {
          window.HSOverlay.close(el);
        }
      } catch {
        // Ignorar si FlyonUI aún no tiene el elemento registrado en su colección
      }
      el.classList.remove('open', 'opened');
      el.classList.add('hidden');
    }
    document.body.classList.remove('overlay-body-open');
    document.body.style.overflow = '';

    // Eliminación forzosa e inmediata de cualquier backdrop residual generado por FlyonUI
    const backdrops = document.querySelectorAll(
      '.overlay-backdrop, [data-overlay-backdrop-template], #dashboard-drawer-backdrop'
    );
    backdrops.forEach((backdrop) => {
      backdrop.remove();
    });
  };

  // Garantizar cierre del drawer y purga de backdrops en cualquier cambio de ruta
  useEffect(() => {
    closeDrawer();
  }, [pathname]);

  // Capturar clicks en el backdrop para asegurar limpieza total e inmediata
  useEffect(() => {
    const handleBackdropClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.classList.contains('overlay-backdrop') ||
          target.id === 'dashboard-drawer-backdrop' ||
          target.hasAttribute('data-overlay-backdrop-template'))
      ) {
        closeDrawer();
      }
    };
    document.addEventListener('click', handleBackdropClick, true);
    return () => {
      document.removeEventListener('click', handleBackdropClick, true);
    };
  }, []);

  if (isLoading) return null;
  if (!edificio) return null;

  return (
    <div className="flex h-screen flex-col lg:flex-row bg-base-200 overflow-hidden w-full">
      {/* Barra superior de navegación móvil */}
      <nav className="navbar bg-base-100 border-b arch-border lg:hidden px-3 min-h-14">
        <div className="flex-none">
          <button
            type="button"
            className="btn btn-outline btn-square btn-sm arch-border text-base-content hover:bg-base-200 hover:text-primary"
            aria-haspopup="dialog"
            aria-expanded="false"
            aria-controls="dashboard-drawer"
            data-overlay="#dashboard-drawer"
            aria-label="Abrir menú"
          >
            <span className="icon-[tabler--menu-2] text-xl" aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 min-w-0 px-2 text-center">
          <span className="truncate block text-sm sm:text-base font-bold text-base-content">
            {edificio.nombre}
          </span>
        </div>
        <div className="flex-none">
          <button onClick={logout} className="btn btn-outline btn-error btn-xs gap-1 px-2.5">
            <span className="icon-[tabler--logout] text-sm" aria-hidden="true" />
            <span>Salir</span>
          </button>
        </div>
      </nav>

      {/* Barra lateral / Sidebar arquitectónico */}
      <aside
        id="dashboard-drawer"
        className="overlay overlay-open:translate-x-0 drawer drawer-start hidden w-64 bg-base-100 border-r arch-border shadow-none [--auto-close:lg] lg:flex lg:translate-x-0 lg:static lg:shadow-none flex-col"
        role="dialog"
        aria-label="Menú de navegación"
        tabIndex={-1}
      >
        <div className="drawer-header border-b arch-border px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-md bg-primary/10 border border-primary/20 text-primary flex items-center justify-center flex-none">
              <span className="icon-[tabler--building-community] text-lg" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-bold text-base-content truncate leading-tight">
                {edificio.nombre}
              </h2>
              <p className="text-2xs text-base-content/60 truncate mt-0.5">
                {edificio.email}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeDrawer}
            className="btn btn-ghost btn-circle btn-xs lg:hidden"
            aria-label="Cerrar menú"
            data-overlay="#dashboard-drawer"
          >
            <span className="icon-[tabler--x] text-lg" aria-hidden="true" />
          </button>
        </div>

        <div className="drawer-body px-3 py-4 flex-1 overflow-y-auto">
          <span className="text-3xs uppercase tracking-wider font-bold text-base-content/50 px-2.5 block mb-2">
            Módulos de Copropiedad
          </span>
          <nav className="flex flex-col gap-1">
            {links.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={closeDrawer}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary/10 text-primary font-bold border border-primary/25'
                      : 'text-base-content/75 hover:text-base-content hover:bg-base-200 border border-transparent'
                  }`}
                >
                  <span
                    className={`${link.icon} text-lg shrink-0 ${
                      isActive ? 'text-primary' : 'text-base-content/60'
                    }`}
                    aria-hidden="true"
                  />
                  <span className="truncate">{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="drawer-footer border-t arch-border p-3.5">
          <button
            onClick={logout}
            className="btn btn-outline btn-error btn-sm w-full gap-2 font-medium rounded-md"
          >
            <span className="icon-[tabler--logout] text-base" aria-hidden="true" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Contenido principal */}
      <main className="flex-1 min-w-0 p-3.5 sm:p-6 lg:p-8 overflow-y-auto overflow-x-hidden bg-base-200">
        <div className="max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
