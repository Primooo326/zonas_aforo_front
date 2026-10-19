'use client';

import { use, useEffect, useState, useMemo } from 'react';
import { apiFetch } from '@/lib/api';
import {
  calcularEdad,
  validarFechaNacimiento,
  validarTelefono,
  validarPlaca,
} from '@/lib/censo-helpers';
import SelectorParqueadero, { ParqueaderoOpcion } from '@/components/censo/SelectorParqueadero';

interface PersonaForm {
  nombreCompleto: string;
  telefono: string;
  email: string;
  documento: string;
  fechaNacimiento: string;
  condicion: 'propietario' | 'arrendatario' | 'habitante' | 'visitante' | 'conviviente';
  esContactoPrincipal: boolean;
  discapacidad: boolean;
  condicionEspecial: string;
  adjuntoCedulaUrl: string;
}

interface MascotaForm {
  tipo: 'perro' | 'gato' | 'otro';
  nombre: string;
  raza: string;
  esPeligroso: boolean;
  esManejoEspecial: boolean;
  vacunasAlDia: boolean;
  observaciones: string;
  adjuntoCarnetVacunacionUrl: string;
  adjuntoPolizaUrl: string;
}

interface VehiculoForm {
  tipo: 'carro' | 'moto' | 'bicicleta' | 'otro';
  placa: string;
  marca: string;
  modelo: string;
  color: string;
  parqueaEnEdificio: boolean;
  numeroParqueadero: string;
  esPropietarioResidente: boolean;
  adjuntoTarjetaPropiedadUrl: string;
}

interface CatalogoUnidadItem {
  _id: string;
  identificador: string;
  torre?: string;
  numeroApto?: string;
}

export default function InvitacionCensoTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);

  const [loading, setLoading] = useState(true);
  const [tokenValido, setTokenValido] = useState(true);
  const [errorToken, setErrorToken] = useState('');
  const [edificioNombre, setEdificioNombre] = useState('Edificio');
  const [expiraEn, setExpiraEn] = useState<string>('');

  const [submitting, setSubmitting] = useState(false);
  const [enviadoExitoso, setEnviadoExitoso] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [inmueblePredefinido, setInmueblePredefinido] = useState<string>('');

  // Catálogo de unidades del edificio
  const [catalogo, setCatalogo] = useState<CatalogoUnidadItem[]>([]);
  const [selectedTorreFiltro, setSelectedTorreFiltro] = useState<string>('');
  const [selectedUnidadId, setSelectedUnidadId] = useState<string>('');
  const [modoManual, setModoManual] = useState(false);

  // 1. Unidad
  const [identificador, setIdentificador] = useState('');
  const [torre, setTorre] = useState('');
  const [numeroApto, setNumeroApto] = useState('');
  const [adjuntoCertificadoLibertadUrl, setAdjuntoCertificadoLibertadUrl] = useState('');

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
      discapacidad: false,
      condicionEspecial: '',
      adjuntoCedulaUrl: '',
    },
  ]);

  // 3. Mascotas
  const [tieneMascotas, setTieneMascotas] = useState(false);
  const [mascotas, setMascotas] = useState<MascotaForm[]>([]);

  // 4. Vehículos
  const [tieneVehiculos, setTieneVehiculos] = useState(false);
  const [vehiculos, setVehiculos] = useState<VehiculoForm[]>([]);

  // Parqueaderos disponibles
  const [parqueaderosInventario, setParqueaderosInventario] = useState<ParqueaderoOpcion[]>([]);

  useEffect(() => {
    if (!token) return;
    apiFetch(`/censo/public/invitacion/${token}`)
      .then((inv) => {
        setTokenValido(true);
        if (inv.inmueblePredefinido) {
          const predef = String(inv.inmueblePredefinido).trim();
          setInmueblePredefinido(predef);
          setIdentificador(predef);

          // Inferir torre y apto si es posible para mantener coherencia en el payload
          const matchTorreApto = predef.match(/Torre\s*([^\-]+?)\s*-\s*Apto\s*(.+)/i) || predef.match(/Torre\s*([^\s]+)\s*(.+)/i);
          if (matchTorreApto) {
            setTorre(`Torre ${matchTorreApto[1].trim()}`);
            setNumeroApto(matchTorreApto[2].trim());
          } else if (predef.toLowerCase().startsWith('apto')) {
            setNumeroApto(predef.replace(/apto/i, '').trim());
          }
        }
        if (inv.expiraEn) {
          setExpiraEn(new Date(inv.expiraEn).toLocaleDateString('es-CO', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }));
        }
        const edif = inv.edificioId;
        if (edif?.nombre) setEdificioNombre(edif.nombre);
        const edifId = edif?._id || edif;
        if (edifId) {
          apiFetch(`/censo/public/${edifId}/unidades`)
            .then((data) => {
              if (Array.isArray(data)) {
                setCatalogo(data);
                if (inv.inmueblePredefinido) {
                  const predefNorm = String(inv.inmueblePredefinido).trim().toLowerCase();
                  const match = data.find(
                    (u: any) =>
                      u.identificador?.trim().toLowerCase() === predefNorm ||
                      (u.torre && u.numeroApto && `${u.torre} - Apto ${u.numeroApto}`.toLowerCase() === predefNorm) ||
                      (u.torre && u.numeroApto && `${u.torre} - ${u.numeroApto}`.toLowerCase() === predefNorm)
                  );
                  if (match) {
                    setSelectedUnidadId(match._id);
                    if (match.torre) setTorre(match.torre);
                    if (match.numeroApto) setNumeroApto(match.numeroApto);
                  }
                }
              }
            })
            .catch(() => {});
          apiFetch(`/censo/public/${edifId}/parqueaderos`)
            .then((data) => {
              if (Array.isArray(data)) setParqueaderosInventario(data);
            })
            .catch(() => {});
        }
      })
      .catch((err) => {
        setTokenValido(false);
        setErrorToken(
          err instanceof Error
            ? err.message
            : 'El enlace de invitación al censo ha expirado o no es válido.',
        );
      })
      .finally(() => setLoading(false));
  }, [token]);

  const torresDisponibles = useMemo(() => {
    const set = new Set<string>();
    catalogo.forEach((u) => {
      if (u.torre?.trim()) set.add(u.torre.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [catalogo]);

  const unidadesFiltradas = useMemo(() => {
    if (!selectedTorreFiltro) return catalogo;
    return catalogo.filter((u) => u.torre?.trim() === selectedTorreFiltro);
  }, [catalogo, selectedTorreFiltro]);

  const handleSelectUnidad = (id: string) => {
    setSelectedUnidadId(id);
    if (!id) {
      setIdentificador('');
      setNumeroApto('');
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

  const agregarPersona = () => {
    setPersonas([
      ...personas,
      {
        nombreCompleto: '',
        telefono: '',
        email: '',
        documento: '',
        fechaNacimiento: '',
        condicion: 'habitante',
        esContactoPrincipal: false,
        discapacidad: false,
        condicionEspecial: '',
        adjuntoCedulaUrl: '',
      },
    ]);
  };

  const eliminarPersona = (index: number) => {
    if (personas.length === 1) return;
    setPersonas(personas.filter((_, i) => i !== index));
  };

  const actualizarPersona = (
    index: number,
    campo: keyof PersonaForm,
    valor: string | boolean,
  ) => {
    setPersonas((prev) =>
      prev.map((p, i) => {
        if (i !== index) {
          if (campo === 'esContactoPrincipal' && valor === true) {
            return { ...p, esContactoPrincipal: false };
          }
          return p;
        }
        return { ...p, [campo]: valor };
      }),
    );
  };

  const agregarMascota = () => {
    setMascotas([
      ...mascotas,
      {
        tipo: 'perro',
        nombre: '',
        raza: '',
        esPeligroso: false,
        esManejoEspecial: false,
        vacunasAlDia: true,
        observaciones: '',
        adjuntoCarnetVacunacionUrl: '',
        adjuntoPolizaUrl: '',
      },
    ]);
  };

  const eliminarMascota = (index: number) => {
    setMascotas(mascotas.filter((_, i) => i !== index));
  };

  const actualizarMascota = (
    index: number,
    campo: keyof MascotaForm,
    valor: string | boolean,
  ) => {
    setMascotas((prev) =>
      prev.map((m, i) => (i === index ? { ...m, [campo]: valor } : m)),
    );
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
        parqueaEnEdificio: true,
        numeroParqueadero: '',
        esPropietarioResidente: true,
        adjuntoTarjetaPropiedadUrl: '',
      },
    ]);
  };

  const eliminarVehiculo = (index: number) => {
    setVehiculos(vehiculos.filter((_, i) => i !== index));
  };

  const actualizarVehiculo = (
    index: number,
    campo: keyof VehiculoForm,
    valor: string | boolean,
  ) => {
    setVehiculos((prev) =>
      prev.map((v, i) => {
        if (i !== index) return v;
        const actualizado = { ...v, [campo]: valor };
        if (campo === 'parqueaEnEdificio') {
          if (valor === true) {
            if (!actualizado.numeroParqueadero) {
              const usados = new Set(
                prev
                  .filter((veh, idx) => idx !== index && veh.parqueaEnEdificio && veh.numeroParqueadero)
                  .map((veh) => veh.numeroParqueadero.trim().toUpperCase()),
              );
              const matchApto = parqueaderosInventario.find(
                (p) =>
                  p.numero &&
                  !usados.has(p.numero.trim().toUpperCase()) &&
                  numeroApto &&
                  p.aptoAsignado &&
                  p.aptoAsignado.toLowerCase() === numeroApto.toLowerCase(),
              );
              if (matchApto) {
                actualizado.numeroParqueadero = matchApto.numero.trim();
              }
            }
          } else {
            actualizado.numeroParqueadero = '';
          }
        }
        return actualizado;
      }),
    );
  };

  const enviarCenso = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    let identCalculado = inmueblePredefinido || identificador.trim();
    if (!inmueblePredefinido && !modoManual && selectedUnidadId) {
      const encontrada = catalogo.find((u) => u._id === selectedUnidadId);
      if (encontrada) identCalculado = encontrada.identificador;
    }

    if (!identCalculado) {
      setErrorMsg('Debes especificar o seleccionar la unidad residencial.');
      return;
    }

    const personasValidas = personas.filter((p) => p.nombreCompleto.trim());
    if (personasValidas.length === 0) {
      setErrorMsg('Debes registrar al menos a un habitante en la vivienda.');
      return;
    }

    for (let i = 0; i < personasValidas.length; i++) {
      const p = personasValidas[i];
      const valFecha = validarFechaNacimiento(p.fechaNacimiento);
      if (!valFecha.valido) {
        setErrorMsg(`Persona ${i + 1} (${p.nombreCompleto}): ${valFecha.mensaje}`);
        return;
      }
      if (p.telefono && p.telefono.trim()) {
        const valTel = validarTelefono(p.telefono);
        if (!valTel.valido) {
          setErrorMsg(`Persona ${i + 1} (${p.nombreCompleto}): ${valTel.mensaje}`);
          return;
        }
      }
    }

    // Validación de póliza obligatoria si hay mascotas de manejo especial
    if (tieneMascotas) {
      for (let m = 0; m < mascotas.length; m++) {
        const masc = mascotas[m];
        if ((masc.esManejoEspecial || masc.esPeligroso) && !masc.adjuntoPolizaUrl.trim()) {
          setErrorMsg(
            `La mascota ${masc.nombre || m + 1} fue marcada como raza de manejo especial. Es obligatorio adjuntar o referenciar la Póliza de Responsabilidad Civil.`,
          );
          return;
        }
      }
    }

    try {
      setSubmitting(true);
      await apiFetch(`/censo/public/invitacion/${token}`, {
        method: 'POST',
        body: JSON.stringify({
          identificador: identCalculado,
          torre: torre.trim() || undefined,
          numeroApto: numeroApto.trim() || undefined,
          adjuntoCertificadoLibertadUrl: adjuntoCertificadoLibertadUrl.trim() || undefined,
          personas: personasValidas,
          mascotas: tieneMascotas ? mascotas.filter((m) => m.nombre.trim()) : [],
          vehiculos: tieneVehiculos ? vehiculos.filter((v) => v.placa.trim()) : [],
        }),
      });
      setEnviadoExitoso(true);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al enviar el censo.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  if (!tokenValido) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-base-200">
        <div className="card bg-base-100 shadow-xl border border-warning/40 max-w-md w-full p-8 text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-warning/10 text-warning">
            <span className="icon-[tabler--clock-x] text-4xl" />
          </div>
          <h1 className="text-xl font-bold text-base-content">
            Enlace de Invitación Expirado
          </h1>
          <p className="text-sm text-base-content/70">
            {errorToken || 'Este enlace de invitación al censo ha caducado por políticas de seguridad.'}
          </p>
          <div className="alert alert-info text-xs text-left">
            <span className="icon-[tabler--info-circle] text-base shrink-0" />
            <span>
              Por favor solicita a la administración de tu conjunto residencial que te envíe un nuevo enlace de invitación por WhatsApp o correo electrónico.
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (enviadoExitoso) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-base-200">
        <div className="card bg-base-100 shadow-lg border border-base-200 p-8 max-w-md w-full text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-success">
            <span className="icon-[tabler--check] text-4xl" />
          </div>
          <h1 className="text-xl font-bold text-base-content">
            ¡Censo Completado con Éxito!
          </h1>
          <p className="text-sm text-base-content/70">
            Tu información ha sido enviada directamente a la administración de <strong>{edificioNombre}</strong>. Los documentos adjuntos y registros serán validados por la administración.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Encabezado */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
            <span className="icon-[tabler--shield-lock] text-sm" />
            Invitación Oficial Verificada · {edificioNombre}
          </div>
          <h1 className="text-2xl font-bold text-base-content">
            Censo Habitacional Digital
          </h1>
          <p className="text-xs text-base-content/60">
            Formulario seguro con control de caducidad · {expiraEn ? `Válido hasta ${expiraEn}` : 'Válido por 7 días'}
          </p>
        </div>

        {errorMsg && (
          <div className="alert alert-error shadow-xs text-xs">
            <span className="icon-[tabler--alert-circle] text-base" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={enviarCenso} className="space-y-4">
          {/* Inmueble y Documentación */}
          <div className="card bg-base-100 shadow-sm border border-base-200 p-5 space-y-4">
            <h2 className="text-sm font-bold flex items-center gap-2 border-b pb-2 border-base-content/10">
              <span className="icon-[tabler--home] text-primary text-base" />
              1. Identificación del Inmueble
            </h2>

            {inmueblePredefinido ? (
              <div className="alert alert-info text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="icon-[tabler--lock] text-base shrink-0" />
                  <div>
                    <span className="font-bold">Unidad Asignada:</span> {inmueblePredefinido}
                    <p className="text-2xs opacity-80">Este enlace está vinculado exclusivamente a este apartamento por la administración.</p>
                  </div>
                </div>
                <span className="badge badge-sm badge-neutral">Bloqueado</span>
              </div>
            ) : catalogo.length > 0 && !modoManual ? (
              <div className="space-y-3">
                {torresDisponibles.length > 0 && (
                  <label className="form-control">
                    <span className="label-text text-xs font-semibold">Torre / Bloque</span>
                    <select
                      value={selectedTorreFiltro}
                      onChange={(e) => {
                        setSelectedTorreFiltro(e.target.value);
                        setSelectedUnidadId('');
                      }}
                      className="select select-bordered select-sm text-xs"
                    >
                      <option value="">Todas las torres...</option>
                      {torresDisponibles.map((t) => (
                        <option key={t} value={t}>Torre {t}</option>
                      ))}
                    </select>
                  </label>
                )}

                <label className="form-control">
                  <span className="label-text text-xs font-semibold">Unidad / Apartamento *</span>
                  <select
                    value={selectedUnidadId}
                    onChange={(e) => handleSelectUnidad(e.target.value)}
                    required
                    className="select select-bordered select-sm text-xs"
                  >
                    <option value="">Selecciona tu unidad...</option>
                    {unidadesFiltradas.map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.identificador} {u.torre ? `(Torre ${u.torre})` : ''}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => {
                      setModoManual(true);
                      setSelectedUnidadId('');
                    }}
                    className="link link-hover text-primary text-2xs"
                  >
                    ¿No encuentras tu unidad? Escríbela manualmente
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <label className="form-control">
                  <span className="label-text text-xs font-semibold">Torre</span>
                  <input
                    type="text"
                    value={torre}
                    onChange={(e) => setTorre(e.target.value)}
                    placeholder="Ej: 1"
                    className="input input-bordered input-sm text-xs"
                  />
                </label>
                <label className="form-control">
                  <span className="label-text text-xs font-semibold">Apto / Casa *</span>
                  <input
                    type="text"
                    value={numeroApto}
                    onChange={(e) => setNumeroApto(e.target.value)}
                    placeholder="Ej: 502"
                    required
                    className="input input-bordered input-sm text-xs"
                  />
                </label>
              </div>
            )}

            {/* Certificado de Tradición y Libertad */}
            <label className="form-control pt-2 border-t border-base-200">
              <div className="flex justify-between items-center mb-1">
                <span className="label-text text-xs font-semibold">
                  Certificado de Tradición y Libertad (Enlace / Archivo)
                </span>
                <span className="text-2xs text-base-content/50">Opcional</span>
              </div>
              <input
                type="text"
                value={adjuntoCertificadoLibertadUrl}
                onChange={(e) => setAdjuntoCertificadoLibertadUrl(e.target.value)}
                placeholder="URL o enlace drive/documento del certificado de libertad"
                className="input input-bordered input-sm text-xs"
              />
            </label>
          </div>

          {/* 2. Residentes */}
          <div className="card bg-base-100 shadow-sm border border-base-200 p-5 space-y-4">
            <div className="flex items-center justify-between border-b pb-2 border-base-content/10">
              <h2 className="text-sm font-bold flex items-center gap-2">
                <span className="icon-[tabler--users] text-primary text-base" />
                2. Habitantes y Demografía ({personas.length})
              </h2>
              <button
                type="button"
                onClick={agregarPersona}
                className="btn btn-xs btn-outline btn-primary gap-1"
              >
                <span className="icon-[tabler--plus] text-xs" />
                Agregar Habitante
              </button>
            </div>

            <div className="space-y-4">
              {personas.map((p, idx) => (
                <div
                  key={idx}
                  className="p-3.5 bg-base-200/50 rounded-box border border-base-200 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-primary">
                      Habitante #{idx + 1} {p.esContactoPrincipal ? '(Contacto Principal)' : ''}
                    </span>
                    {personas.length > 1 && (
                      <button
                        type="button"
                        onClick={() => eliminarPersona(idx)}
                        className="btn btn-ghost btn-xs text-error"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <label className="form-control">
                      <span className="label-text text-2xs font-semibold">Nombre Completo *</span>
                      <input
                        type="text"
                        value={p.nombreCompleto}
                        onChange={(e) => actualizarPersona(idx, 'nombreCompleto', e.target.value)}
                        required
                        className="input input-bordered input-sm text-xs"
                      />
                    </label>

                    <label className="form-control">
                      <span className="label-text text-2xs font-semibold">Cédula / Documento *</span>
                      <input
                        type="text"
                        value={p.documento}
                        onChange={(e) => actualizarPersona(idx, 'documento', e.target.value)}
                        placeholder="Ej: 1020304050"
                        className="input input-bordered input-sm text-xs"
                      />
                    </label>

                    <label className="form-control">
                      <span className="label-text text-2xs font-semibold">Fecha de Nacimiento *</span>
                      <input
                        type="date"
                        value={p.fechaNacimiento}
                        onChange={(e) => actualizarPersona(idx, 'fechaNacimiento', e.target.value)}
                        required
                        className="input input-bordered input-sm text-xs"
                      />
                    </label>

                    <label className="form-control">
                      <span className="label-text text-2xs font-semibold">Tipo de Residente *</span>
                      <select
                        value={p.condicion}
                        onChange={(e) => actualizarPersona(idx, 'condicion', e.target.value)}
                        className="select select-bordered select-sm text-xs"
                      >
                        <option value="propietario">Propietario</option>
                        <option value="arrendatario">Arrendatario</option>
                        <option value="habitante">Habitante / Familiar</option>
                        <option value="visitante">Visitante Frecuente</option>
                        <option value="conviviente">Conviviente</option>
                      </select>
                    </label>

                    <label className="form-control">
                      <span className="label-text text-2xs font-semibold">Teléfono Celular</span>
                      <input
                        type="tel"
                        value={p.telefono}
                        onChange={(e) => actualizarPersona(idx, 'telefono', e.target.value)}
                        placeholder="3001234567"
                        className="input input-bordered input-sm text-xs"
                      />
                    </label>

                    <label className="form-control">
                      <span className="label-text text-2xs font-semibold">Correo Electrónico</span>
                      <input
                        type="email"
                        value={p.email}
                        onChange={(e) => actualizarPersona(idx, 'email', e.target.value)}
                        placeholder="ejemplo@correo.com"
                        className="input input-bordered input-sm text-xs"
                      />
                    </label>
                  </div>

                  {/* Demografía especial & Cédula adjunta */}
                  <div className="pt-2 border-t border-base-300 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={p.discapacidad}
                        onChange={(e) => actualizarPersona(idx, 'discapacidad', e.target.checked)}
                        className="checkbox w-5 h-5 rounded-md checkbox-primary"
                      />
                      <span>Presenta alguna discapacidad</span>
                    </label>

                    <input
                      type="text"
                      value={p.condicionEspecial}
                      onChange={(e) => actualizarPersona(idx, 'condicionEspecial', e.target.value)}
                      placeholder="Condición especial (ej: movilidad reducida, etc.)"
                      className="input input-bordered input-sm font-medium"
                    />

                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        value={p.adjuntoCedulaUrl}
                        onChange={(e) => actualizarPersona(idx, 'adjuntoCedulaUrl', e.target.value)}
                        placeholder="Enlace o adjunto de documento de identidad (opcional)"
                        className="input input-bordered input-sm font-medium w-full"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Mascotas */}
          <div className="card bg-base-100 shadow-sm border border-base-200 p-5 space-y-4">
            <div className="flex items-center justify-between border-b pb-2 border-base-content/10">
              <h2 className="text-sm font-bold flex items-center gap-2">
                <span className="icon-[tabler--paw] text-secondary text-base" />
                3. Mascotas
              </h2>
              <label className="flex items-center gap-2 cursor-pointer text-xs">
                <span>¿Tiene mascotas?</span>
                <input
                  type="checkbox"
                  checked={tieneMascotas}
                  onChange={(e) => {
                    setTieneMascotas(e.target.checked);
                    if (e.target.checked && mascotas.length === 0) agregarMascota();
                  }}
                  className="switch switch-secondary switch-sm"
                />
              </label>
            </div>

            {tieneMascotas && (
              <div className="space-y-3">
                {mascotas.map((m, idx) => (
                  <div key={idx} className="p-3 bg-base-200/50 rounded-box border border-base-200 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-secondary">Mascota #{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => eliminarMascota(idx)}
                        className="btn btn-ghost btn-xs text-error"
                      >
                        Eliminar
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={m.nombre}
                        onChange={(e) => actualizarMascota(idx, 'nombre', e.target.value)}
                        placeholder="Nombre de la mascota *"
                        required
                        className="input input-bordered input-sm text-xs"
                      />
                      <select
                        value={m.tipo}
                        onChange={(e) => actualizarMascota(idx, 'tipo', e.target.value)}
                        className="select select-bordered select-sm text-xs"
                      >
                        <option value="perro">Perro</option>
                        <option value="gato">Gato</option>
                        <option value="otro">Otro</option>
                      </select>
                      <input
                        type="text"
                        value={m.raza}
                        onChange={(e) => actualizarMascota(idx, 'raza', e.target.value)}
                        placeholder="Raza *"
                        required
                        className="input input-bordered input-sm text-xs"
                      />
                    </div>

                    {/* Manejo especial y Póliza */}
                    <div className="pt-2 border-t border-base-300 space-y-2 text-xs">
                      <div className="flex flex-wrap items-center gap-4">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={m.esManejoEspecial}
                            onChange={(e) => actualizarMascota(idx, 'esManejoEspecial', e.target.checked)}
                            className="checkbox w-5 h-5 rounded-md checkbox-warning"
                          />
                          <span className="text-warning font-semibold">Raza de Manejo Especial (potencialmente agresivo)</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={m.vacunasAlDia}
                            onChange={(e) => actualizarMascota(idx, 'vacunasAlDia', e.target.checked)}
                            className="checkbox w-5 h-5 rounded-md checkbox-success"
                          />
                          <span>Vacunas al día</span>
                        </label>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={m.adjuntoCarnetVacunacionUrl}
                          onChange={(e) => actualizarMascota(idx, 'adjuntoCarnetVacunacionUrl', e.target.value)}
                          placeholder="Adjunto Carnet de Vacunación (URL o ref)"
                          className="input input-bordered input-sm font-medium"
                        />
                        <input
                          type="text"
                          value={m.adjuntoPolizaUrl}
                          onChange={(e) => actualizarMascota(idx, 'adjuntoPolizaUrl', e.target.value)}
                          placeholder={m.esManejoEspecial ? "Póliza de Responsabilidad Civil (OBLIGATORIA) *" : "Póliza de Responsabilidad Civil (opcional)"}
                          required={m.esManejoEspecial}
                          className={`input input-bordered input-sm font-medium ${m.esManejoEspecial ? 'border-warning' : ''}`}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={agregarMascota}
                  className="btn btn-xs btn-outline w-full"
                >
                  + Agregar otra mascota
                </button>
              </div>
            )}
          </div>

          {/* 4. Vehículos */}
          <div className="card bg-base-100 shadow-sm border border-base-200 p-5 space-y-4">
            <div className="flex items-center justify-between border-b pb-2 border-base-content/10">
              <h2 className="text-sm font-bold flex items-center gap-2">
                <span className="icon-[tabler--car] text-success text-base" />
                4. Vehículos y Parqueadero
              </h2>
              <label className="flex items-center gap-2 cursor-pointer text-xs">
                <span>¿Tiene vehículos?</span>
                <input
                  type="checkbox"
                  checked={tieneVehiculos}
                  onChange={(e) => {
                    setTieneVehiculos(e.target.checked);
                    if (e.target.checked && vehiculos.length === 0) agregarVehiculo();
                  }}
                  className="switch switch-success switch-sm"
                />
              </label>
            </div>

            {tieneVehiculos && (
              <div className="space-y-3">
                {vehiculos.map((v, idx) => (
                  <div key={idx} className="p-3 bg-base-200/50 rounded-box border border-base-200 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-success">Vehículo #{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => eliminarVehiculo(idx)}
                        className="btn btn-ghost btn-xs text-error"
                      >
                        Eliminar
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <input
                        type="text"
                        value={v.placa}
                        onChange={(e) => actualizarVehiculo(idx, 'placa', e.target.value.toUpperCase())}
                        placeholder="Placa *"
                        required
                        className="input input-bordered input-sm font-mono text-xs uppercase"
                      />
                      <select
                        value={v.tipo}
                        onChange={(e) => actualizarVehiculo(idx, 'tipo', e.target.value)}
                        className="select select-bordered select-sm text-xs"
                      >
                        <option value="carro">Carro</option>
                        <option value="moto">Moto</option>
                        <option value="bicicleta">Bicicleta</option>
                        <option value="otro">Otro</option>
                      </select>
                      <input
                        type="text"
                        value={v.marca}
                        onChange={(e) => actualizarVehiculo(idx, 'marca', e.target.value)}
                        placeholder="Marca"
                        className="input input-bordered input-sm text-xs"
                      />
                      <input
                        type="text"
                        value={v.color}
                        onChange={(e) => actualizarVehiculo(idx, 'color', e.target.value)}
                        placeholder="Color"
                        className="input input-bordered input-sm text-xs"
                      />
                    </div>

                    <div className="pt-2 border-t border-base-300 space-y-2 text-xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={v.parqueaEnEdificio}
                            onChange={(e) => actualizarVehiculo(idx, 'parqueaEnEdificio', e.target.checked)}
                            className="checkbox w-5 h-5 rounded-md checkbox-primary"
                          />
                          <span>¿Parquea en el conjunto/edificio?</span>
                        </label>

                        {v.parqueaEnEdificio && (
                          <div className="w-full sm:w-64">
                            <SelectorParqueadero
                              value={v.numeroParqueadero}
                              onChange={(val) => actualizarVehiculo(idx, 'numeroParqueadero', val)}
                              tipoVehiculo={v.tipo}
                              parqueaderosInventario={parqueaderosInventario}
                              torreUnidad={torre}
                              aptoUnidad={numeroApto}
                              vehiculosEnFormulario={vehiculos}
                              vehiculoIndex={idx}
                              size="sm"
                            />
                          </div>
                        )}
                      </div>

                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={v.esPropietarioResidente}
                          onChange={(e) => actualizarVehiculo(idx, 'esPropietarioResidente', e.target.checked)}
                          className="checkbox w-5 h-5 rounded-md checkbox-primary"
                        />
                        <span>Vehículo a nombre del residente / propietario que habita en esta vivienda</span>
                      </label>

                      <input
                        type="text"
                        value={v.adjuntoTarjetaPropiedadUrl}
                        onChange={(e) => actualizarVehiculo(idx, 'adjuntoTarjetaPropiedadUrl', e.target.value)}
                        placeholder="Adjunto Tarjeta de Propiedad (URL o ref)"
                        className="input input-bordered input-sm font-medium w-full"
                      />
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={agregarVehiculo}
                  className="btn btn-xs btn-outline w-full"
                >
                  + Agregar otro vehículo
                </button>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary w-full shadow-md text-sm"
          >
            {submitting ? <span className="loading loading-spinner"></span> : 'Enviar Formulario de Censo'}
          </button>
        </form>
      </div>
    </div>
  );
}
