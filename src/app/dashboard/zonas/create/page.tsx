'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import RangoHoraPicker, { RangoHora } from '@/components/RangoHoraPicker';

const DIAS_OPTS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const RANGO_DEFAULT: RangoHora = { inicio: '08:00', fin: '20:00' };

function tiempoAMinutos(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

type DiaEstado = { activo: boolean; rango: RangoHora };

// Por defecto auto-seleccionar todos los días habilitados de 08:00 a 20:00
function estadoInicial(todosActivos = true): Record<string, DiaEstado> {
  return DIAS_OPTS.reduce<Record<string, DiaEstado>>((acc, d) => {
    acc[d] = { activo: todosActivos, rango: { ...RANGO_DEFAULT } };
    return acc;
  }, {});
}

interface PlantillaPreset {
  nombre: string;
  aforoMaximo: number;
  lapsoMinutos: number;
  politicasUso: string;
  horarioInicio: string;
  horarioFin: string;
  icono: string;
}

const PLANTILLAS_PRESETS: PlantillaPreset[] = [
  {
    nombre: 'Salón Comunal',
    aforoMaximo: 50,
    lapsoMinutos: 240,
    politicasUso: 'Prohibido exceder el volumen después de las 11:00 PM. Entregar aseado y con el mobiliario en el mismo estado. No se permiten fuegos artificiales.',
    horarioInicio: '09:00',
    horarioFin: '23:00',
    icono: 'icon-[tabler--building-community]',
  },
  {
    nombre: 'Zona BBQ / Parrilla',
    aforoMaximo: 20,
    lapsoMinutos: 180,
    politicasUso: 'Limpiar la parrilla al finalizar. Depositar las cenizas en el recipiente metálico una vez frías. No dejar basura en la zona.',
    horarioInicio: '11:00',
    horarioFin: '21:00',
    icono: 'icon-[tabler--flame]',
  },
  {
    nombre: 'Piscina',
    aforoMaximo: 25,
    lapsoMinutos: 90,
    politicasUso: 'Ducha obligatoria antes de ingresar. Prohibido consumir alimentos y bebidas alcohólicas en el área de piscina. Niños menores de 12 años deben estar acompañados de un adulto.',
    horarioInicio: '08:00',
    horarioFin: '18:00',
    icono: 'icon-[tabler--swimming]',
  },
  {
    nombre: 'Cancha Sintética / Multijuegos',
    aforoMaximo: 14,
    lapsoMinutos: 60,
    politicasUso: 'Uso obligatorio de calzado deportivo adecuado. No ingresar con mascotas ni bebidas alcohólicas. Respetar la hora de finalización del turno.',
    horarioInicio: '07:00',
    horarioFin: '22:00',
    icono: 'icon-[tabler--ball-football]',
  },
  {
    nombre: 'Gimnasio',
    aforoMaximo: 15,
    lapsoMinutos: 60,
    politicasUso: 'Uso de toalla obligatorio para las máquinas. Limpiar los implementos con desinfectante después de su uso. Regresar las pesas a su lugar.',
    horarioInicio: '06:00',
    horarioFin: '21:00',
    icono: 'icon-[tabler--barbell]',
  },
];

export default function CreateZonaPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    nombre: '',
    descripcion: '',
    politicasUso: '',
    aforoMaximo: 20,
    lapsoMinutos: 120,
    imagenUrl: '',
    enMantenimiento: false,
    motivoMantenimiento: '',
  });
  const [horarios, setHorarios] = useState<Record<string, DiaEstado>>(() => estadoInicial(true));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const aplicarPlantilla = (p: PlantillaPreset) => {
    setForm((prev) => ({
      ...prev,
      nombre: p.nombre,
      descripcion: `Área común de ${p.nombre.toLowerCase()} para residentes y copropietarios.`,
      politicasUso: p.politicasUso,
      aforoMaximo: p.aforoMaximo,
      lapsoMinutos: p.lapsoMinutos,
    }));
    // Actualizar horarios de todos los días con el rango del preset
    setHorarios(
      DIAS_OPTS.reduce<Record<string, DiaEstado>>((acc, d) => {
        acc[d] = {
          activo: true,
          rango: { inicio: p.horarioInicio, fin: p.horarioFin },
        };
        return acc;
      }, {}),
    );
  };

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
    if (activos.length === 0) return 'Selecciona al menos un día disponible';
    for (const d of activos) {
      const { inicio, fin } = horarios[d].rango;
      if (tiempoAMinutos(inicio) >= tiempoAMinutos(fin)) {
        return `El horario de fin de ${d} debe ser posterior al de inicio`;
      }
      const totalMin = tiempoAMinutos(fin) - tiempoAMinutos(inicio);
      if (form.lapsoMinutos > totalMin) {
        return `El lapso (${form.lapsoMinutos} min) excede el horario disponible de ${d} (${totalMin} min)`;
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
    setSaving(true);
    const horariosEnviar = DIAS_OPTS.filter((d) => horarios[d].activo).map((d) => ({
      dia: d,
      inicio: horarios[d].rango.inicio,
      fin: horarios[d].rango.fin,
    }));

    const imagenesArray = form.imagenUrl.trim()
      ? [form.imagenUrl.trim()]
      : [];

    try {
      await apiFetch('/zonas', {
        method: 'POST',
        body: JSON.stringify({
          nombre: form.nombre,
          descripcion: form.descripcion,
          politicasUso: form.politicasUso,
          aforoMaximo: form.aforoMaximo,
          lapsoMinutos: form.lapsoMinutos,
          imagenes: imagenesArray,
          enMantenimiento: form.enMantenimiento,
          motivoMantenimiento: form.motivoMantenimiento,
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

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nueva Zona Común</h1>
          <p className="text-sm text-base-content/60">
            Define aforos, políticas de uso y horarios de disponibilidad
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

      {/* Barra de Plantillas Rápidas */}
      <div className="card bg-base-100 shadow-sm border border-base-200 p-4">
        <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-primary">
          <span className="icon-[tabler--template] text-base" />
          <span>Autorrelleno rápido con plantillas predefinidas</span>
        </div>
        <p className="text-xs text-base-content/60 mb-3">
          Toca una plantilla para autocompletar automáticamente el nombre, aforo sugerido, duración y políticas de uso:
        </p>
        <div className="flex flex-wrap gap-2">
          {PLANTILLAS_PRESETS.map((p) => (
            <button
              key={p.nombre}
              type="button"
              onClick={() => aplicarPlantilla(p)}
              className="btn btn-outline btn-sm gap-1.5 hover:btn-primary"
            >
              <span className={p.icono} />
              <span>{p.nombre}</span>
            </button>
          ))}
        </div>
      </div>

      {error && <div className="alert alert-error text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="card bg-base-100 shadow-sm border border-base-200 p-6 space-y-5">
        {/* Nombre */}
        <label className="form-control">
          <span className="label-text font-semibold">Nombre de la Zona *</span>
          <input
            name="nombre"
            type="text"
            className="input input-bordered"
            placeholder="Ej: Salón Social, Zona BBQ Torre B..."
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
            placeholder="Reglas de convivencia, volumen de música permitido, aseo, requisitos para el uso, depósito o restricciones..."
            value={form.politicasUso}
            onChange={(e) => setForm({ ...form, politicasUso: e.target.value })}
          />
          <span className="label-text-alt text-base-content/60 mt-1">
            Se mostrarán directamente a los residentes antes de confirmar su reservación.
          </span>
        </label>

        {/* Descripción general opcional */}
        <label className="form-control">
          <span className="label-text text-xs text-base-content/70">Descripción corta adicional (opcional)</span>
          <input
            name="descripcion"
            type="text"
            className="input input-bordered input-sm"
            placeholder="Ej: Ubicado en el piso 1 al lado del parque infantil"
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

        {/* Aforo y Lapso */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="form-control">
            <span className="label-text font-semibold">Aforo Máximo de Personas *</span>
            <input
              name="aforoMaximo"
              type="number"
              min="1"
              className="input input-bordered"
              value={form.aforoMaximo}
              onChange={(e) => setForm({ ...form, aforoMaximo: Number(e.target.value) })}
              required
            />
            <span className="label-text-alt text-base-content/60">Capacidad máxima simultánea</span>
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
            <span className="label-text-alt text-base-content/60">
              Duración máxima de cada turno reservado
            </span>
          </label>
        </div>

        {/* Estado de Mantenimiento */}
        <div className="p-4 bg-warning/10 border border-warning/30 rounded-box space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-semibold text-sm">Estado de Mantenimiento</span>
              <p className="text-xs text-base-content/70">
                Si activas esta opción, los residentes no podrán solicitar turnos hasta que se vuelva a habilitar.
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
            <label className="form-control">
              <span className="label-text text-xs font-semibold">Motivo del mantenimiento</span>
              <input
                type="text"
                className="input input-bordered input-sm"
                placeholder="Ej: Pintura de paredes, reparación de pisos..."
                value={form.motivoMantenimiento}
                onChange={(e) => setForm({ ...form, motivoMantenimiento: e.target.value })}
              />
            </label>
          )}
        </div>

        {/* Horarios por día */}
        <div className="space-y-3 pt-2">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <span className="font-semibold text-sm">Horarios de Disponibilidad por Día</span>
              <p className="text-xs text-base-content/60">
                Selecciona qué días está abierta la zona y sus rangos de hora permitidos.
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

        {/* Acciones */}
        <div className="flex gap-3 pt-4 border-t border-base-200">
          <button type="submit" disabled={saving} className="btn btn-primary flex-1 sm:flex-initial">
            {saving ? <span className="loading loading-spinner"></span> : 'Guardar Zona'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="btn btn-outline"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}