'use client';

import { useState, useEffect, useCallback } from 'react';
import { residentApiFetch } from '@/lib/api';

interface Persona {
  nombreCompleto: string;
  telefono?: string;
  email?: string;
  documento?: string;
  fechaNacimiento?: string;
  condicion: string;
  esContactoPrincipal?: boolean;
}

interface Mascota {
  tipo: string;
  nombre: string;
  raza: string;
  esPeligroso?: boolean;
  esManejoEspecial?: boolean;
  vacunasAlDia: boolean;
  observaciones?: string;
}

interface Vehiculo {
  tipo: string;
  placa: string;
  marca?: string;
  modelo?: string;
  color?: string;
  numeroParqueadero?: string;
}

interface Parqueadero {
  numero: string;
  tipo: string;
}

interface Bodega {
  numero: string;
  ubicacion?: string;
}

interface UnidadHogar {
  _id: string;
  torre?: string;
  numeroApto?: string;
  identificador: string;
  piso?: number;
  metrosCuadrados?: number;
  coeficiente?: number;
  tipoOcupacion: string;
  tags?: string[];
  personas: Persona[];
  mascotas: Mascota[];
  vehiculos: Vehiculo[];
  parqueaderosAsignados?: Parqueadero[];
  bodegasAsignadas?: Bodega[];
}

interface SolicitudPendiente {
  _id: string;
  createdAt: string;
  tipoOcupacion: string;
  personas: Persona[];
  mascotas: Mascota[];
  vehiculos: Vehiculo[];
  notasAdministracion?: string;
}

export default function MiHogarPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [unidad, setUnidad] = useState<UnidadHogar | null>(null);
  const [solicitudPendiente, setSolicitudPendiente] = useState<SolicitudPendiente | null>(null);
  const [edificioNombre, setEdificioNombre] = useState('');
  const [cancelingRequest, setCancelingRequest] = useState(false);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editOcupacion, setEditOcupacion] = useState('habitada');
  const [editPersonas, setEditPersonas] = useState<Persona[]>([]);
  const [editMascotas, setEditMascotas] = useState<Mascota[]>([]);
  const [editVehiculos, setEditVehiculos] = useState<Vehiculo[]>([]);
  const [motivoCambio, setMotivoCambio] = useState('');
  const [savingRequest, setSavingRequest] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const cargarDatos = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await residentApiFetch('/portal/me');
      setUnidad(data.unidad);
      setSolicitudPendiente(data.solicitudPendiente);
      setEdificioNombre(data.edificio?.nombre || '');

      // Initialize edit state
      if (data.solicitudPendiente) {
        setEditOcupacion(data.solicitudPendiente.tipoOcupacion || 'habitada');
        setEditPersonas(data.solicitudPendiente.personas || []);
        setEditMascotas(data.solicitudPendiente.mascotas || []);
        setEditVehiculos(data.solicitudPendiente.vehiculos || []);
        setMotivoCambio(data.solicitudPendiente.notasAdministracion || '');
      } else if (data.unidad) {
        setEditOcupacion(data.unidad.tipoOcupacion || 'habitada');
        setEditPersonas(data.unidad.personas || []);
        setEditMascotas(data.unidad.mascotas || []);
        setEditVehiculos(data.unidad.vehiculos || []);
        setMotivoCambio('');
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Error al cargar la información del hogar',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const handleCancelarSolicitud = async () => {
    if (!confirm('¿Estás seguro de que deseas cancelar la solicitud de actualización en revisión?')) {
      return;
    }
    setCancelingRequest(true);
    try {
      await residentApiFetch('/portal/solicitud-actualizacion', {
        method: 'DELETE',
      });
      setSuccessMsg('Solicitud de actualización cancelada con éxito.');
      await cargarDatos();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al cancelar solicitud');
    } finally {
      setCancelingRequest(false);
    }
  };

  const handleGuardarSolicitud = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingRequest(true);
    try {
      await residentApiFetch('/portal/solicitud-actualizacion', {
        method: 'POST',
        body: JSON.stringify({
          tipoOcupacion: editOcupacion,
          personas: editPersonas,
          mascotas: editMascotas,
          vehiculos: editVehiculos,
          motivoCambio,
        }),
      });

      setModalOpen(false);
      setSuccessMsg('¡Solicitud enviada a la administración! Los cambios serán reflejados una vez sean validados.');
      await cargarDatos();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al enviar la solicitud');
    } finally {
      setSavingRequest(false);
    }
  };

  // Helper person editor handlers
  const agregarPersona = () => {
    setEditPersonas([
      ...editPersonas,
      {
        nombreCompleto: '',
        telefono: '',
        email: '',
        documento: '',
        condicion: 'habitante',
        esContactoPrincipal: false,
      },
    ]);
  };

  const actualizarPersona = (index: number, field: keyof Persona, val: any) => {
    const list = [...editPersonas];
    list[index] = { ...list[index], [field]: val };
    setEditPersonas(list);
  };

  const eliminarPersona = (index: number) => {
    if (editPersonas.length <= 1) {
      alert('Debe haber al menos un habitante registrado.');
      return;
    }
    setEditPersonas(editPersonas.filter((_, i) => i !== index));
  };

  // Helper pet editor handlers
  const agregarMascota = () => {
    setEditMascotas([
      ...editMascotas,
      {
        tipo: 'perro',
        nombre: '',
        raza: '',
        vacunasAlDia: true,
      },
    ]);
  };

  const actualizarMascota = (index: number, field: keyof Mascota, val: any) => {
    const list = [...editMascotas];
    list[index] = { ...list[index], [field]: val };
    setEditMascotas(list);
  };

  const eliminarMascota = (index: number) => {
    setEditMascotas(editMascotas.filter((_, i) => i !== index));
  };

  // Helper vehicle editor handlers
  const agregarVehiculo = () => {
    setEditVehiculos([
      ...editVehiculos,
      {
        tipo: 'carro',
        placa: '',
        marca: '',
        color: '',
      },
    ]);
  };

  const actualizarVehiculo = (index: number, field: keyof Vehiculo, val: any) => {
    const list = [...editVehiculos];
    list[index] = { ...list[index], [field]: val };
    setEditVehiculos(list);
  };

  const eliminarVehiculo = (index: number) => {
    setEditVehiculos(editVehiculos.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <span className="loading loading-spinner loading-lg text-primary"></span>
        <p className="text-sm font-medium text-base-content/70">
          Cargando ficha oficial de tu hogar...
        </p>
      </div>
    );
  }

  if (error || !unidad) {
    return (
      <div className="alert alert-error rounded-2xl shadow-sm p-6 text-sm">
        <span>{error || 'No se pudo cargar la información del hogar.'}</span>
      </div>
    );
  }

  const esMoroso = unidad.tags?.includes('moroso');

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Success Notification Banner */}
      {successMsg && (
        <div className="alert alert-success rounded-2xl shadow-md py-3 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="btn btn-ghost btn-xs">✕</button>
        </div>
      )}

      {/* Pending Update Request Banner */}
      {solicitudPendiente && (
        <div className="p-4 sm:p-5 rounded-2xl bg-warning/10 border-2 border-warning/30 text-warning-content shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-warning/20 text-warning flex items-center justify-center shrink-0 mt-0.5">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="font-black text-sm text-base-content">
                Solicitud de Actualización en Revisión
              </p>
              <p className="text-xs text-base-content/80 mt-0.5">
                Enviaste una solicitud de cambios el {new Date(solicitudPendiente.createdAt).toLocaleDateString('es-CO')}. La administración está verificando los datos antes de aprobarlos en el censo oficial.
              </p>
              {solicitudPendiente.notasAdministracion && (
                <p className="text-xs text-base-content/60 italic mt-1">
                  Nota: "{solicitudPendiente.notasAdministracion}"
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
            <button
              onClick={() => setModalOpen(true)}
              className="btn btn-sm btn-outline rounded-xl flex-1 sm:flex-none"
            >
              Ver Propuesta
            </button>
            <button
              onClick={handleCancelarSolicitud}
              disabled={cancelingRequest}
              className="btn btn-sm btn-error btn-outline rounded-xl flex-1 sm:flex-none"
            >
              {cancelingRequest ? 'Cancelando...' : 'Cancelar Solicitud'}
            </button>
          </div>
        </div>
      )}

      {/* Apartment Header Panel */}
      <div className="arch-panel p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b arch-border">
          <div>
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              <span className="badge badge-primary badge-xs font-semibold">
                {edificioNombre || 'Copropiedad'}
              </span>
              {esMoroso ? (
                <span className="badge badge-error badge-xs font-semibold">Mora</span>
              ) : (
                <span className="badge badge-success badge-xs font-semibold">Al Día</span>
              )}
              <span className="badge badge-neutral badge-xs font-semibold capitalize">
                {unidad.tipoOcupacion}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-base-content tracking-tight">
              {unidad.torre ? `Torre ${unidad.torre} · ` : ''}
              Apto {unidad.numeroApto || unidad.identificador}
            </h1>
          </div>

          <button
            onClick={() => setModalOpen(true)}
            className="btn btn-sm btn-primary font-bold shadow-xs flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <span className="icon-[tabler--edit] text-sm" aria-hidden="true"></span>
            <span>{solicitudPendiente ? 'Ver Solicitud' : 'Actualizar Datos'}</span>
          </button>
        </div>

        {/* Spec pills row (compact) */}
        <div className="flex flex-wrap items-center gap-2 pt-3 text-xs">
          <span className="badge badge-sm badge-ghost font-medium">
            Piso: <strong className="ml-1 text-base-content">{unidad.piso ?? 'N/A'}</strong>
          </span>
          <span className="badge badge-sm badge-ghost font-medium">
            Área: <strong className="ml-1 text-base-content">{unidad.metrosCuadrados ? `${unidad.metrosCuadrados} m²` : 'N/A'}</strong>
          </span>
          <span className="badge badge-sm badge-ghost font-medium">
            Coeficiente: <strong className="ml-1 text-base-content">{unidad.coeficiente ? `${unidad.coeficiente}%` : 'N/A'}</strong>
          </span>
          <span className="badge badge-sm badge-ghost font-medium">
            Habitantes: <strong className="ml-1 text-base-content">{unidad.personas?.length || 0}</strong>
          </span>
        </div>
      </div>

      {/* Habitantes Section */}
      <div className="arch-panel p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-base-content flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary"></span>
            Habitantes Registrados ({unidad.personas?.length || 0})
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {unidad.personas?.map((p, idx) => (
            <div
              key={idx}
              className="p-3 rounded-lg border arch-border bg-base-200/30 hover:border-primary/30 transition-colors flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="font-bold text-sm text-base-content truncate">
                    {p.nombreCompleto}
                  </span>
                  <div className="flex items-center gap-1">
                    {p.esContactoPrincipal && (
                      <span className="badge badge-primary badge-3xs font-bold">Principal</span>
                    )}
                    <span className="badge badge-ghost badge-3xs capitalize">
                      {p.condicion}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-2xs text-base-content/70">
                  {p.documento && (
                    <span><strong className="text-base-content/50">Doc:</strong> {p.documento}</span>
                  )}
                  {p.telefono && (
                    <span><strong className="text-base-content/50">Tel:</strong> {p.telefono}</span>
                  )}
                  {p.email && (
                    <span><strong className="text-base-content/50">Email:</strong> {p.email}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mascotas Section */}
      <div className="arch-panel p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-base-content flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-secondary"></span>
            Mascotas ({unidad.mascotas?.length || 0})
          </h2>
        </div>

        {unidad.mascotas && unidad.mascotas.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {unidad.mascotas.map((m, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg border arch-border bg-base-200/30 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm text-base-content capitalize">
                      {m.nombre}
                    </span>
                    <span className="badge badge-3xs badge-secondary capitalize">
                      {m.tipo}
                    </span>
                  </div>
                  <p className="text-2xs text-base-content/70">
                    Raza: {m.raza || 'Mestizo'}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {m.vacunasAlDia ? (
                      <span className="badge badge-3xs badge-success">Vacunas al día</span>
                    ) : (
                      <span className="badge badge-3xs badge-warning">Vacunas pendientes</span>
                    )}
                    {m.esPeligroso && (
                      <span className="badge badge-3xs badge-error">Manejo Especial</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-2xs text-base-content/60 italic">
            No hay mascotas registradas.
          </p>
        )}
      </div>

      {/* Vehículos & Parqueaderos Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Vehículos */}
        <div className="arch-panel p-4 sm:p-5 shadow-xs">
          <h2 className="text-sm font-bold text-base-content flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-accent"></span>
            Vehículos ({unidad.vehiculos?.length || 0})
          </h2>

          {unidad.vehiculos && unidad.vehiculos.length > 0 ? (
            <div className="space-y-2">
              {unidad.vehiculos.map((v, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg border arch-border bg-base-200/30 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">
                      {v.tipo === 'moto' ? '🏍️' : v.tipo === 'bicicleta' ? '🚲' : '🚗'}
                    </span>
                    <div>
                      <p className="font-mono font-bold text-base-content uppercase">
                        {v.placa}
                      </p>
                      <p className="text-3xs text-base-content/60 capitalize">
                        {v.marca || ''} {v.color ? `· ${v.color}` : ''}
                      </p>
                    </div>
                  </div>
                  {v.numeroParqueadero && (
                    <span className="badge badge-neutral badge-3xs font-mono font-semibold">
                      Parq: {v.numeroParqueadero}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-2xs text-base-content/60 italic">
              No hay vehículos registrados.
            </p>
          )}
        </div>

        {/* Parqueaderos y Bodegas asignadas */}
        <div className="arch-panel p-4 sm:p-5 shadow-xs">
          <h2 className="text-sm font-bold text-base-content flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-info"></span>
            Zonas Privadas Asignadas
          </h2>

          <div className="space-y-2.5 text-xs">
            <div>
              <p className="text-3xs font-bold text-base-content/60 uppercase tracking-wider mb-1">
                Parqueaderos
              </p>
              {unidad.parqueaderosAsignados && unidad.parqueaderosAsignados.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {unidad.parqueaderosAsignados.map((p, idx) => (
                    <span key={idx} className="badge badge-info badge-outline font-bold text-2xs">
                      #{p.numero} ({p.tipo})
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-2xs text-base-content/60 italic">Sin parqueadero fijo</p>
              )}
            </div>

            <div className="pt-2 border-t arch-border">
              <p className="text-3xs font-bold text-base-content/60 uppercase tracking-wider mb-1">
                Bodegas / Depósitos
              </p>
              {unidad.bodegasAsignadas && unidad.bodegasAsignadas.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {unidad.bodegasAsignadas.map((b, idx) => (
                    <span key={idx} className="badge badge-neutral badge-outline font-bold text-2xs">
                      #{b.numero} {b.ubicacion ? `(${b.ubicacion})` : ''}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-2xs text-base-content/60 italic">Sin depósito asignado</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal / Drawer for Update Request */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-base-100 rounded-3xl border border-base-300 shadow-2xl w-full max-w-3xl my-8 overflow-hidden">
            <div className="p-6 border-b border-base-200 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-base-content">
                  Solicitar Actualización de Datos
                </h3>
                <p className="text-xs text-base-content/70 mt-0.5">
                  Los cambios serán revisados y autorizados por la administración antes de entrar en vigencia.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="btn btn-ghost btn-circle btn-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGuardarSolicitud} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* Tipo de Ocupación */}
              <div className="form-control">
                <label className="label pb-1.5 font-bold text-xs uppercase tracking-wider text-base-content/80">
                  Estado de Ocupación del Inmueble
                </label>
                <select
                  value={editOcupacion}
                  onChange={(e) => setEditOcupacion(e.target.value)}
                  className="select select-bordered rounded-xl w-full font-medium min-h-[48px]"
                >
                  <option value="habitada">Habitada (Por propietarios o arrendatarios)</option>
                  <option value="desocupada">Desocupada</option>
                </select>
              </div>

              {/* Habitantes Form */}
              <div className="border border-base-200 rounded-2xl p-4 bg-base-200/20 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-base-content">Habitantes / Convivientes</h4>
                  <button
                    type="button"
                    onClick={agregarPersona}
                    className="btn btn-xs btn-primary rounded-lg"
                  >
                    + Agregar Habitante
                  </button>
                </div>

                <div className="space-y-3">
                  {editPersonas.map((p, idx) => (
                    <div key={idx} className="p-3 bg-base-100 rounded-xl border border-base-300 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-base-content/70">
                          Habitante #{idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => eliminarPersona(idx)}
                          className="btn btn-ghost btn-xs text-error"
                        >
                          Eliminar
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="font-semibold block mb-1">Nombre Completo *</label>
                          <input
                            type="text"
                            required
                            value={p.nombreCompleto}
                            onChange={(e) => actualizarPersona(idx, 'nombreCompleto', e.target.value)}
                            placeholder="Nombre y Apellidos"
                            className="input input-sm input-bordered rounded-lg w-full"
                          />
                        </div>
                        <div>
                          <label className="font-semibold block mb-1">Condición / Vínculo</label>
                          <select
                            value={p.condicion}
                            onChange={(e) => actualizarPersona(idx, 'condicion', e.target.value)}
                            className="select select-sm select-bordered rounded-lg w-full"
                          >
                            <option value="propietario">Propietario</option>
                            <option value="arrendatario">Arrendatario</option>
                            <option value="habitante">Habitante</option>
                            <option value="conviviente">Conviviente</option>
                          </select>
                        </div>
                        <div>
                          <label className="font-semibold block mb-1">Cédula / Documento</label>
                          <input
                            type="text"
                            value={p.documento || ''}
                            onChange={(e) => actualizarPersona(idx, 'documento', e.target.value)}
                            placeholder="Número de documento"
                            className="input input-sm input-bordered rounded-lg w-full"
                          />
                        </div>
                        <div>
                          <label className="font-semibold block mb-1">Teléfono</label>
                          <input
                            type="tel"
                            value={p.telefono || ''}
                            onChange={(e) => actualizarPersona(idx, 'telefono', e.target.value)}
                            placeholder="Ej. 3001234567"
                            className="input input-sm input-bordered rounded-lg w-full"
                          />
                        </div>
                        <div>
                          <label className="font-semibold block mb-1">Correo Electrónico</label>
                          <input
                            type="email"
                            value={p.email || ''}
                            onChange={(e) => actualizarPersona(idx, 'email', e.target.value)}
                            placeholder="ejemplo@correo.com"
                            className="input input-sm input-bordered rounded-lg w-full"
                          />
                        </div>
                        <div>
                          <label className="font-semibold block mb-1">Fecha de Nacimiento</label>
                          <input
                            type="date"
                            value={p.fechaNacimiento ? p.fechaNacimiento.split('T')[0] : ''}
                            onChange={(e) => actualizarPersona(idx, 'fechaNacimiento', e.target.value)}
                            className="input input-sm input-bordered rounded-lg w-full"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mascotas Form */}
              <div className="border border-base-200 rounded-2xl p-4 bg-base-200/20 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-base-content">Mascotas</h4>
                  <button
                    type="button"
                    onClick={agregarMascota}
                    className="btn btn-xs btn-secondary rounded-lg"
                  >
                    + Agregar Mascota
                  </button>
                </div>

                <div className="space-y-3">
                  {editMascotas.map((m, idx) => (
                    <div key={idx} className="p-3 bg-base-100 rounded-xl border border-base-300 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-base-content/70">Mascota #{idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => eliminarMascota(idx)}
                          className="btn btn-ghost btn-xs text-error"
                        >
                          Eliminar
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                        <div>
                          <label className="font-semibold block mb-1">Tipo</label>
                          <select
                            value={m.tipo}
                            onChange={(e) => actualizarMascota(idx, 'tipo', e.target.value)}
                            className="select select-sm select-bordered rounded-lg w-full"
                          >
                            <option value="perro">Perro</option>
                            <option value="gato">Gato</option>
                            <option value="otro">Otro</option>
                          </select>
                        </div>
                        <div>
                          <label className="font-semibold block mb-1">Nombre *</label>
                          <input
                            type="text"
                            required
                            value={m.nombre}
                            onChange={(e) => actualizarMascota(idx, 'nombre', e.target.value)}
                            placeholder="Nombre de la mascota"
                            className="input input-sm input-bordered rounded-lg w-full"
                          />
                        </div>
                        <div>
                          <label className="font-semibold block mb-1">Raza</label>
                          <input
                            type="text"
                            value={m.raza}
                            onChange={(e) => actualizarMascota(idx, 'raza', e.target.value)}
                            placeholder="Raza"
                            className="input input-sm input-bordered rounded-lg w-full"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  {editMascotas.length === 0 && (
                    <p className="text-xs text-base-content/50 italic">Sin mascotas registradas.</p>
                  )}
                </div>
              </div>

              {/* Vehículos Form */}
              <div className="border border-base-200 rounded-2xl p-4 bg-base-200/20 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-base-content">Vehículos</h4>
                  <button
                    type="button"
                    onClick={agregarVehiculo}
                    className="btn btn-xs btn-accent rounded-lg"
                  >
                    + Agregar Vehículo
                  </button>
                </div>

                <div className="space-y-3">
                  {editVehiculos.map((v, idx) => (
                    <div key={idx} className="p-3 bg-base-100 rounded-xl border border-base-300 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-base-content/70">Vehículo #{idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => eliminarVehiculo(idx)}
                          className="btn btn-ghost btn-xs text-error"
                        >
                          Eliminar
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                        <div>
                          <label className="font-semibold block mb-1">Tipo</label>
                          <select
                            value={v.tipo}
                            onChange={(e) => actualizarVehiculo(idx, 'tipo', e.target.value)}
                            className="select select-sm select-bordered rounded-lg w-full"
                          >
                            <option value="carro">Carro</option>
                            <option value="moto">Moto</option>
                            <option value="bicicleta">Bicicleta</option>
                            <option value="otro">Otro</option>
                          </select>
                        </div>
                        <div>
                          <label className="font-semibold block mb-1">Placa *</label>
                          <input
                            type="text"
                            required
                            value={v.placa}
                            onChange={(e) => actualizarVehiculo(idx, 'placa', e.target.value.toUpperCase())}
                            placeholder="Ej. ABC123"
                            className="input input-sm input-bordered rounded-lg w-full uppercase"
                          />
                        </div>
                        <div>
                          <label className="font-semibold block mb-1">Marca</label>
                          <input
                            type="text"
                            value={v.marca || ''}
                            onChange={(e) => actualizarVehiculo(idx, 'marca', e.target.value)}
                            placeholder="Marca"
                            className="input input-sm input-bordered rounded-lg w-full"
                          />
                        </div>
                        <div>
                          <label className="font-semibold block mb-1">Color</label>
                          <input
                            type="text"
                            value={v.color || ''}
                            onChange={(e) => actualizarVehiculo(idx, 'color', e.target.value)}
                            placeholder="Color"
                            className="input input-sm input-bordered rounded-lg w-full"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  {editVehiculos.length === 0 && (
                    <p className="text-xs text-base-content/50 italic">Sin vehículos registrados.</p>
                  )}
                </div>
              </div>

              {/* Motivo o notas para administración */}
              <div className="form-control">
                <label className="label pb-1.5 font-bold text-xs uppercase tracking-wider text-base-content/80">
                  Motivo de la actualización / Notas para la administración
                </label>
                <textarea
                  value={motivoCambio}
                  onChange={(e) => setMotivoCambio(e.target.value)}
                  placeholder="Ej. Nuevo arrendatario ingresó a la vivienda, o actualización de placa vehicular."
                  className="textarea textarea-bordered rounded-xl w-full text-sm min-h-[80px]"
                ></textarea>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-base-200">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn btn-ghost rounded-xl min-h-[44px]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingRequest}
                  className="btn btn-primary rounded-xl min-h-[48px] px-6 font-bold shadow-md"
                >
                  {savingRequest ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      <span>Enviando propuesta...</span>
                    </>
                  ) : (
                    <span>Enviar a Revisión de Administración</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
