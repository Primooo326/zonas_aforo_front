'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import QRCode from 'qrcode';

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
  const { edificio } = useAuth();
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [copied, setCopied] = useState(false);

  const publicUrl = typeof window !== 'undefined' && edificio?.id
    ? `${window.location.origin}/invitacion/${edificio.id}`
    : '';

  useEffect(() => {
    if (edificio?.id) {
      QRCode.toDataURL(`${window.location.origin}/invitacion/${edificio.id}`)
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
    a.download = `reservas-qr-${edificio.nombre || edificio.id}.png`;
    a.click();
  };

  const cargar = () => {
    apiFetch('/zonas')
      .then(setZonas)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    cargar();
  }, []);

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
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Zonas Comunes</h1>
          <p className="text-xs sm:text-sm text-base-content/60">
            Gestiona las áreas sociales, aforos y horarios de tu edificio
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
                href={`/invitacion/${edificio.id}`}
                target="_blank"
                className="btn btn-sm btn-outline flex-1 sm:flex-initial gap-1.5"
              >
                <span className="icon-[tabler--external-link] text-base" aria-hidden="true" />
                <span>Portal de Reservas</span>
              </Link>
            </>
          )}
          <Link
            href="/dashboard/zonas/create"
            className="btn btn-sm btn-primary w-full sm:w-auto gap-1.5"
          >
            <span className="icon-[tabler--plus] text-base" aria-hidden="true" />
            <span>Nueva Zona</span>
          </Link>
        </div>
      </div>

      {/* Modal QR */}
      {qrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-base-100 rounded-box shadow-xl max-w-md w-full p-5 sm:p-6 space-y-4 animate-in fade-in duration-200">
            <div className="flex justify-between items-center">
              <h3 className="text-base sm:text-lg font-bold">Portal de Reservas de Zonas</h3>
              <button
                type="button"
                onClick={() => setQrModalOpen(false)}
                className="btn btn-ghost btn-sm btn-circle"
              >
                ✕
              </button>
            </div>
            <p className="text-xs sm:text-sm text-base-content/70">
              Comparte este código QR o enlace con los residentes para que puedan consultar aforos y reservar zonas comunes sin iniciar sesión como administrador.
            </p>

            <div className="flex flex-col items-center bg-base-200 rounded-box p-4">
              {qrCodeUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrCodeUrl}
                  alt="QR Reservas Zonas"
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
              <label className="text-xs font-semibold text-base-content/70">Enlace de reservas</label>
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

      {/* Listado de Zonas */}
      {loading ? (
        <div className="flex justify-center py-16">
          <span className="loading loading-spinner loading-lg text-primary"></span>
        </div>
      ) : zonas.length === 0 ? (
        <div className="bg-base-100 rounded-box shadow-sm p-8 sm:p-12 text-center">
          <div className="flex justify-center mb-3">
            <span className="icon-[tabler--map-pin] text-5xl text-base-content/30" aria-hidden="true" />
          </div>
          <p className="text-base-content/60 mb-4 text-sm">No hay zonas registradas</p>
          <Link href="/dashboard/zonas/create" className="btn btn-primary btn-sm gap-1.5">
            <span className="icon-[tabler--plus] text-base" aria-hidden="true" />
            Crear primera zona
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {zonas.map((z) => (
            <div key={z._id} className="card bg-base-100 shadow-sm border border-base-200">
              <div className="card-body p-4 sm:p-5 flex flex-col justify-between gap-3">
                <div>
                  <h3 className="card-title text-base sm:text-lg font-bold">{z.nombre}</h3>
                  {z.descripcion && (
                    <p className="text-xs sm:text-sm text-base-content/60 mt-1 line-clamp-2">
                      {z.descripcion}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 text-xs mt-3">
                    <span className="badge badge-outline badge-sm">Aforo: {z.aforoMaximo}</span>
                    <span className="badge badge-outline badge-sm">Lapso: {z.lapsoMinutos} min</span>
                  </div>
                  {z.horarios && z.horarios.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2.5">
                      {z.horarios.map((h) => (
                        <span key={h.dia} className="badge badge-xs badge-success">
                          {h.dia}: {h.inicio} - {h.fin}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="pt-3 border-t border-base-200 flex items-center justify-end gap-2">
                  <Link
                    href={`/dashboard/zonas/${z._id}/edit`}
                    className="btn btn-outline btn-sm gap-1"
                  >
                    <span className="icon-[tabler--edit] text-base" aria-hidden="true" />
                    Editar
                  </Link>
                  <button
                    onClick={() => eliminar(z._id, z.nombre)}
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
