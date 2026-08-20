'use client';

import { useEffect, useState } from 'react';
import TimePicker from '@/components/TimePicker';
import { API_URL } from '@/lib/api';

interface Zona {
  _id: string;
  nombre: string;
  horarios: { dia: string; inicio: string; fin: string }[];
  aforoMaximo: number;
  lapsoMinutos: number;
}

interface Disponibilidad {
  disponible?: boolean;
  ocupadas?: number;
  disponibles?: number;
}

function sumarLapso(hora: string, lapso: number) {
  const [h, m] = hora.split(':').map(Number);
  const total = h * 60 + m + lapso;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

function diaDeFecha(fecha: string) {
  return DIAS[new Date(fecha + 'T00:00:00').getDay()];
}

export default function SolicitarForm({ edificioId }: { edificioId: string }) {
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [successData, setSuccessData] = useState<{
    zona?: string;
    fecha: string;
    horaInicio: string;
    horaFin: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  const [zonaId, setZonaId] = useState('');
  const [form, setForm] = useState(() => ({
    nombreSolicitante: '',
    torreInmueble: '',
    fecha: new Date().toISOString().split('T')[0],
    horaInicio: '',
    tipo: 'propietario',
  }));
  const [disponibilidad, setDisponibilidad] = useState<Disponibilidad>({});
  const [checking, setChecking] = useState(false);

  const zonaSel = zonas.find((z) => z._id === zonaId) ?? null;
  const diaSel = form.fecha ? diaDeFecha(form.fecha) : '';
  const horarioSel = zonaSel?.horarios?.find((h) => h.dia === diaSel) ?? null;
  const diaSinHorario = !!zonaSel && !!form.fecha && !horarioSel;

  useEffect(() => {
    let active = true;
    fetch(`${API_URL}/edificio/${edificioId}/zonas`)
      .then((r) => r.json())
      .then((data: Zona[]) => {
        if (!active) return;
        if (!Array.isArray(data) || data.length === 0) {
          setError('No hay zonas disponibles en este edificio');
        }
        setZonas(data);
      })
      .catch(() => {
        if (active) setError('No se pudieron cargar las zonas');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [edificioId]);

  const horaFinCalc =
    zonaSel && form.horaInicio
      ? sumarLapso(form.horaInicio, zonaSel.lapsoMinutos)
      : '';

  const checkDisponibilidad = async (zona: Zona | null, fecha: string, horaInicio: string) => {
    const horaFin = zona ? sumarLapso(horaInicio, zona.lapsoMinutos) : '';
    if (!zonaId || !fecha || !horaInicio || !horaFin) {
      setDisponibilidad({});
      return;
    }
    setChecking(true);
    try {
      const res = await fetch(
        `${API_URL}/reservas/disponibilidad?zonaId=${zonaId}&fecha=${fecha}&horaInicio=${horaInicio}&horaFin=${horaFin}`,
      );
      const data = await res.json();
      setDisponibilidad(data);
    } catch {
      setDisponibilidad({});
    } finally {
      setChecking(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!zonaId) {
      setError('Selecciona una zona');
      return;
    }
    if (diaSinHorario) {
      setError(`La zona no está disponible los ${diaSel}`);
      return;
    }
    if (disponibilidad.disponible === false) {
      setError('Aforo completo en esta franja horaria');
      return;
    }
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
      setSuccessData({
        zona: zonaSel?.nombre,
        fecha: form.fecha,
        horaInicio: form.horaInicio,
        horaFin: horaFinCalc,
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar solicitud');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (success && successData) {
    return (
      <div className="card bg-base-100 shadow-sm p-8 text-center max-w-md">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-box bg-success/10 text-success">
          <span className="icon-[tabler--circle-check] text-3xl" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-bold mb-2">Solicitud enviada</h1>
        <p className="text-base-content/60">
          Tu solicitud para <strong>{successData.zona}</strong> el {successData.fecha} de{' '}
          {successData.horaInicio} a {successData.horaFin} ha sido registrada.
        </p>
      </div>
    );
  }

  if (!zonas.length && error) {
    return (
      <div className="card bg-base-100 shadow-sm p-8 text-center max-w-md">
        <h1 className="text-xl font-bold mb-2">Edificio no encontrado</h1>
        <p className="text-base-content/60">{error}</p>
      </div>
    );
  }

  return (
    <div className="card bg-base-100 shadow-sm p-6 w-full max-w-md">
      <h1 className="text-xl font-bold mb-4">Solicitar Turno</h1>

      {error && <div className="alert alert-error mb-4 text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="form-control">
          <span className="label-text">Zona</span>
          <select
            className="select select-bordered"
            value={zonaId}
            onChange={(e) => {
              const v = e.target.value;
              setZonaId(v);
              setForm((prev) => ({
                ...prev,
                horaInicio: '',
                fecha: new Date().toISOString().split('T')[0],
              }));
              setDisponibilidad({});
            }}
            required
          >
            <option value="">Selecciona una zona</option>
            {zonas.map((z) => (
              <option key={z._id} value={z._id}>
                {z.nombre}
              </option>
            ))}
          </select>
        </label>

        {zonaSel && (
          <div className="flex flex-wrap gap-1 text-xs">
            <span className={`badge badge-sm ${horarioSel ? 'badge-outline' : 'badge-error'}`}>
              {horarioSel ? `${horarioSel.inicio} - ${horarioSel.fin}` : `No disponible los ${diaSel}`}
            </span>
            <span className="badge badge-outline badge-sm">Aforo: {zonaSel.aforoMaximo}</span>
            <span className="badge badge-outline badge-sm">Lapso: {zonaSel.lapsoMinutos} min</span>
          </div>
        )}

        <label className="form-control">
          <span className="label-text">Nombre</span>
          <input
            type="text"
            className="input input-bordered"
            required
            value={form.nombreSolicitante}
            onChange={(e) => setForm({ ...form, nombreSolicitante: e.target.value })}
          />
        </label>

        <label className="form-control">
          <span className="label-text">Torre / Inmueble</span>
          <input
            type="text"
            className="input input-bordered"
            required
            value={form.torreInmueble}
            onChange={(e) => setForm({ ...form, torreInmueble: e.target.value })}
          />
        </label>

        <label className="form-control">
          <span className="label-text">Tipo</span>
          <select
            className="select select-bordered"
            value={form.tipo}
            onChange={(e) => setForm({ ...form, tipo: e.target.value })}
          >
            <option value="propietario">Propietario</option>
            <option value="arrendatario">Arrendatario</option>
          </select>
        </label>

        <label className="form-control">
          <span className="label-text">Fecha</span>
          <input
            type="date"
            className="input input-bordered"
            required
            min={new Date().toISOString().split('T')[0]}
            value={form.fecha}
            onChange={(e) => {
              const v = e.target.value;
              setForm({ ...form, fecha: v });
              const tieneHorario = zonaSel?.horarios?.some((h) => h.dia === diaDeFecha(v));
              if (!tieneHorario) {
                setForm((prev) => ({ ...prev, horaInicio: '' }));
                setDisponibilidad({});
              } else {
                checkDisponibilidad(zonaSel, v, form.horaInicio);
              }
            }}
          />
        </label>

        <label className="form-control">
          <span className="label-text">Hora de inicio</span>
          <TimePicker
            value={form.horaInicio}
            onChange={(v) => {
              setForm({ ...form, horaInicio: v });
              checkDisponibilidad(zonaSel, form.fecha, v);
            }}
            minTime={horarioSel?.inicio}
            maxTime={horarioSel?.fin}
          />
        </label>

        {zonaSel && form.horaInicio && (
          <div className="text-sm space-y-1">
            <p className="text-base-content/70">
              Tu turno será de <strong>{form.horaInicio}</strong> a <strong>{horaFinCalc}</strong>
              &nbsp;(lapso: {zonaSel.lapsoMinutos} min)
            </p>
            <p className="text-base-content/50 italic">No es obligatorio usar todo el tiempo.</p>
          </div>
        )}

        {diaSinHorario && (
          <div className="alert alert-error text-sm">
            La zona no está disponible los {diaSel}. Elige otra fecha.
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

        <button
          type="submit"
          disabled={saving || !zonaId || diaSinHorario || disponibilidad.disponible === false}
          className="btn btn-primary w-full mt-2"
        >
          {saving ? <span className="loading loading-spinner"></span> : 'Solicitar turno'}
        </button>
      </form>
    </div>
  );
}
