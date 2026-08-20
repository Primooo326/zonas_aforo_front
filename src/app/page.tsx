'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-base-200 px-4 py-10">
      <div className="w-full max-w-lg text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-box bg-primary/10 text-primary">
          <span className="icon-[tabler--building] text-2xl" aria-hidden="true" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Gestión de Aforo</h1>
        <p className="mt-3 text-base text-base-content/70 sm:text-lg">
          Reserva y controla el aforo de las zonas comunes de tu edificio.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row sm:gap-4">
          <Link href="/auth/login" className="btn btn-primary">
            <span className="icon-[tabler--login] text-lg" aria-hidden="true" />
            Iniciar Sesión
          </Link>
          <Link href="/auth/register" className="btn btn-outline btn-primary">
            <span className="icon-[tabler--building-plus] text-lg" aria-hidden="true" />
            Registrar Edificio
          </Link>
        </div>
      </div>
    </div>
  );
}
