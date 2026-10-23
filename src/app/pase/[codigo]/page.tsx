'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import QRCode from 'qrcode';
import { API_URL } from '@/lib/api';

interface PublicPassData {
  codigoAcceso: string;
  edificioNombre: string;
  torre: string;
  apartamento: string;
  residenteNombre: string;
  nombreVisitante: string;
  documentoVisitante?: string;
  placaVehiculo?: string;
  motivo: string;
  modalidad: string;
  fechaInicio: string;
  fechaFin?: string;
  observaciones?: string;
  estado: string;
}

export default function PublicPassPage() {
  const params = useParams();
  const codigo = params?.codigo as string;

  const [pase, setPase] = useState<PublicPassData | null>(null);
  const [qrUrl, setQrUrl] = useState<string>('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (!codigo) return;

    const fetchPass = async () => {
      setCargando(true);
      setError(null);
      try {
        const res = await fetch(`${API_URL}/pases/publico/${encodeURIComponent(codigo)}`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || 'Pase de acceso no encontrado o inválido');
        }
        const data = await res.json();
        setPase(data);

        // Generar QR para la pantalla
        const url = await QRCode.toDataURL(window.location.href, {
          width: 340,
          margin: 2,
          color: {
            dark: '#1e293b',
            light: '#ffffff',
          },
        });
        setQrUrl(url);
      } catch (err: any) {
        setError(err.message || 'Error cargando la autorización');
      } finally {
        setCargando(false);
      }
    };

    fetchPass();
  }, [codigo]);

  const copiarCodigo = () => {
    if (!pase) return;
    navigator.clipboard.writeText(pase.codigoAcceso);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <div className="min-h-screen bg-base-200 flex flex-col items-center justify-center p-4 selection:bg-primary selection:text-primary-content">
      <div className="w-full max-w-md">
        {cargando ? (
          <div className="arch-panel p-10 text-center shadow-lg">
            <span className="loading loading-spinner loading-lg text-primary"></span>
            <p className="text-xs text-base-content/60 mt-3 font-medium">
              Verificando pase de acceso...
            </p>
          </div>
        ) : error || !pase ? (
          <div className="arch-panel p-8 text-center shadow-lg border-t-4 border-t-error">
            <span className="icon-[tabler--alert-circle] text-4xl text-error mb-2 block mx-auto" aria-hidden="true"></span>
            <h1 className="text-lg font-bold text-base-content">Pase No Válido</h1>
            <p className="text-xs text-base-content/65 mt-1">
              {error || 'El código del pase es incorrecto o ha sido eliminado.'}
            </p>
            <div className="mt-4 p-3 bg-base-200 rounded text-3xs font-mono text-base-content/60">
              Código consultado: {codigo}
            </div>
          </div>
        ) : (
          <div className="arch-panel overflow-hidden shadow-2xl border-t-4 border-t-primary">
            {/* Header */}
            <div className="p-5 border-b arch-border bg-base-100 flex items-center justify-between">
              <div>
                <span className="text-3xs uppercase font-extrabold tracking-widest text-primary block">
                  Pase de Acceso Digital
                </span>
                <h1 className="text-base font-black text-base-content leading-tight">
                  {pase.edificioNombre}
                </h1>
              </div>

              <div>
                {pase.estado === 'activo' ? (
                  <span className="badge badge-sm badge-success font-bold gap-1 shadow-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                    Autorizado
                  </span>
                ) : pase.estado === 'consumido' ? (
                  <span className="badge badge-sm badge-info font-bold">
                    Ingresado
                  </span>
                ) : (
                  <span className="badge badge-sm badge-neutral font-bold capitalize">
                    {pase.estado}
                  </span>
                )}
              </div>
            </div>

            {/* Inmueble y Residente */}
            <div className="p-5 space-y-4">
              <div className="bg-base-200/60 p-3.5 rounded-lg border arch-border flex items-center justify-between">
                <div>
                  <span className="text-3xs text-base-content/60 uppercase font-bold block">
                    Destino
                  </span>
                  <span className="font-mono font-black text-sm text-base-content">
                    {pase.torre ? `Torre ${pase.torre} - ` : ''}Apto {pase.apartamento}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-3xs text-base-content/60 uppercase font-bold block">
                    Anfitrión
                  </span>
                  <span className="font-bold text-xs text-base-content">
                    {pase.residenteNombre}
                  </span>
                </div>
              </div>

              {/* QR Code */}
              <div className="text-center py-2">
                <div className="bg-white p-3 rounded-2xl inline-block border-2 border-base-300 shadow-md">
                  {qrUrl ? (
                    <img
                      src={qrUrl}
                      alt={`Pase ${pase.codigoAcceso}`}
                      className="w-48 h-48 mx-auto"
                    />
                  ) : (
                    <div className="w-48 h-48 flex items-center justify-center">
                      <span className="loading loading-spinner text-primary"></span>
                    </div>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-center gap-2">
                  <span className="font-mono text-base font-black text-primary bg-primary/10 px-3 py-1 rounded-md border border-primary/20 tracking-wider">
                    {pase.codigoAcceso}
                  </span>
                  <button
                    type="button"
                    onClick={copiarCodigo}
                    className="btn btn-xs btn-ghost border arch-border text-2xs font-semibold"
                  >
                    {copiado ? '✅ ¡Copiado!' : 'Copiar'}
                  </button>
                </div>
              </div>

              {/* Datos del Visitante */}
              <div className="space-y-2 text-xs border-t arch-border pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-base-content/60">Visitante:</span>
                  <strong className="text-base-content font-bold">{pase.nombreVisitante}</strong>
                </div>

                {pase.documentoVisitante && (
                  <div className="flex items-center justify-between">
                    <span className="text-base-content/60">Documento:</span>
                    <span className="font-mono font-medium">{pase.documentoVisitante}</span>
                  </div>
                )}

                {pase.placaVehiculo && (
                  <div className="flex items-center justify-between">
                    <span className="text-base-content/60">Vehículo:</span>
                    <span className="font-mono font-bold text-primary">🚗 {pase.placaVehiculo}</span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-base-content/60">Fecha autorizada:</span>
                  <span className="font-mono font-medium">
                    {new Date(pase.fechaInicio).toLocaleDateString('es-CO', {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>

                {pase.fechaFin && (
                  <div className="flex items-center justify-between">
                    <span className="text-base-content/60">Vigente hasta:</span>
                    <span className="font-mono font-medium">
                      {new Date(pase.fechaFin).toLocaleDateString('es-CO', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-base-content/60">Modalidad:</span>
                  <span className="badge badge-xs badge-neutral uppercase font-mono font-bold">
                    {pase.modalidad === 'temporal' ? 'Pase Temporal' : 'Un solo uso'}
                  </span>
                </div>

                {pase.observaciones && (
                  <div className="pt-2 border-t arch-border">
                    <span className="text-3xs uppercase font-bold text-base-content/60 block mb-0.5">
                      Instrucciones de llegada
                    </span>
                    <p className="text-2xs italic text-base-content/75 bg-base-200/50 p-2 rounded border arch-border">
                      &quot;{pase.observaciones}&quot;
                    </p>
                  </div>
                )}
              </div>

              {/* Mensaje al visitante */}
              <div className="bg-primary/5 p-3 rounded-md border border-primary/20 text-center">
                <p className="text-2xs text-base-content/75 font-medium leading-relaxed">
                  Muestra esta pantalla al llegar a la portería o dicta tu código de pase{' '}
                  <strong className="text-primary font-mono">{pase.codigoAcceso}</strong> al vigilante de turno para tu ingreso.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 bg-base-200/50 border-t arch-border text-center text-3xs text-base-content/50 font-mono">
              Zonas de Aforo &bull; Consola de Portería Digital
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
