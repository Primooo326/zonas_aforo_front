'use client';

import { useEffect, useState, useMemo } from 'react';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { fechaLocal } from '@/lib/fecha';
import QRCode from 'qrcode';
import ModalProgramarMantenimiento, { ZonaMantenimientoInfo } from '@/components/ModalProgramarMantenimiento';
import Paginacion from '@/components/Paginacion';
import BarraBusquedaFiltros from '@/components/BarraBusquedaFiltros';
import BotoneraAccionesTabla from '@/components/BotoneraAccionesTabla';

interface Horario {
  dia: string;
  inicio: string;
  fin: string;
}

interface Zona {
  _id: string;
  nombre: string;
  descripcion?: string;
  politicasUso?: string;
  aforoMaximo: number;
  lapsoMinutos: number;
  horarios?: Horario[];
  imagenes?: string[];
  enMantenimiento?: boolean;
  motivoMantenimiento?: string;
  mantenimientoFechaInicio?: string;
  mantenimientoHoraInicio?: string;
  mantenimientoFechaFin?: string;
  mantenimientoHoraFin?: string;
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

export default function ZonasPage() {
  const { edificio } = useAuth();
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [zonaMantenimiento, setZonaMantenimiento] = useState<ZonaMantenimientoInfo | null>(null);
  const [searchZona, setSearchZona] = useState('');
  const [ordenZonas, setOrdenZonas] = useState('nombre_asc');
  const [filtroEstadoZonas, setFiltroEstadoZonas] = useState('todos');
  const [drawerFiltros, setDrawerFiltros] = useState(false);
  const [vistaZonas, setVistaZonas] = useState<'tabla' | 'tarjetas'>('tarjetas');
  const [pageZonas, setPageZonas] = useState(1);
  const [itemsPerPageZonas, setItemsPerPageZonas] = useState(10);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('vista_zonas') as 'tabla' | 'tarjetas' | null;
      if (saved === 'tabla' || saved === 'tarjetas') {
        setVistaZonas(saved);
      }
    }
  }, []);

  const publicUrl = typeof window !== 'undefined' && edificio?.id
    ? `${window.location.origin}/invitacion/${edificio.id}`
    : '';

  useEffect(() => {
    if (edificio?.id) {
      QRCode.toDataURL(`${window.location.origin}/invitacion/${edificio.id}`)
        .then(setQrCodeUrl)
        .catch(console.error);
    }
  }, [edificio?.id]);

  const copiarLink = () => {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const descargarQR = () => {
    if (!qrCodeUrl || !edificio) return;
    const a = document.createElement('a');
    a.href = qrCodeUrl;
    a.download = `reservas-qr-${edificio.nombre || edificio.id}.png`;
    a.click();
  };

  const cargar = () => {
    apiFetch('/zonas')
      .then((data) => setZonas(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));

    if (edificio?.id) {
      const hoy = fechaLocal();
      apiFetch(`/edificio/${edificio.id}/reservas?fecha=${hoy}`)
        .then((data) => setReservas(Array.isArray(data) ? data : []))
        .catch(() => {});
    }
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edificio]);

  const stats = useMemo(() => {
    const activas = reservas.filter((r) => r.estado === 'activa');
    const ahora = new Date();
    const hhmmAhora = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;
    const totalAforo = zonas.reduce((sum, z) => sum + (z.aforoMaximo || 0), 0);
    const ocupacionAhora = activas.filter(
      (r) => r.horaInicio <= hhmmAhora && hhmmAhora < r.horaFin,
    ).length;
    const pctOcupacionAhora = totalAforo > 0 ? Math.round((ocupacionAhora / totalAforo) * 100) : 0;
    const zonasMantenimiento = zonas.filter((z) => z.enMantenimiento).length;
    const reservasHoy = activas.length;

    return {
      totalAforo,
      ocupacionAhora,
      pctOcupacionAhora,
      zonasMantenimiento,
      reservasHoy,
    };
  }, [zonas, reservas]);

  const zonasFiltradas = useMemo(() => {
    const filtradas = zonas.filter((z) => {
      if (filtroEstadoZonas === 'operativas' && z.enMantenimiento) return false;
      if (filtroEstadoZonas === 'mantenimiento' && !z.enMantenimiento) return false;
      if (searchZona.trim()) {
        const term = searchZona.trim().toLowerCase();
        const matchNombre = z.nombre.toLowerCase().includes(term);
        const matchDesc = z.descripcion?.toLowerCase().includes(term);
        const matchPol = z.politicasUso?.toLowerCase().includes(term);
        if (!matchNombre && !matchDesc && !matchPol) return false;
      }
      return true;
    });

    filtradas.sort((a, b) => {
      switch (ordenZonas) {
        case 'nombre_desc':
          return b.nombre.localeCompare(a.nombre);
        case 'aforo_desc':
          return (b.aforoMaximo || 0) - (a.aforoMaximo || 0);
        case 'aforo_asc':
          return (a.aforoMaximo || 0) - (b.aforoMaximo || 0);
        case 'lapso_desc':
          return (b.lapsoMinutos || 0) - (a.lapsoMinutos || 0);
        case 'lapso_asc':
          return (a.lapsoMinutos || 0) - (b.lapsoMinutos || 0);
        case 'nombre_asc':
        default:
          return a.nombre.localeCompare(b.nombre);
      }
    });

    return filtradas;
  }, [zonas, searchZona, ordenZonas, filtroEstadoZonas]);

  const zonasPaginadas = useMemo(() => {
    const start = (pageZonas - 1) * itemsPerPageZonas;
    return zonasFiltradas.slice(start, start + itemsPerPageZonas);
  }, [zonasFiltradas, pageZonas, itemsPerPageZonas]);

  const totalFiltrosActivos = useMemo(() => {
    return filtroEstadoZonas !== 'todos' ? 1 : 0;
  }, [filtroEstadoZonas]);

  const eliminar = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar la zona "${nombre}"?`)) return;
    try {
      await apiFetch(`/zonas/${id}`, { method: 'DELETE' });
      cargar();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al eliminar la zona');
    }
  };

  const abrirModalMantenimiento = (zona: Zona) => {
    setZonaMantenimiento({
      id: zona._id,
      nombre: zona.nombre,
      enMantenimiento: zona.enMantenimiento,
      motivoMantenimiento: zona.motivoMantenimiento,
      mantenimientoFechaInicio: zona.mantenimientoFechaInicio,
      mantenimientoHoraInicio: zona.mantenimientoHoraInicio,
      mantenimientoFechaFin: zona.mantenimientoFechaFin,
      mantenimientoHoraFin: zona.mantenimientoHoraFin,
    });
  };

  return (
    <div className="space-y-6">
      {/* Encabezado y Acciones */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-base-content flex items-center gap-2">
            <span className="icon-[tabler--calendar-event] text-primary text-2xl sm:text-3xl shrink-0" aria-hidden="true" />
            <span>Zonas Comunes</span>
          </h1>
          <p className="text-xs sm:text-sm text-base-content/70 mt-0.5">
            Gestiona las áreas sociales, aforos y horarios de tu edificio
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 w-full sm:flex sm:flex-wrap sm:items-center sm:w-auto">
          {edificio?.id && (
            <>
              <button
                type="button"
                onClick={() => setQrModalOpen(true)}
                className="btn btn-sm btn-outline btn-primary gap-1.5 px-2.5 sm:px-3 text-xs sm:text-sm font-medium w-full sm:w-auto justify-center"
              >
                <span className="icon-[tabler--qrcode] text-base shrink-0" aria-hidden="true" />
                <span className="truncate">Código QR <span className="hidden sm:inline">& Link</span></span>
              </button>
              <Link
                href={`/invitacion/${edificio.id}`}
                target="_blank"
                className="btn btn-sm btn-outline gap-1.5 px-2.5 sm:px-3 text-xs sm:text-sm font-medium w-full sm:w-auto justify-center"
              >
                <span className="icon-[tabler--external-link] text-base shrink-0" aria-hidden="true" />
                <span className="truncate">Portal de Reservas</span>
              </Link>
            </>
          )}
          <Link
            href="/dashboard/zonas/create"
            className="btn btn-sm btn-primary col-span-2 sm:col-span-1 w-full sm:w-auto gap-1.5 px-3 text-xs sm:text-sm font-medium justify-center"
          >
            <span className="icon-[tabler--plus] text-base shrink-0" aria-hidden="true" />
            <span>Nueva Zona</span>
          </Link>
        </div>
      </div>

      {/* Modal QR */}
      {qrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-base-100 rounded-box shadow-xl max-w-md w-full p-5 sm:p-6 space-y-4 animate-in fade-in duration-200">
            <div className="flex justify-between items-center">
              <h3 className="text-base sm:text-lg font-bold">Portal de Reservas de Zonas</h3>
              <button
                type="button"
                onClick={() => setQrModalOpen(false)}
                className="btn btn-ghost btn-sm btn-circle"
              >
                ✕
              </button>
            </div>
            <p className="text-xs sm:text-sm text-base-content/70">
              Comparte este código QR o enlace con los residentes para que puedan consultar aforos y reservar zonas comunes sin iniciar sesión como administrador.
            </p>

            <div className="flex flex-col items-center bg-base-200 rounded-box p-4">
              {qrCodeUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrCodeUrl}
                  alt="QR Reservas Zonas"
                  className="w-44 h-44 sm:w-48 sm:h-48 bg-white p-2 rounded-lg shadow-2xs"
                />
              ) : (
                <div className="w-44 h-44 sm:w-48 sm:h-48 bg-base-300 rounded-lg flex items-center justify-center">
                  <span className="loading loading-spinner"></span>
                </div>
              )}
              <button
                type="button"
                onClick={descargarQR}
                className="btn btn-xs sm:btn-sm btn-outline mt-3 gap-1.5"
              >
                <span className="icon-[tabler--download] text-sm" aria-hidden="true" />
                Descargar QR (PNG)
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-base-content/70">Enlace de reservas</label>
              <div className="join w-full">
                <input
                  type="text"
                  className="input input-bordered input-sm join-item flex-1 text-xs"
                  value={publicUrl}
                  readOnly
                />
                <button
                  type="button"
                  className={`btn btn-sm join-item ${copied ? 'btn-success' : 'btn-primary'}`}
                  onClick={copiarLink}
                >
                  <span className="icon-[tabler--copy] text-base" aria-hidden="true" />
                  {copied ? 'Copiado' : 'Copiar'}
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => window.open(publicUrl, '_blank')}
                className="btn btn-outline btn-primary btn-sm flex-1 gap-1.5"
              >
                <span className="icon-[tabler--external-link] text-base" aria-hidden="true" />
                Abrir en nueva pestaña
              </button>
              <button
                type="button"
                onClick={() => setQrModalOpen(false)}
                className="btn btn-outline btn-sm"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mini Panel de KPIs Operativos de Zonas */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI 1: % Ocupación Actual */}
        <div className="card bg-base-100 shadow-sm border border-base-200 p-3 sm:p-4">
          <div className="flex items-center gap-1.5 text-2xs sm:text-xs font-medium text-base-content/70">
            <span className="icon-[tabler--gauge] text-base sm:text-lg text-primary" aria-hidden="true" />
            <span>Ocupación Actual</span>
          </div>
          <div className={`mt-1.5 text-xl sm:text-2xl font-bold ${colorPct(stats.pctOcupacionAhora)}`}>
            {stats.pctOcupacionAhora}%
          </div>
          <div
            className="progress mt-2 h-1.5 bg-base-200"
            role="progressbar"
            aria-valuenow={stats.pctOcupacionAhora}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className={`progress-bar ${barraPct(stats.pctOcupacionAhora)}`}
              style={{ width: `${Math.min(100, stats.pctOcupacionAhora)}%` }}
            />
          </div>
          <div className="text-3xs sm:text-xs text-base-content/50 mt-1 truncate">
            {stats.ocupacionAhora} de {stats.totalAforo} cupos en uso
          </div>
        </div>

        {/* KPI 2: Cupos en Uso */}
        <div className="card bg-base-100 shadow-sm border border-base-200 p-3 sm:p-4">
          <div className="flex items-center gap-1.5 text-info text-2xs sm:text-xs font-medium">
            <span className="icon-[tabler--users] text-base sm:text-lg" aria-hidden="true" />
            <span>Cupos en Uso</span>
          </div>
          <div className="mt-1.5 text-xl sm:text-2xl font-bold text-info">
            {stats.ocupacionAhora}
          </div>
          <div className="text-3xs sm:text-xs text-base-content/50 mt-0.5 truncate">
            aforo actual utilizado
          </div>
        </div>

        {/* KPI 3: Reservas Hoy */}
        <div className="card bg-base-100 shadow-sm border border-base-200 p-3 sm:p-4">
          <div className="flex items-center gap-1.5 text-accent text-2xs sm:text-xs font-medium">
            <span className="icon-[tabler--calendar-check] text-base sm:text-lg" aria-hidden="true" />
            <span>Reservas Hoy</span>
          </div>
          <div className="mt-1.5 text-xl sm:text-2xl font-bold text-accent">
            {stats.reservasHoy}
          </div>
          <div className="text-3xs sm:text-xs text-base-content/50 mt-0.5 truncate">
            turnos activos del día
          </div>
        </div>

        {/* KPI 4: Zonas en Mantenimiento */}
        <div className="card bg-base-100 shadow-sm border border-base-200 p-3 sm:p-4">
          <div className="flex items-center gap-1.5 text-warning text-2xs sm:text-xs font-medium">
            <span className="icon-[tabler--tool] text-base sm:text-lg" aria-hidden="true" />
            <span>En Mantenimiento</span>
          </div>
          <div className="mt-1.5 text-xl sm:text-2xl font-bold text-warning">
            {stats.zonasMantenimiento}
          </div>
          <div className="text-3xs sm:text-xs text-base-content/50 mt-0.5 truncate">
            {stats.zonasMantenimiento === 1 ? '1 zona bloqueada' : `${stats.zonasMantenimiento} zonas bloqueadas`}
          </div>
        </div>
      </div>

      {/* Barra de Búsqueda y Filtros Compartida (Fila única + Drawer + Toggle Vista) */}
      <BarraBusquedaFiltros
        busqueda={searchZona}
        onBusquedaChange={(val) => {
          setSearchZona(val);
          setPageZonas(1);
        }}
        placeholderBusqueda="Buscar zona por nombre, descripción o políticas..."
        orden={ordenZonas}
        onOrdenChange={(val) => {
          setOrdenZonas(val);
          setPageZonas(1);
        }}
        opcionesOrden={[
          { valor: 'nombre_asc', etiqueta: 'Orden: Nombre (A - Z)' },
          { valor: 'nombre_desc', etiqueta: 'Orden: Nombre (Z - A)' },
          { valor: 'aforo_desc', etiqueta: 'Orden: Mayor aforo' },
          { valor: 'aforo_asc', etiqueta: 'Orden: Menor aforo' },
          { valor: 'lapso_desc', etiqueta: 'Orden: Turno más largo' },
          { valor: 'lapso_asc', etiqueta: 'Orden: Turno más corto' },
        ]}
        labelOrden="Criterio de orden de zonas comunes"
        vista={vistaZonas}
        onVistaChange={(v) => {
          setVistaZonas(v);
          if (typeof window !== 'undefined') {
            localStorage.setItem('vista_zonas', v);
          }
        }}
        drawerFiltrosAbierto={drawerFiltros}
        onToggleDrawerFiltros={() => setDrawerFiltros((prev) => !prev)}
        filtrosActivosCount={totalFiltrosActivos}
        tituloFiltros="Filtros de zonas"
        onLimpiarFiltros={() => {
          setFiltroEstadoZonas('todos');
          setPageZonas(1);
        }}
      >
        <div>
          <label className="text-3xs uppercase font-bold text-base-content/50 block mb-1">
            Estado Operativo
          </label>
          <select
            className="select select-sm w-full text-xs"
            value={filtroEstadoZonas}
            onChange={(e) => {
              setFiltroEstadoZonas(e.target.value);
              setPageZonas(1);
            }}
          >
            <option value="todos">Todas las zonas</option>
            <option value="operativas">Solo Zonas Operativas</option>
            <option value="mantenimiento">En Mantenimiento</option>
          </select>
        </div>
      </BarraBusquedaFiltros>

      {/* Listado de Zonas */}
      {loading ? (
        <div className="flex justify-center py-16">
          <span className="loading loading-spinner loading-lg text-primary"></span>
        </div>
      ) : zonasFiltradas.length === 0 ? (
        <div className="bg-base-100 rounded-box shadow-sm p-8 sm:p-12 text-center">
          <div className="flex justify-center mb-3">
            <span className="icon-[tabler--map-pin] text-5xl text-base-content/30" aria-hidden="true" />
          </div>
          <p className="text-base-content/60 mb-4 text-sm">
            {zonas.length === 0 ? 'No hay zonas registradas' : 'No hay zonas que coincidan con la búsqueda'}
          </p>
          {zonas.length === 0 ? (
            <Link href="/dashboard/zonas/create" className="btn btn-primary btn-sm gap-1.5">
              <span className="icon-[tabler--plus] text-base" aria-hidden="true" />
              Crear primera zona
            </Link>
          ) : (
            <button
              onClick={() => {
                setSearchZona('');
                setFiltroEstadoZonas('todos');
                setPageZonas(1);
              }}
              className="btn btn-outline btn-sm"
            >
              Limpiar búsqueda y filtros
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {vistaZonas === 'tabla' ? (
            <div className="card bg-base-100 shadow-sm border border-base-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Zona Común</th>
                      <th>Aforo y Lapso</th>
                      <th>Horarios</th>
                      <th>Estado</th>
                      <th className="text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {zonasPaginadas.map((z) => (
                      <tr key={z._id} className={z.enMantenimiento ? 'bg-warning/5' : ''}>
                        <td>
                          <div className="font-bold text-base-content text-sm">{z.nombre}</div>
                          {z.politicasUso ? (
                            <div className="text-2xs text-base-content/60 line-clamp-1 max-w-sm mt-0.5">
                              {z.politicasUso}
                            </div>
                          ) : z.descripcion ? (
                            <div className="text-2xs text-base-content/60 line-clamp-1 max-w-sm mt-0.5">
                              {z.descripcion}
                            </div>
                          ) : null}
                        </td>
                        <td>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="badge badge-outline badge-xs font-semibold">
                              Aforo: {z.aforoMaximo} personas
                            </span>
                            <span className="badge badge-outline badge-xs">
                              Lapso: {z.lapsoMinutos} min
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {z.horarios && z.horarios.length > 0 ? (
                              z.horarios.slice(0, 3).map((h) => (
                                <span key={h.dia} className="badge badge-2xs badge-success">
                                  {h.dia.slice(0, 3)}: {h.inicio}-{h.fin}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-base-content/40">Sin horarios</span>
                            )}
                            {z.horarios && z.horarios.length > 3 && (
                              <span className="badge badge-2xs badge-ghost">+{z.horarios.length - 3}</span>
                            )}
                          </div>
                        </td>
                        <td>
                          {z.enMantenimiento ? (
                            <span className="badge badge-xs badge-warning font-semibold gap-1">
                              <span className="icon-[tabler--tool] text-xs" /> Mantenimiento
                            </span>
                          ) : (
                            <span className="badge badge-xs badge-success font-semibold">Operativa</span>
                          )}
                        </td>
                        <td className="text-right">
                          <BotoneraAccionesTabla
                            editarUrl={`/dashboard/zonas/${z._id}/edit`}
                            tituloEditar="Editar zona común"
                            onEliminar={() => eliminar(z._id, z.nombre)}
                            tituloEliminar="Eliminar zona"
                          >
                            <button
                              type="button"
                              onClick={() => abrirModalMantenimiento(z)}
                              title={z.enMantenimiento ? 'Gestionar mantenimiento' : 'Programar mantenimiento'}
                              aria-label="Mantenimiento"
                              className={`inline-flex items-center justify-center w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-lg border text-sm transition-all ${
                                z.enMantenimiento
                                  ? 'bg-warning text-warning-content border-warning font-semibold'
                                  : 'bg-base-200 text-base-content/80 border-base-300 hover:bg-warning/20 hover:text-warning'
                              }`}
                            >
                              <span className="icon-[tabler--tool] text-base" />
                            </button>
                          </BotoneraAccionesTabla>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {zonasPaginadas.map((z) => (
                <div key={z._id} className={`card bg-base-100 shadow-sm border ${z.enMantenimiento ? 'border-warning/60 bg-warning/5' : 'border-base-200'} overflow-hidden`}>
                  {z.imagenes && z.imagenes.length > 0 && z.imagenes[0] && (
                    <div className="h-36 w-full overflow-hidden bg-base-200 relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={z.imagenes[0]}
                        alt={z.nombre}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      {z.enMantenimiento && (
                        <div className="absolute top-2 right-2 badge badge-warning gap-1 font-semibold shadow-xs">
                          <span className="icon-[tabler--tool] text-xs" /> En Mantenimiento
                        </div>
                      )}
                    </div>
                  )}
                  <div className="card-body p-4 sm:p-5 flex flex-col justify-between gap-3">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="card-title text-base sm:text-lg font-bold">{z.nombre}</h3>
                        {z.enMantenimiento && (!z.imagenes || !z.imagenes.length) && (
                          <span className="badge badge-warning badge-sm gap-1 shrink-0">
                            <span className="icon-[tabler--tool] text-xs" /> Mantenimiento
                          </span>
                        )}
                      </div>

                      {z.enMantenimiento && (
                        <div className="alert alert-warning py-2 px-3 text-xs rounded-xl mt-1.5 flex flex-col gap-0.5 shadow-2xs">
                          <div className="flex items-center gap-1.5 font-semibold text-warning-content">
                            <span className="icon-[tabler--tool] text-sm shrink-0" />
                            <span>{z.motivoMantenimiento || 'En mantenimiento'}</span>
                          </div>
                          {z.mantenimientoFechaInicio && (
                            <div className="text-2xs text-warning-content/85 pl-5 font-medium">
                              Programado: {z.mantenimientoFechaInicio} {z.mantenimientoHoraInicio || ''} al {z.mantenimientoFechaFin || ''} {z.mantenimientoHoraFin || ''}
                            </div>
                          )}
                        </div>
                      )}

                      {z.politicasUso ? (
                        <div className="text-xs text-base-content/70 bg-base-200/50 p-2 rounded-md mt-2">
                          <span className="font-semibold text-primary block mb-0.5">Políticas de Uso:</span>
                          <p className="line-clamp-2">{z.politicasUso}</p>
                        </div>
                      ) : z.descripcion ? (
                        <p className="text-xs sm:text-sm text-base-content/60 mt-1 line-clamp-2">
                          {z.descripcion}
                        </p>
                      ) : null}

                      <div className="flex flex-wrap gap-2 text-xs mt-3">
                        <span className="badge badge-outline badge-sm">Aforo: {z.aforoMaximo} personas</span>
                        <span className="badge badge-outline badge-sm">Lapso: {z.lapsoMinutos} min</span>
                      </div>

                      {z.horarios && z.horarios.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2.5">
                          {z.horarios.map((h) => (
                            <span key={h.dia} className="badge badge-xs badge-success">
                              {h.dia}: {h.inicio} - {h.fin}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-base-200">
                      <BotoneraAccionesTabla
                        editarUrl={`/dashboard/zonas/${z._id}/edit`}
                        tituloEditar="Editar zona común"
                        onEliminar={() => eliminar(z._id, z.nombre)}
                        tituloEliminar="Eliminar zona"
                      >
                        <button
                          type="button"
                          onClick={() => abrirModalMantenimiento(z)}
                          className={`btn btn-xs ${
                            z.enMantenimiento
                              ? 'btn-warning font-semibold shadow-2xs'
                              : 'btn-outline text-base-content/70 hover:text-base-content'
                          } gap-1`}
                          title="Programar o gestionar mantenimiento"
                        >
                          <span className="icon-[tabler--tool] text-xs" />
                          <span>{z.enMantenimiento ? 'En Mantenimiento' : 'Mantenimiento'}</span>
                        </button>
                      </BotoneraAccionesTabla>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Paginacion
            currentPage={pageZonas}
            totalItems={zonasFiltradas.length}
            itemsPerPage={itemsPerPageZonas}
            onPageChange={setPageZonas}
            onItemsPerPageChange={setItemsPerPageZonas}
            className="rounded-box shadow-sm border border-base-200"
          />
        </div>
      )}

      {/* Modal para Programar Mantenimiento */}
      <ModalProgramarMantenimiento
        isOpen={Boolean(zonaMantenimiento)}
        zona={zonaMantenimiento}
        onClose={() => setZonaMantenimiento(null)}
        onSuccess={cargar}
      />
    </div>
  );
}
