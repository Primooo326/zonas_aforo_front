'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import RangoHoraPicker, { RangoHora } from '@/components/RangoHoraPicker';

const DIAS_OPTS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const RANGO_DEFAULT: RangoHora = { inicio: '08:00', fin: '18:00' };

function tiempoAMinutos(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

type DiaEstado = { activo: boolean; rango: RangoHora };

function estadoInicial(horarios?: { dia: string; inicio: string; fin: string }[]): Record<string, DiaEstado> {
  const estado = DIAS_OPTS.reduce<Record<string, DiaEstado>>((acc, d) => {
    acc[d] = { activo: false, rango: { ...RANGO_DEFAULT } };
    return acc;
  }, {});
  for (const h of horarios || []) {
    if (estado[h.dia]) {
      estado[h.dia] = { activo: true, rango: { inicio: h.inicio, fin: h.fin } };
    }
  }
  return estado;
}

export default function EditZonaPage() {
  const router = useRouter();
  const params = useParams();
  const [form, setForm] = useState({
    nombre: '',
    descripcion: '',
    politicasUso: '',
    aforoMaximo: 0,
    lapsoMinutos: 0,
    imagenUrl: '',
    enMantenimiento: false,
    motivoMantenimiento: '',
    mantenimientoFechaInicio: '',
    mantenimientoHoraInicio: '08:00',
    mantenimientoFechaFin: '',
    mantenimientoHoraFin: '18:00',
    modoMantenimiento: 'inmediato' as 'inmediato' | 'programado',
  });
  const [horarios, setHorarios] = useState<Record<string, DiaEstado>>(() => estadoInicial());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch(`/zonas/${params.id}`)
      .then((data) => {
        const horariosNuevos = data.horarios?.length
          ? data.horarios
          : (data.diasDisponibles || []).map((d: string) => ({
              dia: d,
              inicio: data.horarioInicio || '08:00',
              fin: data.horarioFin || '18:00',
            }));
        const hoy = new Date().toISOString().split('T')[0];
        const tieneFechas = Boolean(data.mantenimientoFechaInicio || data.mantenimientoFechaFin);
        setForm({
          nombre: data.nombre || '',
          descripcion: data.descripcion || '',
          politicasUso: data.politicasUso || '',
          aforoMaximo: data.aforoMaximo || 20,
          lapsoMinutos: data.lapsoMinutos || 60,
          imagenUrl: Array.isArray(data.imagenes) && data.imagenes[0] ? data.imagenes[0] : '',
          enMantenimiento: Boolean(data.enMantenimiento),
          motivoMantenimiento: data.motivoMantenimiento || '',
          mantenimientoFechaInicio: data.mantenimientoFechaInicio || hoy,
          mantenimientoHoraInicio: data.mantenimientoHoraInicio || '08:00',
          mantenimientoFechaFin: data.mantenimientoFechaFin || hoy,
          mantenimientoHoraFin: data.mantenimientoHoraFin || '18:00',
          modoMantenimiento: tieneFechas ? 'programado' : 'inmediato',
        });
        setHorarios(estadoInicial(horariosNuevos));
      })
      .catch(() => router.push('/dashboard/zonas'))
      .finally(() => setLoading(false));
  }, [params.id, router]);

  const seleccionarTodosLosDias = (activo: boolean) => {
    setHorarios((prev) =>
      DIAS_OPTS.reduce<Record<string, DiaEstado>>((acc, d) => {
        acc[d] = { ...prev[d], activo };
        return acc;
      }, {}),
    );
  };

  const validarForm = (): string | null => {
    const activos = DIAS_OPTS.filter((d) => horarios[d].activo);
    if (activos.length === 0) return 'Selecciona al menos un día';
    for (const d of activos) {
      const { inicio, fin } = horarios[d].rango;
      if (tiempoAMinutos(inicio) >= tiempoAMinutos(fin)) {
        return `El horario de fin de ${d} debe ser posterior al de inicio`;
      }
      const totalMin = tiempoAMinutos(fin) - tiempoAMinutos(inicio);
      if (form.lapsoMinutos > totalMin) {
        return `El lapso (${form.lapsoMinutos}min) excede el horario disponible de ${d} (${totalMin}min)`;
      }
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validarForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    const esProgramado = form.enMantenimiento && form.modoMantenimiento === 'programado';
    if (esProgramado) {
      if (!form.mantenimientoFechaInicio || !form.mantenimientoFechaFin) {
        setError('Debes especificar la fecha de inicio y fin del mantenimiento programado');
        return;
      }
      const dtInicio = `${form.mantenimientoFechaInicio}T${form.mantenimientoHoraInicio || '00:00'}`;
      const dtFin = `${form.mantenimientoFechaFin}T${form.mantenimientoHoraFin || '23:59'}`;
      if (dtInicio >= dtFin) {
        setError('La fecha y hora de fin del mantenimiento debe ser posterior a la de inicio');
        return;
      }
    }

    setSaving(true);
    const horariosEnviar = DIAS_OPTS.filter((d) => horarios[d].activo).map((d) => ({
      dia: d,
      inicio: horarios[d].rango.inicio,
      fin: horarios[d].rango.fin,
    }));

    const imagenesArray = form.imagenUrl.trim() ? [form.imagenUrl.trim()] : [];

    try {
      await apiFetch(`/zonas/${params.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          nombre: form.nombre,
          descripcion: form.descripcion,
          politicasUso: form.politicasUso,
          aforoMaximo: form.aforoMaximo,
          lapsoMinutos: form.lapsoMinutos,
          imagenes: imagenesArray,
          enMantenimiento: form.enMantenimiento,
          motivoMantenimiento: form.enMantenimiento ? form.motivoMantenimiento.trim() : '',
          mantenimientoFechaInicio: esProgramado ? form.mantenimientoFechaInicio : '',
          mantenimientoHoraInicio: esProgramado ? form.mantenimientoHoraInicio : '',
          mantenimientoFechaFin: esProgramado ? form.mantenimientoFechaFin : '',
          mantenimientoHoraFin: esProgramado ? form.mantenimientoHoraFin : '',
          horarios: horariosEnviar,
        }),
      });
      router.push('/dashboard/zonas');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar la zona');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Editar Zona Común</h1>
          <p className="text-sm text-base-content/60">
            Actualiza los parámetros, aforos y políticas de la zona
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.back()}
          className="btn btn-outline btn-sm gap-1"
        >
          ← Volver
        </button>
      </div>

      {error && <div className="alert alert-error text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="card bg-base-100 shadow-sm border border-base-200 p-6 space-y-5">
        <label className="form-control">
          <span className="label-text font-semibold">Nombre de la Zona *</span>
          <input
            name="nombre"
            type="text"
            className="input input-bordered"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            required
          />
        </label>

        {/* Políticas de Uso */}
        <label className="form-control">
          <div className="flex justify-between items-center mb-1">
            <span className="label-text font-semibold">Políticas de Uso y Normas de Convivencia</span>
            <span className="text-xs text-base-content/50">Requerimiento</span>
          </div>
          <textarea
            name="politicasUso"
            rows={3}
            className="textarea textarea-bordered text-sm"
            placeholder="Reglas de convivencia, volumen de música permitido, aseo, restricciones de uso..."
            value={form.politicasUso}
            onChange={(e) => setForm({ ...form, politicasUso: e.target.value })}
          />
          <span className="label-text-alt text-base-content/60 mt-1">
            Se mostrarán directamente a los residentes antes de confirmar su turno.
          </span>
        </label>

        <label className="form-control">
          <span className="label-text text-xs text-base-content/70">Descripción adicional (opcional)</span>
          <textarea
            name="descripcion"
            className="textarea textarea-bordered textarea-sm"
            value={form.descripcion}
            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
          />
        </label>

        {/* Imagen URL */}
        <label className="form-control">
          <span className="label-text font-semibold">Imagen de la Zona (URL)</span>
          <input
            name="imagenUrl"
            type="url"
            className="input input-bordered"
            placeholder="https://ejemplo.com/foto-zona.jpg"
            value={form.imagenUrl}
            onChange={(e) => setForm({ ...form, imagenUrl: e.target.value })}
          />
          {form.imagenUrl && (
            <div className="mt-2 rounded-lg overflow-hidden max-h-40 border border-base-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={form.imagenUrl}
                alt="Vista previa"
                className="w-full h-32 object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
          )}
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="form-control">
            <span className="label-text font-semibold">Aforo Máximo *</span>
            <input
              name="aforoMaximo"
              type="number"
              min="1"
              className="input input-bordered"
              value={form.aforoMaximo}
              onChange={(e) => setForm({ ...form, aforoMaximo: Number(e.target.value) })}
              required
            />
          </label>
          <label className="form-control">
            <span className="label-text font-semibold">Lapso por Uso (minutos) *</span>
            <input
              name="lapsoMinutos"
              type="number"
              min="15"
              step="15"
              className="input input-bordered"
              value={form.lapsoMinutos}
              onChange={(e) => setForm({ ...form, lapsoMinutos: Number(e.target.value) })}
              required
            />
          </label>
        </div>

        {/* Estado y Programación de Mantenimiento */}
        <div className="p-4 bg-warning/10 border border-warning/30 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="icon-[tabler--tool] text-warning text-lg" aria-hidden="true" />
                <span className="font-bold text-sm text-base-content">Estado de Mantenimiento</span>
              </div>
              <p className="text-xs text-base-content/70">
                Bloquea reservaciones de residentes durante el período indicado.
              </p>
            </div>
            <input
              type="checkbox"
              className="switch switch-warning"
              checked={form.enMantenimiento}
              onChange={(e) => setForm({ ...form, enMantenimiento: e.target.checked })}
            />
          </div>

          {form.enMantenimiento && (
            <div className="pt-2 border-t border-warning/20 space-y-3.5">
              {/* Modalidad */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-base-content/80">Modalidad de Mantenimiento:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, modoMantenimiento: 'inmediato' })}
                    className={`btn btn-sm text-xs justify-start gap-2 h-auto py-2 px-3 border transition-colors ${
                      form.modoMantenimiento === 'inmediato'
                        ? 'btn-primary border-primary text-white font-bold'
                        : 'bg-base-100 border-base-300 text-base-content hover:bg-base-200'
                    }`}
                  >
                    <span className="icon-[tabler--bolt] text-base shrink-0" />
                    <div className="text-left">
                      <div className="font-semibold">Inmediato / Indefinido</div>
                      <div className="text-2xs opacity-80">Activo hasta desactivarlo</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setForm({ ...form, modoMantenimiento: 'programado' })}
                    className={`btn btn-sm text-xs justify-start gap-2 h-auto py-2 px-3 border transition-colors ${
                      form.modoMantenimiento === 'programado'
                        ? 'btn-primary border-primary text-white font-bold'
                        : 'bg-base-100 border-base-300 text-base-content hover:bg-base-200'
                    }`}
                  >
                    <span className="icon-[tabler--calendar-time] text-base shrink-0" />
                    <div className="text-left">
                      <div className="font-semibold">Programado por fechas</div>
                      <div className="text-2xs opacity-80">Rango de fecha y hora</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Rango de fechas si es programado */}
              {form.modoMantenimiento === 'programado' && (
                <div className="p-3 bg-base-100 rounded-xl border border-warning/30 space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <span className="label-text text-2xs font-semibold text-base-content/80">
                        Fecha y Hora Inicio *
                      </span>
                      <div className="flex gap-1.5">
                        <input
                          type="date"
                          value={form.mantenimientoFechaInicio}
                          onChange={(e) => setForm({ ...form, mantenimientoFechaInicio: e.target.value })}
                          className="input input-bordered input-sm flex-1 text-xs"
                          required={form.modoMantenimiento === 'programado'}
                        />
                        <input
                          type="time"
                          value={form.mantenimientoHoraInicio}
                          onChange={(e) => setForm({ ...form, mantenimientoHoraInicio: e.target.value })}
                          className="input input-bordered input-sm w-24 text-xs"
                          required={form.modoMantenimiento === 'programado'}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="label-text text-2xs font-semibold text-base-content/80">
                        Fecha y Hora Fin *
                      </span>
                      <div className="flex gap-1.5">
                        <input
                          type="date"
                          value={form.mantenimientoFechaFin}
                          onChange={(e) => setForm({ ...form, mantenimientoFechaFin: e.target.value })}
                          className="input input-bordered input-sm flex-1 text-xs"
                          required={form.modoMantenimiento === 'programado'}
                        />
                        <input
                          type="time"
                          value={form.mantenimientoHoraFin}
                          onChange={(e) => setForm({ ...form, mantenimientoHoraFin: e.target.value })}
                          className="input input-bordered input-sm w-24 text-xs"
                          required={form.modoMantenimiento === 'programado'}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Motivo */}
              <label className="form-control">
                <span className="label-text text-xs font-semibold">Motivo del mantenimiento *</span>
                <input
                  type="text"
                  className="input input-bordered input-sm text-xs"
                  placeholder="Ej: Mantenimiento preventivo, pintura, arreglo de motor..."
                  value={form.motivoMantenimiento}
                  onChange={(e) => setForm({ ...form, motivoMantenimiento: e.target.value })}
                />
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {['Mantenimiento preventivo', 'Pintura y acabados', 'Limpieza profunda', 'Reparación de filtración'].map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => setForm({ ...form, motivoMantenimiento: sug })}
                      className="badge badge-sm badge-ghost hover:badge-warning text-2xs cursor-pointer py-0.5"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </label>
            </div>
          )}
        </div>

        <div className="space-y-3 pt-2">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <span className="font-semibold text-sm">Horarios por día</span>
              <p className="text-xs text-base-content/60">
                Ajusta los días disponibles y sus horas de operación.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => seleccionarTodosLosDias(true)}
                className="btn btn-xs btn-outline"
              >
                Activar todos
              </button>
              <button
                type="button"
                onClick={() => seleccionarTodosLosDias(false)}
                className="btn btn-xs btn-outline text-base-content/70 hover:bg-base-200"
              >
                Desmarcar todos
              </button>
            </div>
          </div>

          <div className="divide-y divide-base-200 border border-base-200 rounded-box p-3 bg-base-200/30">
            {DIAS_OPTS.map((dia) => (
              <div key={dia} className="py-2.5 first:pt-1 last:pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-sm font-medium w-28">{dia}</span>
                <div className="flex-1">
                  <RangoHoraPicker
                    dia={dia}
                    activo={horarios[dia].activo}
                    rango={horarios[dia].rango}
                    onActivar={(d, activo) =>
                      setHorarios((prev) => ({ ...prev, [d]: { ...prev[d], activo } }))
                    }
                    onRango={(d, rango) =>
                      setHorarios((prev) => ({ ...prev, [d]: { ...prev[d], rango } }))
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t border-base-200">
          <button type="submit" disabled={saving} className="btn btn-primary flex-1 sm:flex-initial">
            {saving ? <span className="loading loading-spinner"></span> : 'Guardar Cambios'}
          </button>
          <button type="button" onClick={() => router.back()} className="btn btn-outline">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}