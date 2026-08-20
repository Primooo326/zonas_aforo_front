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

  if (isLoading) return null;
  if (!edificio) return null;

  const links = [
    { href: '/dashboard', label: 'Panel de Control', icon: 'icon-[tabler--layout-dashboard]' },
    { href: '/dashboard/zonas', label: 'Zonas', icon: 'icon-[tabler--map-pin]' },
    { href: '/dashboard/invitacion', label: 'Invitaciones', icon: 'icon-[tabler--qrcode]' },
  ];

  const closeDrawer = () => {
    const el = document.getElementById('dashboard-drawer');
    if (el) {
      if (window.HSOverlay && typeof window.HSOverlay.close === 'function') {
        window.HSOverlay.close(el);
      }
      el.classList.remove('open', 'opened');
      el.classList.add('hidden');
    }
    document.body.classList.remove('overlay-body-open');
    document.body.style.overflow = '';
  };

  return (
    <div className="flex h-screen flex-col lg:flex-row">
      <nav className="navbar bg-base-100 border-b border-base-content/10 lg:hidden">
        <div className="navbar-start">
          <button
            type="button"
            className="btn btn-ghost btn-square btn-sm"
            aria-haspopup="dialog"
            aria-expanded="false"
            aria-controls="dashboard-drawer"
            data-overlay="#dashboard-drawer"
            aria-label="Abrir menú"
          >
            <span className="icon-[tabler--menu-2] text-xl" aria-hidden="true" />
          </button>
        </div>
        <div className="navbar-center min-w-0">
          <span className="truncate text-base font-semibold text-base-content">
            {edificio.nombre}
          </span>
        </div>
        <div className="navbar-end">
          <button onClick={logout} className="btn btn-outline btn-error btn-sm">
            <span className="icon-[tabler--logout] text-lg" aria-hidden="true" />
            Salir
          </button>
        </div>
      </nav>

      <aside
        id="dashboard-drawer"
        className="overlay overlay-open:translate-x-0 drawer drawer-start hidden w-64 [--auto-close:lg] lg:flex lg:translate-x-0 lg:static lg:shadow-none"
        role="dialog"
        aria-label="Menú de navegación"
        tabIndex={-1}
      >
        <div className="drawer-header">
          <div className="min-w-0">
            <h2 className="drawer-title truncate">{edificio.nombre}</h2>
            <p className="truncate text-sm text-base-content/60">{edificio.email}</p>
          </div>
          <button
            type="button"
            className="btn btn-text btn-circle btn-sm lg:hidden"
            aria-label="Cerrar menú"
            data-overlay="#dashboard-drawer"
          >
            <span className="icon-[tabler--x] text-xl" aria-hidden="true" />
          </button>
        </div>
        <div className="drawer-body flex flex-col gap-1">
          <nav className="flex flex-col gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeDrawer}
                className={`btn btn-ghost btn-md justify-start ${pathname === link.href ? 'btn-active' : ''}`}
              >
                <span className={`${link.icon} text-lg`} aria-hidden="true" />
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="drawer-footer">
          <button onClick={logout} className="btn btn-outline btn-error w-full">
            <span className="icon-[tabler--logout] text-lg" aria-hidden="true" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 p-4 overflow-auto bg-base-200 lg:p-6">{children}</main>
    </div>
  );
}
