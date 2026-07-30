'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

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

  return (
    <div className="flex h-screen">
      <aside className="w-64 bg-base-300 p-4 flex flex-col">
        <div className="mb-6">
          <h2 className="text-lg font-bold truncate">{edificio.nombre}</h2>
          <p className="text-sm text-base-content/60">{edificio.email}</p>
        </div>
        <nav className="flex flex-col gap-1 flex-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`btn btn-ghost justify-start ${pathname === link.href ? 'btn-active' : ''}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <button onClick={logout} className="btn btn-outline btn-error mt-4">
          Cerrar Sesión
        </button>
      </aside>
      <main className="flex-1 p-6 overflow-auto bg-base-200">{children}</main>
    </div>
  );
}
