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
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-base-content tracking-tight">
          Zonas Comunes & Reservas
        </h1>
        <p className="text-xs sm:text-sm text-base-content/70 mt-1">
          Consulta aforos, disponibilidad de horarios y aparta espacios para tu inmueble
        </p>
      </div>

      {/* Alert Messages */}
      {successMsg && (
        <div className="alert alert-success rounded-2xl shadow-md py-3 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="btn btn-ghost btn-xs">✕</button>
        </div>
      )}

      {error && (
        <div className="alert alert-error rounded-2xl shadow-sm p-4 text-sm">
          <span>{error}</span>
        </div>
      )}

      {/* Moroso Notice */}
      {esMoroso && (
        <div className="alert alert-error rounded-2xl shadow-sm p-5 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="font-bold">Reservas Restringidas por Mora en Administración</p>
            <p className="text-xs opacity-90 mt-0.5">
              El apartamento presenta mora en sus cuotas de administración. De acuerdo con el reglamento de propiedad horizontal, la reserva de zonas comunes queda suspendida hasta encontrarse a paz y salvo.
            </p>
          </div>
        </div>
      )}

      {/* Catalog of Common Areas */}
      <div>
        <h2 className="text-lg font-bold text-base-content flex items-center gap-2 mb-4">
          <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
          Zonas Disponibles ({zonas.length})
        </h2>

        {zonas.length === 0 ? (
          <div className="card bg-base-100 border border-base-300 p-8 rounded-2xl text-center">
            <p className="text-sm text-base-content/60 italic">
              No hay zonas comunes configuradas por la administración en este momento.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {zonas.map((zona) => (
              <div
                key={zona._id}
                className={`card bg-base-100 border shadow-sm rounded-2xl overflow-hidden flex flex-col justify-between transition-all ${
                  zona.enMantenimiento ? 'border-warning/50 opacity-80' : 'border-base-300 hover:border-primary/40'
                }`}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-black text-lg text-base-content tracking-tight">
                      {zona.nombre}
                    </h3>
                    {zona.enMantenimiento ? (
                      <span className="badge badge-warning badge-sm font-semibold shrink-0">
                        En Mantenimiento
                      </span>
                    ) : (
                      <span className="badge badge-success badge-sm font-semibold shrink-0">
                        Disponible
                      </span>
                    )}
                  </div>

                  {zona.descripcion && (
                    <p className="text-xs text-base-content/70 line-clamp-2 mb-4">
                      {zona.descripcion}
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-xs bg-base-200/50 p-3 rounded-xl mb-4">
                    <div>
                      <span className="text-base-content/60 font-medium block">Aforo Máximo</span>
                      <span className="font-extrabold text-base text-base-content">
                        {zona.aforoMaximo} personas
                      </span>
                    </div>
                    <div>
                      <span className="text-base-content/60 font-medium block">Turno</span>
                      <span className="font-extrabold text-base text-base-content">
                        {zona.lapsoMinutos} min
                      </span>
                    </div>
                  </div>

                  {/* Maintenance reason if active */}
                  {zona.enMantenimiento && zona.motivoMantenimiento && (
                    <p className="text-xs text-warning-content bg-warning/10 p-2.5 rounded-lg mb-3">
                      ⚠️ {zona.motivoMantenimiento}
                    </p>
                  )}

                  {/* Horarios preview */}
                  {zona.horarios && zona.horarios.length > 0 && (
                    <div className="text-[11px] text-base-content/60 space-y-0.5">
                      <p className="font-semibold text-base-content/80">Horarios:</p>
                      <p className="truncate">
                        {zona.horarios.map((h) => `${h.dia.slice(0, 3)}: ${h.inicio}-${h.fin}`).join(' · ')}
                      </p>
                    </div>
                  )}
                </div>

                <div className="p-4 pt-0">
                  <button
                    onClick={() => abrirReservaModal(zona)}
                    disabled={esMoroso || zona.enMantenimiento}
                    className="btn btn-primary w-full rounded-xl min-h-[44px] font-bold text-sm shadow-sm touch-manipulation"
                  >
                    {zona.enMantenimiento ? 'Zona en Mantenimiento' : esMoroso ? 'Restringido por Mora' : 'Reservar Zona'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Historial de Reservas del Inmueble */}
      <div>
        <h2 className="text-lg font-bold text-base-content flex items-center gap-2 mb-4">
          <span className="w-2.5 h-2.5 rounded-full bg-accent"></span>
          Mis Reservas ({reservas.length})
        </h2>

        {reservas.length === 0 ? (
          <div className="card bg-base-100 border border-base-300 p-8 rounded-2xl text-center">
            <p className="text-sm text-base-content/60 italic">
              Aún no tienes reservas registradas para tu inmueble.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {reservas.map((reserva) => {
              const esActiva = reserva.estado === 'activa' || reserva.estado === 'aprobada';
              return (
                <div
                  key={reserva._id}
                  className="card bg-base-100 border border-base-300 shadow-sm rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg shrink-0">
                      📅
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-base text-base-content">
                          {reserva.zonaId?.nombre || 'Zona Común'}
                        </span>
                        <span
                          className={`badge badge-sm font-semibold capitalize ${
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
                      <p className="text-xs text-base-content/70 mt-1">
                        <span className="font-semibold">Fecha:</span> {reserva.fecha} ·{' '}
                        <span className="font-semibold">Horario:</span> {reserva.horaInicio} a {reserva.horaFin}
                      </p>
                      <p className="text-xs text-base-content/60 mt-0.5">
                        Solicitante: <span className="font-medium">{reserva.nombreSolicitante}</span>
                      </p>
                      {reserva.motivoRechazo && (
                        <p className="text-xs text-error mt-1 italic">
                          Motivo: {reserva.motivoRechazo}
                        </p>
                      )}
                    </div>
                  </div>

                  {esActiva && (
                    <div className="shrink-0 w-full sm:w-auto">
                      <button
                        onClick={() => handleCancelarReserva(reserva._id)}
                        className="btn btn-outline btn-error btn-sm rounded-xl w-full sm:w-auto font-semibold"
                      >
                        Cancelar Reserva
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Booking Modal */}
      {modalOpen && selectedZona && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-base-100 rounded-3xl border border-base-300 shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-6 border-b border-base-200 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-base-content">
                  Reservar {selectedZona.nombre}
                </h3>
                <p className="text-xs text-base-content/70 mt-0.5">
                  Turno de {selectedZona.lapsoMinutos} minutos · Aforo máx: {selectedZona.aforoMaximo}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="btn btn-ghost btn-circle btn-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCrearReserva} className="p-6 space-y-4">
              {bookingError && (
                <div className="alert alert-error rounded-xl py-2.5 text-xs">
                  <span>{bookingError}</span>
                </div>
              )}

              {/* Date */}
              <div className="form-control">
                <label className="label pb-1.5 font-bold text-xs uppercase tracking-wider text-base-content/80">
                  Fecha de la Reserva *
                </label>
                <input
                  type="date"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="input input-bordered rounded-xl w-full text-base min-h-[48px]"
                />
              </div>

              {/* Time */}
              <div className="form-control">
                <label className="label pb-1.5 font-bold text-xs uppercase tracking-wider text-base-content/80">
                  Hora de Inicio *
                </label>
                <input
                  type="time"
                  required
                  value={horaInicio}
                  onChange={(e) => setHoraInicio(e.target.value)}
                  className="input input-bordered rounded-xl w-full text-base min-h-[48px]"
                />
                <span className="text-[11px] text-base-content/60 mt-1">
                  La hora de fin se calcula automáticamente según el turno de {selectedZona.lapsoMinutos} min.
                </span>
              </div>

              {/* Applicant Name */}
              <div className="form-control">
                <label className="label pb-1.5 font-bold text-xs uppercase tracking-wider text-base-content/80">
                  Nombre del Solicitante *
                </label>
                {personas.length > 0 ? (
                  <select
                    value={nombreSolicitante}
                    onChange={(e) => setNombreSolicitante(e.target.value)}
                    className="select select-bordered rounded-xl w-full text-base min-h-[48px]"
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
                    placeholder="Nombre de quien usará la zona"
                    className="input input-bordered rounded-xl w-full text-base min-h-[48px]"
                  />
                )}
              </div>

              {/* Contact Phone */}
              <div className="form-control">
                <label className="label pb-1.5 font-bold text-xs uppercase tracking-wider text-base-content/80">
                  Teléfono de Contacto
                </label>
                <input
                  type="tel"
                  value={telefonoContacto}
                  onChange={(e) => setTelefonoContacto(e.target.value)}
                  placeholder="Ej. 3001234567"
                  className="input input-bordered rounded-xl w-full text-base min-h-[48px]"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-base-200">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn btn-ghost rounded-xl min-h-[44px]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={bookingLoading}
                  className="btn btn-primary rounded-xl min-h-[48px] px-6 font-bold shadow-md"
                >
                  {bookingLoading ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      <span>Verificando Aforo...</span>
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
