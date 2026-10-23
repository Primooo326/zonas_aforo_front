'use client';

import React, { useState, useEffect } from 'react';
import { usePorteria } from '@/contexts/PorteriaContext';
import { porteriaApiFetch } from '@/lib/api';

export default function MinutaPorteriaPage() {
  const { vigilanteActivo } = usePorteria();

  const [novedades, setNovedades] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);
  const [filtroSeveridad, setFiltroSeveridad] = useState<string>('todos');

  // Formulario
  const [severidad, setSeveridad] = useState<'rutinaria' | 'mantenimiento' | 'incidente_grave'>('rutinaria');
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fotos, setFotos] = useState<FileList | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);

  const cargarMinuta = async () => {
    setCargando(true);
    try {
      const url =
        filtroSeveridad === 'todos'
          ? '/porteria/minuta?limit=40'
          : `/porteria/minuta?severidad=${filtroSeveridad}&limit=40`;
      const data = await porteriaApiFetch(url);
      setNovedades(data || []);
    } catch (err) {
      console.error('Error cargando minuta digital:', err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarMinuta();
  }, [filtroSeveridad]);

  const handleRegistrar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !descripcion.trim()) {
      alert('Por favor ingresa título y descripción de la novedad');
      return;
    }

    const vigilanteNombre = vigilanteActivo?.nombreCompleto || 'Vigilante de Turno';
    const vigilanteId = vigilanteActivo?._id;

    setGuardando(true);
    try {
      const formData = new FormData();
      formData.append('severidad', severidad);
      formData.append('titulo', titulo.trim());
      formData.append('descripcion', descripcion.trim());
      if (vigilanteId) formData.append('vigilanteId', vigilanteId);
      formData.append('vigilanteNombre', vigilanteNombre);

      if (fotos && fotos.length > 0) {
        for (let i = 0; i < fotos.length; i++) {
          formData.append('fotos', fotos[i]);
        }
      }

      await porteriaApiFetch('/porteria/minuta', {
        method: 'POST',
        body: formData,
      });

      setTitulo('');
      setDescripcion('');
      setFotos(null);
      setMostrarForm(false);
      await cargarMinuta();
    } catch (err: any) {
      alert(err.message || 'Error guardando novedad en minuta');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado Arquitectónico */}
      <div className="arch-panel p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-base-content flex items-center gap-2">
            <span className="icon-[tabler--notebook] text-primary text-2xl" aria-hidden="true"></span>
            Minuta Digital de Turno
          </h1>
          <p className="text-xs text-base-content/65 mt-0.5">
            Bitácora inmutable con trazabilidad legal de eventos, rondas, incidentes y mantenimientos.
          </p>
        </div>

        <button
          onClick={() => setMostrarForm(!mostrarForm)}
          className="btn btn-sm btn-primary font-bold shadow-xs self-start sm:self-auto cursor-pointer"
        >
          <span className="icon-[tabler--plus] text-base" aria-hidden="true"></span>
          {mostrarForm ? 'Cerrar Formulario' : 'Nueva Novedad'}
        </button>
      </div>

      {/* Formulario de Nueva Novedad */}
      {mostrarForm && (
        <div className="arch-panel max-w-2xl mx-auto p-5 sm:p-7 shadow-xs">
          <h2 className="text-base font-bold text-base-content mb-4 flex items-center gap-2 pb-3 border-b arch-border">
            <span className="icon-[tabler--pencil-plus] text-primary text-xl" aria-hidden="true"></span>
            Consignar Novedad en Minuta
          </h2>

          <form onSubmit={handleRegistrar} className="space-y-4">
            {/* Selector de Severidad */}
            <div>
              <label className="block text-2xs font-bold text-base-content/70 uppercase tracking-wider mb-2">
                Clasificación del Evento
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSeveridad('rutinaria')}
                  className={`p-3 rounded-md border text-left transition-colors cursor-pointer ${
                    severidad === 'rutinaria'
                      ? 'bg-primary/10 border-primary text-primary font-bold shadow-xs'
                      : 'bg-base-100 arch-border text-base-content/70 hover:bg-base-200'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs mb-0.5">
                    <span className="w-2 h-2 rounded-full bg-primary" aria-hidden="true"></span>
                    Rutinaria
                  </div>
                  <span className="text-2xs block text-base-content/60 leading-tight">
                    Ronda de puesto, relevo, sin novedad
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSeveridad('mantenimiento')}
                  className={`p-3 rounded-md border text-left transition-colors cursor-pointer ${
                    severidad === 'mantenimiento'
                      ? 'bg-warning/10 border-warning text-warning font-bold shadow-xs'
                      : 'bg-base-100 arch-border text-base-content/70 hover:bg-base-200'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs mb-0.5">
                    <span className="w-2 h-2 rounded-full bg-warning" aria-hidden="true"></span>
                    Mantenimiento
                  </div>
                  <span className="text-2xs block text-base-content/60 leading-tight">
                    Fugas de agua, bombillos, portón, ascensor
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSeveridad('incidente_grave')}
                  className={`p-3 rounded-md border text-left transition-colors cursor-pointer ${
                    severidad === 'incidente_grave'
                      ? 'bg-error/10 border-error text-error font-bold shadow-xs'
                      : 'bg-base-100 arch-border text-base-content/70 hover:bg-base-200'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs mb-0.5">
                    <span className="w-2 h-2 rounded-full bg-error" aria-hidden="true"></span>
                    Incidente Grave
                  </div>
                  <span className="text-2xs block text-base-content/60 leading-tight">
                    Riñas, ruido excesivo, policía, emergencia
                  </span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-2xs font-bold text-base-content/70 uppercase tracking-wider mb-1">
                Título del Evento
              </label>
              <input
                type="text"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="ej: Ronda perimetral sin novedad / Fuga de agua en sótano 1"
                className="input input-bordered arch-border bg-base-100 text-base-content w-full rounded-md px-3.5 py-2.5 text-sm focus:border-primary font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-2xs font-bold text-base-content/70 uppercase tracking-wider mb-1">
                Descripción Detallada
              </label>
              <textarea
                rows={3}
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Describe la situación con detalles de tiempo, modo y lugar..."
                className="textarea textarea-bordered arch-border bg-base-100 text-base-content w-full rounded-md p-3 text-sm focus:border-primary resize-none font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-2xs font-bold text-base-content/70 uppercase tracking-wider mb-1">
                Evidencia Fotográfica (Opcional, hasta 5 fotos)
              </label>
              <input
                type="file"
                multiple
                accept="image/*"
                capture="environment"
                onChange={(e) => setFotos(e.target.files)}
                className="file-input file-input-bordered arch-border bg-base-100 text-xs w-full text-base-content/70 rounded-md file:bg-base-200 file:border-0 file:text-xs file:font-bold file:text-base-content"
              />
            </div>

            <div className="text-xs text-base-content/60 pt-2 border-t arch-border flex items-center justify-between">
              <span>
                Firma:{' '}
                <strong className="text-base-content">
                  {vigilanteActivo?.nombreCompleto || 'Vigilante de Turno'}
                </strong>
              </span>
              <button
                type="submit"
                disabled={guardando}
                className="btn btn-sm btn-primary font-bold shadow-xs cursor-pointer"
              >
                {guardando ? 'Guardando en minuta...' : 'Guardar Novedad'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filtros de Visualización */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <span className="text-2xs font-bold text-base-content/50 uppercase tracking-wider mr-1">
          Filtrar:
        </span>
        {['todos', 'rutinaria', 'mantenimiento', 'incidente_grave'].map((s) => (
          <button
            key={s}
            onClick={() => setFiltroSeveridad(s)}
            className={`btn btn-xs rounded-md font-semibold capitalize transition-colors ${
              filtroSeveridad === s
                ? 'btn-primary shadow-xs'
                : 'btn-outline arch-border text-base-content/75 hover:bg-base-200'
            }`}
          >
            {s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Línea de Tiempo de Novedades */}
      <div className="space-y-3">
        {cargando ? (
          <div className="text-center py-10 text-base-content/50 text-sm">
            <span className="loading loading-spinner loading-md text-primary mb-2"></span>
            <p>Cargando bitácora de novedades...</p>
          </div>
        ) : novedades.length === 0 ? (
          <div className="arch-panel p-8 text-center shadow-xs">
            <span className="icon-[tabler--notebook-off] text-3xl text-base-content/30 mb-2 block mx-auto" aria-hidden="true"></span>
            <p className="text-sm font-semibold text-base-content">
              No hay novedades registradas en este criterio
            </p>
          </div>
        ) : (
          novedades.map((n) => {
            const isMantenimiento = n.severidad === 'mantenimiento';
            const isIncidente = n.severidad === 'incidente_grave';

            return (
              <div
                key={n._id}
                className={`arch-panel p-4 shadow-xs transition-colors ${
                  isIncidente
                    ? 'border-error/40 bg-error/5'
                    : isMantenimiento
                    ? 'border-warning/40 bg-warning/5'
                    : ''
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`badge badge-sm font-bold uppercase text-3xs ${
                        isIncidente
                          ? 'badge-error'
                          : isMantenimiento
                          ? 'badge-warning'
                          : 'badge-outline arch-border text-base-content/80'
                      }`}
                    >
                      {n.severidad.replace('_', ' ')}
                    </span>
                    <h3 className="font-bold text-sm text-base-content">{n.titulo}</h3>
                  </div>

                  <div className="flex items-center gap-2 text-2xs text-base-content/60">
                    <span className="font-mono tabular-nums">
                      {new Date(n.fechaHora).toLocaleString('es-CO', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-base-content/80 leading-relaxed whitespace-pre-wrap mb-3">
                  {n.descripcion}
                </p>

                {/* Fotos adjuntas */}
                {n.fotos && n.fotos.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {n.fotos.map((url: string, i: number) => (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="block rounded-md overflow-hidden border arch-border hover:border-primary transition-colors"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt="Evidencia minuta"
                          className="w-16 h-16 object-cover"
                        />
                      </a>
                    ))}
                  </div>
                )}

                {/* Pie de Novedad con Auditoría de Administración */}
                <div className="pt-2 border-t arch-border flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-2xs text-base-content/60">
                  <span>
                    Registrado por:{' '}
                    <strong className="text-base-content">{n.vigilanteNombre}</strong>
                  </span>

                  {n.revisadoPorAdmin ? (
                    <span className="text-success flex items-center gap-1 font-semibold">
                      <span className="icon-[tabler--checks] text-sm" aria-hidden="true"></span>
                      Revisado por Administración{' '}
                      {n.notasAdmin && `("${n.notasAdmin}")`}
                    </span>
                  ) : isMantenimiento || isIncidente ? (
                    <span className="text-warning flex items-center gap-1 font-medium">
                      <span className="icon-[tabler--clock-hour-4] text-xs" aria-hidden="true"></span>
                      Pendiente revisión administrativa
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
