'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <div className="hero min-h-screen bg-base-200">
      <div className="hero-content text-center">
        <div className="max-w-lg">
          <h1 className="text-5xl font-bold mb-4">Gestión de Aforo</h1>
          <p className="text-lg mb-6 text-base-content/70">
            Sistema inteligente para la reserva y control de aforo en zonas comunes de tu edificio.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/auth/login" className="btn btn-primary">
              Iniciar Sesión
            </Link>
            <Link href="/auth/register" className="btn btn-outline btn-primary">
              Registrar Edificio
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
