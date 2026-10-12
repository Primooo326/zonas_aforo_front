'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';

export interface ZonaMantenimientoInfo {
  id: string;
  nombre: string;
  enMantenimiento?: boolean;
  motivoMantenimiento?: string;
  mantenimientoFechaInicio?: string;
  mantenimientoHoraInicio?: string;
  mantenimientoFechaFin?: string;
  mantenimientoHoraFin?: string;
}

interface ModalProgramarMantenimientoProps {
  isOpen: boolean;
  zona: ZonaMantenimientoInfo | null;
  onClose: () => void;
  onSuccess: () => void;
}

const MOTIVOS_SUGERIDOS = [
  'Mantenimiento preventivo',
  'Pintura y acabados',
  'Limpieza profunda',
  'Reparación de filtración',
  'Arreglo de equipos y accesorios',
];

export default function ModalProgramarMantenimiento({
  isOpen,
  zona,
  onClose,
  onSuccess,
}: ModalProgramarMantenimientoProps) {
  const [modo, setModo] = useState<'inmediato' | 'programado'>('inmediato');
  const [motivo, setMotivo] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [horaInicio, setHoraInicio] = useState('08:00');
  const [fechaFin, setFechaFin] = useState('');
  const [horaFin, setHoraFin] = useState('18:00');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!zona) return;

    const hoy = new Date().toISOString().split('T')[0];
    const tieneFechas = Boolean(zona.mantenimientoFechaInicio || zona.mantenimientoFechaFin);

    setModo(tieneFechas ? 'programado' : 'inmediato');
    setMotivo(zona.motivoMantenimiento || '');
    setFechaInicio(zona.mantenimientoFechaInicio || hoy);
    setHoraInicio(zona.mantenimientoHoraInicio || '08:00');
    setFechaFin(zona.mantenimientoFechaFin || hoy);
    setHoraFin(zona.mantenimientoHoraFin || '18:00');
    setError('');
  }, [zona, isOpen]);

  if (!isOpen || !zona) return null;

  const handleFinalizar = async () => {
    setError('');
    setLoading(true);
    try {
      await apiFetch(`/zonas/${zona.id}/mantenimiento`, {
        method: 'PUT',
        body: JSON.stringify({
          enMantenimiento: false,
          motivo: '',
          fechaInicio: '',
          horaInicio: '',
          fechaFin: '',
          horaFin: '',
        }),
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al levantar el mantenimiento');
    } finally {
      setLoading(false);
    }
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const motivoTrim = motivo.trim() || 'Mantenimiento preventivo';

    if (modo === 'programado') {
      if (!fechaInicio || !fechaFin) {
        setError('Debes especificar tanto la fecha de inicio como la fecha de fin');
        return;
      }
      const dtInicio = `${fechaInicio}T${horaInicio || '00:00'}`;
      const dtFin = `${fechaFin}T${horaFin || '23:59'}`;
      if (dtInicio >= dtFin) {
        setError('La fecha y hora de fin debe ser posterior a la de inicio');
        return;
      }
    }

    setLoading(true);
    try {
      await apiFetch(`/zonas/${zona.id}/mantenimiento`, {
        method: 'PUT',
        body: JSON.stringify({
          enMantenimiento: true,
          motivo: motivoTrim,
          fechaInicio: modo === 'programado' ? fechaInicio : '',
          horaInicio: modo === 'programado' ? horaInicio : '',
          fechaFin: modo === 'programado' ? fechaFin : '',
          horaFin: modo === 'programado' ? horaFin : '',
        }),
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar la programación de mantenimiento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="card bg-base-100 rounded-2xl shadow-2xl border border-base-200 max-w-lg w-full p-5 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-base-200 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-warning/15 text-warning flex items-center justify-center">
              <span className="icon-[tabler--tool] text-xl" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-base-content leading-tight">
                Mantenimiento de Zona
              </h2>
              <p className="text-xs text-base-content/60">
                {zona.nombre}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost btn-circle btn-sm"
            aria-label="Cerrar modal"
          >
            ✕
          </button>
        </div>

        {/* Estado actual */}
        {zona.enMantenimiento ? (
          <div className="p-3 rounded-xl bg-warning/10 border border-warning/30 flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="badge badge-warning badge-sm font-semibold">
                Actualmente en mantenimiento
              </span>
              <p className="text-xs text-base-content/80 font-medium">
                {zona.motivoMantenimiento || 'Sin motivo especificado'}
              </p>
              {zona.mantenimientoFechaInicio && (
                <p className="text-2xs text-base-content/60">
                  Programado: {zona.mantenimientoFechaInicio} {zona.mantenimientoHoraInicio || ''} - {zona.mantenimientoFechaFin || ''} {zona.mantenimientoHoraFin || ''}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={handleFinalizar}
              disabled={loading}
              className="btn btn-xs btn-outline btn-error shrink-0"
            >
              Finalizar
            </button>
          </div>
        ) : (
          <div className="text-xs text-base-content/70">
            Al activar el mantenimiento, los residentes no podrán solicitar ni reservar esta zona durante el período establecido.
          </div>
        )}

        {error && (
          <div className="alert alert-error text-xs py-2">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleGuardar} className="space-y-4">
          {/* Selector de Modo */}
          <div className="space-y-1.5">
            <span className="label-text font-semibold text-xs text-base-content/80">
              Modalidad de Bloqueo
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setModo('inmediato')}
                className={`btn btn-sm text-xs justify-start gap-2 h-auto py-2.5 px-3 border transition-colors ${
                  modo === 'inmediato'
                    ? 'btn-primary border-primary text-white font-bold'
                    : 'bg-base-200/60 border-base-300 text-base-content hover:bg-base-200'
                }`}
              >
                <span className="icon-[tabler--bolt] text-base shrink-0" />
                <div className="text-left leading-tight">
                  <div className="font-semibold">Inmediato</div>
                  <div className="text-2xs opacity-80">Hasta desactivarlo</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setModo('programado')}
                className={`btn btn-sm text-xs justify-start gap-2 h-auto py-2.5 px-3 border transition-colors ${
                  modo === 'programado'
                    ? 'btn-primary border-primary text-white font-bold'
                    : 'bg-base-200/60 border-base-300 text-base-content hover:bg-base-200'
                }`}
              >
                <span className="icon-[tabler--calendar-time] text-base shrink-0" />
                <div className="text-left leading-tight">
                  <div className="font-semibold">Programado</div>
                  <div className="text-2xs opacity-80">Rango de fechas</div>
                </div>
              </button>
            </div>
          </div>

          {/* Rango de Fechas (si es programado) */}
          {modo === 'programado' && (
            <div className="p-3.5 rounded-xl bg-base-200/40 border border-base-200 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="label-text text-2xs font-semibold text-base-content/80">
                    Desde (Fecha y Hora) *
                  </span>
                  <div className="flex gap-1.5">
                    <input
                      type="date"
                      value={fechaInicio}
                      onChange={(e) => setFechaInicio(e.target.value)}
                      className="input input-bordered input-sm flex-1 text-xs text-base-content bg-base-100"
                      required
                    />
                    <input
                      type="time"
                      value={horaInicio}
                      onChange={(e) => setHoraInicio(e.target.value)}
                      className="input input-bordered input-sm w-24 text-xs text-base-content bg-base-100"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="label-text text-2xs font-semibold text-base-content/80">
                    Hasta (Fecha y Hora) *
                  </span>
                  <div className="flex gap-1.5">
                    <input
                      type="date"
                      value={fechaFin}
                      onChange={(e) => setFechaFin(e.target.value)}
                      className="input input-bordered input-sm flex-1 text-xs text-base-content bg-base-100"
                      required
                    />
                    <input
                      type="time"
                      value={horaFin}
                      onChange={(e) => setHoraFin(e.target.value)}
                      className="input input-bordered input-sm w-24 text-xs text-base-content bg-base-100"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Motivo */}
          <div className="space-y-1.5">
            <span className="label-text font-semibold text-xs text-base-content/80">
              Motivo o Detalle de los Trabajos
            </span>
            <input
              type="text"
              placeholder="Ej: Pintura, arreglo de bomba de agua, limpieza..."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="input input-bordered input-sm w-full text-xs text-base-content bg-base-100"
            />
            {/* Chips de sugerencias */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {MOTIVOS_SUGERIDOS.map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => setMotivo(sug)}
                  className="badge badge-sm bg-base-200 border-base-300 text-base-content hover:bg-primary hover:text-white text-2xs cursor-pointer py-1 transition-colors"
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>

          {/* Botones de acción */}
          <div className="pt-3 border-t border-base-200 flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-sm btn-outline text-xs"
              disabled={loading}
            >
              Cancelar
            </button>

            {zona.enMantenimiento && (
              <button
                type="button"
                onClick={handleFinalizar}
                disabled={loading}
                className="btn btn-sm btn-outline btn-error text-xs gap-1"
              >
                <span className="icon-[tabler--check] text-sm" />
                Finalizar Mantenimiento
              </button>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-sm btn-primary text-xs gap-1"
            >
              {loading ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                <>
                  <span className="icon-[tabler--calendar-plus] text-sm" />
                  {zona.enMantenimiento ? 'Actualizar Programación' : 'Activar Mantenimiento'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
