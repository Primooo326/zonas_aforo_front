'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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

export default function NuevoCensoPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Unidad
  const [identificador, setIdentificador] = useState('');
  const [torre, setTorre] = useState('');
  const [numeroApto, setNumeroApto] = useState('');
  const [tipoOcupacion, setTipoOcupacion] = useState<'habitada' | 'desocupada'>('habitada');
  const [notasAdministracion, setNotasAdministracion] = useState('');

  // Personas
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

  // Mascotas
  const [mascotas, setMascotas] = useState<MascotaForm[]>([]);

  // Vehículos
  const [vehiculos, setVehiculos] = useState<VehiculoForm[]>([]);

  // Helpers para modificar personas
  const agregarPersona = () => {
    const yaTienePrincipal = personas.some((p) => p.esContactoPrincipal);
    setPersonas([
      ...personas,
      {
        nombreCompleto: '',
        telefono: '',
        email: '',
        documento: '',
        fechaNacimiento: '',
        condicion: 'conviviente',
        esContactoPrincipal: !yaTienePrincipal,
      },
    ]);
  };

  const eliminarPersona = (index: number) => {
    const eliminadaEraPrincipal = personas[index]?.esContactoPrincipal;
    const restantes = personas.filter((_, i) => i !== index);
    if (eliminadaEraPrincipal && restantes.length > 0) {
      const idxAdulto = restantes.findIndex((p) => !p.fechaNacimiento || calcularEdad(p.fechaNacimiento) >= 18);
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
          if (campo === 'esContactoPrincipal' && valor === true) {
            return { ...p, esContactoPrincipal: false };
          }
          return p;
        }

        const actualizado = { ...p, [campo]: valor };

        if (campo === 'fechaNacimiento' && typeof valor === 'string') {
          if (valor) {
            const edad = calcularEdad(valor);
            if (edad < 18) {
              if (actualizado.condicion === 'propietario') {
                actualizado.condicion = 'conviviente';
              }
              actualizado.esContactoPrincipal = false;
            }
          }
        }

        if (campo === 'esContactoPrincipal' && valor === true) {
          if (actualizado.fechaNacimiento && calcularEdad(actualizado.fechaNacimiento) < 18) {
            actualizado.esContactoPrincipal = false;
          }
        }

        if (campo === 'condicion' && valor === 'propietario') {
          if (actualizado.fechaNacimiento && calcularEdad(actualizado.fechaNacimiento) < 18) {
            actualizado.condicion = 'conviviente';
          }
        }

        return actualizado;
      }),
    );
  };

  // Helpers para mascotas
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

  // Helpers para vehículos
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

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!identificador.trim()) {
      setErrorMsg('El identificador de la unidad (ej. Apto 302) es obligatorio.');
      return;
    }

    // Filtrar personas vacías
    const personasValidas = personas.filter((p) => p.nombreCompleto.trim() && p.fechaNacimiento);
    if (tipoOcupacion === 'habitada' && personasValidas.length === 0) {
      setErrorMsg('Debes registrar al menos una persona con nombre y fecha de nacimiento para una unidad habitada.');
      return;
    }

    if (tipoOcupacion === 'habitada') {
      let contactosPrincipales = 0;
      for (let i = 0; i < personasValidas.length; i++) {
        const p = personasValidas[i];
        const valFecha = validarFechaNacimiento(p.fechaNacimiento);
        if (!valFecha.valido) {
          setErrorMsg(`Persona ${i + 1} (${p.nombreCompleto}): ${valFecha.mensaje}`);
          return;
        }

        const edad = calcularEdad(p.fechaNacimiento);
        if (edad < 18) {
          if (p.condicion === 'propietario') {
            setErrorMsg(`Persona ${i + 1} (${p.nombreCompleto}): Un menor de edad (${edad} años) no puede ser propietario.`);
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

      if (contactosPrincipales === 0 && personasValidas.length > 0) {
        setErrorMsg('Debes designar a un adulto como Contacto Principal de la vivienda.');
        return;
      }
      if (contactosPrincipales > 1) {
        setErrorMsg('Solo puede haber un único Contacto Principal por vivienda.');
        return;
      }
    }

    const vehsValidos = vehiculos.filter((v) => v.placa.trim());
    for (let j = 0; j < vehsValidos.length; j++) {
      const v = vehsValidos[j];
      const valPlaca = validarPlaca(v.placa);
      if (!valPlaca.valido) {
        setErrorMsg(`Vehículo ${j + 1}: ${valPlaca.mensaje}`);
        return;
      }
    }

    try {
      setSubmitting(true);
      await apiFetch('/censo', {
        method: 'POST',
        body: JSON.stringify({
          identificador: identificador.trim(),
          torre: torre.trim() || undefined,
          numeroApto: numeroApto.trim() || undefined,
          tipoOcupacion,
          notasAdministracion: notasAdministracion.trim() || undefined,
          personas: personasValidas,
          mascotas: mascotas.filter((m) => m.nombre.trim() && m.raza.trim()),
          vehiculos: vehsValidos.map((v) => ({ ...v, placa: v.placa.trim().toUpperCase() })),
          estado: 'aprobado',
        }),
      });

      router.push('/dashboard/censo');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al guardar la unidad.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-2.5 sm:gap-3">
        <Link href="/dashboard/censo" className="btn btn-ghost btn-circle btn-sm shrink-0">
          <span className="icon-[tabler--arrow-left] text-lg sm:text-xl" />
        </Link>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-bold text-base-content flex items-center gap-2">
            <span className="icon-[tabler--plus] text-primary shrink-0" />
            <span>Registrar Unidad en Censo</span>
          </h1>
          <p className="text-2xs sm:text-xs text-base-content/60">
            Ingreso manual administrativo directo en estado Aprobado.
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
        {/* 1. Datos de la Unidad */}
        <div className="card bg-base-100 shadow-sm border border-base-200 p-4 sm:p-5 space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2 border-b pb-2 border-base-content/10">
            <span className="icon-[tabler--home] text-primary" />
            1. Datos de la Unidad Habitacional
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="label label-text text-xs font-semibold">Identificador Completo *</label>
              <input
                type="text"
                required
                value={identificador}
                onChange={(e) => setIdentificador(e.target.value)}
                placeholder="Ej. Torre 1 - Apto 302 o Casa 14"
                className="input input-sm w-full"
              />
            </div>
            <div>
              <label className="label label-text text-xs font-semibold">Torre / Bloque</label>
              <input
                type="text"
                value={torre}
                onChange={(e) => setTorre(e.target.value)}
                placeholder="Ej. Torre 1"
                className="input input-sm w-full"
              />
            </div>
            <div>
              <label className="label label-text text-xs font-semibold">N° Apto / Casa</label>
              <input
                type="text"
                value={numeroApto}
                onChange={(e) => setNumeroApto(e.target.value)}
                placeholder="Ej. 302"
                className="input input-sm w-full"
              />
            </div>
            <div>
              <label className="label label-text text-xs font-semibold">Tipo de Ocupación</label>
              <select
                value={tipoOcupacion}
                onChange={(e) => setTipoOcupacion(e.target.value as 'habitada' | 'desocupada')}
                className="select select-sm w-full"
              >
                <option value="habitada">Habitada</option>
                <option value="desocupada">Desocupada</option>
              </select>
            </div>
          </div>
        </div>

        {/* 2. Residentes */}
        <div className="card bg-base-100 shadow-sm border border-base-200 p-5 space-y-4">
          <div className="flex items-center justify-between border-b pb-2 border-base-content/10">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <span className="icon-[tabler--users] text-primary" />
              2. Residentes del Hogar
            </h2>
            <button
              type="button"
              onClick={agregarPersona}
              className="btn btn-outline btn-primary btn-xs"
            >
              <span className="icon-[tabler--plus]" />
              Agregar Persona
            </button>
          </div>

          <div className="space-y-4">
            {personas.map((p, index) => {
              const edad = p.fechaNacimiento ? calcularEdad(p.fechaNacimiento) : null;
              const cat = edad !== null ? categorizarEdad(edad) : null;
              const esMenor = edad !== null && edad < 18;

              return (
                <div key={index} className="p-4 rounded-lg bg-base-200/50 border border-base-content/10 relative space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-base-content/70 flex items-center gap-1.5">
                      Persona #{index + 1}
                      {p.esContactoPrincipal && (
                        <span className="badge badge-2xs badge-primary font-semibold">
                          Contacto Principal
                        </span>
                      )}
                    </span>
                    {personas.length > 1 && (
                      <button
                        type="button"
                        onClick={() => eliminarPersona(index)}
                        className="btn btn-ghost btn-xs text-error"
                      >
                        <span className="icon-[tabler--trash]" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="label label-text text-2xs">Nombre Completo *</label>
                      <input
                        type="text"
                        required
                        value={p.nombreCompleto}
                        onChange={(e) => actualizarPersona(index, 'nombreCompleto', e.target.value)}
                        placeholder="Ej. Juan Pérez"
                        className="input input-xs w-full"
                      />
                    </div>
                    <div>
                      <label className="label label-text text-2xs">Fecha Nacimiento * (Cálculo Automático)</label>
                      <input
                        type="date"
                        required
                        min={FECHA_MIN_NACIMIENTO}
                        max={FECHA_MAX_NACIMIENTO}
                        value={p.fechaNacimiento}
                        onChange={(e) => actualizarPersona(index, 'fechaNacimiento', e.target.value)}
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
                      <label className="label label-text text-2xs">Condición en el Hogar</label>
                      <select
                        value={p.condicion}
                        onChange={(e) => actualizarPersona(index, 'condicion', e.target.value as any)}
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

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="label label-text text-2xs">Teléfono (7-15 dígitos)</label>
                      <input
                        type="tel"
                        value={p.telefono}
                        onChange={(e) => actualizarPersona(index, 'telefono', e.target.value)}
                        placeholder="3001234567"
                        className="input input-xs w-full"
                      />
                    </div>
                    <div>
                      <label className="label label-text text-2xs">Email</label>
                      <input
                        type="email"
                        value={p.email}
                        onChange={(e) => actualizarPersona(index, 'email', e.target.value)}
                        placeholder="correo@ejemplo.com"
                        className="input input-xs w-full"
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-4">
                      <input
                        type="radio"
                        name="cpRadioNuevo"
                        id={`p-cp-${index}`}
                        disabled={esMenor}
                        checked={p.esContactoPrincipal}
                        onChange={() => actualizarPersona(index, 'esContactoPrincipal', true)}
                        className="radio radio-xs radio-primary"
                      />
                      <label
                        htmlFor={`p-cp-${index}`}
                        className={`text-2xs cursor-pointer ${
                          esMenor ? 'text-base-content/40 cursor-not-allowed' : 'text-base-content/80 font-medium'
                        }`}
                      >
                        Contacto Principal {esMenor && '(Inhabilitado para menores)'}
                      </label>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Mascotas */}
        <div className="card bg-base-100 shadow-sm border border-base-200 p-5 space-y-4">
          <div className="flex items-center justify-between border-b pb-2 border-base-content/10">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <span className="icon-[tabler--paw] text-secondary" />
              3. Mascotas ({mascotas.length})
            </h2>
            <button
              type="button"
              onClick={agregarMascota}
              className="btn btn-outline btn-secondary btn-xs"
            >
              <span className="icon-[tabler--plus]" />
              Agregar Mascota
            </button>
          </div>

          {mascotas.length === 0 ? (
            <p className="text-xs text-base-content/50 italic">Sin mascotas registradas.</p>
          ) : (
            <div className="space-y-3">
              {mascotas.map((m, index) => (
                <div key={index} className="p-3 rounded-lg bg-base-200/50 border border-base-content/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">Mascota #{index + 1}</span>
                    <button
                      type="button"
                      onClick={() => eliminarMascota(index)}
                      className="btn btn-ghost btn-xs text-error"
                    >
                      <span className="icon-[tabler--trash]" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="label label-text text-2xs">Tipo</label>
                      <select
                        value={m.tipo}
                        onChange={(e) => actualizarMascota(index, 'tipo', e.target.value)}
                        className="select select-xs w-full"
                      >
                        <option value="perro">Perro</option>
                        <option value="gato">Gato</option>
                        <option value="otro">Otro</option>
                      </select>
                    </div>
                    <div>
                      <label className="label label-text text-2xs">Nombre</label>
                      <input
                        type="text"
                        value={m.nombre}
                        onChange={(e) => actualizarMascota(index, 'nombre', e.target.value)}
                        placeholder="Ej. Firulais"
                        className="input input-xs w-full"
                      />
                    </div>
                    <div>
                      <label className="label label-text text-2xs">Raza</label>
                      <input
                        type="text"
                        value={m.raza}
                        onChange={(e) => actualizarMascota(index, 'raza', e.target.value)}
                        placeholder="Ej. Criollo, Labrador"
                        className="input input-xs w-full"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 pt-1">
                    <label className="flex items-center gap-1.5 text-2xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={m.esPeligroso}
                        onChange={(e) => actualizarMascota(index, 'esPeligroso', e.target.checked)}
                        className="checkbox checkbox-xs checkbox-error"
                      />
                      <span className="font-semibold text-error">⚠️ Raza de Manejo Especial / Peligrosa</span>
                    </label>

                    <label className="flex items-center gap-1.5 text-2xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={m.vacunasAlDia}
                        onChange={(e) => actualizarMascota(index, 'vacunasAlDia', e.target.checked)}
                        className="checkbox checkbox-xs checkbox-success"
                      />
                      <span>Vacunación al día</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 4. Vehículos */}
        <div className="card bg-base-100 shadow-sm border border-base-200 p-5 space-y-4">
          <div className="flex items-center justify-between border-b pb-2 border-base-content/10">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <span className="icon-[tabler--car] text-success" />
              4. Vehículos ({vehiculos.length})
            </h2>
            <button
              type="button"
              onClick={agregarVehiculo}
              className="btn btn-outline btn-success btn-xs"
            >
              <span className="icon-[tabler--plus]" />
              Agregar Vehículo
            </button>
          </div>

          {vehiculos.length === 0 ? (
            <p className="text-xs text-base-content/50 italic">Sin vehículos registrados.</p>
          ) : (
            <div className="space-y-3">
              {vehiculos.map((v, index) => (
                <div key={index} className="p-3 rounded-lg bg-base-200/50 border border-base-content/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">Vehículo #{index + 1}</span>
                    <button
                      type="button"
                      onClick={() => eliminarVehiculo(index)}
                      className="btn btn-ghost btn-xs text-error"
                    >
                      <span className="icon-[tabler--trash]" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <label className="label label-text text-2xs">Tipo</label>
                      <select
                        value={v.tipo}
                        onChange={(e) => actualizarVehiculo(index, 'tipo', e.target.value)}
                        className="select select-xs w-full"
                      >
                        <option value="carro">Carro</option>
                        <option value="moto">Moto</option>
                        <option value="bicicleta">Bicicleta</option>
                        <option value="otro">Otro</option>
                      </select>
                    </div>
                    <div>
                      <label className="label label-text text-2xs">Placa *</label>
                      <input
                        type="text"
                        value={v.placa}
                        onChange={(e) => actualizarVehiculo(index, 'placa', e.target.value.toUpperCase())}
                        placeholder="ABC-123"
                        className="input input-xs w-full font-mono uppercase"
                      />
                    </div>
                    <div>
                      <label className="label label-text text-2xs">Marca / Modelo</label>
                      <input
                        type="text"
                        value={v.marca}
                        onChange={(e) => actualizarVehiculo(index, 'marca', e.target.value)}
                        placeholder="Renault Logan"
                        className="input input-xs w-full"
                      />
                    </div>
                    <div>
                      <label className="label label-text text-2xs">Color</label>
                      <input
                        type="text"
                        value={v.color}
                        onChange={(e) => actualizarVehiculo(index, 'color', e.target.value)}
                        placeholder="Gris"
                        className="input input-xs w-full"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 items-center">
                    <label className="flex items-center gap-1.5 text-2xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={v.parqueaEnEdificio}
                        onChange={(e) => actualizarVehiculo(index, 'parqueaEnEdificio', e.target.checked)}
                        className="checkbox checkbox-xs checkbox-primary"
                      />
                      <span>¿Parquea en el conjunto/edificio?</span>
                    </label>

                    {v.parqueaEnEdificio && (
                      <input
                        type="text"
                        value={v.numeroParqueadero}
                        onChange={(e) => actualizarVehiculo(index, 'numeroParqueadero', e.target.value)}
                        placeholder="N° de parqueadero asignado"
                        className="input input-xs w-full"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 5. Notas */}
        <div className="card bg-base-100 shadow-sm border border-base-200 p-5 space-y-2">
          <label className="label label-text text-xs font-semibold">Notas Internas de Administración</label>
          <textarea
            value={notasAdministracion}
            onChange={(e) => setNotasAdministracion(e.target.value)}
            placeholder="Observaciones de uso exclusivo de administración o portería..."
            className="textarea textarea-sm w-full"
            rows={2}
          />
        </div>

        {/* Botones de acción */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3">
          <Link href="/dashboard/censo" className="btn btn-ghost btn-sm w-full sm:w-auto justify-center">
            Cancelar
          </Link>
          <button type="submit" disabled={submitting} className="btn btn-primary btn-sm w-full sm:w-auto justify-center">
            {submitting ? 'Guardando...' : 'Guardar Unidad en Censo'}
          </button>
        </div>
      </form>
    </div>
  );
}
