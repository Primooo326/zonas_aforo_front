'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';

const TIPOS = ['inmueble', 'parqueadero', 'habitacion'] as const;
const TRANSACCIONES = ['venta', 'arriendo'] as const;

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
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

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
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Nueva Publicación</h1>
      {error && <div className="alert alert-error mb-4 text-sm">{error}</div>}
      <form onSubmit={handleSubmit} className="card bg-base-100 shadow-sm p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <label className="form-control">
            <span className="label-text">Tipo *</span>
            <select className="select select-bordered" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
              {TIPOS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="form-control">
            <span className="label-text">Transacción *</span>
            <select className="select select-bordered" value={form.transaccion} onChange={(e) => setForm({ ...form, transaccion: e.target.value })}>
              {TRANSACCIONES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <label className="form-control">
            <span className="label-text">Precio *</span>
            <input type="number" min="1" className="input input-bordered" value={form.precio} onChange={(e) => setForm({ ...form, precio: e.target.value })} required />
          </label>
          <label className="form-control">
            <span className="label-text">Teléfono *</span>
            <input type="tel" className="input input-bordered" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} placeholder="+57 3001234567" required />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <label className="form-control">
            <span className="label-text">Metros²</span>
            <input type="number" min="1" className="input input-bordered" value={form.metrosCuadrados} onChange={(e) => setForm({ ...form, metrosCuadrados: e.target.value })} />
          </label>
          <label className="form-control">
            <span className="label-text">Piso</span>
            <input type="number" min="0" className="input input-bordered" value={form.piso} onChange={(e) => setForm({ ...form, piso: e.target.value })} />
          </label>
        </div>

        {/* Campos condicionales */}
        <div className="space-y-2">
          <p className="label-text font-medium">Características (según tipo)</p>
          <div className="flex flex-wrap gap-4">
            {form.tipo === 'inmueble' && (
              <label className="label cursor-pointer gap-2">
                <input type="checkbox" className="checkbox checkbox-sm" checked={form.parqueadero} onChange={(e) => setForm({ ...form, parqueadero: e.target.checked })} />
                <span className="label-text">Con parqueadero</span>
              </label>
            )}
            {(form.tipo === 'inmueble' || form.tipo === 'habitacion') && (
              <>
                <label className="label cursor-pointer gap-2">
                  <input type="checkbox" className="checkbox checkbox-sm" checked={form.balcon} onChange={(e) => setForm({ ...form, balcon: e.target.checked })} />
                  <span className="label-text">Balcón</span>
                </label>
                <label className="label cursor-pointer gap-2">
                  <input type="checkbox" className="checkbox checkbox-sm" checked={form.amoblado} onChange={(e) => setForm({ ...form, amoblado: e.target.checked })} />
                  <span className="label-text">Amoblado</span>
                </label>
              </>
            )}
            {form.tipo === 'inmueble' && (
              <label className="label cursor-pointer gap-2">
                <input type="checkbox" className="checkbox checkbox-sm" checked={form.deposito} onChange={(e) => setForm({ ...form, deposito: e.target.checked })} />
                <span className="label-text">Depósito</span>
              </label>
            )}
            {form.tipo === 'parqueadero' && (
              <label className="label cursor-pointer gap-2">
                <input type="checkbox" className="checkbox checkbox-sm" checked={form.cubierto} onChange={(e) => setForm({ ...form, cubierto: e.target.checked })} />
                <span className="label-text">Cubierto</span>
              </label>
            )}
          </div>
        </div>

        <label className="form-control">
          <span className="label-text">Email contacto (opcional)</span>
          <input type="email" className="input input-bordered" value={form.emailContacto} onChange={(e) => setForm({ ...form, emailContacto: e.target.value })} />
        </label>

        <label className="form-control">
          <span className="label-text">Observación</span>
          <textarea className="textarea textarea-bordered" rows={3} maxLength={1000} value={form.observacion} onChange={(e) => setForm({ ...form, observacion: e.target.value })} placeholder="Detalles adicionales..." />
          <span className="label-text-alt text-right">{form.observacion.length}/1000</span>
        </label>

        <label className="form-control">
          <span className="label-text">Imágenes (1-10, jpg/png/webp, max 5MB c/u)</span>
          <input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={handleFiles} className="file-input file-input-bordered" />
        </label>
        {previews.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {previews.map((src, idx) => (
              <div key={idx} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`preview ${idx}`} className="w-full h-24 object-cover rounded" />
                <button type="button" onClick={() => removeFile(idx)} className="btn btn-circle btn-xs btn-error absolute -top-2 -right-2">
                  <span className="icon-[tabler--x] text-xs" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving} className="btn btn-primary">
            {saving ? <span className="loading loading-spinner"></span> : 'Publicar'}
          </button>
          <button type="button" onClick={() => router.back()} className="btn btn-outline">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
