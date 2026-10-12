'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { fechaLocal } from '@/lib/fecha';
import Link from 'next/link';
import ReservasCalendario from '@/components/ReservasCalendario';
import ReservasDia from '@/components/ReservasDia';

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

function colorPct(pct: number) {
  if (pct >= 100) return 'text-error';
  if (pct >= 75) return 'text-warning';
  return 'text-success';
}

function barraPct(pct: number) {
  if (pct >= 100) return 'progress-error';
  if (pct >= 75) return 'progress-warning';
  return 'progress-success';
}

const tipoBadge = (tipo: string) => {
  switch (tipo) {
    case 'inmueble':
      return 'badge-primary';
    case 'parqueadero':
      return 'badge-warning';
    case 'habitacion':
      return 'badge-info';
    default:
      return 'badge-ghost';
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
  const pctOcupacionAhora = totalAforo > 0 ? Math.round((ocupacionAhora / totalAforo) * 100) : 0;

  let picoTurnos = 0;
  let picoHora = '';
  for (const r of activas) {
    const n = activas.filter((s) => s.horaInicio <= r.horaInicio && r.horaInicio < s.horaFin).length;
    if (n > picoTurnos) {
      picoTurnos = n;
      picoHora = r.horaInicio;
    }
  }
  const zonasEnUso = new Set(activas.map((r) => r.zonaId?._id).filter(Boolean)).size;

  // Métricas de Venta y Arriendo
  const publicacionesActivas = inmuebles.filter((i) => i.estado === 'activa');
  const totalEnVenta = publicacionesActivas.filter((i) => i.transaccion === 'venta').length;
  const totalEnArriendo = publicacionesActivas.filter((i) => i.transaccion === 'arriendo').length;
  const totalOtrosTipos = publicacionesActivas.filter(
    (i) => i.tipo === 'parqueadero' || i.tipo === 'habitacion',
  ).length;

  // Últimas publicaciones (ordenadas por fecha de creación descendente)
  const ultimasPublicaciones = [...inmuebles]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4);

  return (
    <div className="space-y-8">
      {/* Encabezado General */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Panel de Control</h1>
        <p className="text-sm text-base-content/60">
          Resumen operativo de zonas comunes y ofertas de tu edificio
        </p>
      </div>

      {/* SECCIÓN 1: MÉTRICAS DE OPERACIÓN Y AFORO */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-base-content/70">
          <span className="icon-[tabler--calendar-stats] text-lg text-primary" aria-hidden="true" />
          <span>Operación de Zonas y Aforo</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/dashboard/zonas"
            className="stat bg-base-100 rounded-2xl shadow-sm border border-base-200/60 p-4 sm:p-5 hover:shadow-md hover:border-primary/40 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer block group"
          >
            <div className="stat-title flex items-center gap-2 text-sm font-semibold text-base-content/80 group-hover:text-primary transition-colors">
              <span className="icon-[tabler--gauge] text-xl text-primary" aria-hidden="true" />
              <span>Ocupación Ahora</span>
            </div>
            <div className={`stat-value text-2xl sm:text-3xl mt-1.5 ${colorPct(pctOcupacionAhora)}`}>{pctOcupacionAhora}%</div>
            <div
              className="progress mt-2.5 h-2 bg-base-200"
              role="progressbar"
              aria-valuenow={pctOcupacionAhora}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className={`progress-bar ${barraPct(pctOcupacionAhora)}`}
                style={{ width: `${pctOcupacionAhora}%` }}
              />
            </div>
            <div className="stat-desc text-xs font-medium text-base-content/60 mt-1">
              {ocupacionAhora} de {totalAforo} cupos en uso
            </div>
          </Link>

          <Link
            href="/dashboard/zonas"
            className="stat bg-base-100 rounded-2xl shadow-sm border border-base-200/60 p-4 sm:p-5 hover:shadow-md hover:border-accent/40 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer block group"
          >
            <div className="stat-title flex items-center gap-2 text-sm font-semibold text-base-content/80 group-hover:text-accent transition-colors">
              <span className="icon-[tabler--calendar-check] text-xl text-accent" aria-hidden="true" />
              <span>Reservas Hoy</span>
            </div>
            <div className="stat-value text-2xl sm:text-3xl mt-1.5 text-accent">{activas.length}</div>
            <div className="stat-desc text-xs font-medium text-base-content/60 mt-1">Turnos activos hoy</div>
          </Link>

          <Link
            href="/dashboard/zonas"
            className="stat bg-base-100 rounded-2xl shadow-sm border border-base-200/60 p-4 sm:p-5 hover:shadow-md hover:border-secondary/40 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer block group"
          >
            <div className="stat-title flex items-center gap-2 text-sm font-semibold text-base-content/80 group-hover:text-secondary transition-colors">
              <span className="icon-[tabler--chart-bar] text-xl text-secondary" aria-hidden="true" />
              <span>Pico de Ocupación</span>
            </div>
            <div className="stat-value text-2xl sm:text-3xl mt-1.5 text-secondary">{picoHora || '—'}</div>
            <div className="stat-desc text-xs font-medium text-base-content/60 mt-1">
              {picoTurnos > 0 ? `${picoTurnos} turnos simultáneos` : 'Sin reservas hoy'}
            </div>
          </Link>

          <Link
            href="/dashboard/zonas"
            className="stat bg-base-100 rounded-2xl shadow-sm border border-base-200/60 p-4 sm:p-5 hover:shadow-md hover:border-warning/40 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer block group"
          >
            <div className="stat-title flex items-center gap-2 text-sm font-semibold text-base-content/80 group-hover:text-warning transition-colors">
              <span className="icon-[tabler--building-community] text-xl text-warning" aria-hidden="true" />
              <span>Zonas en Uso</span>
            </div>
            <div className="stat-value text-2xl sm:text-3xl mt-1.5 text-warning">{zonasEnUso}</div>
            <div className="stat-desc text-xs font-medium text-base-content/60 mt-1">de {zonas.length} zonas registradas</div>
          </Link>
        </div>
      </div>

      {/* SECCIÓN 2: MÉTRICAS DE VENTA Y ARRIENDO */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-base font-bold text-base-content/80">
            <span className="icon-[tabler--building] text-xl text-primary" aria-hidden="true" />
            <span>Venta y Arriendo</span>
          </div>
          <Link
            href="/dashboard/inmuebles"
            className="text-sm text-primary hover:underline font-semibold flex items-center gap-1"
          >
            Ver módulo completo
            <span className="icon-[tabler--arrow-right] text-sm" aria-hidden="true" />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/dashboard/inmuebles"
            className="stat bg-base-100 rounded-2xl shadow-sm border border-base-200/60 p-4 sm:p-5 hover:shadow-md hover:border-primary/40 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer block group"
          >
            <div className="stat-title flex items-center gap-2 text-sm font-semibold text-base-content/80 group-hover:text-primary transition-colors">
              <span className="icon-[tabler--tag] text-xl text-primary" aria-hidden="true" />
              <span>Ofertas Activas</span>
            </div>
            <div className="stat-value text-2xl sm:text-3xl mt-1.5 text-primary">{publicacionesActivas.length}</div>
            <div className="stat-desc text-xs font-medium text-base-content/60 mt-1">{inmuebles.length} publicaciones en total</div>
          </Link>

          <Link
            href="/dashboard/inmuebles?transaccion=venta"
            className="stat bg-base-100 rounded-2xl shadow-sm border border-base-200/60 p-4 sm:p-5 hover:shadow-md hover:border-success/40 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer block group"
          >
            <div className="stat-title flex items-center gap-2 text-sm font-semibold text-base-content/80 group-hover:text-success transition-colors">
              <span className="icon-[tabler--home-dollar] text-xl text-success" aria-hidden="true" />
              <span>En Venta</span>
            </div>
            <div className="stat-value text-2xl sm:text-3xl mt-1.5 text-success">{totalEnVenta}</div>
            <div className="stat-desc text-xs font-medium text-base-content/60 mt-1">Inmuebles en oferta</div>
          </Link>

          <Link
            href="/dashboard/inmuebles?transaccion=arriendo"
            className="stat bg-base-100 rounded-2xl shadow-sm border border-base-200/60 p-4 sm:p-5 hover:shadow-md hover:border-info/40 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer block group"
          >
            <div className="stat-title flex items-center gap-2 text-sm font-semibold text-base-content/80 group-hover:text-info transition-colors">
              <span className="icon-[tabler--key] text-xl text-info" aria-hidden="true" />
              <span>En Arriendo</span>
            </div>
            <div className="stat-value text-2xl sm:text-3xl mt-1.5 text-info">{totalEnArriendo}</div>
            <div className="stat-desc text-xs font-medium text-base-content/60 mt-1">Disponibles para renta</div>
          </Link>

          <Link
            href="/dashboard/inmuebles?tipo=parqueadero"
            className="stat bg-base-100 rounded-2xl shadow-sm border border-base-200/60 p-4 sm:p-5 hover:shadow-md hover:border-warning/40 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer block group"
          >
            <div className="stat-title flex items-center gap-2 text-sm font-semibold text-base-content/80 group-hover:text-warning transition-colors">
              <span className="icon-[tabler--car] text-xl text-warning" aria-hidden="true" />
              <span>Parqueaderos / Otros</span>
            </div>
            <div className="stat-value text-2xl sm:text-3xl mt-1.5 text-warning">{totalOtrosTipos}</div>
            <div className="stat-desc text-xs font-medium text-base-content/60 mt-1">Parqueaderos o habitaciones</div>
          </Link>
        </div>
      </div>

      {/* SECCIÓN 3: POBLACIÓN Y CENSO HABITACIONAL */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-base font-bold text-base-content/80">
            <span className="icon-[tabler--users-group] text-xl text-primary" aria-hidden="true" />
            <span>Población y Censo Habitacional</span>
          </div>
          <Link
            href="/dashboard/censo"
            className="btn btn-outline btn-sm font-semibold gap-1 text-primary hover:btn-primary"
          >
            Ver Censo Completo
            <span className="icon-[tabler--arrow-right] text-sm" aria-hidden="true" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Link
            href="/dashboard/censo?tab=residentes"
            className="stat bg-base-100 rounded-2xl shadow-sm border border-base-200/60 p-3.5 sm:p-4 hover:shadow-md hover:border-primary/40 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer block group"
          >
            <div className="stat-title flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-base-content/70 group-hover:text-primary transition-colors">
              <span className="icon-[tabler--users] text-lg text-primary" />
              <span>Habitantes</span>
            </div>
            <div className="stat-value text-xl sm:text-2xl text-base-content mt-1 font-bold">
              {censoStats ? censoStats.totalPersonas : '-'}
            </div>
            <div className="stat-desc text-xs font-medium text-base-content/60 mt-1 truncate">
              en {censoStats ? censoStats.totalUnidades : '-'} unidades
            </div>
          </Link>

          <Link
            href="/dashboard/censo?tab=residentes&demografia=menor"
            className="stat bg-base-100 rounded-2xl shadow-sm border border-base-200/60 p-3.5 sm:p-4 hover:shadow-md hover:border-info/40 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer block group"
          >
            <div className="stat-title flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-info group-hover:underline">
              <span className="icon-[tabler--mood-kid] text-lg" />
              <span>Menores (&lt;18)</span>
            </div>
            <div className="stat-value text-xl sm:text-2xl text-info mt-1 font-bold">
              {censoStats ? censoStats.menores : '-'}
            </div>
            <div className="stat-desc text-xs font-medium text-base-content/60 mt-1 truncate">niños y jóvenes</div>
          </Link>

          <Link
            href="/dashboard/censo?tab=residentes&demografia=adultoMayor"
            className="stat bg-base-100 rounded-2xl shadow-sm border border-base-200/60 p-3.5 sm:p-4 hover:shadow-md hover:border-warning/40 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer block group"
          >
            <div className="stat-title flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-warning group-hover:underline">
              <span className="icon-[tabler--user-heart] text-lg" />
              <span>Adultos Mayores</span>
            </div>
            <div className="stat-value text-xl sm:text-2xl text-warning mt-1 font-bold">
              {censoStats ? censoStats.adultosMayores : '-'}
            </div>
            <div className="stat-desc text-xs font-medium text-base-content/60 mt-1 truncate">60+ años prioritarios</div>
          </Link>

          <Link
            href="/dashboard/censo?tab=mascotas"
            className="stat bg-base-100 rounded-2xl shadow-sm border border-base-200/60 p-3.5 sm:p-4 hover:shadow-md hover:border-secondary/40 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer block group"
          >
            <div className="stat-title flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-secondary group-hover:underline">
              <span className="icon-[tabler--paw] text-lg" />
              <span>Mascotas</span>
            </div>
            <div className="stat-value text-xl sm:text-2xl text-secondary mt-1 font-bold">
              {censoStats ? censoStats.totalMascotas : '-'}
            </div>
            <div className="stat-desc text-xs font-medium text-base-content/60 mt-1 truncate">
              {censoStats && censoStats.mascotasPeligrosas > 0
                ? `${censoStats.mascotasPeligrosas} manejo especial`
                : 'registradas'}
            </div>
          </Link>

          <Link
            href="/dashboard/censo?tab=parqueaderos"
            className="stat bg-base-100 rounded-2xl shadow-sm border border-base-200/60 p-3.5 sm:p-4 hover:shadow-md hover:border-success/40 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer block group"
          >
            <div className="stat-title flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-success group-hover:underline">
              <span className="icon-[tabler--car] text-lg" />
              <span>Vehículos</span>
            </div>
            <div className="stat-value text-xl sm:text-2xl text-success mt-1 font-bold">
              {censoStats ? censoStats.totalVehiculos : '-'}
            </div>
            <div className="stat-desc text-xs font-medium text-base-content/60 mt-1 truncate">parque automotor</div>
          </Link>

          <Link
            href="/dashboard/censo?tab=inmuebles"
            className="stat bg-base-100 rounded-2xl shadow-sm border border-base-200/60 p-3.5 sm:p-4 hover:shadow-md hover:border-primary/40 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer block group"
          >
            <div className="stat-title flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-base-content/70 group-hover:text-primary transition-colors">
              <span className="icon-[tabler--home-check] text-lg text-primary" />
              <span>Unidades Censadas</span>
            </div>
            <div className="stat-value text-xl sm:text-2xl text-base-content mt-1 font-bold">
              {censoStats ? censoStats.totalUnidades : '-'}
            </div>
            <div className="stat-desc text-xs font-medium text-base-content/60 mt-1 truncate">
              {censoStats && censoStats.pendientes > 0 ? (
                <span className="text-warning font-semibold">{censoStats.pendientes} por validar</span>
              ) : (
                'al día'
              )}
            </div>
          </Link>
        </div>
      </div>

      {/* Operativa diaria de reservas */}
      <ReservasDia zonas={zonas} reservas={reservas} />

      {/* Calendario de Reservas */}
      <div>
        <ReservasCalendario edificioId={edificio.id} />
      </div>

      {/* SECCIÓN INFERIOR: RESUMEN DE ZONAS + ÚLTIMAS OFERTAS DE VENTA Y ARRIENDO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Columna 1: Resumen de Zonas */}
        <div className="bg-base-100 rounded-box shadow-sm p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
                <span className="icon-[tabler--map-pin] text-primary" aria-hidden="true" />
                Resumen de Zonas Comunes
              </h2>
              <Link
                href="/dashboard/zonas"
                className="btn btn-outline btn-xs gap-1"
              >
                Gestionar
                <span className="icon-[tabler--arrow-right] text-xs" aria-hidden="true" />
              </Link>
            </div>
            {zonas.length === 0 ? (
              <div className="py-8 text-center text-base-content/60 text-sm">
                Aún no has registrado ninguna zona común.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-sm">
                  <thead>
                    <tr className="text-xs text-base-content/70">
                      <th>Nombre</th>
                      <th>Aforo</th>
                      <th>Lapso</th>
                      <th>Horario</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs">
                    {zonas.map((z) => (
                      <tr key={z._id}>
                        <td className="font-medium">{z.nombre}</td>
                        <td>{z.aforoMaximo}</td>
                        <td>{z.lapsoMinutos} min</td>
                        <td>
                          {(z.horarios || []).map((h) => (
                            <span key={h.dia} className="badge badge-xs badge-success mr-1 mb-1">
                              {h.dia}: {h.inicio} - {h.fin}
                            </span>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Columna 2: Últimas Ofertas de Venta y Arriendo */}
        <div className="bg-base-100 rounded-box shadow-sm p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
                <span className="icon-[tabler--building] text-primary" aria-hidden="true" />
                Últimas Publicaciones de Venta y Arriendo
              </h2>
              <div className="flex items-center gap-1.5">
                <Link
                  href="/dashboard/inmuebles/nuevo"
                  className="btn btn-primary btn-xs gap-1"
                >
                  <span className="icon-[tabler--plus] text-xs" aria-hidden="true" />
                  Nueva
                </Link>
                <Link
                  href="/dashboard/inmuebles"
                  className="btn btn-outline btn-xs gap-1"
                >
                  Ver todas
                  <span className="icon-[tabler--arrow-right] text-xs" aria-hidden="true" />
                </Link>
              </div>
            </div>
            {inmuebles.length === 0 ? (
              <div className="py-8 text-center text-base-content/60 text-sm">
                No hay publicaciones registradas aún.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-sm">
                  <thead>
                    <tr className="text-xs text-base-content/70">
                      <th>Bien</th>
                      <th>Transacción</th>
                      <th>Precio (COP)</th>
                      <th>Contacto</th>
                      <th className="text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs">
                    {ultimasPublicaciones.map((item) => (
                      <tr key={item._id} className="hover:bg-base-200/40">
                        <td>
                          <div className="flex items-center gap-1.5">
                            <span className={`badge badge-xs ${tipoBadge(item.tipo)}`}>
                              {item.tipo}
                            </span>
                            {item.piso !== undefined && (
                              <span className="text-base-content/60 text-2xs">P.{item.piso}</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className="badge badge-xs badge-outline">
                            {item.transaccion === 'venta' ? 'Venta' : 'Arriendo'}
                          </span>
                        </td>
                        <td className="font-semibold text-primary">
                          ${item.precio.toLocaleString('es-CO')}
                        </td>
                        <td className="text-base-content/70 whitespace-nowrap">
                          {item.telefono}
                        </td>
                        <td className="text-right whitespace-nowrap">
                          <Link
                            href={`/dashboard/inmuebles/${item._id}/edit`}
                            className="btn btn-outline btn-primary btn-xs gap-1"
                            title="Editar publicación"
                          >
                            <span className="icon-[tabler--edit] text-xs" aria-hidden="true" />
                            <span>Editar</span>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
