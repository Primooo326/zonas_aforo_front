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
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/dashboard/zonas', label: 'Zonas' },
    { href: '/dashboard/invitacion', label: 'Invitaciones' },
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
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="4" x2="20" y1="6" y2="6" />
              <line x1="4" x2="20" y1="12" y2="12" />
              <line x1="4" x2="20" y1="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="navbar-center min-w-0">
          <span className="truncate text-base font-semibold text-base-content">
            {edificio.nombre}
          </span>
        </div>
        <div className="navbar-end">
          <button onClick={logout} className="btn btn-outline btn-error btn-sm">
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
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="drawer-body flex flex-col gap-1">
          <nav className="flex flex-col gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeDrawer}
                className={`btn btn-ghost btn-md justify-start ${
                  pathname === link.href ? 'btn-active' : ''
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="drawer-footer">
          <button onClick={logout} className="btn btn-outline btn-error w-full">
            Cerrar Sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 p-4 overflow-auto bg-base-200 lg:p-6">{children}</main>
    </div>
  );
}
