"use client";

import { use, useEffect, useState } from 'react';
import { apiFetch, API_URL } from '@/lib/api';
import Link from 'next/link';

interface Inmueble {
  _id: string;
  edificioId?: string;
  tipo: string;
  transaccion: string;
  precio: number;
  metrosCuadrados?: number;
  piso?: number;
  parqueadero?: boolean;
  balcon?: boolean;
  deposito?: boolean;
  amoblado?: boolean;
  cubierto?: boolean;
  telefono: string;
  emailContacto?: string;
  observacion?: string;
  imagenes: string[];
  estado: string;
  censoUnidadId?: string | { _id: string; identificador?: string };
  torre?: string;
  numeroApto?: string;
  identificador?: string;
  itemAsignadoRef?: string;
}

export default function DetalleInmueblePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [item, setItem] = useState<Inmueble | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeIdx, setActiveIdx] = useState(0);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    apiFetch(`/inmuebles/${id}`)
      .then(setItem)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  const compartir = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: item ? `${item.tipo} en ${item.transaccion}` : 'Inmueble', url });
        return;
      } catch {}
    }
    await navigator.clipboard.writeText(url);
    alert('Link copiado al portapapeles');
  };

  const getImageUrl = (img: string) => (img.startsWith('/uploads') ? `${API_URL.replace('/api', '')}${img}` : img);

  if (loading) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }
  if (notFound || !item) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="bg-base-100 rounded-box shadow-sm p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold mb-4">Inmueble no encontrado</h1>
          <p className="text-base-content/60">El enlace no es válido o la publicación ya no existe.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {item.edificioId && (
          <div className="mb-4">
            <Link
              href={`/inmuebles/${item.edificioId}`}
              className="btn btn-outline btn-sm gap-2"
            >
              <span className="icon-[tabler--arrow-left] text-lg" aria-hidden="true" />
              Volver al catálogo del edificio
            </Link>
          </div>
        )}
        <div className="bg-base-100 rounded-box shadow-sm overflow-hidden">
          {/* Galería */}
          {item.imagenes.length > 0 ? (
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={getImageUrl(item.imagenes[activeIdx])} alt={`${item.tipo} ${activeIdx}`} className="w-full h-80 object-cover" />
              {item.imagenes.length > 1 && (
                <div className="flex gap-2 p-3 overflow-x-auto">
                  {item.imagenes.map((img, idx) => (
                    <button key={idx} onClick={() => setActiveIdx(idx)} className={`w-20 h-20 rounded overflow-hidden border-2 ${idx === activeIdx ? 'border-primary' : 'border-transparent'}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={getImageUrl(img)} alt={`thumb ${idx}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="w-full h-80 bg-base-200 flex items-center justify-center">
              <span className="icon-[tabler--photo] text-6xl text-base-content/20" aria-hidden="true" />
            </div>
          )}

          <div className="p-6 space-y-4">
            <div className="flex flex-wrap gap-2">
              <span className="badge badge-primary">{item.tipo}</span>
              <span className="badge badge-outline">{item.transaccion}</span>
              <span className={`badge ${item.estado === 'activa' ? 'badge-success' : 'badge-error'}`}>{item.estado}</span>
            </div>

            {(item.identificador || item.numeroApto) && (
              <div className="flex items-center gap-2 text-base font-semibold text-primary">
                <span className="icon-[tabler--door] text-xl" />
                <span>{item.identificador || `${item.torre ? item.torre + ' - ' : ''}Apto ${item.numeroApto}`}</span>
                {item.itemAsignadoRef && (
                  <span className="badge badge-outline badge-sm">{item.itemAsignadoRef}</span>
                )}
              </div>
            )}

            <h1 className="text-3xl font-bold">${item.precio.toLocaleString('es-CO')}</h1>
            <p className="text-sm text-base-content/60">
              {item.transaccion === 'venta' ? 'En venta' : 'En arriendo'} • {item.tipo}
            </p>

            <div className="grid grid-cols-2 gap-3 text-sm">
              {item.metrosCuadrados && <div><span className="font-medium">Metros²:</span> {item.metrosCuadrados}</div>}
              {item.piso !== undefined && <div><span className="font-medium">Piso:</span> {item.piso}</div>}
              {item.parqueadero !== undefined && <div><span className="font-medium">Parqueadero:</span> {item.parqueadero ? 'Sí' : 'No'}</div>}
              {item.balcon !== undefined && <div><span className="font-medium">Balcón:</span> {item.balcon ? 'Sí' : 'No'}</div>}
              {item.deposito !== undefined && <div><span className="font-medium">Depósito:</span> {item.deposito ? 'Sí' : 'No'}</div>}
              {item.amoblado !== undefined && <div><span className="font-medium">Amoblado:</span> {item.amoblado ? 'Sí' : 'No'}</div>}
              {item.cubierto !== undefined && <div><span className="font-medium">Cubierto:</span> {item.cubierto ? 'Sí' : 'No'}</div>}
            </div>

            <div className="bg-base-200 rounded-lg p-4">
              <h3 className="font-semibold mb-2">Contacto</h3>
              <p className="text-sm"><span className="icon-[tabler--phone] text-sm" aria-hidden="true" /> {item.telefono}</p>
              {item.emailContacto && <p className="text-sm"><span className="icon-[tabler--mail] text-sm" aria-hidden="true" /> {item.emailContacto}</p>}
            </div>

            {item.observacion && (
              <div>
                <h3 className="font-semibold mb-2">Observación</h3>
                <p className="text-sm text-base-content/80 whitespace-pre-wrap">{item.observacion}</p>
              </div>
            )}

            <button onClick={compartir} className="btn btn-primary w-full">
              <span className="icon-[tabler--share] text-lg" aria-hidden="true" /> Compartir
            </button>
            <p className="text-xs text-center text-base-content/50">Comparte este inmueble con quien esté interesado</p>
          </div>
        </div>
      </div>
    </div>
  );
}
