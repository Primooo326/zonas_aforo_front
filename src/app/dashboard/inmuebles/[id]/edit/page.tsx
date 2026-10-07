'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { apiFetch, API_URL } from '@/lib/api';

const TIPOS = ['inmueble', 'parqueadero', 'habitacion'] as const;
const TRANSACCIONES = ['venta', 'arriendo'] as const;

export default function EditInmueblePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [loading, setLoading] = useState(true);
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
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [censoInfo, setCensoInfo] = useState<{
    censoUnidadId?: string;
    torre?: string;
    numeroApto?: string;
    identificador?: string;
    itemAsignadoRef?: string;
  } | null>(null);

  useEffect(() => {
    apiFetch(`/inmuebles/${id}`)
      .then((data: any) => {
        setForm({
          tipo: data.tipo,
          transaccion: data.transaccion,
          metrosCuadrados: data.metrosCuadrados?.toString() || '',
          piso: data.piso?.toString() || '',
          parqueadero: !!data.parqueadero,
          balcon: !!data.balcon,
          deposito: !!data.deposito,
          amoblado: !!data.amoblado,
          cubierto: !!data.cubierto,
          precio: data.precio?.toString() || '',
          telefono: data.telefono || '',
          emailContacto: data.emailContacto || '',
          observacion: data.observacion || '',
        });
        setExistingImages(data.imagenes || []);
        if (data.censoUnidadId || data.identificador) {
          setCensoInfo({
            censoUnidadId: typeof data.censoUnidadId === 'object' ? data.censoUnidadId?._id : data.censoUnidadId,
            torre: data.torre,
            numeroApto: data.numeroApto,
            identificador: data.identificador,
            itemAsignadoRef: data.itemAsignadoRef,
          });
        }
      })
      .catch(() => setError('No se pudo cargar la publicación'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (existingImages.length + files.length + selected.length > 10) {
      setError('Máximo 10 imágenes en total');
      return;
    }
    for (const f of selected) {
      if (f.size > 5 * 1024 * 1024) {
        setError(`Imagen ${f.name} excede 5MB`);
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) {
        setError(`Formato no permitido: ${f.name}`);
        return;
      }
    }
    const newFiles = [...files, ...selected];
    setFiles(newFiles);
    const newPreviews = selected.map((f) => URL.createObjectURL(f));
    setPreviews((prev) => [...prev, ...newPreviews]);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.observacion.length > 1000) {
      setError('Observación máximo 1000 caracteres');
      return;
    }
    setSaving(true);
    setError('');
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
      if (censoInfo?.censoUnidadId) fd.append('censoUnidadId', censoInfo.censoUnidadId);
      if (censoInfo?.torre) fd.append('torre', censoInfo.torre);
      if (censoInfo?.numeroApto) fd.append('numeroApto', censoInfo.numeroApto);
      if (censoInfo?.identificador) fd.append('identificador', censoInfo.identificador);
      if (censoInfo?.itemAsignadoRef) fd.append('itemAsignadoRef', censoInfo.itemAsignadoRef);
      // Mantener imágenes existentes
      if (existingImages.length > 0) fd.append('imagenes', JSON.stringify(existingImages));
      files.forEach((f) => fd.append('imagenes', f));
      await apiFetch(`/inmuebles/${id}`, { method: 'PATCH', body: fd as any });
      router.push('/dashboard/inmuebles');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><span className="loading loading-spinner loading-lg"></span></div>;

  const getImageUrl = (img: string) => (img.startsWith('/uploads') ? `${API_URL.replace('/api', '')}${img}` : img);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Editar Publicación</h1>
        <p className="text-xs sm:text-sm text-base-content/60">
          Modifica los detalles, precio o fotografías de la oferta
        </p>
      </div>

      {error && <div className="alert alert-error text-sm">{error}</div>}

      {censoInfo && (
        <div className="bg-primary/5 border border-primary/20 rounded-box p-3 sm:p-4 flex items-center justify-between gap-3 text-xs sm:text-sm">
          <div className="flex items-center gap-2 text-primary font-medium">
            <span className="icon-[tabler--database-check] text-lg" />
            <span>
              Inmueble Vinculado: <strong>{censoInfo.identificador || `${censoInfo.torre ? censoInfo.torre + ' - ' : ''}Apto ${censoInfo.numeroApto}`}</strong>
              {censoInfo.itemAsignadoRef ? ` (${censoInfo.itemAsignadoRef})` : ''}
            </span>
          </div>
          {censoInfo.censoUnidadId && (
            <a
              href={`/dashboard/censo/${censoInfo.censoUnidadId}`}
              target="_blank"
              rel="noreferrer"
              className="btn btn-xs btn-outline btn-primary gap-1"
            >
              <span className="icon-[tabler--external-link] text-xs" />
              Ver Ficha
            </a>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card bg-base-100 shadow-sm p-4 sm:p-6 space-y-4 border border-base-200">
        <div className="grid grid-cols-2 gap-4">
          <label className="form-control">
            <span className="label-text">Tipo *</span>
            <select className="select select-bordered" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
              {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label className="form-control">
            <span className="label-text">Transacción *</span>
            <select className="select select-bordered" value={form.transaccion} onChange={(e) => setForm({ ...form, transaccion: e.target.value })}>
              {TRANSACCIONES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <label className="form-control">
            <span className="label-text">Precio *</span>
            <input type="number" className="input input-bordered" value={form.precio} onChange={(e) => setForm({ ...form, precio: e.target.value })} required />
          </label>
          <label className="form-control">
            <span className="label-text">Teléfono *</span>
            <input type="tel" className="input input-bordered" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} required />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <label className="form-control">
            <span className="label-text">Metros²</span>
            <input type="number" step="any" className="input input-bordered" value={form.metrosCuadrados} onChange={(e) => setForm({ ...form, metrosCuadrados: e.target.value })} />
          </label>
          <label className="form-control">
            <span className="label-text">Piso</span>
            <input type="number" className="input input-bordered" value={form.piso} onChange={(e) => setForm({ ...form, piso: e.target.value })} />
          </label>
        </div>
        <div className="space-y-2">
          <p className="label-text font-medium">Características</p>
          <div className="flex flex-wrap gap-4">
            {form.tipo === 'inmueble' && <label className="label cursor-pointer gap-2"><input type="checkbox" className="checkbox checkbox-sm" checked={form.parqueadero} onChange={(e) => setForm({ ...form, parqueadero: e.target.checked })} /><span className="label-text">Con parqueadero</span></label>}
            {(form.tipo === 'inmueble' || form.tipo === 'habitacion') && <>
              <label className="label cursor-pointer gap-2"><input type="checkbox" className="checkbox checkbox-sm" checked={form.balcon} onChange={(e) => setForm({ ...form, balcon: e.target.checked })} /><span className="label-text">Balcón</span></label>
              <label className="label cursor-pointer gap-2"><input type="checkbox" className="checkbox checkbox-sm" checked={form.amoblado} onChange={(e) => setForm({ ...form, amoblado: e.target.checked })} /><span className="label-text">Amoblado</span></label>
            </>}
            {form.tipo === 'inmueble' && <label className="label cursor-pointer gap-2"><input type="checkbox" className="checkbox checkbox-sm" checked={form.deposito} onChange={(e) => setForm({ ...form, deposito: e.target.checked })} /><span className="label-text">Depósito</span></label>}
            {form.tipo === 'parqueadero' && <label className="label cursor-pointer gap-2"><input type="checkbox" className="checkbox checkbox-sm" checked={form.cubierto} onChange={(e) => setForm({ ...form, cubierto: e.target.checked })} /><span className="label-text">Cubierto</span></label>}
          </div>
        </div>
        <label className="form-control">
          <span className="label-text">Email contacto</span>
          <input type="email" className="input input-bordered" value={form.emailContacto} onChange={(e) => setForm({ ...form, emailContacto: e.target.value })} />
        </label>
        <label className="form-control">
          <span className="label-text">Observación</span>
          <textarea className="textarea textarea-bordered" rows={3} maxLength={1000} value={form.observacion} onChange={(e) => setForm({ ...form, observacion: e.target.value })} />
          <span className="label-text-alt text-right">{form.observacion.length}/1000</span>
        </label>
        {existingImages.length > 0 && (
          <div>
            <p className="label-text mb-2">Imágenes actuales</p>
            <div className="grid grid-cols-3 gap-2">
              {existingImages.map((img, idx) => (
                <div key={idx} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={getImageUrl(img)} alt={`exist ${idx}`} className="w-full h-24 object-cover rounded" />
                  <button type="button" onClick={() => setExistingImages((prev) => prev.filter((_, i) => i !== idx))} className="btn btn-circle btn-xs btn-error absolute -top-2 -right-2">×</button>
                </div>
              ))}
            </div>
          </div>
        )}
        <label className="form-control">
          <span className="label-text">Agregar imágenes (max 10 total, 5MB)</span>
          <input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={handleFiles} className="file-input file-input-bordered" />
        </label>
        {previews.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {previews.map((src, idx) => (
              <div key={idx} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`new ${idx}`} className="w-full h-24 object-cover rounded" />
                <button type="button" onClick={() => { setFiles((p) => p.filter((_, i) => i !== idx)); setPreviews((p) => { URL.revokeObjectURL(p[idx]); return p.filter((_, i) => i !== idx); }); }} className="btn btn-circle btn-xs btn-error absolute -top-2 -right-2">×</button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving} className="btn btn-primary">{saving ? <span className="loading loading-spinner"></span> : 'Guardar'}</button>
          <button type="button" onClick={() => router.back()} className="btn btn-outline">Cancelar</button>
        </div>
      </form>
    </div>
  );
}
