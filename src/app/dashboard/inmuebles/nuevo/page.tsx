'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';

const TIPOS = ['inmueble', 'parqueadero', 'habitacion'] as const;
const TRANSACCIONES = ['venta', 'arriendo'] as const;

interface UnidadCenso {
  _id: string;
  identificador: string;
  torre?: string;
  numeroApto?: string;
  piso?: number;
  metrosCuadrados?: number;
  tieneBalcon?: boolean;
  tienePatio?: boolean;
  parqueaderosAsignados?: Array<{ numero: string; tipo: string; esCubierto: boolean }>;
  bodegasAsignadas?: Array<{ numero: string; ubicacion?: string; metrosCuadrados?: number }>;
  personas?: Array<{
    nombreCompleto: string;
    telefono?: string;
    email?: string;
    condicion: string;
    esContactoPrincipal: boolean;
  }>;
}

export default function NuevoInmueblePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    tipo: 'inmueble' as string,
    transaccion: 'venta' as string,
    metrosCuadrados: '',
    piso: '',
    parqueadero: false,
    balcon: false,
    deposito: false,
    amoblado: false,
    cubierto: false,
    precio: '',
    telefono: '',
    emailContacto: '',
    observacion: '',
  });

  // Integración Censo
  const [unidadesCenso, setUnidadesCenso] = useState<UnidadCenso[]>([]);
  const [cargandoCenso, setCargandoCenso] = useState(true);
  const [torreSel, setTorreSel] = useState('');
  const [unidadSelId, setUnidadSelId] = useState('');
  const [itemAsignadoRef, setItemAsignadoRef] = useState('');

  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Cargar catálogo de unidades del censo
  useEffect(() => {
    apiFetch('/censo/catalogo-unidades')
      .then((data: UnidadCenso[]) => {
        if (Array.isArray(data)) {
          setUnidadesCenso(data);
        }
      })
      .catch(() => {
        // Modo legacy silencioso si no hay censo o falla
      })
      .finally(() => setCargandoCenso(false));
  }, []);

  const tieneTorres = unidadesCenso.some((u) => u.torre);
  const torresDisponibles = Array.from(
    new Set(unidadesCenso.map((u) => u.torre).filter(Boolean)),
  ).sort() as string[];

  const unidadesFiltradas = torreSel
    ? unidadesCenso.filter((u) => u.torre === torreSel)
    : unidadesCenso;

  const unidadSeleccionada = unidadesCenso.find((u) => u._id === unidadSelId);

  // Auto-completar al seleccionar una unidad del censo
  const handleSeleccionarUnidad = (id: string) => {
    setUnidadSelId(id);
    setItemAsignadoRef('');
    const u = unidadesCenso.find((item) => item._id === id);
    if (!u) return;

    // Contacto principal o primer residente
    const principal =
      u.personas?.find((p) => p.esContactoPrincipal) || u.personas?.[0];

    setForm((prev) => ({
      ...prev,
      piso: u.piso !== undefined ? String(u.piso) : prev.piso,
      metrosCuadrados:
        u.metrosCuadrados !== undefined ? String(u.metrosCuadrados) : prev.metrosCuadrados,
      balcon: u.tieneBalcon !== undefined ? u.tieneBalcon : prev.balcon,
      parqueadero: (u.parqueaderosAsignados?.length || 0) > 0,
      deposito: (u.bodegasAsignadas?.length || 0) > 0,
      telefono: principal?.telefono || prev.telefono,
      emailContacto: principal?.email || prev.emailContacto,
    }));
  };

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (files.length + selected.length > 10) {
      setError('Máximo 10 imágenes');
      return;
    }
    for (const f of selected) {
      if (f.size > 5 * 1024 * 1024) {
        setError(`Imagen ${f.name} excede 5MB`);
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) {
        setError(`Formato no permitido: ${f.name} (solo jpg/png/webp)`);
        return;
      }
    }
    const newFiles = [...files, ...selected];
    setFiles(newFiles);
    const newPreviews = selected.map((f) => URL.createObjectURL(f));
    setPreviews((prev) => [...prev, ...newPreviews]);
    setError('');
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
    setPreviews((prev) => {
      URL.revokeObjectURL(prev[idx]);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (unidadesCenso.length > 0 && !unidadSelId) {
      setError('Debes seleccionar un inmueble del censo registrado');
      return;
    }
    if (!form.precio || Number(form.precio) <= 0) {
      setError('Precio debe ser mayor a 0');
      return;
    }
    if (!form.telefono || form.telefono.length < 7) {
      setError('Teléfono requerido (mín 7 dígitos)');
      return;
    }
    if (form.observacion.length > 1000) {
      setError('Observación máximo 1000 caracteres');
      return;
    }
    setError('');
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('tipo', form.tipo);
      fd.append('transaccion', form.transaccion);
      if (form.metrosCuadrados) fd.append('metrosCuadrados', form.metrosCuadrados);
      if (form.piso) fd.append('piso', form.piso);
      if (form.tipo === 'inmueble' && form.parqueadero) fd.append('parqueadero', 'true');
      if ((form.tipo === 'inmueble' || form.tipo === 'habitacion') && form.balcon) fd.append('balcon', 'true');
      if (form.tipo === 'inmueble' && form.deposito) fd.append('deposito', 'true');
      if ((form.tipo === 'inmueble' || form.tipo === 'habitacion') && form.amoblado) fd.append('amoblado', 'true');
      if (form.tipo === 'parqueadero' && form.cubierto) fd.append('cubierto', 'true');
      fd.append('precio', form.precio);
      fd.append('telefono', form.telefono);
      if (form.emailContacto) fd.append('emailContacto', form.emailContacto);
      if (form.observacion) fd.append('observacion', form.observacion);

      // Campos de censo vinculados
      if (unidadSeleccionada) {
        fd.append('censoUnidadId', unidadSeleccionada._id);
        if (unidadSeleccionada.torre) fd.append('torre', unidadSeleccionada.torre);
        if (unidadSeleccionada.numeroApto) fd.append('numeroApto', unidadSeleccionada.numeroApto);
        fd.append('identificador', unidadSeleccionada.identificador);
      }
      if (itemAsignadoRef) {
        fd.append('itemAsignadoRef', itemAsignadoRef);
      }

      files.forEach((f) => fd.append('imagenes', f));
      await apiFetch('/inmuebles', { method: 'POST', body: fd as any });
      router.push('/dashboard/inmuebles');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Nueva Publicación</h1>
        <p className="text-xs sm:text-sm text-base-content/60">
          Publica un inmueble, parqueadero o habitación en oferta para tu comunidad
        </p>
      </div>

      {error && <div className="alert alert-error text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="card bg-base-100 shadow-sm p-4 sm:p-6 space-y-4 border border-base-200">
        {/* Selector Asistido por Censo (Modo Inteligente vs Legacy) */}
        {!cargandoCenso && unidadesCenso.length > 0 ? (
          <div className="bg-primary/5 border border-primary/20 rounded-box p-3.5 sm:p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="icon-[tabler--database-check] text-primary text-lg" />
              <span className="text-xs sm:text-sm font-semibold text-primary">
                Vinculación con Censo de Inmuebles Registrados
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {tieneTorres && (
                <label className="form-control">
                  <span className="label-text text-xs font-medium">Torre *</span>
                  <select
                    className="select select-bordered select-sm w-full"
                    value={torreSel}
                    onChange={(e) => {
                      setTorreSel(e.target.value);
                      setUnidadSelId('');
                      setItemAsignadoRef('');
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
                <span className="label-text text-xs font-medium">Apartamento / Inmueble *</span>
                <select
                  className="select select-bordered select-sm w-full"
                  value={unidadSelId}
                  onChange={(e) => handleSeleccionarUnidad(e.target.value)}
                  disabled={tieneTorres && !torreSel}
                  required
                >
                  <option value="">Selecciona inmueble...</option>
                  {unidadesFiltradas.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.identificador} {u.piso !== undefined ? `(Piso ${u.piso})` : ''}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {/* Sub-bienes asignados (Parqueadero / Bodega) si aplica */}
            {unidadSeleccionada && form.tipo === 'parqueadero' && (
              <div className="pt-2 border-t border-primary/10">
                <label className="form-control">
                  <span className="label-text text-xs font-medium">
                    Parqueadero asignado a esta unidad
                  </span>
                  {unidadSeleccionada.parqueaderosAsignados && unidadSeleccionada.parqueaderosAsignados.length > 0 ? (
                    <select
                      className="select select-bordered select-sm w-full"
                      value={itemAsignadoRef}
                      onChange={(e) => {
                        const val = e.target.value;
                        setItemAsignadoRef(val);
                        const match = unidadSeleccionada.parqueaderosAsignados?.find(
                          (p) => `Parqueadero ${p.numero}` === val,
                        );
                        if (match) {
                          setForm((prev) => ({ ...prev, cubierto: match.esCubierto }));
                        }
                      }}
                    >
                      <option value="">Selecciona parqueadero específico...</option>
                      {unidadSeleccionada.parqueaderosAsignados.map((p) => (
                        <option key={p.numero} value={`Parqueadero ${p.numero}`}>
                          Parqueadero #{p.numero} ({p.tipo || 'Carro'}) - {p.esCubierto ? 'Cubierto' : 'Descubierto'}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-xs text-base-content/60 italic mt-1">
                      Esta unidad no tiene parqueaderos censados asignados. Puedes especificar el número en la observación.
                    </p>
                  )}
                </label>
              </div>
            )}

            {unidadSeleccionada && (form.tipo === 'habitacion' || form.tipo === 'inmueble') && unidadSeleccionada.bodegasAsignadas && unidadSeleccionada.bodegasAsignadas.length > 0 && (
              <div className="pt-2 border-t border-primary/10">
                <label className="form-control">
                  <span className="label-text text-xs font-medium">
                    Bodega / Depósito asignado a esta unidad
                  </span>
                  <select
                    className="select select-bordered select-sm w-full"
                    value={itemAsignadoRef}
                    onChange={(e) => {
                      const val = e.target.value;
                      setItemAsignadoRef(val);
                      const match = unidadSeleccionada.bodegasAsignadas?.find(
                        (b) => `Bodega ${b.numero}` === val,
                      );
                      if (match && match.metrosCuadrados) {
                        setForm((prev) => ({ ...prev, metrosCuadrados: String(match.metrosCuadrados) }));
                      }
                    }}
                  >
                    <option value="">(Opcional) Selecciona bodega específica...</option>
                    {unidadSeleccionada.bodegasAsignadas.map((b) => (
                      <option key={b.numero} value={`Bodega ${b.numero}`}>
                        Bodega #{b.numero} {b.metrosCuadrados ? `(${b.metrosCuadrados} m²)` : ''} {b.ubicacion ? `- ${b.ubicacion}` : ''}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}

            {unidadSeleccionada && (
              <p className="text-[11px] text-primary/80">
                ✓ Características técnicas y contacto principal precargados automáticamente. Puedes editarlos libremente abajo.
              </p>
            )}
          </div>
        ) : !cargandoCenso && unidadesCenso.length === 0 ? (
          <div className="alert alert-info text-xs">
            <span className="icon-[tabler--info-circle] text-base" />
            <span>Modo Tradicional (Legacy): Edificio sin unidades censadas. Puedes registrar los datos manualmente.</span>
          </div>
        ) : null}

        {/* Tipo y Transacción */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="form-control">
            <span className="label-text">Tipo *</span>
            <select
              className="select select-bordered"
              value={form.tipo}
              onChange={(e) => {
                const t = e.target.value;
                setForm({ ...form, tipo: t });
                setItemAsignadoRef('');
              }}
            >
              {TIPOS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="form-control">
            <span className="label-text">Transacción *</span>
            <select
              className="select select-bordered"
              value={form.transaccion}
              onChange={(e) => setForm({ ...form, transaccion: e.target.value })}
            >
              {TRANSACCIONES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Precio y Teléfono */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="form-control">
            <span className="label-text">Precio (COP) *</span>
            <input
              type="number"
              min="1"
              className="input input-bordered"
              value={form.precio}
              onChange={(e) => setForm({ ...form, precio: e.target.value })}
              placeholder="Ej: 1500000"
              required
            />
          </label>
          <label className="form-control">
            <span className="label-text">Teléfono de Contacto *</span>
            <input
              type="tel"
              className="input input-bordered"
              value={form.telefono}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })}
              placeholder="+57 3001234567"
              required
            />
          </label>
        </div>

        {/* Metros y Piso */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="form-control">
            <span className="label-text">Metros²</span>
            <input
              type="number"
              step="any"
              min="1"
              className="input input-bordered"
              value={form.metrosCuadrados}
              onChange={(e) => setForm({ ...form, metrosCuadrados: e.target.value })}
              placeholder="Ej: 65"
            />
          </label>
          <label className="form-control">
            <span className="label-text">Piso</span>
            <input
              type="number"
              min="0"
              className="input input-bordered"
              value={form.piso}
              onChange={(e) => setForm({ ...form, piso: e.target.value })}
              placeholder="Ej: 3"
            />
          </label>
        </div>

        {/* Características según tipo */}
        <div className="space-y-2">
          <p className="label-text font-medium">Características del Bien</p>
          <div className="flex flex-wrap gap-4">
            {form.tipo === 'inmueble' && (
              <label className="label cursor-pointer gap-2">
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm"
                  checked={form.parqueadero}
                  onChange={(e) => setForm({ ...form, parqueadero: e.target.checked })}
                />
                <span className="label-text text-xs sm:text-sm">Con parqueadero</span>
              </label>
            )}
            {(form.tipo === 'inmueble' || form.tipo === 'habitacion') && (
              <>
                <label className="label cursor-pointer gap-2">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm"
                    checked={form.balcon}
                    onChange={(e) => setForm({ ...form, balcon: e.target.checked })}
                  />
                  <span className="label-text text-xs sm:text-sm">Balcón</span>
                </label>
                <label className="label cursor-pointer gap-2">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm"
                    checked={form.amoblado}
                    onChange={(e) => setForm({ ...form, amoblado: e.target.checked })}
                  />
                  <span className="label-text text-xs sm:text-sm">Amoblado</span>
                </label>
              </>
            )}
            {form.tipo === 'inmueble' && (
              <label className="label cursor-pointer gap-2">
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm"
                  checked={form.deposito}
                  onChange={(e) => setForm({ ...form, deposito: e.target.checked })}
                />
                <span className="label-text text-xs sm:text-sm">Depósito / Bodega</span>
              </label>
            )}
            {form.tipo === 'parqueadero' && (
              <label className="label cursor-pointer gap-2">
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm"
                  checked={form.cubierto}
                  onChange={(e) => setForm({ ...form, cubierto: e.target.checked })}
                />
                <span className="label-text text-xs sm:text-sm">Cubierto</span>
              </label>
            )}
          </div>
        </div>

        {/* Email */}
        <label className="form-control">
          <span className="label-text">Email de Contacto (opcional)</span>
          <input
            type="email"
            className="input input-bordered"
            value={form.emailContacto}
            onChange={(e) => setForm({ ...form, emailContacto: e.target.value })}
            placeholder="contacto@ejemplo.com"
          />
        </label>

        {/* Observación */}
        <label className="form-control">
          <span className="label-text">Descripción y Observaciones</span>
          <textarea
            className="textarea textarea-bordered"
            rows={3}
            maxLength={1000}
            value={form.observacion}
            onChange={(e) => setForm({ ...form, observacion: e.target.value })}
            placeholder="Detalles adicionales, amenidades, condiciones de arriendo..."
          />
          <span className="label-text-alt text-right">{form.observacion.length}/1000</span>
        </label>

        {/* Imágenes */}
        <label className="form-control">
          <span className="label-text">Fotografías (1-10, jpg/png/webp, máx 5MB c/u)</span>
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFiles}
            className="file-input file-input-bordered w-full"
          />
        </label>
        {previews.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {previews.map((src, idx) => (
              <div key={idx} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`preview ${idx}`} className="w-full h-24 object-cover rounded-lg border border-base-200" />
                <button
                  type="button"
                  onClick={() => removeFile(idx)}
                  className="btn btn-circle btn-xs btn-error absolute -top-2 -right-2"
                >
                  <span className="icon-[tabler--x] text-xs" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
          <button type="submit" disabled={saving} className="btn btn-primary w-full sm:w-auto">
            {saving ? <span className="loading loading-spinner"></span> : 'Publicar'}
          </button>
          <button type="button" onClick={() => router.back()} className="btn btn-outline w-full sm:w-auto">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
