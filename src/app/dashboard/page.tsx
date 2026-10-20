'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { fechaLocal } from '@/lib/fecha';
import Link from 'next/link';
import ReservasCalendario from '@/components/ReservasCalendario';
import ReservasDia from '@/components/ReservasDia';
import BuildingPlaque from '@/components/BuildingPlaque';
import AforoScaleMeter from '@/components/AforoScaleMeter';

interface Zona {
  _id: string;
  nombre: string;
  horarios: { dia: string; inicio: string; fin: string }[];
  aforoMaximo: number;
  lapsoMinutos: number;
}

interface Reserva {
  _id: string;
  zonaId?: { _id: string; nombre: string } | null;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  nombreSolicitante: string;
  torreInmueble: string;
  estado: string;
}

interface Inmueble {
  _id: string;
  tipo: string;
  transaccion: string;
  precio: number;
  telefono: string;
  estado: string;
  createdAt: string;
  observacion?: string;
  metrosCuadrados?: number;
  piso?: number;
}

interface CensoStats {
  totalUnidades: number;
  totalPersonas: number;
  menores: number;
  adultos: number;
  adultosMayores: number;
  totalMascotas: number;
  mascotasPeligrosas: number;
  totalVehiculos: number;
  pendientes: number;
}

const tipoBadge = (tipo: string) => {
  switch (tipo) {
    case 'inmueble':
      return 'bg-primary/10 text-primary border-primary/20';
    case 'parqueadero':
      return 'bg-warning/10 text-warning border-warning/20';
    case 'habitacion':
      return 'bg-info/10 text-info border-info/20';
    default:
      return 'bg-base-300 text-base-content/70 border-base-content/10';
  }
};

export default function DashboardPage() {
  const { edificio, isLoading } = useAuth();
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [inmuebles, setInmuebles] = useState<Inmueble[]>([]);
  const [censoStats, setCensoStats] = useState<CensoStats | null>(null);
  const edificioId = edificio?.id;

  useEffect(() => {
    if (!edificioId) return;
    const hoy = fechaLocal();
    apiFetch(`/edificio/${edificioId}/reservas?fecha=${hoy}`)
      .then(setReservas)
      .catch(() => {});
  }, [edificioId]);

  useEffect(() => {
    apiFetch('/zonas')
      .then(setZonas)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!edificioId) return;
    apiFetch(`/inmuebles?edificioId=${edificioId}`)
      .then(setInmuebles)
      .catch(() => {});
    apiFetch('/censo/stats')
      .then(setCensoStats)
      .catch(() => {});
  }, [edificioId]);

  useEffect(() => {
    if (!edificioId) return;
    const interval = setInterval(() => {
      const hoy = fechaLocal();
      apiFetch(`/edificio/${edificioId}/reservas?fecha=${hoy}`)
        .then(setReservas)
        .catch(() => {});
      apiFetch(`/inmuebles?edificioId=${edificioId}`)
        .then(setInmuebles)
        .catch(() => {});
      apiFetch('/censo/stats')
        .then(setCensoStats)
        .catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [edificioId]);

  if (isLoading || !edificio) return null;

  // Métricas de Zonas y Aforo
  const activas = reservas.filter((r) => r.estado === 'activa');
  const ahora = new Date();
  const hhmmAhora = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;
  const totalAforo = zonas.reduce((sum, z) => sum + z.aforoMaximo, 0);
  const ocupacionAhora = activas.filter(
    (r) => r.horaInicio <= hhmmAhora && hhmmAhora < r.horaFin,
  ).length;

  // Métricas de Venta y Arriendo
  const publicacionesActivas = inmuebles.filter((i) => i.estado === 'activa');
  const totalEnVenta = publicacionesActivas.filter((i) => i.transaccion === 'venta').length;
  const totalEnArriendo = publicacionesActivas.filter((i) => i.transaccion === 'arriendo').length;

  // Últimas publicaciones
  const ultimasPublicaciones = [...inmuebles]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4);

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Placa Arquitectónica del Edificio */}
      <BuildingPlaque
        nombreEdificio={edificio.nombre}
        tipoEdificio="Panel de Control y Supervisión"
        direccion={edificio.email}
        subtitulo="Monitoreo en tiempo real de ocupación de zonas comunes, agenda del día y registro censal."
        acciones={
          <div className="flex items-center gap-2">
            <Link
              href={`/invitacion/${edificio.id}`}
              target="_blank"
              className="btn btn-outline btn-xs sm:btn-sm gap-1.5 arch-border hover:border-primary"
            >
              <span className="icon-[tabler--qrcode] text-base text-primary" aria-hidden="true" />
              <span>Portal de Residentes (QR)</span>
            </Link>
          </div>
        }
      />

      {/* RETÍCULA DE 4 KPIS ESTRUCTURALES (Bordes 1px, sin sombras difusas) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Ocupación en Vivo con Escalímetro */}
        <Link
          href="/dashboard/zonas"
          className="arch-panel p-4 sm:p-5 hover:border-primary/50 transition-colors flex flex-col justify-between group"
        >
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-base-content/80 group-hover:text-primary transition-colors">
              <span className="flex items-center gap-2">
                <span className="icon-[tabler--gauge] text-lg text-primary" aria-hidden="true" />
                <span>Ocupación de Zonas</span>
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-3xs font-bold uppercase bg-primary/10 text-primary border border-primary/20">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" aria-hidden="true" />
                En Vivo
              </span>
            </div>

            <div className="mt-3">
              <AforoScaleMeter
                aforoActual={ocupacionAhora}
                aforoMaximo={totalAforo || 1}
                tamano="sm"
                mostrarEtiqueta={false}
              />
            </div>
          </div>

          <div className="text-2xs font-medium text-base-content/60 mt-3 pt-2.5 border-t arch-border flex items-center justify-between">
            <span className="tabular-nums font-semibold text-base-content">{activas.length} reservas activas</span>
            <span>{zonas.length} zonas</span>
          </div>
        </Link>

        {/* KPI 2: Habitantes Censados */}
        <Link
          href="/dashboard/censo"
          className="arch-panel p-4 sm:p-5 hover:border-primary/50 transition-colors flex flex-col justify-between group"
        >
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-base-content/80 group-hover:text-primary transition-colors">
              <span className="flex items-center gap-2">
                <span className="icon-[tabler--users] text-lg text-primary" aria-hidden="true" />
                <span>Habitantes Censados</span>
              </span>
              <span className="text-3xs font-semibold uppercase px-1.5 py-0.5 rounded bg-base-300/80 text-base-content/70">
                Población
              </span>
            </div>

            <div className="stat-value text-2xl sm:text-3xl mt-2 font-extrabold text-base-content tabular-nums">
              {censoStats ? censoStats.totalPersonas : '0'}
            </div>
          </div>

          <div className="text-2xs font-medium text-base-content/60 mt-3 pt-2.5 border-t arch-border flex items-center justify-between">
            <span className="tabular-nums">{censoStats ? `${censoStats.menores || 0} menores` : 'Censo'}</span>
            <span className="tabular-nums">{censoStats ? `${censoStats.adultosMayores || 0} mayores` : ''}</span>
          </div>
        </Link>

        {/* KPI 3: Inmuebles Registrados */}
        <Link
          href="/dashboard/censo"
          className="arch-panel p-4 sm:p-5 hover:border-primary/50 transition-colors flex flex-col justify-between group"
        >
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-base-content/80 group-hover:text-primary transition-colors">
              <span className="flex items-center gap-2">
                <span className="icon-[tabler--building-community] text-lg text-primary" aria-hidden="true" />
                <span>Inmuebles & Unidades</span>
              </span>
              <span className="text-3xs font-semibold uppercase px-1.5 py-0.5 rounded bg-base-300/80 text-base-content/70">
                Copropiedad
              </span>
            </div>

            <div className="stat-value text-2xl sm:text-3xl mt-2 font-extrabold text-base-content tabular-nums">
              {censoStats ? censoStats.totalUnidades : '0'}
            </div>
          </div>

          <div className="text-2xs font-medium text-base-content/60 mt-3 pt-2.5 border-t arch-border flex items-center justify-between">
            <span className="tabular-nums">{censoStats ? `${censoStats.totalVehiculos || 0} vehículos` : '0'}</span>
            <span className="tabular-nums">{censoStats ? `${censoStats.totalMascotas || 0} mascotas` : '0'}</span>
          </div>
        </Link>

        {/* KPI 4: Cartelera Inmobiliaria */}
        <Link
          href="/dashboard/inmuebles"
          className="arch-panel p-4 sm:p-5 hover:border-primary/50 transition-colors flex flex-col justify-between group"
        >
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-base-content/80 group-hover:text-primary transition-colors">
              <span className="flex items-center gap-2">
                <span className="icon-[tabler--home-dollar] text-lg text-primary" aria-hidden="true" />
                <span>Ofertas Inmobiliarias</span>
              </span>
              <span className="text-3xs font-semibold uppercase px-1.5 py-0.5 rounded bg-base-300/80 text-base-content/70">
                Cartelera
              </span>
            </div>

            <div className="stat-value text-2xl sm:text-3xl mt-2 font-extrabold text-primary tabular-nums">
              {publicacionesActivas.length}
            </div>
          </div>

          <div className="text-2xs font-medium text-base-content/60 mt-3 pt-2.5 border-t arch-border flex items-center justify-between">
            <span className="tabular-nums">{totalEnVenta} en venta</span>
            <span className="tabular-nums">{totalEnArriendo} en arriendo</span>
          </div>
        </Link>
      </section>

      {/* Operativa diaria de reservas */}
      <section className="arch-panel p-4 sm:p-6">
        <ReservasDia zonas={zonas} reservas={reservas} />
      </section>

      {/* Calendario de Reservas */}
      <section className="arch-panel p-4 sm:p-6">
        <ReservasCalendario edificioId={edificio.id} />
      </section>

      {/* SECCIÓN INFERIOR: RESUMEN DE ZONAS + CARTELERA DE INMUEBLES */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Columna 1: Resumen de Zonas Comunes */}
        <article className="arch-panel p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 border-b arch-border pb-3">
              <h2 className="text-sm sm:text-base font-bold flex items-center gap-2 text-base-content">
                <span className="icon-[tabler--map-pin] text-primary" aria-hidden="true" />
                <span>Zonas Comunes Registradas</span>
              </h2>
              <Link
                href="/dashboard/zonas"
                className="btn btn-outline btn-xs gap-1 arch-border hover:border-primary text-2xs"
              >
                <span>Configurar</span>
                <span className="icon-[tabler--arrow-right] text-xs" aria-hidden="true" />
              </Link>
            </div>

            {zonas.length === 0 ? (
              <div className="py-8 text-center text-base-content/60 text-xs">
                Aún no has registrado ninguna zona común en la copropiedad.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-sm w-full text-xs">
                  <thead>
                    <tr className="text-2xs uppercase tracking-wider text-base-content/60 border-b arch-border">
                      <th className="font-semibold">Zona</th>
                      <th className="font-semibold text-center">Aforo Máx.</th>
                      <th className="font-semibold text-center">Lapso</th>
                      <th className="font-semibold">Horario Asignado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {zonas.map((z) => (
                      <tr key={z._id} className="border-b arch-border hover:bg-base-200/50">
                        <td className="font-bold text-base-content">{z.nombre}</td>
                        <td className="text-center tabular-nums font-semibold">{z.aforoMaximo}</td>
                        <td className="text-center tabular-nums text-base-content/70">{z.lapsoMinutos} min</td>
                        <td>
                          <div className="flex flex-wrap gap-1">
                            {(z.horarios || []).map((h) => (
                              <span
                                key={h.dia}
                                className="inline-flex px-1.5 py-0.5 rounded text-3xs font-medium border arch-border bg-base-200"
                              >
                                {h.dia}: {h.inicio}-{h.fin}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </article>

        {/* Columna 2: Últimas Ofertas de Venta y Arriendo */}
        <article className="arch-panel p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 border-b arch-border pb-3">
              <h2 className="text-sm sm:text-base font-bold flex items-center gap-2 text-base-content">
                <span className="icon-[tabler--home-dollar] text-primary" aria-hidden="true" />
                <span>Cartelera Inmobiliaria Reciente</span>
              </h2>
              <div className="flex items-center gap-2">
                <Link
                  href="/dashboard/inmuebles/nuevo"
                  className="btn btn-primary btn-xs gap-1 font-semibold shadow-none"
                >
                  <span className="icon-[tabler--plus] text-xs" aria-hidden="true" />
                  <span>Publicar</span>
                </Link>
                <Link
                  href="/dashboard/inmuebles"
                  className="btn btn-outline btn-xs gap-1 arch-border hover:border-primary text-2xs"
                >
                  <span>Ver todas</span>
                  <span className="icon-[tabler--arrow-right] text-xs" aria-hidden="true" />
                </Link>
              </div>
            </div>

            {inmuebles.length === 0 ? (
              <div className="py-8 text-center text-base-content/60 text-xs">
                No hay ofertas inmobiliarias publicadas actualmente.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-sm w-full text-xs">
                  <thead>
                    <tr className="text-2xs uppercase tracking-wider text-base-content/60 border-b arch-border">
                      <th className="font-semibold">Inmueble</th>
                      <th className="font-semibold text-center">Modalidad</th>
                      <th className="font-semibold text-right">Precio (COP)</th>
                      <th className="font-semibold text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ultimasPublicaciones.map((item) => (
                      <tr key={item._id} className="border-b arch-border hover:bg-base-200/50">
                        <td>
                          <div className="flex items-center gap-1.5">
                            <span className={`inline-flex px-1.5 py-0.5 rounded text-3xs font-bold uppercase border ${tipoBadge(item.tipo)}`}>
                              {item.tipo}
                            </span>
                            {item.piso !== undefined && (
                              <span className="text-base-content/60 text-3xs tabular-nums">Piso {item.piso}</span>
                            )}
                          </div>
                        </td>
                        <td className="text-center">
                          <span className="inline-flex px-1.5 py-0.5 rounded text-3xs font-medium border arch-border bg-base-200">
                            {item.transaccion === 'venta' ? 'Venta' : 'Arriendo'}
                          </span>
                        </td>
                        <td className="text-right font-bold text-primary tabular-nums">
                          ${item.precio.toLocaleString('es-CO')}
                        </td>
                        <td className="text-right">
                          <Link
                            href={`/dashboard/inmuebles/${item._id}/edit`}
                            className="btn btn-ghost btn-xs text-base-content/70 hover:text-primary"
                            title="Editar publicación"
                          >
                            <span className="icon-[tabler--edit] text-sm" aria-hidden="true" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
