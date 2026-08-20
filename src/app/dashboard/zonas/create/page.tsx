'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import RangoHoraPicker, { RangoHora } from '@/components/RangoHoraPicker';

const DIAS_OPTS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const RANGO_DEFAULT: RangoHora = { inicio: '08:00', fin: '18:00' };

function tiempoAMinutos(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

type DiaEstado = { activo: boolean; rango: RangoHora };

function estadoInicial(): Record<string, DiaEstado> {
  return DIAS_OPTS.reduce<Record<string, DiaEstado>>((acc, d) => {
    acc[d] = { activo: false, rango: { ...RANGO_DEFAULT } };
    return acc;
  }, {});
}

export default function CreateZonaPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    nombre: '',
    descripcion: '',
    aforoMaximo: 20,
    lapsoMinutos: 120,
  });
  const [horarios, setHorarios] = useState<Record<string, DiaEstado>>(estadoInicial);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

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
    setSaving(true);
    const horariosEnviar = DIAS_OPTS.filter((d) => horarios[d].activo).map((d) => ({
      dia: d,
      inicio: horarios[d].rango.inicio,
      fin: horarios[d].rango.fin,
    }));
    try {
      await apiFetch('/zonas', {
        method: 'POST',
        body: JSON.stringify({ ...form, horarios: horariosEnviar }),
      });
      router.push('/dashboard/zonas');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar la zona');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Nueva Zona</h1>
      {error && <div className="alert alert-error mb-4">{error}</div>}
      <form onSubmit={handleSubmit} className="card bg-base-100 shadow-sm p-6 space-y-4">
        <label className="form-control">
          <span className="label-text">Nombre</span>
          <input name="nombre" type="text" className="input input-bordered" value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
        </label>
        <label className="form-control">
          <span className="label-text">Descripción</span>
          <textarea name="descripcion" className="textarea textarea-bordered" value={form.descripcion}
            onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className="form-control">
            <span className="label-text">Aforo Máximo</span>
            <input name="aforoMaximo" type="number" min="1" className="input input-bordered" value={form.aforoMaximo}
              onChange={(e) => setForm({ ...form, aforoMaximo: Number(e.target.value) })} required />
          </label>
          <label className="form-control">
            <span className="label-text">Lapso por uso (minutos)</span>
            <input name="lapsoMinutos" type="number" min="1" className="input input-bordered" value={form.lapsoMinutos}
              onChange={(e) => setForm({ ...form, lapsoMinutos: Number(e.target.value) })} required />
          </label>
        </div>
        <div className="form-control">
          <span className="label-text mb-2">Horarios por día</span>
          <p className="text-xs text-base-content/60 mb-3">
            Marca los días disponibles y ajusta su rango de horas (por defecto 08:00 – 18:00).
          </p>
          <div className="grid grid-cols-3 gap-y-3 items-center">
            {DIAS_OPTS.map((dia) => (
              <div key={dia} className="grid grid-cols-3 col-span-3 gap-2 items-center">
                <span className="text-sm font-medium">{dia}</span>
                <div className="col-span-2">
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
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving} className="btn btn-primary">
            {saving ? <span className="loading loading-spinner"></span> : 'Guardar'}
          </button>
          <button type="button" onClick={() => router.back()} className="btn btn-ghost">Cancelar</button>
        </div>
      </form>
    </div>
  );
}