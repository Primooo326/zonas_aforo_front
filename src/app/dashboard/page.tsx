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

      {/* PANEL DE CONTROL: 4 KPIS ESENCIALES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Ocupación y Aforo Hoy */}
        <Link
          href="/dashboard/zonas"
          className="stat bg-base-100 rounded-2xl shadow-sm border border-base-200/60 p-4 sm:p-5 hover:shadow-md hover:border-primary/40 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer block group"
        >
          <div className="stat-title flex items-center justify-between text-sm font-semibold text-base-content/80 group-hover:text-primary transition-colors">
            <span className="flex items-center gap-2">
              <span className="icon-[tabler--gauge] text-xl text-primary" aria-hidden="true" />
              <span>Ocupación Hoy</span>
            </span>
            <span className="text-2xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              En Vivo
            </span>
          </div>
          <div className={`stat-value text-2xl sm:text-3xl mt-2 font-bold ${colorPct(pctOcupacionAhora)}`}>
            {pctOcupacionAhora}%
          </div>
          <div
            className="progress mt-2.5 h-2 bg-base-200 rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={pctOcupacionAhora}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className={`progress-bar ${barraPct(pctOcupacionAhora)}`}
              style={{ width: `${Math.min(100, pctOcupacionAhora)}%` }}
            />
          </div>
          <div className="stat-desc text-xs font-medium text-base-content/60 mt-2 flex items-center justify-between">
            <span>{ocupacionAhora} de {totalAforo} cupos</span>
            <span>{activas.length} reservas</span>
          </div>
        </Link>

        {/* KPI 2: Habitantes Censados */}
        <Link
          href="/dashboard/censo?tab=residentes"
          className="stat bg-base-100 rounded-2xl shadow-sm border border-base-200/60 p-4 sm:p-5 hover:shadow-md hover:border-info/40 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer block group"
        >
          <div className="stat-title flex items-center justify-between text-sm font-semibold text-base-content/80 group-hover:text-info transition-colors">
            <span className="flex items-center gap-2">
              <span className="icon-[tabler--users] text-xl text-info" aria-hidden="true" />
              <span>Habitantes Censados</span>
            </span>
            <span className="text-2xs font-semibold px-2 py-0.5 rounded-full bg-info/10 text-info">
              Población
            </span>
          </div>
          <div className="stat-value text-2xl sm:text-3xl mt-2 font-bold text-base-content">
            {censoStats ? censoStats.totalPersonas : '-'}
          </div>
          <div className="stat-desc text-xs font-medium text-base-content/60 mt-3 flex items-center justify-between">
            <span>{censoStats ? `${censoStats.menores || 0} menores` : 'Censo activo'}</span>
            <span>{censoStats ? `${censoStats.adultosMayores || 0} ad. mayores` : ''}</span>
          </div>
        </Link>

        {/* KPI 3: Inmuebles Registrados */}
        <Link
          href="/dashboard/censo?tab=inmuebles"
          className="stat bg-base-100 rounded-2xl shadow-sm border border-base-200/60 p-4 sm:p-5 hover:shadow-md hover:border-secondary/40 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer block group"
        >
          <div className="stat-title flex items-center justify-between text-sm font-semibold text-base-content/80 group-hover:text-secondary transition-colors">
            <span className="flex items-center gap-2">
              <span className="icon-[tabler--building-community] text-xl text-secondary" aria-hidden="true" />
              <span>Inmuebles Registrados</span>
            </span>
            <span className="text-2xs font-semibold px-2 py-0.5 rounded-full bg-secondary/10 text-secondary">
              Copropiedad
            </span>
          </div>
          <div className="stat-value text-2xl sm:text-3xl mt-2 font-bold text-base-content">
            {censoStats ? censoStats.totalUnidades : '-'}
          </div>
          <div className="stat-desc text-xs font-medium text-base-content/60 mt-3 flex items-center justify-between">
            <span>{censoStats ? `${censoStats.totalVehiculos || 0} vehículos` : 'Unidades'}</span>
            <span>{censoStats ? `${censoStats.totalMascotas || 0} mascotas` : ''}</span>
          </div>
        </Link>

        {/* KPI 4: Ofertas Venta / Arriendo */}
        <Link
          href="/dashboard/inmuebles"
          className="stat bg-base-100 rounded-2xl shadow-sm border border-base-200/60 p-4 sm:p-5 hover:shadow-md hover:border-success/40 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer block group"
        >
          <div className="stat-title flex items-center justify-between text-sm font-semibold text-base-content/80 group-hover:text-success transition-colors">
            <span className="flex items-center gap-2">
              <span className="icon-[tabler--tag] text-xl text-success" aria-hidden="true" />
              <span>Ofertas Venta/Arriendo</span>
            </span>
            <span className="text-2xs font-semibold px-2 py-0.5 rounded-full bg-success/10 text-success">
              Catálogo
            </span>
          </div>
          <div className="stat-value text-2xl sm:text-3xl mt-2 font-bold text-success">
            {publicacionesActivas.length}
          </div>
          <div className="stat-desc text-xs font-medium text-base-content/60 mt-3 flex items-center justify-between">
            <span>{totalEnVenta} en venta</span>
            <span>{totalEnArriendo} en arriendo</span>
          </div>
        </Link>
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
