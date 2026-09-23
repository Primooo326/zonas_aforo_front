'use client';

import { useEffect, useState } from 'react';
import { apiFetch, API_URL } from '@/lib/api';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import QRCode from 'qrcode';

interface Inmueble {
  _id: string;
  tipo: string;
  transaccion: string;
  precio: number;
  metrosCuadrados?: number;
  piso?: number;
  telefono: string;
  observacion?: string;
  imagenes: string[];
  estado: string;
  createdAt: string;
}

const tipoBadge = (tipo: string) => {
  switch (tipo) {
    case 'inmueble':
      return 'badge-primary';
    case 'parqueadero':
      return 'badge-warning';
    case 'habitacion':
      return 'badge-info';
    default:
      return 'badge-ghost';
  }
};

export default function InmueblesPage() {
  const { edificio } = useAuth();
  const [inmuebles, setInmuebles] = useState<Inmueble[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroTrans, setFiltroTrans] = useState('');
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [copied, setCopied] = useState(false);

  const publicUrl = typeof window !== 'undefined' && edificio?.id
    ? `${window.location.origin}/inmuebles/${edificio.id}`
    : '';

  useEffect(() => {
    if (edificio?.id) {
      QRCode.toDataURL(`${window.location.origin}/inmuebles/${edificio.id}`)
        .then(setQrCodeUrl)
        .catch(console.error);
    }
  }, [edificio?.id]);

  const copiarLink = () => {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const descargarQR = () => {
    if (!qrCodeUrl || !edificio) return;
    const a = document.createElement('a');
    a.href = qrCodeUrl;
    a.download = `venta-arriendo-qr-${edificio.nombre || edificio.id}.png`;
    a.click();
  };

  const cargar = () => {
    if (!edificio) return;
    const params = new URLSearchParams({ edificioId: edificio.id });
    if (filtroTipo) params.set('tipo', filtroTipo);
    if (filtroTrans) params.set('transaccion', filtroTrans);
    apiFetch(`/inmuebles?${params.toString()}`)
      .then(setInmuebles)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edificio, filtroTipo, filtroTrans]);

  const eliminar = async (id: string) => {
    if (!confirm('¿Eliminar esta publicación?')) return;
    try {
      await apiFetch(`/inmuebles/${id}`, { method: 'DELETE' });
      cargar();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al eliminar');
    }
  };

  const getImageUrl = (img: string) => {
    if (img.startsWith('/uploads')) return `${API_URL.replace('/api', '')}${img}`;
    return img;
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Venta y Arriendo</h1>
          <p className="text-xs sm:text-sm text-base-content/60">
            Gestiona las ofertas en venta y arriendo de tu edificio
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {edificio?.id && (
            <>
              <button
                type="button"
                onClick={() => setQrModalOpen(true)}
                className="btn btn-sm btn-outline btn-primary flex-1 sm:flex-initial gap-1.5"
              >
                <span className="icon-[tabler--qrcode] text-base" aria-hidden="true" />
                <span>Código QR & Link</span>
              </button>
              <Link
                href={`/inmuebles/${edificio.id}`}
                target="_blank"
                className="btn btn-sm btn-outline flex-1 sm:flex-initial gap-1.5"
              >
                <span className="icon-[tabler--external-link] text-base" aria-hidden="true" />
                <span>Ver Catálogo</span>
              </Link>
            </>
          )}
          <Link
            href="/dashboard/inmuebles/nuevo"
            className="btn btn-sm btn-primary w-full sm:w-auto gap-1.5"
          >
            <span className="icon-[tabler--plus] text-base" aria-hidden="true" />
            <span>Nueva Publicación</span>
          </Link>
        </div>
      </div>

      {/* Modal QR */}
      {qrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-base-100 rounded-box shadow-xl max-w-md w-full p-5 sm:p-6 space-y-4 animate-in fade-in duration-200">
            <div className="flex justify-between items-center">
              <h3 className="text-base sm:text-lg font-bold">Catálogo de Venta y Arriendo</h3>
              <button
                type="button"
                onClick={() => setQrModalOpen(false)}
                className="btn btn-ghost btn-sm btn-circle"
              >
                ✕
              </button>
            </div>
            <p className="text-xs sm:text-sm text-base-content/70">
              Comparte este código QR o enlace para que los interesados puedan consultar las ofertas de tu edificio sin necesidad de iniciar sesión.
            </p>

            <div className="flex flex-col items-center bg-base-200 rounded-box p-4">
              {qrCodeUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrCodeUrl}
                  alt="QR Inmuebles"
                  className="w-44 h-44 sm:w-48 sm:h-48 bg-white p-2 rounded-lg shadow-2xs"
                />
              ) : (
                <div className="w-44 h-44 sm:w-48 sm:h-48 bg-base-300 rounded-lg flex items-center justify-center">
                  <span className="loading loading-spinner"></span>
                </div>
              )}
              <button
                type="button"
                onClick={descargarQR}
                className="btn btn-xs sm:btn-sm btn-outline mt-3 gap-1.5"
              >
                <span className="icon-[tabler--download] text-sm" aria-hidden="true" />
                Descargar QR (PNG)
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-base-content/70">Enlace público</label>
              <div className="join w-full">
                <input
                  type="text"
                  className="input input-bordered input-sm join-item flex-1 text-xs"
                  value={publicUrl}
                  readOnly
                />
                <button
                  type="button"
                  className={`btn btn-sm join-item ${copied ? 'btn-success' : 'btn-primary'}`}
                  onClick={copiarLink}
                >
                  <span className="icon-[tabler--copy] text-base" aria-hidden="true" />
                  {copied ? 'Copiado' : 'Copiar'}
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => window.open(publicUrl, '_blank')}
                className="btn btn-outline btn-primary btn-sm flex-1 gap-1.5"
              >
                <span className="icon-[tabler--external-link] text-base" aria-hidden="true" />
                Abrir en nueva pestaña
              </button>
              <button
                type="button"
                onClick={() => setQrModalOpen(false)}
                className="btn btn-outline btn-sm"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barra de Filtros */}
      <div className="bg-base-100 p-3.5 rounded-box shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="select select-bordered select-sm w-full sm:w-auto text-xs"
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
          >
            <option value="">Todos los tipos</option>
            <option value="inmueble">Inmueble</option>
            <option value="parqueadero">Parqueadero</option>
            <option value="habitacion">Habitación</option>
          </select>
          <select
            className="select select-bordered select-sm w-full sm:w-auto text-xs"
            value={filtroTrans}
            onChange={(e) => setFiltroTrans(e.target.value)}
          >
            <option value="">Venta / Arriendo</option>
            <option value="venta">Venta</option>
            <option value="arriendo">Arriendo</option>
          </select>
        </div>
        <div className="text-xs text-base-content/60 text-right sm:text-left">
          {inmuebles.length} {inmuebles.length === 1 ? 'publicación' : 'publicaciones'}
        </div>
      </div>

      {/* Listado */}
      {loading ? (
        <div className="flex justify-center py-16">
          <span className="loading loading-spinner loading-lg text-primary"></span>
        </div>
      ) : inmuebles.length === 0 ? (
        <div className="bg-base-100 rounded-box shadow-sm p-8 sm:p-12 text-center">
          <div className="flex justify-center mb-3">
            <span className="icon-[tabler--building] text-5xl text-base-content/30" aria-hidden="true" />
          </div>
          <p className="text-base-content/60 mb-4 text-sm">No hay publicaciones registradas</p>
          <Link href="/dashboard/inmuebles/nuevo" className="btn btn-primary btn-sm gap-1.5">
            <span className="icon-[tabler--plus] text-base" aria-hidden="true" />
            Crear primera publicación
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {inmuebles.map((item) => (
            <div
              key={item._id}
              className="card bg-base-100 shadow-sm hover:shadow-md transition-all duration-200 border border-base-200 flex flex-col overflow-hidden"
            >
              {/* Thumbnail */}
              <div className="relative w-full h-44 sm:h-48 bg-base-200 overflow-hidden">
                {item.imagenes[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={getImageUrl(item.imagenes[0])}
                    alt={item.tipo}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-base-content/30">
                    <span className="icon-[tabler--photo] text-5xl" aria-hidden="true" />
                    <span className="text-xs mt-1">Sin fotografía</span>
                  </div>
                )}
                {/* Badges superpuestos */}
                <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
                  <span className={`badge badge-sm font-semibold shadow-xs ${tipoBadge(item.tipo)}`}>
                    {item.tipo}
                  </span>
                  <span className="badge badge-sm badge-neutral font-semibold shadow-xs">
                    {item.transaccion}
                  </span>
                  <span
                    className={`badge badge-sm ${item.estado === 'activa' ? 'badge-success' : 'badge-error'}`}
                  >
                    {item.estado}
                  </span>
                </div>
              </div>

              {/* Contenido Card */}
              <div className="card-body p-4 sm:p-5 flex flex-col flex-1 justify-between gap-3">
                <div>
                  <div className="flex items-baseline justify-between gap-2 mb-1.5">
                    <h3 className="card-title text-lg font-bold text-primary">
                      ${item.precio.toLocaleString('es-CO')}
                    </h3>
                    <span className="text-xs text-base-content/60">COP</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 text-xs text-base-content/70 mb-2">
                    {item.metrosCuadrados && (
                      <span className="badge badge-neutral badge-xs">
                        {item.metrosCuadrados} m²
                      </span>
                    )}
                    {item.piso !== undefined && (
                      <span className="badge badge-neutral badge-xs">
                        Piso {item.piso}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-base-content/70 mb-2">
                    <span className="icon-[tabler--phone] text-primary" aria-hidden="true" />
                    <span>{item.telefono}</span>
                  </div>

                  {item.observacion && (
                    <p className="text-xs text-base-content/70 line-clamp-2 leading-relaxed">
                      {item.observacion}
                    </p>
                  )}
                </div>

                {/* Acciones */}
                <div className="pt-3 border-t border-base-200 flex items-center justify-end gap-2">
                  <Link
                    href={`/dashboard/inmuebles/${item._id}/edit`}
                    className="btn btn-outline btn-sm gap-1"
                  >
                    <span className="icon-[tabler--edit] text-base" aria-hidden="true" />
                    Editar
                  </Link>
                  <button
                    onClick={() => eliminar(item._id)}
                    className="btn btn-outline btn-error btn-sm gap-1"
                  >
                    <span className="icon-[tabler--trash] text-base" aria-hidden="true" />
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
