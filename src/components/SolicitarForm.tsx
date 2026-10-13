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
  politicasUso?: string;
  enMantenimiento?: boolean;
  motivoMantenimiento?: string;
  mantenimientoFechaInicio?: string;
  mantenimientoHoraInicio?: string;
  mantenimientoFechaFin?: string;
  mantenimientoHoraFin?: string;
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
  const [telefonoContacto, setTelefonoContacto] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEYS.telefono) || '';
    }
    return '';
  });

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
      edadSolicitante: '25',
    };
  });
  const [disponibilidad, setDisponibilidad] = useState<Disponibilidad>({});
  const [checking, setChecking] = useState(false);

  const zonaSel = zonas.find((z) => z._id === zonaId) ?? null;
  const diaSel = form.fecha ? diaDeFecha(form.fecha) : '';
  const horarioSel = zonaSel?.horarios?.find((h) => h.dia === diaSel) ?? null;
  const diaSinHorario = !!zonaSel && !!form.fecha && !horarioSel;

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

  const estaEnMantenimiento = (zona?: Zona | null, fecha?: string, horaIni?: string, horaF?: string) => {
    if (!zona?.enMantenimiento) return false;
    if (!zona.mantenimientoFechaInicio && !zona.mantenimientoFechaFin) return true;
    if (!fecha || !horaIni || !horaF) return false;

    const fInicio = zona.mantenimientoFechaInicio || '1970-01-01';
    const hInicio = zona.mantenimientoHoraInicio || '00:00';
    const fFin = zona.mantenimientoFechaFin || '2099-12-31';
    const hFin = zona.mantenimientoHoraFin || '23:59';

    const slotInicio = `${fecha}T${horaIni}`;
    const slotFin = `${fecha}T${horaF}`;
    const mantInicio = `${fInicio}T${hInicio}`;
    const mantFin = `${fFin}T${hFin}`;

    return slotInicio < mantFin && slotFin > mantInicio;
  };

  const enMantenimientoSlot = estaEnMantenimiento(zonaSel, form.fecha, form.horaInicio, horaFinCalc);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!zonaId) {
      setError('Selecciona una zona');
      return;
    }
    if (enMantenimientoSlot) {
      const periodo = zonaSel?.mantenimientoFechaInicio
        ? ` (del ${zonaSel.mantenimientoFechaInicio} al ${zonaSel.mantenimientoFechaFin})`
        : '';
      setError(
        `Esta zona común se encuentra en mantenimiento${periodo}: ${zonaSel?.motivoMantenimiento || 'Mantenimiento en curso'}. No es posible reservar en este horario.`,
      );
      return;
    }
    if (form.edadSolicitante && Number(form.edadSolicitante) < 18) {
      setError('Los menores de edad no están autorizados para apartar zonas comunes.');
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
      const payload: Record<string, unknown> = {
        zonaId,
        fecha: form.fecha,
        horaInicio: form.horaInicio,
        nombreSolicitante: form.nombreSolicitante,
        edadSolicitante: Number(form.edadSolicitante) || 18,
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
      localStorage.setItem(STORAGE_KEYS.torre, String(payload.torreInmueble || ''));
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
          className="btn btn-primary w-full mt-6 gap-2"
          onClick={() => {
            setSuccess(false);
            setSuccessData(null);
            setForm((prev) => ({ ...prev, horaInicio: '' }));
            setDisponibilidad({});
          }}
        >
          <span className="icon-[tabler--arrow-back-up] text-lg" />
          Volver para hacer otra reservación
        </button>
      </div>
    );
  }

  return (
    <div className="card bg-base-100 shadow-sm p-6 sm:p-8 max-w-lg w-full">
      <div className="mb-6 space-y-1">
        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-base-content flex items-center gap-2.5">
          <span className="icon-[tabler--calendar-plus] text-primary text-2xl shrink-0" />
          <span>Reservar Zona Común</span>
        </h1>
        <p className="text-sm sm:text-base text-base-content/85 font-medium">
          Elige la zona común, fecha y horario deseado para tu reserva
        </p>
      </div>

      {error && <div className="alert alert-error mb-4 text-sm font-semibold">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Zona */}
        <label className="form-control">
          <span className="label-text font-bold text-sm sm:text-base text-base-content">Zona común *</span>
          <select
            className="select select-bordered mt-1 font-medium"
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
                {z.nombre} (Aforo: {z.aforoMaximo}){z.enMantenimiento ? ' — [EN MANTENIMIENTO]' : ''}
              </option>
            ))}
          </select>
        </label>

        {zonaSel?.enMantenimiento && (
          <div className="alert alert-warning text-sm">
            <span className="icon-[tabler--alert-triangle] text-xl shrink-0" />
            <div>
              <p className="font-bold">
                {zonaSel.mantenimientoFechaInicio ? 'Mantenimiento Programado' : 'Zona en Mantenimiento'}
              </p>
              <p className="font-medium">
                {zonaSel.mantenimientoFechaInicio ? (
                  <span>
                    Programado del <strong>{zonaSel.mantenimientoFechaInicio} {zonaSel.mantenimientoHoraInicio || ''}</strong> al <strong>{zonaSel.mantenimientoFechaFin || ''} {zonaSel.mantenimientoHoraFin || ''}</strong>. Motivo: {zonaSel.motivoMantenimiento || 'Mantenimiento de instalaciones'}.
                  </span>
                ) : (
                  <span>
                    {zonaSel.motivoMantenimiento || 'Esta zona se encuentra temporalmente fuera de servicio por mantenimiento'}. Reservas deshabilitadas.
                  </span>
                )}
              </p>
            </div>
          </div>
        )}

        {zonaSel?.politicasUso && (
          <div className="callout-indicativo space-y-1.5">
            <span className="font-bold text-primary flex items-center gap-2 text-sm sm:text-base">
              <span className="icon-[tabler--shield-check] text-lg shrink-0" />
              Reglamento y Políticas de Uso:
            </span>
            <p className="text-base-content font-medium whitespace-pre-line text-sm leading-relaxed">
              {zonaSel.politicasUso}
            </p>
          </div>
        )}

        {/* MODO CENSO (Selectores de Torre e Inmueble) vs MODO LEGACY */}
        {!cargandoCenso && unidadesCenso.length > 0 ? (
          <div className="p-4 rounded-box bg-base-200/40 border border-base-200 space-y-3">
            <div className="flex items-center gap-2 text-sm sm:text-base font-bold text-primary">
              <span className="icon-[tabler--building-community] text-lg shrink-0" />
              <span>Inmueble Registrado en el Censo</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {tieneTorres && (
                <label className="form-control">
                  <span className="label-text font-bold text-xs sm:text-sm text-base-content">Torre *</span>
                  <select
                    className="select select-bordered select-sm w-full mt-1"
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
                <span className="label-text font-bold text-xs sm:text-sm text-base-content">Apartamento / Inmueble *</span>
                <select
                  className="select select-bordered select-sm w-full mt-1"
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
              <span className="label-text font-bold text-sm sm:text-base text-base-content">Torre / Inmueble</span>
              <input
                type="text"
                className="input input-bordered mt-1 font-medium"
                required
                placeholder="Ej: Torre 1 - 201"
                value={form.torreInmueble}
                onChange={(e) => setForm({ ...form, torreInmueble: e.target.value })}
              />
            </label>

            <label className="form-control">
              <span className="label-text font-bold text-sm sm:text-base text-base-content">Condición</span>
              <select
                className="select select-bordered mt-1 font-medium"
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
          <span className="label-text font-bold text-sm sm:text-base text-base-content">Nombre del Solicitante *</span>
          <input
            type="text"
            className="input input-bordered mt-1 font-medium"
            required
            placeholder="Nombre completo"
            value={form.nombreSolicitante}
            onChange={(e) => setForm({ ...form, nombreSolicitante: e.target.value })}
          />
        </label>

        <label className="form-control">
          <div className="flex justify-between items-center mb-1">
            <span className="label-text font-bold text-sm sm:text-base text-base-content">Edad del Solicitante * (Mayor de edad)</span>
            <span className="badge badge-sm badge-outline font-semibold">Regla de Aforo</span>
          </div>
          <input
            type="number"
            min="1"
            max="120"
            className="input input-bordered font-semibold text-base"
            required
            placeholder="Ej: 28"
            value={form.edadSolicitante}
            onChange={(e) => setForm({ ...form, edadSolicitante: e.target.value })}
          />
          <span className="label-text-alt text-base-content/85 font-medium mt-1">
            Los menores de 18 años no están autorizados para apartar zonas comunes.
          </span>
        </label>

        <label className="form-control">
          <span className="label-text font-bold text-sm sm:text-base text-base-content">Teléfono de Contacto (opcional)</span>
          <input
            type="tel"
            className="input input-bordered mt-1 font-medium"
            placeholder="Ej: 3001234567"
            value={telefonoContacto}
            onChange={(e) => setTelefonoContacto(e.target.value)}
          />
          <span className="label-text-alt text-base-content/85 font-medium mt-1">
            {unidadesCenso.length > 0
              ? 'Se utilizará para verificar automáticamente tu estado de propietario o residente en el censo'
              : 'Para notificaciones o confirmación de tu turno'}
          </span>
        </label>

        {/* Fecha */}
        <label className="form-control">
          <span className="label-text font-bold text-sm sm:text-base text-base-content">Fecha de la Reserva *</span>
          <input
            type="date"
            className="input input-bordered mt-1 font-medium"
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
          <span className="label-text font-bold text-sm sm:text-base text-base-content">Hora de inicio deseada *</span>
          <div className="mt-1">
            <TimePicker
              value={form.horaInicio}
              onChange={(v) => {
                setForm({ ...form, horaInicio: v });
                checkDisponibilidad(zonaSel, form.fecha, v);
              }}
              minTime={horarioSel?.inicio}
              maxTime={horarioSel?.fin}
            />
          </div>
        </label>

        {zonaSel && form.horaInicio && (
          <div className="bg-base-200/60 border border-base-200 rounded-lg p-3.5 space-y-1">
            <p className="text-sm sm:text-base text-base-content font-bold">
              Horario asignado para tu turno: <span className="text-primary">{form.horaInicio}</span> a <span className="text-primary">{horaFinCalc}</span>
            </p>
            <p className="text-xs sm:text-sm text-base-content/85 font-medium">
              Duración máxima de este turno: <strong>{zonaSel.lapsoMinutos} minutos</strong>. No es obligatorio permanecer todo el tiempo.
            </p>
          </div>
        )}

        {diaSinHorario && (
          <div className="alert alert-error text-sm font-semibold">
            La zona no está disponible los {diaSel}. Elige otra fecha.
          </div>
        )}

        {checking && (
          <div className="flex items-center gap-2 text-sm text-base-content font-semibold">
            <span className="loading loading-spinner loading-xs text-primary"></span> Verificando disponibilidad...
          </div>
        )}

        {!checking && disponibilidad.disponible !== undefined && (
          <div className={`alert ${disponibilidad.disponible ? 'alert-success' : 'alert-error'} text-sm font-semibold`}>
            {disponibilidad.disponible
              ? `Disponible (${disponibilidad.disponibles} cupos libres)`
              : 'Aforo completo en esta franja horaria'}
          </div>
        )}

        <button
          type="submit"
          disabled={saving || !zonaId || diaSinHorario || disponibilidad.disponible === false || enMantenimientoSlot}
          className="btn btn-primary btn-sm w-full mt-3 text-base font-bold gap-2"
        >
          {saving ? (
            <span className="loading loading-spinner"></span>
          ) : enMantenimientoSlot ? (
            'Zona en mantenimiento'
          ) : (
            <>
              <span className="icon-[tabler--calendar-check] text-xl" />
              Solicitar Turno
            </>
          )}
        </button>
      </form>
    </div>
  );
}
