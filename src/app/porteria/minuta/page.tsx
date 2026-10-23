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
      {/* Encabezado Conciso */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b arch-border">
        <div className="flex items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-black text-base-content flex items-center gap-2">
            <span className="icon-[tabler--notebook] text-primary text-2xl" aria-hidden="true"></span>
            Minuta de Turno
          </h1>
          <span className="badge badge-sm badge-neutral font-mono font-bold">
            {novedades.length} eventos
          </span>
        </div>

        <button
          onClick={() => setMostrarForm(!mostrarForm)}
          className="btn btn-xs btn-primary font-bold shadow-xs self-start sm:self-auto cursor-pointer gap-1"
        >
          <span className="icon-[tabler--plus] text-xs" aria-hidden="true"></span>
          {mostrarForm ? 'Cerrar' : 'Nueva Novedad'}
        </button>
      </div>

      {/* Formulario de Nueva Novedad */}
      {mostrarForm && (
        <div className="arch-panel max-w-xl mx-auto p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b arch-border mb-3">
            <h2 className="text-sm font-bold text-base-content flex items-center gap-1.5">
              <span className="icon-[tabler--pencil-plus] text-primary text-base" aria-hidden="true"></span>
              Consignar Novedad
            </h2>
            <button
              onClick={() => setMostrarForm(false)}
              className="btn btn-ghost btn-circle btn-xs"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleRegistrar} className="space-y-3">
            {/* Selector de Severidad en Segmented Control */}
            <div>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-base-200/60 rounded-lg border arch-border">
                <button
                  type="button"
                  onClick={() => setSeveridad('rutinaria')}
                  className={`py-1.5 px-2 rounded-md text-xs font-bold transition-all text-center cursor-pointer ${
                    severidad === 'rutinaria'
                      ? 'bg-base-100 text-primary shadow-xs'
                      : 'text-base-content/60 hover:text-base-content'
                  }`}
                >
                  🟢 Rutinaria
                </button>

                <button
                  type="button"
                  onClick={() => setSeveridad('mantenimiento')}
                  className={`py-1.5 px-2 rounded-md text-xs font-bold transition-all text-center cursor-pointer ${
                    severidad === 'mantenimiento'
                      ? 'bg-base-100 text-warning shadow-xs'
                      : 'text-base-content/60 hover:text-base-content'
                  }`}
                >
                  🟡 Mantenimiento
                </button>

                <button
                  type="button"
                  onClick={() => setSeveridad('incidente_grave')}
                  className={`py-1.5 px-2 rounded-md text-xs font-bold transition-all text-center cursor-pointer ${
                    severidad === 'incidente_grave'
                      ? 'bg-base-100 text-error shadow-xs'
                      : 'text-base-content/60 hover:text-base-content'
                  }`}
                >
                  🔴 Incidente
                </button>
              </div>
            </div>

            <div>
              <label className="block text-2xs font-semibold text-base-content/75 mb-1">
                Título del Evento *
              </label>
              <input
                type="text"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="ej: Ronda perimetral sin novedad / Fuga en sótano 1"
                className="input input-bordered arch-border bg-base-100 text-base-content w-full rounded-md px-3 py-1.5 text-xs focus:border-primary font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-2xs font-semibold text-base-content/75 mb-1">
                Descripción *
              </label>
              <textarea
                rows={3}
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Detalla tiempo, modo y personas involucradas..."
                className="textarea textarea-bordered arch-border bg-base-100 text-base-content w-full rounded-md px-3 py-1.5 text-xs focus:border-primary font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-2xs font-semibold text-base-content/75 mb-1">
                Fotos de Evidencia (Opcional)
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

            <div className="pt-2.5 border-t arch-border flex items-center justify-between text-2xs text-base-content/60">
              <span>
                Firma: <strong className="text-base-content">{vigilanteActivo?.nombreCompleto || 'Vigilante de Turno'}</strong>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMostrarForm(false)}
                  className="btn btn-xs btn-ghost"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="btn btn-xs btn-primary font-bold shadow-xs cursor-pointer px-3.5"
                >
                  {guardando ? 'Guardando...' : 'Guardar Novedad'}
                </button>
              </div>
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
