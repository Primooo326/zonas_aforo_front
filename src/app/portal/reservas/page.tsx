'use client';

import { useState, useEffect, useCallback } from 'react';
import { residentApiFetch } from '@/lib/api';

interface Horario {
  dia: string;
  inicio: string;
  fin: string;
}

interface Zona {
  _id: string;
  nombre: string;
  descripcion?: string;
  aforoMaximo: number;
  lapsoMinutos: number;
  horarios?: Horario[];
  enMantenimiento?: boolean;
  motivoMantenimiento?: string;
  mantenimientoFechaInicio?: string;
  mantenimientoFechaFin?: string;
}

interface Reserva {
  _id: string;
  zonaId: {
    _id: string;
    nombre: string;
  } | null;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  nombreSolicitante: string;
  torreInmueble: string;
  estado: string;
  motivoRechazo?: string;
  createdAt: string;
}

interface Persona {
  nombreCompleto: string;
  telefono?: string;
  fechaNacimiento?: string;
}

export default function ReservasPortalPage() {
  const [loading, setLoading] = useState(true);
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [esMoroso, setEsMoroso] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Booking Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedZona, setSelectedZona] = useState<Zona | null>(null);
  const [fecha, setFecha] = useState('');
  const [horaInicio, setHoraInicio] = useState('');
  const [nombreSolicitante, setNombreSolicitante] = useState('');
  const [telefonoContacto, setTelefonoContacto] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');

  const cargarDatos = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const [meRes, zonasRes, reservasRes] = await Promise.all([
        residentApiFetch('/portal/me'),
        residentApiFetch('/portal/zonas'),
        residentApiFetch('/portal/reservas'),
      ]);

      const isUnitMoroso = meRes.unidad?.tags?.includes('moroso') || false;
      setEsMoroso(isUnitMoroso);
      setPersonas(meRes.unidad?.personas || []);
      setZonas(zonasRes || []);
      setReservas(reservasRes || []);

      if (meRes.propietario) {
        setNombreSolicitante(meRes.propietario.nombre || '');
        setTelefonoContacto(meRes.propietario.telefono || '');
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Error al cargar zonas y reservas',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const abrirReservaModal = (zona: Zona) => {
    if (esMoroso) {
      alert('Tu apartamento presenta restricciones por mora en administración.');
      return;
    }
    if (zona.enMantenimiento) {
      alert(`La zona "${zona.nombre}" se encuentra en mantenimiento y no admite reservas.`);
      return;
    }
    setSelectedZona(zona);
    const hoy = new Date().toISOString().split('T')[0];
    setFecha(hoy);
    setHoraInicio('');
    setBookingError('');
    setModalOpen(true);
  };

  const handleCrearReserva = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedZona) return;
    setBookingLoading(true);
    setBookingError('');

    try {
      await residentApiFetch('/portal/reservas', {
        method: 'POST',
        body: JSON.stringify({
          zonaId: selectedZona._id,
          fecha,
          horaInicio,
          nombreSolicitante,
          telefonoContacto,
          edadSolicitante: 25, // Adult validation passed
        }),
      });

      setModalOpen(false);
      setSuccessMsg('¡Reserva creada con éxito!');
      await cargarDatos();
    } catch (err: unknown) {
      setBookingError(
        err instanceof Error ? err.message : 'Error al solicitar reserva',
      );
    } finally {
      setBookingLoading(false);
    }
  };

  const handleCancelarReserva = async (reservaId: string) => {
    if (!confirm('¿Deseas cancelar esta reserva?')) return;
    try {
      await residentApiFetch(`/portal/reservas/${reservaId}/cancelar`, {
        method: 'PATCH',
      });
      setSuccessMsg('Reserva cancelada exitosamente.');
      await cargarDatos();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al cancelar la reserva');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <span className="loading loading-spinner loading-lg text-primary"></span>
        <p className="text-sm font-medium text-base-content/70">
          Cargando zonas comunes y reservas...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b arch-border">
        <div className="flex items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-black text-base-content flex items-center gap-2">
            <span className="icon-[tabler--calendar-event] text-primary text-2xl sm:text-3xl" aria-hidden="true"></span>
            Zonas Comunes & Reservas
          </h1>
          <span className="badge badge-sm badge-neutral font-mono font-bold">
            {zonas.length} disponibles
          </span>
        </div>
      </div>

      {/* Alert Messages */}
      {successMsg && (
        <div className="alert alert-success py-2.5 px-4 text-xs flex items-center justify-between rounded-lg">
          <div className="flex items-center gap-2">
            <span className="icon-[tabler--check] text-base shrink-0"></span>
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="btn btn-ghost btn-xs">✕</button>
        </div>
      )}

      {error && (
        <div className="alert alert-error py-2.5 px-4 text-xs rounded-lg">
          <span>{error}</span>
        </div>
      )}

      {/* Moroso Notice */}
      {esMoroso && (
        <div className="alert alert-error py-3 px-4 text-xs rounded-lg flex items-center gap-2.5">
          <span className="icon-[tabler--alert-circle] text-lg shrink-0" aria-hidden="true"></span>
          <span><strong>Reservas restringidas:</strong> Tu unidad presenta mora en administración.</span>
        </div>
      )}

      {/* Catalog of Common Areas */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold text-base-content/70 uppercase tracking-wider flex items-center gap-1.5">
          <span>Zonas Comunes</span>
          <span className="badge badge-3xs badge-primary font-bold">{zonas.length}</span>
        </h2>

        {zonas.length === 0 ? (
          <div className="arch-panel p-8 text-center shadow-xs">
            <p className="text-xs text-base-content/60 italic">
              No hay zonas comunes configuradas en este momento.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {zonas.map((zona) => (
              <div
                key={zona._id}
                className={`arch-panel p-4 flex flex-col justify-between shadow-xs transition-colors ${
                  zona.enMantenimiento ? 'opacity-70 border-warning/40' : 'hover:border-primary/40'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h3 className="font-bold text-sm text-base-content">
                      {zona.nombre}
                    </h3>
                    {zona.enMantenimiento ? (
                      <span className="badge badge-warning badge-3xs font-semibold shrink-0">
                        Mantenimiento
                      </span>
                    ) : (
                      <span className="badge badge-success badge-3xs font-semibold shrink-0">
                        Disponible
                      </span>
                    )}
                  </div>

                  {zona.descripcion && (
                    <p className="text-2xs text-base-content/65 line-clamp-2 mb-2.5">
                      {zona.descripcion}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-1.5 mb-3 text-3xs">
                    <span className="badge badge-xs badge-ghost font-medium">
                      👥 Máx: {zona.aforoMaximo} pers.
                    </span>
                    <span className="badge badge-xs badge-ghost font-medium">
                      ⏱️ Turno: {zona.lapsoMinutos} min
                    </span>
                  </div>

                  {/* Maintenance reason if active */}
                  {zona.enMantenimiento && zona.motivoMantenimiento && (
                    <p className="text-3xs text-warning bg-warning/10 p-2 rounded mb-2">
                      ⚠️ {zona.motivoMantenimiento}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => abrirReservaModal(zona)}
                  disabled={esMoroso || zona.enMantenimiento}
                  className="btn btn-xs btn-primary w-full font-bold shadow-xs cursor-pointer"
                >
                  {zona.enMantenimiento ? 'En Mantenimiento' : esMoroso ? 'Restringido' : 'Reservar Espacio'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Historial de Reservas del Inmueble */}
      <div className="space-y-3 pt-3 border-t arch-border">
        <h2 className="text-xs font-bold text-base-content/70 uppercase tracking-wider flex items-center gap-1.5">
          <span>Mis Reservas</span>
          <span className="badge badge-3xs badge-neutral font-bold">{reservas.length}</span>
        </h2>

        {reservas.length === 0 ? (
          <div className="arch-panel p-6 text-center shadow-xs">
            <p className="text-2xs text-base-content/60 italic">
              Aún no tienes reservas registradas para tu inmueble.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {reservas.map((reserva) => {
              const esActiva = reserva.estado === 'activa' || reserva.estado === 'aprobada';
              return (
                <div
                  key={reserva._id}
                  className="arch-panel p-3 sm:p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">📅</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-base-content">
                          {reserva.zonaId?.nombre || 'Zona Común'}
                        </span>
                        <span
                          className={`badge badge-3xs font-bold capitalize ${
                            reserva.estado === 'aprobada' || reserva.estado === 'activa'
                              ? 'badge-success'
                              : reserva.estado === 'cancelada'
                              ? 'badge-ghost'
                              : 'badge-error'
                          }`}
                        >
                          {reserva.estado}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-2xs text-base-content/70 mt-0.5">
                        <span className="font-mono">📅 {reserva.fecha}</span>
                        <span className="font-mono">⏰ {reserva.horaInicio} - {reserva.horaFin}</span>
                        <span>· {reserva.nombreSolicitante}</span>
                      </div>
                      {reserva.motivoRechazo && (
                        <p className="text-3xs text-error mt-0.5 italic">
                          Motivo: {reserva.motivoRechazo}
                        </p>
                      )}
                    </div>
                  </div>

                  {esActiva && (
                    <button
                      onClick={() => handleCancelarReserva(reserva._id)}
                      className="btn btn-ghost btn-xs text-error hover:bg-error/10 font-semibold self-end sm:self-auto"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Booking Modal */}
      {modalOpen && selectedZona && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="arch-panel w-full max-w-md p-5 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between pb-2.5 border-b arch-border mb-3.5">
              <div>
                <h3 className="text-base font-black text-base-content">
                  Reservar {selectedZona.nombre}
                </h3>
                <span className="badge badge-3xs badge-neutral font-medium">
                  Turno: {selectedZona.lapsoMinutos} min · Aforo: {selectedZona.aforoMaximo} pers.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="btn btn-ghost btn-circle btn-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCrearReserva} className="space-y-3">
              {bookingError && (
                <div className="alert alert-error py-2 text-xs rounded">
                  <span>{bookingError}</span>
                </div>
              )}

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-2xs font-semibold text-base-content/75 mb-1">
                    Fecha *
                  </label>
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().split('T')[0]}
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    className="input input-bordered arch-border bg-base-100 text-xs w-full rounded-md px-3 py-1.5 focus:border-primary font-mono"
                  />
                </div>

                <div>
                  <label className="block text-2xs font-semibold text-base-content/75 mb-1">
                    Hora de Inicio *
                  </label>
                  <input
                    type="time"
                    required
                    value={horaInicio}
                    onChange={(e) => setHoraInicio(e.target.value)}
                    className="input input-bordered arch-border bg-base-100 text-xs w-full rounded-md px-3 py-1.5 focus:border-primary font-mono"
                  />
                </div>
              </div>

              {/* Applicant Name */}
              <div>
                <label className="block text-2xs font-semibold text-base-content/75 mb-1">
                  Solicitante *
                </label>
                {personas.length > 0 ? (
                  <select
                    value={nombreSolicitante}
                    onChange={(e) => setNombreSolicitante(e.target.value)}
                    className="select select-bordered arch-border bg-base-100 text-xs w-full rounded-md px-3 py-1.5 focus:border-primary"
                  >
                    {personas.map((p, idx) => (
                      <option key={idx} value={p.nombreCompleto}>
                        {p.nombreCompleto}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    value={nombreSolicitante}
                    onChange={(e) => setNombreSolicitante(e.target.value)}
                    placeholder="Nombre del solicitante"
                    className="input input-bordered arch-border bg-base-100 text-xs w-full rounded-md px-3 py-1.5 focus:border-primary"
                  />
                )}
              </div>

              {/* Contact Phone */}
              <div>
                <label className="block text-2xs font-semibold text-base-content/75 mb-1">
                  Teléfono de Contacto (Opcional)
                </label>
                <input
                  type="tel"
                  value={telefonoContacto}
                  onChange={(e) => setTelefonoContacto(e.target.value)}
                  placeholder="ej: 3001234567"
                  className="input input-bordered arch-border bg-base-100 text-xs w-full rounded-md px-3 py-1.5 focus:border-primary font-mono"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t arch-border">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn btn-ghost btn-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={bookingLoading}
                  className="btn btn-primary btn-xs font-bold shadow-xs px-4"
                >
                  {bookingLoading ? (
                    <>
                      <span className="loading loading-spinner loading-xs"></span>
                      <span>Verificando...</span>
                    </>
                  ) : (
                    <span>Confirmar Reserva</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
