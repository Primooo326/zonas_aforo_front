'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

function sumarLapso(hora: string, lapso: number) {
  const [h, m] = hora.split(':').map(Number);
  const total = h * 60 + m + lapso;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export default function SolicitarPage() {
  const { id } = useParams();
  const [zonas, setZonas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const [zonaId, setZonaId] = useState('');
  const [zonaSel, setZonaSel] = useState<any>(null);
  const [form, setForm] = useState({
    nombreSolicitante: '',
    torreInmueble: '',
    fecha: '',
    horaInicio: '',
    tipo: 'propietario',
  });
  const [disponibilidad, setDisponibilidad] = useState<{
    disponible?: boolean; ocupadas?: number; disponibles?: number;
  }>({});
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!id) return;
    const today = new Date().toISOString().split('T')[0];
    setForm((prev) => ({ ...prev, fecha: today }));
    fetch(`${API_URL}/edificio/${id}/zonas`)
      .then((r) => r.json())
      .then((data) => {
        if (!Array.isArray(data) || data.length === 0) {
          setError('No hay zonas disponibles en este edificio');
        }
        setZonas(data);
      })
      .catch(() => setError('No se pudieron cargar las zonas'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!zonaId) {
      setZonaSel(null);
      setDisponibilidad({});
      return;
    }
    const z = zonas.find((z) => z._id === zonaId);
    setZonaSel(z);
    setForm((prev) => ({ ...prev, horaInicio: '', fecha: new Date().toISOString().split('T')[0] }));
    setDisponibilidad({});
  }, [zonaId, zonas]);

  const horaFinCalc = zonaSel && form.horaInicio
    ? sumarLapso(form.horaInicio, zonaSel.lapsoMinutos)
    : '';

  const checkDisponibilidad = useCallback(async () => {
    if (!zonaId || !form.fecha || !form.horaInicio || !horaFinCalc) {
      setDisponibilidad({});
      return;
    }
    setChecking(true);
    try {
      const res = await fetch(
        `${API_URL}/reservas/disponibilidad?zonaId=${zonaId}&fecha=${form.fecha}&horaInicio=${form.horaInicio}&horaFin=${horaFinCalc}`,
      );
      const data = await res.json();
      setDisponibilidad(data);
    } catch {
      setDisponibilidad({});
    } finally {
      setChecking(false);
    }
  }, [zonaId, form.fecha, form.horaInicio, horaFinCalc]);

  useEffect(() => {
    if (zonaId && form.fecha && form.horaInicio) {
      checkDisponibilidad();
    }
  }, [zonaId, form.fecha, form.horaInicio, checkDisponibilidad]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!zonaId) { setError('Selecciona una zona'); return; }
    if (disponibilidad.disponible === false) { setError('Aforo completo en esta franja horaria'); return; }
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/solicitudes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zonaId,
          fecha: form.fecha,
          horaInicio: form.horaInicio,
          nombreSolicitante: form.nombreSolicitante,
          torreInmueble: form.torreInmueble,
          tipo: form.tipo,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Error al enviar solicitud');
      }
      setSuccessData({ zona: zonaSel?.nombre, fecha: form.fecha, horaInicio: form.horaInicio, horaFin: horaFinCalc });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (success && successData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200 p-4">
        <div className="card bg-base-100 shadow-sm p-8 text-center max-w-md">
          <div className="text-4xl mb-4 text-success">&#10003;</div>
          <h1 className="text-xl font-bold mb-2">Solicitud enviada</h1>
          <p className="text-base-content/60">
            Tu solicitud para <strong>{successData.zona}</strong> el {successData.fecha} de {successData.horaInicio} a {successData.horaFin} ha sido registrada.
          </p>
        </div>
      </div>
    );
  }

  if (!zonas.length && error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <div className="card bg-base-100 shadow-sm p-8 text-center">
          <h1 className="text-xl font-bold mb-2">Edificio no encontrado</h1>
          <p className="text-base-content/60">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200 p-4">
      <div className="card bg-base-100 shadow-sm p-6 w-full max-w-md">
        <h1 className="text-xl font-bold mb-4">Solicitar Turno</h1>

        {error && <div className="alert alert-error mb-4 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="form-control">
            <span className="label-text">Zona</span>
            <select className="select select-bordered" value={zonaId}
              onChange={(e) => setZonaId(e.target.value)} required>
              <option value="">Selecciona una zona</option>
              {zonas.map((z) => (
                <option key={z._id} value={z._id}>{z.nombre}</option>
              ))}
            </select>
          </label>

          {zonaSel && (
            <div className="flex flex-wrap gap-1 text-xs">
              <span className="badge badge-outline badge-sm">{zonaSel.horarioInicio} - {zonaSel.horarioFin}</span>
              <span className="badge badge-outline badge-sm">Aforo: {zonaSel.aforoMaximo}</span>
              <span className="badge badge-outline badge-sm">Lapso: {zonaSel.lapsoMinutos} min</span>
            </div>
          )}

          <label className="form-control">
            <span className="label-text">Nombre</span>
            <input type="text" className="input input-bordered" required
              value={form.nombreSolicitante}
              onChange={(e) => setForm({ ...form, nombreSolicitante: e.target.value })} />
          </label>

          <label className="form-control">
            <span className="label-text">Torre / Inmueble</span>
            <input type="text" className="input input-bordered" required
              value={form.torreInmueble}
              onChange={(e) => setForm({ ...form, torreInmueble: e.target.value })} />
          </label>

          <label className="form-control">
            <span className="label-text">Tipo</span>
            <select className="select select-bordered" value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
              <option value="propietario">Propietario</option>
              <option value="arrendatario">Arrendatario</option>
            </select>
          </label>

          <label className="form-control">
            <span className="label-text">Fecha</span>
            <input type="date" className="input input-bordered" required
              min={new Date().toISOString().split('T')[0]}
              value={form.fecha}
              onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
          </label>

          <label className="form-control">
            <span className="label-text">Hora de inicio</span>
            <input type="time" className="input input-bordered" required
              min={zonaSel?.horarioInicio || ''}
              max={zonaSel?.horarioFin || ''}
              value={form.horaInicio}
              onChange={(e) => setForm({ ...form, horaInicio: e.target.value })} />
          </label>

          {zonaSel && form.horaInicio && (
            <div className="text-sm space-y-1">
              <p className="text-base-content/70">
                Tu turno será de <strong>{form.horaInicio}</strong> a <strong>{horaFinCalc}</strong>
                &nbsp;(lapso: {zonaSel.lapsoMinutos} min)
              </p>
              <p className="text-base-content/50 italic">
                No es obligatorio usar todo el tiempo.
              </p>
            </div>
          )}

          {checking && (
            <div className="flex items-center gap-2 text-sm text-base-content/60">
              <span className="loading loading-spinner loading-xs"></span> Verificando disponibilidad...
            </div>
          )}

          {!checking && disponibilidad.disponible !== undefined && (
            <div className={`alert ${disponibilidad.disponible ? 'alert-success' : 'alert-error'} text-sm`}>
              {disponibilidad.disponible
                ? `Disponible (${disponibilidad.disponibles} cupos libres)`
                : 'Aforo completo en esta franja horaria'}
            </div>
          )}

          <button type="submit" disabled={saving || !zonaId || disponibilidad.disponible === false}
            className="btn btn-primary w-full mt-2">
            {saving ? <span className="loading loading-spinner"></span> : 'Solicitar turno'}
          </button>
        </form>
      </div>
    </div>
  );
}
