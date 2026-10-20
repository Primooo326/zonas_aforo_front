'use client';

import Link from 'next/link';
import AforoScaleMeter from '@/components/AforoScaleMeter';

export default function Home() {
  return (
    <div className="min-h-dvh bg-base-200 flex flex-col justify-between p-4 sm:p-6 lg:p-10">
      {/* Barra superior de placa institucional */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between border-b arch-border pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-primary/10 border border-primary/25 text-primary flex items-center justify-center">
            <span className="icon-[tabler--building-community] text-xl" aria-hidden="true" />
          </div>
          <div>
            <span className="text-xs uppercase tracking-wider font-semibold text-primary block">
              Sistema de Copropiedades
            </span>
            <span className="text-base font-bold text-base-content tracking-tight">
              Control de Zonas & Aforo
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/auth/login"
            className="btn btn-outline btn-sm border-base-content/20 hover:border-primary gap-1.5"
          >
            <span className="icon-[tabler--login] text-base" aria-hidden="true" />
            <span>Ingreso Administrativo</span>
          </Link>
        </div>
      </header>

      {/* Contenedor central arquitectónico */}
      <main className="w-full max-w-5xl mx-auto my-8 sm:my-12 flex flex-col gap-8">
        {/* Placa Hero Principal */}
        <section className="arch-plaque p-6 sm:p-10">
          <div className="max-w-2xl">
            <span className="text-xs uppercase tracking-widest text-primary font-bold">
              Conserjería Digital & Operación Residencial
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-base-content tracking-tight mt-2">
              Gestión ordenada de espacios compartidos
            </h1>
            <p className="mt-3 text-base sm:text-lg text-base-content/80 leading-relaxed">
              Supervisión de aforo en tiempo real, reserva de zonas comunes y registro censal unificado para edificios y conjuntos residenciales.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/auth/register"
              className="btn btn-primary gap-2 shadow-none font-semibold px-5"
            >
              <span className="icon-[tabler--building-plus] text-lg" aria-hidden="true" />
              <span>Habilitar Nuevo Edificio</span>
            </Link>
            <Link
              href="/auth/login"
              className="btn btn-outline btn-secondary gap-2 border-base-content/20 font-semibold px-5"
            >
              <span className="icon-[tabler--layout-dashboard] text-lg" aria-hidden="true" />
              <span>Abrir Panel de Control</span>
            </Link>
          </div>
        </section>

        {/* Retícula de Módulos Operativos (Bordes 1px, sin sombras difusas) */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Módulo 1: Control de Aforo */}
          <article className="arch-panel p-5 flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded bg-primary/10 text-primary flex items-center justify-center mb-3">
                <span className="icon-[tabler--users-group] text-lg" aria-hidden="true" />
              </div>
              <h2 className="text-base font-bold text-base-content">
                Aforo & Franjas Horarias
              </h2>
              <p className="text-xs text-base-content/70 mt-1.5 leading-relaxed">
                Visualización instantánea de ocupación con regla métrica continua por zona común.
              </p>
            </div>
            <div className="mt-5 pt-4 border-t arch-border">
              <span className="text-2xs font-semibold text-base-content/60 uppercase tracking-wider block mb-2">
                Escala de disponibilidad de muestra:
              </span>
              <AforoScaleMeter
                aforoActual={12}
                aforoMaximo={18}
                tamano="sm"
                mostrarEtiqueta={true}
              />
            </div>
          </article>

          {/* Módulo 2: Censo de Residentes */}
          <article className="arch-panel p-5 flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded bg-primary/10 text-primary flex items-center justify-center mb-3">
                <span className="icon-[tabler--clipboard-list] text-lg" aria-hidden="true" />
              </div>
              <h2 className="text-base font-bold text-base-content">
                Censo & Código QR
              </h2>
              <p className="text-xs text-base-content/70 mt-1.5 leading-relaxed">
                Registro asistido en 4 pasos para habitantes, vehículos, parqueaderos y mascotas desde el móvil.
              </p>
            </div>
            <div className="mt-5 pt-4 border-t arch-border flex items-center gap-2 text-xs text-primary font-medium">
              <span className="icon-[tabler--qrcode] text-lg" aria-hidden="true" />
              <span>Acceso directo por token o escaneo</span>
            </div>
          </article>

          {/* Módulo 3: Cartelera Inmobiliaria */}
          <article className="arch-panel p-5 flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded bg-primary/10 text-primary flex items-center justify-center mb-3">
                <span className="icon-[tabler--home-dollar] text-lg" aria-hidden="true" />
              </div>
              <h2 className="text-base font-bold text-base-content">
                Cartelera Inmobiliaria
              </h2>
              <p className="text-xs text-base-content/70 mt-1.5 leading-relaxed">
                Venta y arrendamiento interno de apartamentos, habitaciones y parqueaderos de la copropiedad.
              </p>
            </div>
            <div className="mt-5 pt-4 border-t arch-border flex items-center gap-2 text-xs text-base-content/70">
              <span className="icon-[tabler--check] text-primary text-base" aria-hidden="true" />
              <span>Publicaciones verificadas del edificio</span>
            </div>
          </article>
        </section>
      </main>

      {/* Pie institucional */}
      <footer className="w-full max-w-5xl mx-auto border-t arch-border pt-4 flex flex-col sm:flex-row items-center justify-between text-2xs text-base-content/60 gap-2">
        <span>© Zonas de Aforo · Plataforma de Gestión Residencial y Espacios Comunes</span>
        <div className="flex items-center gap-4">
          <Link href="/auth/login" className="hover:text-primary transition-colors">
            Acceso Conserjería
          </Link>
          <span className="text-base-content/30">|</span>
          <Link href="/auth/register" className="hover:text-primary transition-colors">
            Registro de Copropiedad
          </Link>
        </div>
      </footer>
    </div>
  );
}
