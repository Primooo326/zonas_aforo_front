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

interface UnidadPublica {
  _id: string;
  identificador: string;
  torre?: string;
  numeroApto?: string;
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

const STORAGE_KEYS = {
  nombre: 'solicitante_nombre',
  torre: 'solicitante_torre',
  telefono: 'solicitante_telefono',
  tipo: 'solicitante_tipo',
};

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

  // Unidades del Censo
  const [unidadesCenso, setUnidadesCenso] = useState<UnidadPublica[]>([]);
  const [cargandoCenso, setCargandoCenso] = useState(true);
  const [torreSel, setTorreSel] = useState('');
  const [unidadSelId, setUnidadSelId] = useState('');
  const [telefonoContacto, setTelefonoContacto] = useState('');

  const [zonaId, setZonaId] = useState('');
  const [form, setForm] = useState(() => {
    const hoy = new Date().toISOString().split('T')[0];
    let nombre = '';
    let torre = '';
    let tipo = 'propietario';
    let tel = '';
    if (typeof window !== 'undefined') {
      nombre = localStorage.getItem(STORAGE_KEYS.nombre) || '';
      torre = localStorage.getItem(STORAGE_KEYS.torre) || '';
      tipo = localStorage.getItem(STORAGE_KEYS.tipo) || 'propietario';
      tel = localStorage.getItem(STORAGE_KEYS.telefono) || '';
    }
    return {
      nombreSolicitante: nombre,
      torreInmueble: torre,
      fecha: hoy,
      horaInicio: '',
      tipo,
      telefonoContacto: tel,
    };
  });
  const [disponibilidad, setDisponibilidad] = useState<Disponibilidad>({});
  const [checking, setChecking] = useState(false);

  const zonaSel = zonas.find((z) => z._id === zonaId) ?? null;
  const diaSel = form.fecha ? diaDeFecha(form.fecha) : '';
  const horarioSel = zonaSel?.horarios?.find((h) => h.dia === diaSel) ?? null;
  const diaSinHorario = !!zonaSel && !!form.fecha && !horarioSel;

  useEffect(() => {
    if (form.telefonoContacto) {
      setTelefonoContacto(form.telefonoContacto);
    }
  }, [form.telefonoContacto]);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch(`${API_URL}/edificio/${edificioId}/zonas`).then((r) => r.json()),
      fetch(`${API_URL}/censo/public/${edificioId}/unidades`)
        .then((r) => r.json())
        .catch(() => []),
    ])
      .then(([dataZonas, dataCenso]) => {
        if (!active) return;
        if (!Array.isArray(dataZonas) || dataZonas.length === 0) {
          setError('No hay zonas disponibles en este edificio');
        }
        setZonas(dataZonas || []);

        if (Array.isArray(dataCenso)) {
          setUnidadesCenso(dataCenso);
        }
      })
      .catch(() => {
        if (active) setError('No se pudieron cargar los datos del edificio');
      })
      .finally(() => {
        if (active) {
          setLoading(false);
          setCargandoCenso(false);
        }
      });

    return () => {
      active = false;
    };
  }, [edificioId]);

  const tieneTorres = unidadesCenso.some((u) => u.torre);
  const torresDisponibles = Array.from(
    new Set(unidadesCenso.map((u) => u.torre).filter(Boolean)),
  ).sort() as string[];

  const unidadesFiltradas = torreSel
    ? unidadesCenso.filter((u) => u.torre === torreSel)
    : unidadesCenso;

  const unidadSeleccionada = unidadesCenso.find((u) => u._id === unidadSelId);

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

    if (unidadesCenso.length > 0 && !unidadSelId) {
      setError('Por favor selecciona tu apartamento o unidad censada');
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, any> = {
        zonaId,
        fecha: form.fecha,
        horaInicio: form.horaInicio,
        nombreSolicitante: form.nombreSolicitante,
      };

      if (unidadesCenso.length > 0 && unidadSeleccionada) {
        payload.censoUnidadId = unidadSeleccionada._id;
        payload.torreInmueble = unidadSeleccionada.identificador;
        payload.telefonoContacto = telefonoContacto;
      } else {
        payload.torreInmueble = form.torreInmueble;
        payload.tipo = form.tipo;
        payload.telefonoContacto = telefonoContacto;
      }

      const res = await fetch(`${API_URL}/solicitudes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Error al enviar solicitud');
      }

      localStorage.setItem(STORAGE_KEYS.nombre, form.nombreSolicitante);
      localStorage.setItem(STORAGE_KEYS.torre, payload.torreInmueble || '');
      localStorage.setItem(STORAGE_KEYS.tipo, form.tipo);
      if (telefonoContacto) localStorage.setItem(STORAGE_KEYS.telefono, telefonoContacto);

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
        <button
          type="button"
          className="btn btn-primary w-full mt-6"
          onClick={() => {
            setSuccess(false);
            setSuccessData(null);
          }}
        >
          Hacer otra solicitud
        </button>
      </div>
    );
  }

  return (
    <div className="card bg-base-100 shadow-sm p-6 sm:p-8 max-w-lg w-full">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Reservar Zona Común</h1>
        <p className="text-xs sm:text-sm text-base-content/60">
          Elige la zona, fecha y horario de tu reserva
        </p>
      </div>

      {error && <div className="alert alert-error mb-4 text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Zona */}
        <label className="form-control">
          <span className="label-text">Zona común</span>
          <select
            className="select select-bordered"
            required
            value={zonaId}
            onChange={(e) => {
              const id = e.target.value;
              setZonaId(id);
              const z = zonas.find((item) => item._id === id) ?? null;
              checkDisponibilidad(z, form.fecha, form.horaInicio);
            }}
          >
            <option value="">Selecciona una zona...</option>
            {zonas.map((z) => (
              <option key={z._id} value={z._id}>
                {z.nombre} (Aforo: {z.aforoMaximo})
              </option>
            ))}
          </select>
        </label>

        {/* MODO CENSO (Selectores de Torre e Inmueble) vs MODO LEGACY */}
        {!cargandoCenso && unidadesCenso.length > 0 ? (
          <div className="bg-primary/5 border border-primary/20 rounded-box p-3.5 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
              <span className="icon-[tabler--database-check] text-sm" />
              <span>Inmueble Registrado en el Censo</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {tieneTorres && (
                <label className="form-control">
                  <span className="label-text text-xs">Torre *</span>
                  <select
                    className="select select-bordered select-sm w-full"
                    value={torreSel}
                    onChange={(e) => {
                      setTorreSel(e.target.value);
                      setUnidadSelId('');
                    }}
                    required
                  >
                    <option value="">Selecciona torre...</option>
                    {torresDisponibles.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <label className="form-control">
                <span className="label-text text-xs">Apartamento / Inmueble *</span>
                <select
                  className="select select-bordered select-sm w-full"
                  value={unidadSelId}
                  onChange={(e) => setUnidadSelId(e.target.value)}
                  disabled={tieneTorres && !torreSel}
                  required
                >
                  <option value="">Selecciona apartamento...</option>
                  {unidadesFiltradas.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.identificador}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        ) : !cargandoCenso && unidadesCenso.length === 0 ? (
          /* MODO LEGACY (Campos abiertos) */
          <>
            <label className="form-control">
              <span className="label-text">Torre / Inmueble</span>
              <input
                type="text"
                className="input input-bordered"
                required
                placeholder="Ej: Torre 1 - 201"
                value={form.torreInmueble}
                onChange={(e) => setForm({ ...form, torreInmueble: e.target.value })}
              />
            </label>

            <label className="form-control">
              <span className="label-text">Condición</span>
              <select
                className="select select-bordered"
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value })}
              >
                <option value="propietario">Propietario</option>
                <option value="arrendatario">Arrendatario</option>
              </select>
            </label>
          </>
        ) : null}

        {/* Datos del Solicitante */}
        <label className="form-control">
          <span className="label-text">Nombre del Solicitante *</span>
          <input
            type="text"
            className="input input-bordered"
            required
            placeholder="Nombre completo"
            value={form.nombreSolicitante}
            onChange={(e) => setForm({ ...form, nombreSolicitante: e.target.value })}
          />
        </label>

        <label className="form-control">
          <span className="label-text">Teléfono de Contacto (opcional)</span>
          <input
            type="tel"
            className="input input-bordered"
            placeholder="Ej: 3001234567"
            value={telefonoContacto}
            onChange={(e) => setTelefonoContacto(e.target.value)}
          />
          <span className="label-text-alt text-base-content/60">
            {unidadesCenso.length > 0
              ? 'Se utilizará para verificar automáticamente tu estado de propietario o residente en el censo'
              : 'Para notificaciones o confirmación de tu turno'}
          </span>
        </label>

        {/* Fecha */}
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

        {/* Hora */}
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
            <p className="text-base-content/50 italic text-xs">No es obligatorio usar todo el tiempo.</p>
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
