'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';
import QRCode from 'qrcode';

export default function ZonasPage() {
  const [zonas, setZonas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrZona, setQrZona] = useState<any>(null);
  const [qrDataUrl, setQrDataUrl] = useState('');

  const cargar = () => {
    setLoading(true);
    apiFetch('/zonas')
      .then(setZonas)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

  const mostrarQr = async (zona: any) => {
    setQrZona(zona);
    setQrDataUrl('');
    const url = `${window.location.origin}/solicitar/${zona.edificioId}`;
    const dataUrl = await QRCode.toDataURL(url, { width: 300, margin: 2 });
    setQrDataUrl(dataUrl);
  };

  const descargarQr = () => {
    const link = document.createElement('a');
    link.download = `qr-${qrZona.nombre}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  const compartirLink = async () => {
    const url = `${window.location.origin}/solicitar/${qrZona.edificioId}`;
    if (navigator.share) {
      await navigator.share({ title: qrZona.nombre, url });
    } else {
      await navigator.clipboard.writeText(url);
      alert('Link copiado al portapapeles');
    }
  };

  const eliminar = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar la zona "${nombre}"?`)) return;
    try {
      await apiFetch(`/zonas/${id}`, { method: 'DELETE' });
      cargar();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Zonas</h1>
        <Link href="/dashboard/zonas/create" className="btn btn-primary">
          + Nueva Zona
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
                  <span className="badge badge-outline">{z.horarioInicio} - {z.horarioFin}</span>
                  <span className="badge badge-outline">Aforo: {z.aforoMaximo}</span>
                  <span className="badge badge-outline">Lapso: {z.lapsoMinutos} min</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {DIAS.map((d) => (
                    <span key={d} className={`badge badge-xs ${z.diasDisponibles?.includes(d) ? 'badge-success' : 'badge-ghost'}`}>
                      {d}
                    </span>
                  ))}
                </div>
                <div className="card-actions justify-end mt-3">
                  <button onClick={() => mostrarQr(z)} className="btn btn-ghost btn-sm text-primary">
                    QR
                  </button>
                  <Link href={`/dashboard/zonas/${z._id}/edit`} className="btn btn-ghost btn-sm">
                    Editar
                  </Link>
                  <button onClick={() => eliminar(z._id, z.nombre)} className="btn btn-ghost btn-sm text-error">
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {qrZona && (
        <dialog className="modal modal-open" onClick={() => setQrZona(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-1">{qrZona.nombre}</h3>
            <p className="text-sm text-base-content/60 mb-4">Escanea el código QR o comparte el link para solicitar un turno</p>
            <div className="flex justify-center mb-4">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt={`QR ${qrZona.nombre}`} className="w-64 h-64" />
              ) : (
                <span className="loading loading-spinner loading-lg"></span>
              )}
            </div>
            <div className="flex justify-center gap-2 mt-2">
              <button onClick={compartirLink} className="btn btn-outline btn-sm" disabled={!qrDataUrl}>
                Compartir link
              </button>
              <button onClick={descargarQr} className="btn btn-primary btn-sm" disabled={!qrDataUrl}>
                Descargar QR
              </button>
            </div>
            <div className="modal-action">
              <button onClick={() => setQrZona(null)} className="btn btn-ghost btn-sm">Cerrar</button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setQrZona(null)}>cerrar</button>
          </form>
        </dialog>
      )}
    </div>
  );
}
