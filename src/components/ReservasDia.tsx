'use client';

import { useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';

interface Zona {
  _id: string;
  nombre: string;
  aforoMaximo: number;
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
  tipo?: string;
  censoUnidadId?: string | { _id: string; identificador?: string };
  esCensoVerificado?: boolean;
  esReservaAdmin?: boolean;
  motivoAdmin?: string;
}

function nivelAforo(pct: number) {
  if (pct >= 100) return 'progress-error';
  if (pct >= 75) return 'progress-warning';
  return 'progress-success';
}

function textoEstado(pct: number) {
  if (pct >= 100) return 'Lleno';
  if (pct >= 75) return 'Casi lleno';
  return 'Disponible';
}

export default function ReservasDia({
  zonas,
  reservas: reservasIniciales,
}: {
  zonas: Zona[];
  reservas: Reserva[];
}) {
  const [tab, setTab] = useState<'aforo' | 'reservas'>('aforo');
  const [reservas, setReservas] = useState<Reserva[]>(reservasIniciales);
  const [procesandoId, setProcesandoId] = useState<string | null>(null);

  // Modal Reserva Admin
  const [modalAdminOpen, setModalAdminOpen] = useState(false);
  const [adminForm, setAdminForm] = useState({
    zonaId: '',
    fecha: new Date().toISOString().split('T')[0],
    horaInicio: '09:00',
    horaFin: '11:00',
    nombreSolicitante: 'Administración del Conjunto',
    motivoAdmin: 'Evento Comunitario / Mantenimiento Programado',
  });
  const [guardandoAdmin, setGuardandoAdmin] = useState(false);
  const [adminError, setAdminError] = useState('');

  // Actualizar reservas si el prop cambia
  if (reservasIniciales !== reservas && reservas.length === 0 && reservasIniciales.length > 0) {
    setReservas(reservasIniciales);
  }

  const activasPorZona = reservas.reduce<Record<string, number>>((acc, r) => {
    if ((r.estado !== 'activa' && r.estado !== 'aprobada') || !r.zonaId?._id) return acc;
    acc[r.zonaId._id] = (acc[r.zonaId._id] || 0) + 1;
    return acc;
  }, {});

  const aprobar = async (id: string) => {
    try {
      setProcesandoId(id);
      await apiFetch(`/reservas/${id}/aprobar`, { method: 'POST' });
      setReservas((prev) =>
        prev.map((r) => (r._id === id ? { ...r, estado: 'aprobada' } : r)),
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al aprobar reserva');
    } finally {
      setProcesandoId(null);
    }
  };

  const rechazar = async (id: string) => {
    const motivo = prompt('Motivo del rechazo de la reserva (opcional):') || 'Rechazada por administración';
    try {
      setProcesandoId(id);
      await apiFetch(`/reservas/${id}/rechazar`, {
        method: 'POST',
        body: JSON.stringify({ motivo }),
      });
      setReservas((prev) =>
        prev.map((r) => (r._id === id ? { ...r, estado: 'rechazada' } : r)),
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al rechazar reserva');
    } finally {
      setProcesandoId(null);
    }
  };

  const cancelar = async (id: string) => {
    if (!confirm('¿Deseas cancelar esta reserva?')) return;
    try {
      setProcesandoId(id);
      await apiFetch(`/reservas/${id}/cancelar`, { method: 'POST' });
      setReservas((prev) =>
        prev.map((r) => (r._id === id ? { ...r, estado: 'cancelada' } : r)),
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al cancelar reserva');
    } finally {
      setProcesandoId(null);
    }
  };

  const handleCrearAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError('');
    if (!adminForm.zonaId) {
      setAdminError('Selecciona una zona común');
      return;
    }
    setGuardandoAdmin(true);
    try {
      const nueva = await apiFetch('/reservas/admin', {
        method: 'POST',
        body: JSON.stringify({
          ...adminForm,
          tipo: 'propietario',
          torreInmueble: 'ADMINISTRACIÓN',
        }),
      });
      setReservas((prev) => [nueva, ...prev]);
      setModalAdminOpen(false);
      alert('Reserva administrativa creada con éxito');
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : 'Error al crear reserva admin');
    } finally {
      setGuardandoAdmin(false);
    }
  };

  return (
    <div className="bg-base-100 rounded-box shadow-sm mb-6 border border-base-200">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center px-4 pt-3 gap-2">
        <div className="tabs tabs-bordered">
          <button
            className={`tab ${tab === 'aforo' ? 'tab-active' : ''}`}
            onClick={() => setTab('aforo')}
          >
            Aforo Disponible
          </button>
          <button
            className={`tab ${tab === 'reservas' ? 'tab-active' : ''}`}
            onClick={() => setTab('reservas')}
          >
            Reservas del Día
            {reservas.length > 0 && (
              <span className="badge badge-sm badge-primary ml-2">
                {reservas.filter((r) => r.estado === 'activa' || r.estado === 'aprobada').length}
              </span>
            )}
          </button>
        </div>

        {zonas.length > 0 && (
          <button
            type="button"
            onClick={() => {
              if (zonas.length > 0 && !adminForm.zonaId) {
                setAdminForm((prev) => ({ ...prev, zonaId: zonas[0]._id }));
              }
              setModalAdminOpen(true);
            }}
            className="btn btn-xs sm:btn-sm btn-outline btn-primary gap-1"
          >
            <span className="icon-[tabler--calendar-plus] text-base" />
            <span>+ Reserva Administrativa</span>
          </button>
        )}
      </div>

      {/* Modal Reserva Administrativa */}
      {modalAdminOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-base-100 rounded-box shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in duration-200">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-lg">Crear Reserva Administrativa</h3>
              <button
                type="button"
                onClick={() => setModalAdminOpen(false)}
                className="btn btn-ghost btn-sm btn-circle"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-base-content/70">
              Reserva una zona común para eventos de la copropiedad, mantenimiento o asignación directa.
            </p>

            {adminError && <div className="alert alert-error text-xs">{adminError}</div>}

            <form onSubmit={handleCrearAdmin} className="space-y-3">
              <label className="form-control">
                <span className="label-text text-xs font-semibold">Zona común *</span>
                <select
                  className="select select-bordered select-sm"
                  value={adminForm.zonaId}
                  onChange={(e) => setAdminForm({ ...adminForm, zonaId: e.target.value })}
                  required
                >
                  <option value="">Selecciona zona...</option>
                  {zonas.map((z) => (
                    <option key={z._id} value={z._id}>
                      {z.nombre} (Aforo: {z.aforoMaximo})
                    </option>
                  ))}
                </select>
              </label>

              <label className="form-control">
                <span className="label-text text-xs font-semibold">Fecha *</span>
                <input
                  type="date"
                  className="input input-bordered input-sm"
                  value={adminForm.fecha}
                  onChange={(e) => setAdminForm({ ...adminForm, fecha: e.target.value })}
                  required
                />
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="form-control">
                  <span className="label-text text-xs font-semibold">Hora Inicio</span>
                  <input
                    type="time"
                    className="input input-bordered input-sm"
                    value={adminForm.horaInicio}
                    onChange={(e) => setAdminForm({ ...adminForm, horaInicio: e.target.value })}
                    required
                  />
                </label>
                <label className="form-control">
                  <span className="label-text text-xs font-semibold">Hora Fin</span>
                  <input
                    type="time"
                    className="input input-bordered input-sm"
                    value={adminForm.horaFin}
                    onChange={(e) => setAdminForm({ ...adminForm, horaFin: e.target.value })}
                    required
                  />
                </label>
              </div>

              <label className="form-control">
                <span className="label-text text-xs font-semibold">Nombre / Solicitante *</span>
                <input
                  type="text"
                  className="input input-bordered input-sm"
                  value={adminForm.nombreSolicitante}
                  onChange={(e) => setAdminForm({ ...adminForm, nombreSolicitante: e.target.value })}
                  required
                />
              </label>

              <label className="form-control">
                <span className="label-text text-xs font-semibold">Motivo del Evento</span>
                <input
                  type="text"
                  className="input input-bordered input-sm"
                  placeholder="Ej: Asamblea general, limpieza, actividad..."
                  value={adminForm.motivoAdmin}
                  onChange={(e) => setAdminForm({ ...adminForm, motivoAdmin: e.target.value })}
                />
              </label>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setModalAdminOpen(false)}
                  className="btn btn-outline btn-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoAdmin}
                  className="btn btn-primary btn-sm"
                >
                  {guardandoAdmin ? <span className="loading loading-spinner"></span> : 'Guardar Reserva'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {tab === 'aforo' && (
        <div className="p-4">
          {!zonas.length ? (
            <p className="text-base-content/60 text-center py-8">
              Aún no has registrado ninguna zona.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {zonas.map((z) => {
                const ocupadas = activasPorZona[z._id] || 0;
                const restantes = Math.max(0, z.aforoMaximo - ocupadas);
                const pct =
                  z.aforoMaximo > 0
                    ? Math.min(100, Math.round((ocupadas / z.aforoMaximo) * 100))
                    : 0;

                return (
                  <div key={z._id} className="bg-base-200/60 rounded-box p-4 border border-base-200">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold">{z.nombre}</h3>
                        <p className="text-sm text-base-content/60">
                          Capacidad: {z.aforoMaximo} personas
                        </p>
                      </div>
                      <span
                        className={`badge badge-sm ${
                          pct >= 100
                            ? 'badge-error'
                            : pct >= 75
                              ? 'badge-warning'
                              : 'badge-success'
                        }`}
                      >
                        {textoEstado(pct)}
                      </span>
                    </div>

                    <div className="mt-3">
                      <div className="flex items-baseline gap-2">
                        <span
                          className={`text-3xl font-bold ${
                            pct >= 100
                              ? 'text-error'
                              : pct >= 75
                                ? 'text-warning'
                                : 'text-success'
                          }`}
                        >
                          {restantes}
                        </span>
                        <span className="text-sm text-base-content/60">
                          cupos disponibles de {z.aforoMaximo}
                        </span>
                      </div>

                      <div
                        className="progress mt-3"
                        role="progressbar"
                        aria-valuenow={pct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      >
                        <div
                          className={`progress-bar ${nivelAforo(pct)}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      <p className="text-xs text-base-content/60 mt-2">
                        {ocupadas} reserva{ocupadas === 1 ? '' : 's'} activa{ocupadas === 1 ? '' : 's'} hoy
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'reservas' && (
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-base-content/60">
              {reservas.length === 0
                ? 'No hay reservas registradas para hoy.'
                : `${reservas.length} reserva${reservas.length === 1 ? '' : 's'} registradas hoy`}
            </p>
          </div>
          {reservas.length === 0 ? (
            <p className="text-base-content/60 text-center py-8">
              No hay reservas para hoy.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr className="text-xs text-base-content/70">
                    <th>Zona</th>
                    <th>Solicitante</th>
                    <th>Inmueble / Censo</th>
                    <th>Horario</th>
                    <th>Estado</th>
                    <th className="text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="text-xs">
                  {reservas.map((r) => (
                    <tr key={r._id} className="hover:bg-base-200/40">
                      <td className="font-semibold">{r.zonaId?.nombre || '—'}</td>
                      <td>
                        <div className="font-medium flex items-center gap-1">
                          <span>{r.nombreSolicitante}</span>
                          {r.esReservaAdmin && (
                            <span className="badge badge-primary badge-xs">Admin</span>
                          )}
                        </div>
                        {r.motivoAdmin ? (
                          <span className="text-[11px] text-base-content/50 italic block">
                            {r.motivoAdmin}
                          </span>
                        ) : r.tipo ? (
                          <span className="text-[11px] text-base-content/60 capitalize block">
                            {r.tipo}
                          </span>
                        ) : null}
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>{r.torreInmueble}</span>
                          {r.esCensoVerificado ? (
                            <span className="badge badge-success badge-xs gap-0.5" title="Residente verificado en el censo">
                              <span className="icon-[tabler--check] text-[10px]" /> Verificado
                            </span>
                          ) : (
                            <span className="badge badge-ghost badge-xs text-base-content/50">Manual</span>
                          )}
                          {r.censoUnidadId && (
                            <Link
                              href={`/dashboard/censo/${typeof r.censoUnidadId === 'object' ? r.censoUnidadId._id : r.censoUnidadId}`}
                              className="link link-hover text-primary text-xs font-medium ml-1"
                              title="Ver ficha de censo de la unidad"
                            >
                              Ver Ficha
                            </Link>
                          )}
                        </div>
                      </td>
                      <td className="whitespace-nowrap font-medium">
                        {r.horaInicio} - {r.horaFin}
                      </td>
                      <td>
                        {r.estado === 'aprobada' ? (
                          <span className="badge badge-xs badge-success">Aprobada</span>
                        ) : r.estado === 'activa' ? (
                          <span className="badge badge-xs badge-info">Activa</span>
                        ) : r.estado === 'rechazada' ? (
                          <span className="badge badge-xs badge-error">Rechazada</span>
                        ) : (
                          <span className="badge badge-xs badge-ghost">Cancelada</span>
                        )}
                      </td>
                      <td className="text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {r.estado !== 'aprobada' && r.estado !== 'rechazada' && r.estado !== 'cancelada' && (
                            <button
                              type="button"
                              onClick={() => aprobar(r._id)}
                              disabled={procesandoId === r._id}
                              className="btn btn-xs btn-success gap-0.5"
                              title="Aprobar reserva"
                            >
                              <span className="icon-[tabler--check] text-xs" />
                              Aprobar
                            </button>
                          )}
                          {r.estado !== 'rechazada' && r.estado !== 'cancelada' && (
                            <button
                              type="button"
                              onClick={() => rechazar(r._id)}
                              disabled={procesandoId === r._id}
                              className="btn btn-xs btn-error btn-outline gap-0.5"
                              title="Rechazar reserva"
                            >
                              <span className="icon-[tabler--x] text-xs" />
                              Rechazar
                            </button>
                          )}
                          {r.estado === 'aprobada' && (
                            <button
                              type="button"
                              onClick={() => cancelar(r._id)}
                              disabled={procesandoId === r._id}
                              className="btn btn-xs btn-ghost text-error gap-0.5"
                              title="Cancelar reserva"
                            >
                              Cancelar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
