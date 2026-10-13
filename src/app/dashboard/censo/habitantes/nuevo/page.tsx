'use client';

import { useEffect, useState, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import {
  CensoUnidad,
  calcularEdad,
  categorizarEdad,
  validarFechaNacimiento,
  validarTelefono,
} from '@/lib/censo-helpers';

function NuevoHabitanteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedUnidadId = searchParams.get('unidadId') || '';

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Catálogo de unidades disponibles
  const [unidades, setUnidades] = useState<CensoUnidad[]>([]);
  const [selectedUnidadId, setSelectedUnidadId] = useState<string>(preselectedUnidadId);
  const [filtroBusquedaUnidad, setFiltroBusquedaUnidad] = useState('');

  // Datos del habitante
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [documento, setDocumento] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [condicion, setCondicion] = useState<'propietario' | 'arrendatario' | 'conviviente' | 'habitante' | 'visitante'>('conviviente');
  const [esContactoPrincipal, setEsContactoPrincipal] = useState(false);
  const [discapacidad, setDiscapacidad] = useState(false);
  const [condicionEspecial, setCondicionEspecial] = useState('');

  // Cargar catálogo de unidades
  useEffect(() => {
    const cargar = async () => {
      try {
        setLoading(true);
        const data = await apiFetch('/censo');
        if (Array.isArray(data)) {
          setUnidades(data);
          if (preselectedUnidadId && data.some((u: CensoUnidad) => u._id === preselectedUnidadId)) {
            setSelectedUnidadId(preselectedUnidadId);
          }
        }
      } catch (e) {
        console.error('Error cargando unidades:', e);
        setErrorMsg('No se pudo cargar la lista de inmuebles del edificio.');
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, [preselectedUnidadId]);

  // Unidad actualmente seleccionada
  const unidadSeleccionada = useMemo(() => {
    return unidades.find((u) => u._id === selectedUnidadId);
  }, [unidades, selectedUnidadId]);

  // Lista de unidades filtradas para el buscador
  const unidadesFiltradas = useMemo(() => {
    if (!filtroBusquedaUnidad.trim()) return unidades;
    const term = filtroBusquedaUnidad.toLowerCase().trim();
    return unidades.filter(
      (u) =>
        u.identificador.toLowerCase().includes(term) ||
        u.torre?.toLowerCase().includes(term) ||
        u.numeroApto?.toLowerCase().includes(term),
    );
  }, [unidades, filtroBusquedaUnidad]);

  // Contacto principal actual de la unidad seleccionada
  const contactoPrincipalActual = useMemo(() => {
    if (!unidadSeleccionada?.personas) return null;
    return unidadSeleccionada.personas.find((p) => p.esContactoPrincipal);
  }, [unidadSeleccionada]);

  // Cálculo de edad y grupo etario
  const edad = useMemo(() => {
    return fechaNacimiento ? calcularEdad(fechaNacimiento) : null;
  }, [fechaNacimiento]);

  const catEdad = useMemo(() => {
    return edad !== null ? categorizarEdad(edad) : null;
  }, [edad]);

  const esMenor = edad !== null && edad < 18;

  // Actualizar reglas de contacto principal y condición al cambiar edad o unidad
  useEffect(() => {
    if (esMenor) {
      if (condicion === 'propietario') setCondicion('conviviente');
      setEsContactoPrincipal(false);
      return;
    }

    if (unidadSeleccionada) {
      const tienePersonas = (unidadSeleccionada.personas || []).length > 0;
      // Si la unidad no tiene habitantes previos y es adulto, sugerir como principal por defecto
      if (!tienePersonas) {
        setEsContactoPrincipal(true);
      }
    }
  }, [unidadSeleccionada, esMenor, condicion]);

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedUnidadId) {
      setErrorMsg('Debes seleccionar obligatoriamente el inmueble al que pertenece el habitante.');
      return;
    }

    if (!nombreCompleto.trim()) {
      setErrorMsg('El nombre completo es obligatorio.');
      return;
    }

    if (!fechaNacimiento) {
      setErrorMsg('La fecha de nacimiento es obligatoria.');
      return;
    }

    const valFecha = validarFechaNacimiento(fechaNacimiento);
    if (!valFecha.valido) {
      setErrorMsg(valFecha.mensaje || 'Fecha de nacimiento inválida.');
      return;
    }

    if (esMenor && condicion === 'propietario') {
      setErrorMsg('Un menor de edad no puede ser registrado como propietario.');
      return;
    }

    if (esMenor && esContactoPrincipal) {
      setErrorMsg('Un menor de edad no puede ser el contacto principal.');
      return;
    }

    if (telefono.trim()) {
      const valTel = validarTelefono(telefono);
      if (!valTel.valido) {
        setErrorMsg(valTel.mensaje || 'Teléfono inválido.');
        return;
      }
    }

    try {
      setSubmitting(true);
      await apiFetch(`/censo/${selectedUnidadId}/habitante`, {
        method: 'POST',
        body: JSON.stringify({
          nombreCompleto: nombreCompleto.trim(),
          documento: documento.trim() || undefined,
          fechaNacimiento,
          telefono: telefono.trim() || undefined,
          email: email.trim().toLowerCase() || undefined,
          condicion,
          esContactoPrincipal,
          discapacidad,
          condicionEspecial: discapacidad ? condicionEspecial.trim() : undefined,
        }),
      });

      // Redirigir al detalle del inmueble actualizado
      router.push(`/dashboard/censo/${selectedUnidadId}`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al registrar el habitante.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <span className="loading loading-spinner loading-lg text-primary" />
        <p className="text-sm text-base-content/60">Cargando catálogo de inmuebles...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Encabezado */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/censo"
          className="btn btn-circle btn-ghost btn-sm"
          title="Volver al Censo"
        >
          <span className="icon-[tabler--arrow-left] text-lg" />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-base-content flex items-center gap-2">
            <span className="icon-[tabler--user-plus] text-primary" />
            <span>Registrar Nuevo Habitante</span>
          </h1>
          <p className="text-xs sm:text-sm text-base-content/70">
            Ingresa los datos personales del residente y asígnalo obligatoriamente a una unidad habitacional existente.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="alert alert-error shadow-xs">
          <span className="icon-[tabler--alert-circle] text-xl shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={guardar} className="space-y-6">
        {/* 1. SELECCIÓN OBLIGATORIA DEL INMUEBLE */}
        <div className="card card-border bg-base-100 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b pb-2 border-base-content/10">
            <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
              <span className="icon-[tabler--home-check] text-primary" />
              <span>1. Asignación de Inmueble (Obligatorio)</span>
            </h2>
            <span className="badge badge-xs badge-primary font-semibold">Paso Requerido</span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="label label-text text-xs font-semibold">
                Selecciona la Unidad Habitacional / Apartamento *
              </label>

              {/* Input de filtro si hay muchas unidades */}
              {unidades.length > 8 && (
                <div className="mb-2">
                  <input
                    type="text"
                    value={filtroBusquedaUnidad}
                    onChange={(e) => setFiltroBusquedaUnidad(e.target.value)}
                    placeholder="Filtrar por torre o número de apartamento..."
                    className="input input-xs w-full mb-1 text-xs"
                  />
                </div>
              )}

              <select
                required
                value={selectedUnidadId}
                onChange={(e) => setSelectedUnidadId(e.target.value)}
                className="select select-sm w-full font-medium"
              >
                <option value="">-- Selecciona el inmueble donde habitará --</option>
                {unidadesFiltradas.map((u) => {
                  const cantHabitantes = (u.personas || []).length;
                  const estadoOcupacion = u.tipoOcupacion === 'desocupada' ? 'Desocupado' : `${cantHabitantes} habitante${cantHabitantes === 1 ? '' : 's'}`;
                  return (
                    <option key={u._id} value={u._id}>
                      {u.identificador} ({estadoOcupacion})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Resumen del Inmueble Seleccionado */}
            {unidadSeleccionada && (
              <div className="p-3.5 rounded-lg bg-base-200/60 border border-base-content/10 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-base-content font-mono">
                      {unidadSeleccionada.identificador}
                    </span>
                    <span
                      className={`badge badge-2xs font-semibold ${
                        unidadSeleccionada.tipoOcupacion === 'desocupada'
                          ? 'badge-warning'
                          : 'badge-success'
                      }`}
                    >
                      {unidadSeleccionada.tipoOcupacion === 'desocupada' ? 'Desocupado' : 'Habitado'}
                    </span>
                  </div>

                  <div className="text-2xs text-base-content/70">
                    Habitantes actuales: <strong>{(unidadSeleccionada.personas || []).length}</strong>
                  </div>
                </div>

                {contactoPrincipalActual ? (
                  <p className="text-2xs text-base-content/70">
                    Contacto Principal actual: <strong>{contactoPrincipalActual.nombreCompleto}</strong>{' '}
                    {contactoPrincipalActual.telefono && `(${contactoPrincipalActual.telefono})`}
                  </p>
                ) : (
                  <p className="text-2xs text-warning/90 font-medium">
                    ⚠️ Este inmueble no cuenta con ningún Contacto Principal asignado actualmente.
                  </p>
                )}

                {unidadSeleccionada.tipoOcupacion === 'desocupada' && (
                  <div className="text-3xs text-info flex items-center gap-1.5 pt-1">
                    <span className="icon-[tabler--info-circle] text-xs shrink-0" />
                    <span>
                      Al guardar este habitante, la unidad pasará automáticamente a estado <strong>Habitada</strong>.
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 2. DATOS DEL HABITANTE */}
        <div className="card card-border bg-base-100 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b pb-2 border-base-content/10">
            <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
              <span className="icon-[tabler--user] text-primary" />
              <span>2. Datos Personales del Habitante</span>
            </h2>
            {catEdad && (
              <span className={`badge badge-xs ${catEdad.badgeClass}`}>
                <span className={`${catEdad.icon} mr-1`} />
                {edad} años ({catEdad.label})
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="label label-text text-xs font-semibold">Nombre Completo *</label>
              <input
                type="text"
                required
                value={nombreCompleto}
                onChange={(e) => setNombreCompleto(e.target.value)}
                placeholder="Ej. Juan Carlos Rodríguez Pérez"
                className="input input-sm w-full"
              />
            </div>

            <div>
              <label className="label label-text text-xs font-semibold">Documento de Identidad</label>
              <input
                type="text"
                value={documento}
                onChange={(e) => setDocumento(e.target.value)}
                placeholder="C.C. / T.I. / C.E."
                className="input input-sm w-full"
              />
            </div>

            <div>
              <label className="label label-text text-xs font-semibold">Fecha de Nacimiento *</label>
              <input
                type="date"
                required
                value={fechaNacimiento}
                onChange={(e) => setFechaNacimiento(e.target.value)}
                className="input input-sm w-full font-mono"
              />
            </div>

            <div>
              <label className="label label-text text-xs font-semibold">Teléfono Celular</label>
              <input
                type="tel"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="3101234567"
                className="input input-sm w-full"
              />
            </div>

            <div>
              <label className="label label-text text-xs font-semibold">Correo Electrónico</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ejemplo@correo.com"
                className="input input-sm w-full"
              />
            </div>

            <div>
              <label className="label label-text text-xs font-semibold">Condición Residencial *</label>
              <select
                value={condicion}
                onChange={(e) => setCondicion(e.target.value as any)}
                className="select select-sm w-full"
              >
                <option value="propietario" disabled={esMenor}>
                  Propietario {esMenor ? '(No apto para menores)' : ''}
                </option>
                <option value="arrendatario">Arrendatario</option>
                <option value="habitante">Habitante</option>
                <option value="conviviente">Conviviente</option>
                <option value="visitante">Visitante frecuente</option>
              </select>
            </div>
          </div>

          {/* Opciones avanzadas */}
          <div className="pt-2 border-t border-base-content/10 space-y-3">
            {/* Contacto Principal */}
            <div className="p-3 rounded-lg bg-base-200/40 border border-base-content/10">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={esMenor}
                  checked={esContactoPrincipal}
                  onChange={(e) => setEsContactoPrincipal(e.target.checked)}
                  className="checkbox checkbox-sm checkbox-primary mt-0.5"
                />
                <div className="text-xs">
                  <span className="font-bold text-base-content block">
                    Designar como Contacto Principal de la vivienda
                  </span>
                  <span className="text-base-content/65 text-2xs block">
                    {contactoPrincipalActual
                      ? `Atención: La unidad ya tiene asignado a "${contactoPrincipalActual.nombreCompleto}" como contacto principal. Al marcar esta opción, la titularidad pasará automáticamente a este nuevo habitante.`
                      : 'El contacto principal recibe las notificaciones oficiales, citaciones a asamblea y comunicaciones de administración.'}
                  </span>
                </div>
              </label>
            </div>

            {/* Discapacidad o Atención Especial */}
            <div className="p-3 rounded-lg bg-base-200/40 border border-base-content/10 space-y-2">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={discapacidad}
                  onChange={(e) => setDiscapacidad(e.target.checked)}
                  className="checkbox checkbox-sm checkbox-secondary"
                />
                <span className="text-xs font-bold text-base-content">
                  Presenta condición de discapacidad o requiere atención preferencial
                </span>
              </label>

              {discapacidad && (
                <div className="pt-1">
                  <label className="label label-text text-2xs font-semibold">
                    Especificación / Detalle de la condición especial:
                  </label>
                  <input
                    type="text"
                    value={condicionEspecial}
                    onChange={(e) => setCondicionEspecial(e.target.value)}
                    placeholder="Ej. Movilidad reducida - Bastón / Silla de ruedas, Discapacidad auditiva..."
                    className="input input-xs w-full text-xs"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Acciones de envío */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
          <Link
            href="/dashboard/censo"
            className="btn btn-sm btn-ghost w-full sm:w-auto order-2 sm:order-1"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={submitting || !selectedUnidadId}
            className="btn btn-sm btn-primary w-full sm:w-auto gap-2 order-1 sm:order-2"
          >
            {submitting ? (
              <>
                <span className="loading loading-spinner loading-xs" />
                <span>Guardando habitante...</span>
              </>
            ) : (
              <>
                <span className="icon-[tabler--check] text-base" />
                <span>Guardar y Asignar Habitante</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function NuevoHabitantePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <span className="loading loading-spinner loading-lg text-primary" />
        </div>
      }
    >
      <NuevoHabitanteForm />
    </Suspense>
  );
}
