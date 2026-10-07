'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import {
  calcularEdad,
  categorizarEdad,
  FECHA_MAX_NACIMIENTO,
  FECHA_MIN_NACIMIENTO,
  validarFechaNacimiento,
  validarTelefono,
  validarPlaca,
} from '@/lib/censo-helpers';

interface PersonaForm {
  nombreCompleto: string;
  telefono: string;
  email: string;
  documento: string;
  fechaNacimiento: string;
  condicion: 'propietario' | 'arrendatario' | 'conviviente';
  esContactoPrincipal: boolean;
}

interface MascotaForm {
  tipo: 'perro' | 'gato' | 'otro';
  nombre: string;
  raza: string;
  esPeligroso: boolean;
  vacunasAlDia: boolean;
  observaciones: string;
}

interface VehiculoForm {
  tipo: 'carro' | 'moto' | 'bicicleta' | 'otro';
  placa: string;
  marca: string;
  modelo: string;
  color: string;
  parqueaEnEdificio: boolean;
  numeroParqueadero: string;
}

interface CatalogoUnidadItem {
  _id: string;
  identificador: string;
  torre?: string;
  numeroApto?: string;
  piso?: number;
  metrosCuadrados?: number;
  parqueaderosAsignados?: Array<{ numero: string; tipo: string; esCubierto: boolean }>;
  bodegasAsignadas?: Array<{ numero: string; ubicacion?: string; metrosCuadrados?: number }>;
}

export default function PublicCensoPage() {
  const { buildingId } = useParams<{ buildingId: string }>();

  const [edificioNombre, setEdificioNombre] = useState('Edificio');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [enviadoExitoso, setEnviadoExitoso] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Catálogo precargado de unidades del edificio
  const [catalogo, setCatalogo] = useState<CatalogoUnidadItem[]>([]);
  const [selectedTorreFiltro, setSelectedTorreFiltro] = useState<string>('');
  const [selectedUnidadId, setSelectedUnidadId] = useState<string>('');
  const [modoManual, setModoManual] = useState(false);

  // 1. Unidad seleccionada / manual
  const [identificador, setIdentificador] = useState('');
  const [torre, setTorre] = useState('');
  const [numeroApto, setNumeroApto] = useState('');

  // 2. Personas
  const [personas, setPersonas] = useState<PersonaForm[]>([
    {
      nombreCompleto: '',
      telefono: '',
      email: '',
      documento: '',
      fechaNacimiento: '',
      condicion: 'propietario',
      esContactoPrincipal: true,
    },
  ]);

  // 3. Mascotas
  const [tieneMascotas, setTieneMascotas] = useState(false);
  const [mascotas, setMascotas] = useState<MascotaForm[]>([]);

  // 4. Vehículos
  const [tieneVehiculos, setTieneVehiculos] = useState(false);
  const [vehiculos, setVehiculos] = useState<VehiculoForm[]>([]);

  useEffect(() => {
    if (!buildingId) return;
    Promise.all([
      apiFetch(`/edificio/${buildingId}`).catch(() => ({})),
      apiFetch(`/censo/public/${buildingId}/unidades`).catch(() => []),
    ])
      .then(([edificioData, catalogoData]) => {
        if (edificioData?.nombre) setEdificioNombre(edificioData.nombre);
        if (Array.isArray(catalogoData)) {
          setCatalogo(catalogoData);
        }
      })
      .catch((e) => console.error('Error cargando datos del censo:', e))
      .finally(() => setLoading(false));
  }, [buildingId]);

  // Torres disponibles extraídas del catálogo
  const torresDisponibles = useMemo(() => {
    const set = new Set<string>();
    catalogo.forEach((u) => {
      if (u.torre?.trim()) set.add(u.torre.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [catalogo]);

  const tieneTorres = torresDisponibles.length > 0;

  // Apartamentos filtrados por la torre seleccionada (o todos si el edificio no tiene torres)
  const aptosDisponibles = useMemo(() => {
    if (!tieneTorres) {
      return catalogo;
    }
    if (!selectedTorreFiltro) {
      return [];
    }
    return catalogo
      .filter((u) => u.torre?.trim().toLowerCase() === selectedTorreFiltro.trim().toLowerCase())
      .sort((a, b) => (a.numeroApto || a.identificador).localeCompare(b.numeroApto || b.identificador, undefined, { numeric: true }));
  }, [catalogo, tieneTorres, selectedTorreFiltro]);

  const handleSelectTorre = (nuevaTorre: string) => {
    setSelectedTorreFiltro(nuevaTorre);
    setSelectedUnidadId('');
    setNumeroApto('');
    setIdentificador('');
    setTorre(nuevaTorre);
  };

  const handleSelectUnidad = (id: string) => {
    setSelectedUnidadId(id);
    if (!id) {
      setNumeroApto('');
      setIdentificador('');
      if (!selectedTorreFiltro) setTorre('');
      return;
    }
    const u = catalogo.find((item) => item._id === id);
    if (u) {
      setTorre(u.torre || '');
      setNumeroApto(u.numeroApto || '');
      setIdentificador(u.identificador);
    }
  };

  // Manejadores Personas
  const agregarPersona = () => {
    // Si ya hay un contacto principal, la nueva persona no lo será por defecto
    const yaTieneContactoPrincipal = personas.some((p) => p.esContactoPrincipal);
    setPersonas([
      ...personas,
      {
        nombreCompleto: '',
        telefono: '',
        email: '',
        documento: '',
        fechaNacimiento: '',
        condicion: 'conviviente',
        esContactoPrincipal: !yaTieneContactoPrincipal,
      },
    ]);
  };

  const eliminarPersona = (index: number) => {
    if (personas.length === 1) return;
    const eliminadaEraPrincipal = personas[index]?.esContactoPrincipal;
    const restantes = personas.filter((_, i) => i !== index);

    // Si eliminó el contacto principal, asignar al primer adulto disponible
    if (eliminadaEraPrincipal && restantes.length > 0) {
      const idxAdulto = restantes.findIndex((p) => {
        if (!p.fechaNacimiento) return true;
        return calcularEdad(p.fechaNacimiento) >= 18;
      });
      if (idxAdulto !== -1) {
        restantes[idxAdulto].esContactoPrincipal = true;
      } else {
        restantes[0].esContactoPrincipal = true;
      }
    }
    setPersonas(restantes);
  };

  const actualizarPersona = (index: number, campo: keyof PersonaForm, valor: string | boolean) => {
    setPersonas((prev) =>
      prev.map((p, i) => {
        if (i !== index) {
          // Comportamiento Radio: Si esta persona se marca como contacto principal, desmarcar a las demás
          if (campo === 'esContactoPrincipal' && valor === true) {
            return { ...p, esContactoPrincipal: false };
          }
          return p;
        }

        const actualizado = { ...p, [campo]: valor };

        // Al cambiar fecha de nacimiento, validar mayoría de edad
        if (campo === 'fechaNacimiento' && typeof valor === 'string') {
          if (valor) {
            const edad = calcularEdad(valor);
            if (edad < 18) {
              // Menor de edad: no puede ser propietario ni contacto principal
              if (actualizado.condicion === 'propietario') {
                actualizado.condicion = 'conviviente';
              }
              actualizado.esContactoPrincipal = false;
            }
          }
        }

        // Si se intenta marcar como contacto principal siendo menor de edad, impedirlo
        if (campo === 'esContactoPrincipal' && valor === true) {
          if (actualizado.fechaNacimiento) {
            const edad = calcularEdad(actualizado.fechaNacimiento);
            if (edad < 18) {
              actualizado.esContactoPrincipal = false;
            }
          }
        }

        // Si se intenta marcar como propietario siendo menor de edad, cambiar a conviviente
        if (campo === 'condicion' && valor === 'propietario') {
          if (actualizado.fechaNacimiento) {
            const edad = calcularEdad(actualizado.fechaNacimiento);
            if (edad < 18) {
              actualizado.condicion = 'conviviente';
            }
          }
        }

        return actualizado;
      }),
    );
  };

  // Manejadores Mascotas
  const toggleMascotas = (activo: boolean) => {
    setTieneMascotas(activo);
    if (activo && mascotas.length === 0) {
      setMascotas([
        {
          tipo: 'perro',
          nombre: '',
          raza: '',
          esPeligroso: false,
          vacunasAlDia: true,
          observaciones: '',
        },
      ]);
    }
  };

  const agregarMascota = () => {
    setMascotas([
      ...mascotas,
      {
        tipo: 'perro',
        nombre: '',
        raza: '',
        esPeligroso: false,
        vacunasAlDia: true,
        observaciones: '',
      },
    ]);
  };

  const eliminarMascota = (index: number) => {
    setMascotas(mascotas.filter((_, i) => i !== index));
  };

  const actualizarMascota = (index: number, campo: keyof MascotaForm, valor: string | boolean) => {
    const copia = [...mascotas];
    copia[index] = { ...copia[index], [campo]: valor };
    setMascotas(copia);
  };

  // Manejadores Vehículos
  const toggleVehiculos = (activo: boolean) => {
    setTieneVehiculos(activo);
    if (activo && vehiculos.length === 0) {
      setVehiculos([
        {
          tipo: 'carro',
          placa: '',
          marca: '',
          modelo: '',
          color: '',
          parqueaEnEdificio: false,
          numeroParqueadero: '',
        },
      ]);
    }
  };

  const agregarVehiculo = () => {
    setVehiculos([
      ...vehiculos,
      {
        tipo: 'carro',
        placa: '',
        marca: '',
        modelo: '',
        color: '',
        parqueaEnEdificio: false,
        numeroParqueadero: '',
      },
    ]);
  };

  const eliminarVehiculo = (index: number) => {
    setVehiculos(vehiculos.filter((_, i) => i !== index));
  };

  const actualizarVehiculo = (index: number, campo: keyof VehiculoForm, valor: string | boolean) => {
    const copia = [...vehiculos];
    copia[index] = { ...copia[index], [campo]: valor };
    setVehiculos(copia);
  };

  const enviarCenso = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const identCalculado = identificador.trim() || [torre.trim(), numeroApto.trim()].filter(Boolean).join(' - ');
    if (!identCalculado) {
      setErrorMsg('Por favor selecciona o indica tu número de apartamento o casa.');
      return;
    }

    const personasValidas = personas.filter((p) => p.nombreCompleto.trim() && p.fechaNacimiento);
    if (personasValidas.length === 0) {
      setErrorMsg('Debes registrar al menos un habitante con su nombre y fecha de nacimiento.');
      return;
    }

    // Validaciones estrictas de personas
    let contactosPrincipales = 0;
    for (let i = 0; i < personasValidas.length; i++) {
      const p = personasValidas[i];
      const validacionFecha = validarFechaNacimiento(p.fechaNacimiento);
      if (!validacionFecha.valido) {
        setErrorMsg(`Persona ${i + 1} (${p.nombreCompleto}): ${validacionFecha.mensaje}`);
        return;
      }

      const edad = calcularEdad(p.fechaNacimiento);
      if (edad < 18) {
        if (p.condicion === 'propietario') {
          setErrorMsg(`Persona ${i + 1} (${p.nombreCompleto}): Un menor de edad (${edad} años) no puede registrarse como propietario.`);
          return;
        }
        if (p.esContactoPrincipal) {
          setErrorMsg(`Persona ${i + 1} (${p.nombreCompleto}): Un menor de edad (${edad} años) no puede ser el contacto principal.`);
          return;
        }
      }

      if (p.esContactoPrincipal) {
        contactosPrincipales++;
      }

      if (p.telefono && p.telefono.trim()) {
        const valTel = validarTelefono(p.telefono);
        if (!valTel.valido) {
          setErrorMsg(`Persona ${i + 1} (${p.nombreCompleto}): ${valTel.mensaje}`);
          return;
        }
      }
    }

    if (contactosPrincipales === 0) {
      setErrorMsg('Debes designar a un adulto como Contacto Principal de la vivienda.');
      return;
    }
    if (contactosPrincipales > 1) {
      setErrorMsg('Solo puede haber un único Contacto Principal por vivienda.');
      return;
    }

    // Validaciones estrictas de vehículos
    if (tieneVehiculos) {
      const vehsValidos = vehiculos.filter((v) => v.placa.trim());
      for (let j = 0; j < vehsValidos.length; j++) {
        const v = vehsValidos[j];
        const valPlaca = validarPlaca(v.placa);
        if (!valPlaca.valido) {
          setErrorMsg(`Vehículo ${j + 1}: ${valPlaca.mensaje}`);
          return;
        }
      }
    }

    try {
      setSubmitting(true);
      await apiFetch(`/censo/public/${buildingId}`, {
        method: 'POST',
        body: JSON.stringify({
          identificador: identCalculado,
          torre: torre.trim() || undefined,
          numeroApto: numeroApto.trim() || undefined,
          personas: personasValidas,
          mascotas: tieneMascotas ? mascotas.filter((m) => m.nombre.trim()) : [],
          vehiculos: tieneVehiculos ? vehiculos.filter((v) => v.placa.trim()) : [],
        }),
      });

      setEnviadoExitoso(true);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al enviar el formulario.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <span className="loading loading-spinner text-primary" />
      </div>
    );
  }

  if (enviadoExitoso) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-base-200">
        <div className="card bg-base-100 shadow-lg border border-base-200 p-6 max-w-md w-full text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-success">
            <span className="icon-[tabler--check] text-4xl" />
          </div>
          <h1 className="text-xl font-bold text-base-content">
            ¡Censo Enviado con Éxito!
          </h1>
          <p className="text-sm text-base-content/70">
            La información de tu apartamento ha sido enviada a la administración de <strong>{edificioNombre}</strong>. Los datos serán validados e incorporados al registro oficial de la copropiedad.
          </p>
          <div className="pt-2">
            <button
              onClick={() => {
                setEnviadoExitoso(false);
                setSelectedTorreFiltro('');
                setSelectedUnidadId('');
                setIdentificador('');
                setTorre('');
                setNumeroApto('');
                setPersonas([
                  {
                    nombreCompleto: '',
                    telefono: '',
                    email: '',
                    documento: '',
                    fechaNacimiento: '',
                    condicion: 'propietario',
                    esContactoPrincipal: true,
                  },
                ]);
              }}
              className="btn btn-outline btn-primary btn-sm w-full"
            >
              Registrar otra unidad
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200 py-6 px-4">
      <div className="max-w-xl mx-auto space-y-6">
        {/* Cabecera Móvil */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
            <span className="icon-[tabler--building-community] text-sm" />
            {edificioNombre}
          </div>
          <h1 className="text-2xl font-bold text-base-content">
            Censo Habitacional Digital
          </h1>
          <p className="text-xs text-base-content/60">
            Diligencia los datos de los habitantes de tu inmueble, mascotas y vehículos para el control y seguridad del conjunto.
          </p>
        </div>

        {errorMsg && (
          <div className="alert alert-error shadow-xs text-xs">
            <span className="icon-[tabler--alert-circle] text-lg" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={enviarCenso} className="space-y-4">
          {/* 1. Apartamento / Casa */}
          <div className="card bg-base-100 shadow-sm border border-base-200 p-4 space-y-3">
            <h2 className="text-sm font-bold flex items-center gap-2 text-base-content border-b pb-2 border-base-content/10">
              <span className="icon-[tabler--home] text-primary text-base" />
              1. Tu Apartamento o Casa
            </h2>

            {catalogo.length > 0 && !modoManual ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-2xs font-semibold text-base-content/80">
                    Selecciona tu vivienda de la lista oficial ({catalogo.length} unidades disponibles)
                  </span>
                  <button
                    type="button"
                    onClick={() => setModoManual(true)}
                    className="text-2xs text-primary hover:underline font-medium"
                  >
                    ¿No aparece en la lista? Escribir manual
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Selector 1: Torre */}
                  <div>
                    <label className="label label-text text-2xs font-semibold">
                      1. Torre / Bloque {tieneTorres ? '*' : '(No aplica)'}
                    </label>
                    <select
                      disabled={!tieneTorres}
                      value={tieneTorres ? selectedTorreFiltro : ''}
                      onChange={(e) => handleSelectTorre(e.target.value)}
                      className="select select-sm w-full"
                    >
                      {tieneTorres ? (
                        <>
                          <option value="">-- Selecciona la Torre ({torresDisponibles.length}) --</option>
                          {torresDisponibles.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </>
                      ) : (
                        <option value="">Edificio sin torres registradas</option>
                      )}
                    </select>
                    {!tieneTorres && (
                      <p className="text-3xs text-base-content/50 mt-1">
                        Este conjunto no maneja división por torres.
                      </p>
                    )}
                  </div>

                  {/* Selector 2: Apartamento / Inmueble */}
                  <div>
                    <label className="label label-text text-2xs font-semibold">
                      2. Apartamento / Casa *
                    </label>
                    <select
                      required
                      disabled={tieneTorres && !selectedTorreFiltro}
                      value={selectedUnidadId}
                      onChange={(e) => handleSelectUnidad(e.target.value)}
                      className="select select-sm w-full"
                    >
                      <option value="">
                        {tieneTorres && !selectedTorreFiltro
                          ? '← Primero selecciona una torre'
                          : `-- Selecciona tu apartamento (${aptosDisponibles.length}) --`}
                      </option>
                      {aptosDisponibles.map((u) => (
                        <option key={u._id} value={u._id}>
                          {u.numeroApto ? `Apto ${u.numeroApto}` : u.identificador} {u.metrosCuadrados ? `(${u.metrosCuadrados} m²)` : ''}
                        </option>
                      ))}
                    </select>
                    {tieneTorres && selectedTorreFiltro && (
                      <p className="text-3xs text-base-content/50 mt-1">
                        Mostrando apartamentos de {selectedTorreFiltro}
                      </p>
                    )}
                  </div>
                </div>

                {/* Resumen de espacios asignados a la unidad seleccionada */}
                {(() => {
                  const uSel = catalogo.find((u) => u._id === selectedUnidadId);
                  if (!uSel) return null;
                  return (
                    <div className="p-3 rounded-lg bg-base-200/50 border border-base-200 space-y-1.5 animate-in fade-in duration-200">
                      <div className="text-2xs font-bold text-base-content flex items-center gap-1.5">
                        <span className="icon-[tabler--info-circle] text-primary text-sm" />
                        Información oficial de tu unidad: <span className="text-primary">{uSel.identificador}</span>
                      </div>
                      <div className="flex flex-wrap gap-2 text-2xs">
                        {uSel.piso !== undefined && (
                          <span className="badge badge-2xs badge-soft">Piso {uSel.piso}</span>
                        )}
                        {uSel.metrosCuadrados && (
                          <span className="badge badge-2xs badge-soft">{uSel.metrosCuadrados} m²</span>
                        )}
                        {uSel.parqueaderosAsignados && uSel.parqueaderosAsignados.length > 0 ? (
                          <span className="badge badge-2xs badge-soft badge-success">
                            🚗 Parqueadero: {uSel.parqueaderosAsignados.map((p) => p.numero).join(', ')} ({uSel.parqueaderosAsignados[0].esCubierto ? 'Cubierto' : 'Descubierto'})
                          </span>
                        ) : (
                          <span className="badge badge-2xs badge-soft badge-ghost">Sin parqueadero privado</span>
                        )}
                        {uSel.bodegasAsignadas && uSel.bodegasAsignadas.length > 0 && (
                          <span className="badge badge-2xs badge-soft badge-info">
                            📦 Bodega: {uSel.bodegasAsignadas.map((b) => b.numero).join(', ')} {uSel.bodegasAsignadas[0].ubicacion ? `(${uSel.bodegasAsignadas[0].ubicacion})` : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="space-y-3">
                {catalogo.length > 0 && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setModoManual(false)}
                      className="text-2xs text-primary hover:underline font-medium"
                    >
                      ← Volver a la lista oficial de apartamentos
                    </button>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="label label-text text-2xs font-semibold">
                      Torre / Bloque {tieneTorres ? '' : '(Opcional)'}
                    </label>
                    <input
                      type="text"
                      value={torre}
                      onChange={(e) => setTorre(e.target.value)}
                      placeholder={tieneTorres ? 'Ej. Torre 2' : 'Opcional'}
                      disabled={!tieneTorres && catalogo.length > 0}
                      className="input input-sm w-full"
                    />
                  </div>
                  <div>
                    <label className="label label-text text-2xs font-semibold">Número de Apto o Casa *</label>
                    <input
                      type="text"
                      required
                      value={numeroApto}
                      onChange={(e) => setNumeroApto(e.target.value)}
                      placeholder="Ej. 402"
                      className="input input-sm w-full"
                    />
                  </div>
                </div>
                <div>
                  <label className="label label-text text-2xs font-semibold">Identificador Completo</label>
                  <input
                    type="text"
                    value={identificador || (torre && numeroApto ? `${torre} - Apto ${numeroApto}` : numeroApto ? `Apto ${numeroApto}` : '')}
                    onChange={(e) => setIdentificador(e.target.value)}
                    placeholder="Ej. Torre 2 - Apto 402 o Casa 15"
                    className="input input-sm w-full"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 2. Habitantes */}
          <div className="card bg-base-100 shadow-sm border border-base-200 p-4 space-y-3">
            <div className="flex items-center justify-between border-b pb-2 border-base-content/10">
              <h2 className="text-sm font-bold flex items-center gap-2 text-base-content">
                <span className="icon-[tabler--users] text-primary text-base" />
                2. Personas que Habitan ({personas.length})
              </h2>
              <button
                type="button"
                onClick={agregarPersona}
                className="btn btn-outline btn-primary btn-xs"
              >
                <span className="icon-[tabler--plus]" />
                Agregar
              </button>
            </div>

            <div className="space-y-3">
              {personas.map((p, idx) => {
                const edad = p.fechaNacimiento ? calcularEdad(p.fechaNacimiento) : null;
                const cat = edad !== null ? categorizarEdad(edad) : null;
                const esMenor = edad !== null && edad < 18;

                return (
                  <div key={idx} className="p-3 rounded-lg bg-base-200/40 border border-base-content/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-2xs font-bold text-base-content/70 flex items-center gap-1.5">
                        Persona #{idx + 1}
                        {p.esContactoPrincipal && (
                          <span className="badge badge-2xs badge-primary font-semibold">
                            Contacto Principal
                          </span>
                        )}
                      </span>
                      {personas.length > 1 && (
                        <button
                          type="button"
                          onClick={() => eliminarPersona(idx)}
                          className="btn btn-ghost btn-xs text-error p-0 h-auto min-h-0"
                          title="Eliminar habitante"
                        >
                          <span className="icon-[tabler--trash] text-sm" />
                        </button>
                      )}
                    </div>

                    <div>
                      <label className="label label-text text-2xs font-semibold">Nombre Completo *</label>
                      <input
                        type="text"
                        required
                        value={p.nombreCompleto}
                        onChange={(e) => actualizarPersona(idx, 'nombreCompleto', e.target.value)}
                        placeholder="Ej. María Gómez"
                        className="input input-xs w-full"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="label label-text text-2xs font-semibold">Fecha Nacimiento *</label>
                        <input
                          type="date"
                          required
                          min={FECHA_MIN_NACIMIENTO}
                          max={FECHA_MAX_NACIMIENTO}
                          value={p.fechaNacimiento}
                          onChange={(e) => actualizarPersona(idx, 'fechaNacimiento', e.target.value)}
                          className="input input-xs w-full"
                        />
                        {cat && (
                          <div className="mt-1 flex flex-col gap-0.5">
                            <span className={`badge badge-2xs ${cat.badgeClass}`}>
                              {edad} años ({cat.label})
                            </span>
                            {esMenor && (
                              <span className="text-3xs text-warning font-medium">
                                Menor de edad (no propietario ni contacto principal)
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="label label-text text-2xs font-semibold">Condición en la vivienda</label>
                        <select
                          value={p.condicion}
                          onChange={(e) => actualizarPersona(idx, 'condicion', e.target.value as any)}
                          className="select select-xs w-full"
                        >
                          <option value="propietario" disabled={esMenor}>
                            Propietario {esMenor ? '(No permitido para menores)' : ''}
                          </option>
                          <option value="arrendatario">Arrendatario</option>
                          <option value="conviviente">Conviviente / Familiar</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="label label-text text-2xs font-semibold">Teléfono Móvil (7-15 dígitos)</label>
                        <input
                          type="tel"
                          value={p.telefono}
                          onChange={(e) => actualizarPersona(idx, 'telefono', e.target.value)}
                          placeholder="3001234567"
                          className="input input-xs w-full"
                        />
                      </div>
                      <div>
                        <label className="label label-text text-2xs font-semibold">Correo Electrónico</label>
                        <input
                          type="email"
                          value={p.email}
                          onChange={(e) => actualizarPersona(idx, 'email', e.target.value)}
                          placeholder="correo@ejemplo.com"
                          className="input input-xs w-full"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="radio"
                        name="contactoPrincipalRadio"
                        id={`pub-p-${idx}`}
                        disabled={esMenor}
                        checked={p.esContactoPrincipal}
                        onChange={() => actualizarPersona(idx, 'esContactoPrincipal', true)}
                        className="radio radio-xs radio-primary"
                      />
                      <label
                        htmlFor={`pub-p-${idx}`}
                        className={`text-2xs cursor-pointer ${
                          esMenor ? 'text-base-content/40 cursor-not-allowed' : 'text-base-content/80 font-medium'
                        }`}
                      >
                        Designar como Contacto Principal de la Vivienda
                        {esMenor && ' (Inhabilitado para menores)'}
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. Mascotas */}
          <div className="card bg-base-100 shadow-sm border border-base-200 p-4 space-y-3">
            <div className="flex items-center justify-between border-b pb-2 border-base-content/10">
              <h2 className="text-sm font-bold flex items-center gap-2 text-base-content">
                <span className="icon-[tabler--paw] text-secondary text-base" />
                3. Mascotas
              </h2>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="chk-mascotas"
                  checked={tieneMascotas}
                  onChange={(e) => toggleMascotas(e.target.checked)}
                  className="checkbox checkbox-xs checkbox-secondary"
                />
                <label htmlFor="chk-mascotas" className="text-2xs cursor-pointer font-medium">
                  Tenemos mascotas
                </label>
              </div>
            </div>

            {tieneMascotas && (
              <div className="space-y-3">
                {mascotas.map((m, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-base-200/40 border border-base-content/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-2xs font-bold">Mascota #{idx + 1}</span>
                      {mascotas.length > 1 && (
                        <button
                          type="button"
                          onClick={() => eliminarMascota(idx)}
                          className="btn btn-ghost btn-xs text-error p-0 h-auto min-h-0"
                        >
                          <span className="icon-[tabler--trash] text-sm" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="label label-text text-2xs font-semibold">Tipo</label>
                        <select
                          value={m.tipo}
                          onChange={(e) => actualizarMascota(idx, 'tipo', e.target.value as any)}
                          className="select select-xs w-full"
                        >
                          <option value="perro">Perro</option>
                          <option value="gato">Gato</option>
                          <option value="otro">Otro</option>
                        </select>
                      </div>
                      <div>
                        <label className="label label-text text-2xs font-semibold">Nombre *</label>
                        <input
                          type="text"
                          required
                          value={m.nombre}
                          onChange={(e) => actualizarMascota(idx, 'nombre', e.target.value)}
                          placeholder="Nombre"
                          className="input input-xs w-full"
                        />
                      </div>
                      <div>
                        <label className="label label-text text-2xs font-semibold">Raza</label>
                        <input
                          type="text"
                          value={m.raza}
                          onChange={(e) => actualizarMascota(idx, 'raza', e.target.value)}
                          placeholder="Raza"
                          className="input input-xs w-full"
                        />
                      </div>
                    </div>

                    <div className="space-y-1 pt-1">
                      <label className="flex items-center gap-1.5 text-2xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={m.esPeligroso}
                          onChange={(e) => actualizarMascota(idx, 'esPeligroso', e.target.checked)}
                          className="checkbox checkbox-2xs checkbox-error"
                        />
                        <span className="text-error font-medium">Es de raza potencialmente peligrosa / manejo especial</span>
                      </label>
                      <label className="flex items-center gap-1.5 text-2xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={m.vacunasAlDia}
                          onChange={(e) => actualizarMascota(idx, 'vacunasAlDia', e.target.checked)}
                          className="checkbox checkbox-2xs checkbox-success"
                        />
                        <span>Carnet de vacunación al día</span>
                      </label>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={agregarMascota}
                  className="btn btn-outline btn-secondary btn-2xs w-full"
                >
                  <span className="icon-[tabler--plus]" />
                  Agregar otra mascota
                </button>
              </div>
            )}
          </div>

          {/* 4. Vehículos */}
          <div className="card bg-base-100 shadow-sm border border-base-200 p-4 space-y-3">
            <div className="flex items-center justify-between border-b pb-2 border-base-content/10">
              <h2 className="text-sm font-bold flex items-center gap-2 text-base-content">
                <span className="icon-[tabler--car] text-success text-base" />
                4. Vehículos
              </h2>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="chk-vehiculos"
                  checked={tieneVehiculos}
                  onChange={(e) => toggleVehiculos(e.target.checked)}
                  className="checkbox checkbox-xs checkbox-success"
                />
                <label htmlFor="chk-vehiculos" className="text-2xs cursor-pointer font-medium">
                  Poseemos vehículos
                </label>
              </div>
            </div>

            {tieneVehiculos && (
              <div className="space-y-3">
                {vehiculos.map((v, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-base-200/40 border border-base-content/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-2xs font-bold">Vehículo #{idx + 1}</span>
                      {vehiculos.length > 1 && (
                        <button
                          type="button"
                          onClick={() => eliminarVehiculo(idx)}
                          className="btn btn-ghost btn-xs text-error p-0 h-auto min-h-0"
                        >
                          <span className="icon-[tabler--trash] text-sm" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="label label-text text-2xs font-semibold">Tipo</label>
                        <select
                          value={v.tipo}
                          onChange={(e) => actualizarVehiculo(idx, 'tipo', e.target.value as any)}
                          className="select select-xs w-full"
                        >
                          <option value="carro">Carro</option>
                          <option value="moto">Moto</option>
                          <option value="bicicleta">Bicicleta / Patineta</option>
                          <option value="otro">Otro</option>
                        </select>
                      </div>
                      <div>
                        <label className="label label-text text-2xs font-semibold">Placa (5 a 8 caracteres) *</label>
                        <input
                          type="text"
                          required
                          maxLength={8}
                          value={v.placa}
                          onChange={(e) => actualizarVehiculo(idx, 'placa', e.target.value.toUpperCase())}
                          placeholder="ABC123 o ABC12D"
                          className="input input-xs w-full font-mono uppercase"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="label label-text text-2xs font-semibold">Marca / Modelo</label>
                        <input
                          type="text"
                          value={v.marca}
                          onChange={(e) => actualizarVehiculo(idx, 'marca', e.target.value)}
                          placeholder="Ej. Chevrolet Spark"
                          className="input input-xs w-full"
                        />
                      </div>
                      <div>
                        <label className="label label-text text-2xs font-semibold">Color</label>
                        <input
                          type="text"
                          value={v.color}
                          onChange={(e) => actualizarVehiculo(idx, 'color', e.target.value)}
                          placeholder="Blanco"
                          className="input input-xs w-full"
                        />
                      </div>
                    </div>

                    <div className="pt-1">
                      <label className="flex items-center gap-1.5 text-2xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={v.parqueaEnEdificio}
                          onChange={(e) => actualizarVehiculo(idx, 'parqueaEnEdificio', e.target.checked)}
                          className="checkbox checkbox-2xs checkbox-primary"
                        />
                        <span>Estaciona dentro del edificio/conjunto</span>
                      </label>
                      {v.parqueaEnEdificio && (
                        <input
                          type="text"
                          value={v.numeroParqueadero}
                          onChange={(e) => actualizarVehiculo(idx, 'numeroParqueadero', e.target.value)}
                          placeholder="Número o lugar de parqueadero"
                          className="input input-xs w-full mt-1.5"
                        />
                      )}
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={agregarVehiculo}
                  className="btn btn-outline btn-success btn-2xs w-full"
                >
                  <span className="icon-[tabler--plus]" />
                  Agregar otro vehículo
                </button>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary w-full btn-md shadow-md"
          >
            {submitting ? 'Enviando...' : 'Enviar Ficha Censal'}
          </button>
        </form>
      </div>
    </div>
  );
}
