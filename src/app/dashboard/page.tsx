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
          <div className="stat bg-base-100 rounded-box shadow-sm">
            <div className="stat-title flex items-center gap-2">
              <span className="icon-[tabler--gauge] text-lg text-primary" aria-hidden="true" />
              Ocupación Ahora
            </div>
            <div className={`stat-value ${colorPct(pctOcupacionAhora)}`}>{pctOcupacionAhora}%</div>
            <div
              className="progress mt-2"
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
            <div className="stat-desc">
              {ocupacionAhora} de {totalAforo} cupos en uso
            </div>
          </div>
          <div className="stat bg-base-100 rounded-box shadow-sm">
            <div className="stat-title flex items-center gap-2">
              <span className="icon-[tabler--calendar-check] text-lg text-accent" aria-hidden="true" />
              Reservas Hoy
            </div>
            <div className="stat-value text-accent">{activas.length}</div>
            <div className="stat-desc">Turnos activos hoy</div>
          </div>
          <div className="stat bg-base-100 rounded-box shadow-sm">
            <div className="stat-title flex items-center gap-2">
              <span className="icon-[tabler--chart-bar] text-lg text-secondary" aria-hidden="true" />
              Pico de Ocupación
            </div>
            <div className="stat-value text-secondary">{picoHora || '—'}</div>
            <div className="stat-desc">
              {picoTurnos > 0 ? `${picoTurnos} turnos simultáneos` : 'Sin reservas hoy'}
            </div>
          </div>
          <div className="stat bg-base-100 rounded-box shadow-sm">
            <div className="stat-title flex items-center gap-2">
              <span className="icon-[tabler--building-community] text-lg text-warning" aria-hidden="true" />
              Zonas en Uso
            </div>
            <div className="stat-value text-warning">{zonasEnUso}</div>
            <div className="stat-desc">de {zonas.length} zonas registradas</div>
          </div>
        </div>
      </div>

      {/* SECCIÓN 2: MÉTRICAS DE VENTA Y ARRIENDO */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-base-content/70">
            <span className="icon-[tabler--building] text-lg text-primary" aria-hidden="true" />
            <span>Venta y Arriendo</span>
          </div>
          <Link
            href="/dashboard/inmuebles"
            className="text-xs text-primary hover:underline font-medium flex items-center gap-1"
          >
            Ver módulo completo
            <span className="icon-[tabler--arrow-right] text-xs" aria-hidden="true" />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="stat bg-base-100 rounded-box shadow-sm">
            <div className="stat-title flex items-center gap-2">
              <span className="icon-[tabler--tag] text-lg text-primary" aria-hidden="true" />
              Ofertas Activas
            </div>
            <div className="stat-value text-primary">{publicacionesActivas.length}</div>
            <div className="stat-desc">{inmuebles.length} publicaciones en total</div>
          </div>
          <div className="stat bg-base-100 rounded-box shadow-sm">
            <div className="stat-title flex items-center gap-2">
              <span className="icon-[tabler--home-dollar] text-lg text-success" aria-hidden="true" />
              En Venta
            </div>
            <div className="stat-value text-success">{totalEnVenta}</div>
            <div className="stat-desc">Inmuebles en oferta</div>
          </div>
          <div className="stat bg-base-100 rounded-box shadow-sm">
            <div className="stat-title flex items-center gap-2">
              <span className="icon-[tabler--key] text-lg text-info" aria-hidden="true" />
              En Arriendo
            </div>
            <div className="stat-value text-info">{totalEnArriendo}</div>
            <div className="stat-desc">Disponibles para renta</div>
          </div>
          <div className="stat bg-base-100 rounded-box shadow-sm">
            <div className="stat-title flex items-center gap-2">
              <span className="icon-[tabler--car] text-lg text-warning" aria-hidden="true" />
              Parqueaderos / Otros
            </div>
            <div className="stat-value text-warning">{totalOtrosTipos}</div>
            <div className="stat-desc">Parqueaderos o habitaciones</div>
          </div>
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
