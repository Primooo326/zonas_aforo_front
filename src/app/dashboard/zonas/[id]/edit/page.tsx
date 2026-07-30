'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';

const DIAS_OPTS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

function tiempoAMinutos(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export default function EditZonaPage() {
  const router = useRouter();
  const params = useParams();
  const [form, setForm] = useState({
    nombre: '',
    descripcion: '',
    horarioInicio: '',
    horarioFin: '',
    aforoMaximo: 0,
    lapsoMinutos: 0,
    diasDisponibles: [] as string[],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch(`/zonas/${params.id}`)
      .then((data) => {
        setForm({
          nombre: data.nombre,
          descripcion: data.descripcion || '',
          horarioInicio: data.horarioInicio,
          horarioFin: data.horarioFin,
          aforoMaximo: data.aforoMaximo,
          lapsoMinutos: data.lapsoMinutos,
          diasDisponibles: data.diasDisponibles || [],
        });
      })
      .catch(() => router.push('/dashboard/zonas'))
      .finally(() => setLoading(false));
  }, [params.id, router]);

  const validarForm = (): string | null => {
    if (form.diasDisponibles.length === 0) return 'Selecciona al menos un día';
    if (tiempoAMinutos(form.horarioInicio) >= tiempoAMinutos(form.horarioFin)) {
      return 'El horario de fin debe ser posterior al de inicio';
    }
    const totalMin = tiempoAMinutos(form.horarioFin) - tiempoAMinutos(form.horarioInicio);
    if (form.lapsoMinutos > totalMin) {
      return `El lapso (${form.lapsoMinutos}min) excede el horario disponible (${totalMin}min)`;
    }
    return null;
  };

  const toggleDia = (dia: string) => {
    setForm((prev) => ({
      ...prev,
      diasDisponibles: prev.diasDisponibles.includes(dia)
        ? prev.diasDisponibles.filter((d) => d !== dia)
        : [...prev.diasDisponibles, dia],
    }));
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
    try {
      await apiFetch(`/zonas/${params.id}`, { method: 'PUT', body: JSON.stringify(form) });
      router.push('/dashboard/zonas');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Editar Zona</h1>
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
            <span className="label-text">Horario Inicio</span>
            <input name="horarioInicio" type="time" className="input input-bordered" value={form.horarioInicio}
              onChange={(e) => setForm({ ...form, horarioInicio: e.target.value })} required />
          </label>
          <label className="form-control">
            <span className="label-text">Horario Fin</span>
            <input name="horarioFin" type="time" className="input input-bordered" value={form.horarioFin}
              onChange={(e) => setForm({ ...form, horarioFin: e.target.value })} required />
          </label>
        </div>
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
          <span className="label-text mb-2">Días Disponibles</span>
          <div className="flex flex-wrap gap-2">
            {DIAS_OPTS.map((dia) => (
              <button key={dia} type="button" onClick={() => toggleDia(dia)}
                className={`btn btn-sm ${form.diasDisponibles.includes(dia) ? 'btn-primary' : 'btn-outline'}`}>
                {dia}
              </button>
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
