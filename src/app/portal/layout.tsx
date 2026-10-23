'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useResidentAuth } from '@/contexts/ResidentAuthContext';

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { resident, logout, isLoading } = useResidentAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAuthPage =
    pathname.startsWith('/portal/login') ||
    pathname.startsWith('/portal/registro');

  useEffect(() => {
    if (!isLoading && !resident && !isAuthPage) {
      router.replace('/portal/login');
    }
  }, [isLoading, resident, isAuthPage, router]);

  // If on login/registro, render directly without the resident topbar
  if (isAuthPage) {
    return <>{children}</>;
  }

  if (isLoading || !resident) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <div className="flex flex-col items-center gap-3">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="text-sm text-base-content/70 font-medium">Verificando sesión de residente...</p>
        </div>
      </div>
    );
  }

  const navLinks = [
    {
      name: 'Mi Hogar',
      href: '/portal/hogar',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      name: 'Zonas & Reservas',
      href: '/portal/reservas',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      name: 'Casillero',
      href: '/portal/casillero',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
    },
    {
      name: 'Visitas & Pases',
      href: '/portal/visitas',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-base-200">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-base-100/95 backdrop-blur border-b border-base-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand Logo & Name */}
            <div className="flex items-center gap-3">
              <Link href="/portal/hogar" className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary text-primary-content flex items-center justify-center font-black text-lg shadow-sm">
                  Z
                </div>
                <div>
                  <span className="font-extrabold text-base tracking-tight text-base-content block leading-tight">
                    Zonas Aforo
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-primary block leading-none">
                    Portal Residente
                  </span>
                </div>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors min-h-[44px] ${
                      isActive
                        ? 'bg-primary text-primary-content shadow-sm'
                        : 'text-base-content/80 hover:bg-base-200 hover:text-base-content'
                    }`}
                  >
                    {link.icon}
                    <span>{link.name}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Right side Profile & Logout */}
            <div className="hidden md:flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs font-bold text-base-content leading-tight">
                  {resident.nombre}
                </p>
                <p className="text-[11px] text-base-content/60 leading-tight">
                  {resident.email}
                </p>
              </div>

              <button
                onClick={() => {
                  logout();
                  router.push('/portal/login');
                }}
                className="btn btn-ghost btn-sm text-error rounded-xl hover:bg-error/10 min-h-[40px] px-3 font-semibold"
                title="Cerrar sesión"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Salir
              </button>
            </div>

            {/* Mobile Hamburger Button */}
            <div className="md:hidden flex items-center">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="btn btn-ghost btn-square min-w-[48px] min-h-[48px] rounded-xl text-base-content"
                aria-label="Abrir menú de navegación"
              >
                {mobileMenuOpen ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-base-300 bg-base-100 px-4 pt-3 pb-6 space-y-3 animate-fadeIn">
            {/* Resident Mobile Badge */}
            <div className="p-3 bg-base-200 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-base-content">{resident.nombre}</p>
                <p className="text-[11px] text-base-content/60">{resident.email}</p>
              </div>
              <span className="badge badge-primary badge-sm">Residente</span>
            </div>

            <nav className="space-y-1">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-semibold min-h-[48px] touch-manipulation ${
                      isActive
                        ? 'bg-primary text-primary-content'
                        : 'text-base-content/80 hover:bg-base-200'
                    }`}
                  >
                    {link.icon}
                    <span>{link.name}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="pt-2 border-t border-base-200">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                  router.push('/portal/login');
                }}
                className="btn btn-outline btn-error w-full rounded-xl min-h-[48px] text-base font-semibold touch-manipulation flex items-center justify-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Cerrar Sesión
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-base-300 bg-base-100 py-4 text-center text-xs text-base-content/50">
        <p>© {new Date().getFullYear()} Zonas Aforo · Portal de Autoservicio para Copropiedades</p>
      </footer>
    </div>
  );
}
