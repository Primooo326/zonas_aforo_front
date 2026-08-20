'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';

interface Horario {
  dia: string;
  inicio: string;
  fin: string;
}

interface Zona {
  _id: string;
  nombre: string;
  descripcion?: string;
  aforoMaximo: number;
  lapsoMinutos: number;
  horarios?: Horario[];
}

export default function ZonasPage() {
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [loading, setLoading] = useState(true);

  const cargar = () => {
    apiFetch('/zonas')
      .then(setZonas)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

  const eliminar = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar la zona "${nombre}"?`)) return;
    try {
      await apiFetch(`/zonas/${id}`, { method: 'DELETE' });
      cargar();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al eliminar la zona');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Zonas</h1>
        <Link href="/dashboard/zonas/create" className="btn btn-primary">
          <span className="icon-[tabler--plus] text-lg" aria-hidden="true" />
          Nueva Zona
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      ) : zonas.length === 0 ? (
        <div className="bg-base-100 rounded-box shadow-sm p-12 text-center">
          <p className="text-base-content/60 mb-4">No hay zonas registradas</p>
          <Link href="/dashboard/zonas/create" className="btn btn-primary">
            <span className="icon-[tabler--plus] text-lg" aria-hidden="true" />
            Crear primera zona
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {zonas.map((z) => (
            <div key={z._id} className="card bg-base-100 shadow-sm">
              <div className="card-body">
                <h3 className="card-title">{z.nombre}</h3>
                {z.descripcion && <p className="text-sm text-base-content/60">{z.descripcion}</p>}
                <div className="flex flex-wrap gap-2 text-sm mt-2">
                  <span className="badge badge-outline">Aforo: {z.aforoMaximo}</span>
                  <span className="badge badge-outline">Lapso: {z.lapsoMinutos} min</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {(z.horarios || []).map((h) => (
                    <span key={h.dia} className="badge badge-xs badge-success">
                      {h.dia}: {h.inicio} - {h.fin}
                    </span>
                  ))}
                </div>
                <div className="card-actions justify-end mt-3">
                  <Link href={`/dashboard/zonas/${z._id}/edit`} className="btn btn-ghost btn-sm">
                    Editar
                  </Link>
                  <button onClick={() => eliminar(z._id, z.nombre)} className="btn btn-ghost btn-sm text-error">
                    <span className="icon-[tabler--trash] text-lg" aria-hidden="true" />
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
