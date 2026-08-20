
"use client";

import { useAuth } from '@/contexts/AuthContext';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';

export default function InvitacionPage() {
  const { edificio, isLoading } = useAuth();
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  useEffect(() => {
    if (edificio?.id) {
      QRCode.toDataURL(`${window.location.origin}/invitacion/${edificio.id}`)
        .then(setQrCodeUrl)
        .catch(console.error);
    }
  }, [edificio?.id]);

  if (isLoading || !edificio) return null;

  const inviteUrl = `${window.location.origin}/invitacion/${edificio.id}`;

  return (
    <div className="bg-base-100 rounded-box shadow-sm p-6">
      <h1 className="text-2xl font-bold mb-6">Invitaciones</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-base-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Código QR de Invitación</h2>
          {qrCodeUrl ? (
            <div className="flex flex-col items-center">
              <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48 mb-4" />
              <p className="text-sm text-base-content/60 mb-2">Escanea para ver la invitación</p>
            </div>
          ) : (
            <div className="w-48 h-48 bg-base-300 rounded-lg flex items-center justify-center mb-4">
              <span className="text-base-content/60">Generando QR...</span>
            </div>
          )}
        </div>

        <div className="bg-base-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Link de Invitación</h2>
          <div className="space-y-4">
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">URL de invitación</span>
              </label>
              <div className="join">
                <input
                  type="text"
                  className="input input-bordered join-item flex-1"
                  value={inviteUrl}
                  readOnly
                />
                <button
                  className="btn btn-primary join-item"
                  onClick={() => navigator.clipboard.writeText(inviteUrl)}
                >
                  <span className="icon-[tabler--copy] text-lg" aria-hidden="true" />
                  Copiar
                </button>
              </div>
            </div>

            <button
              className="btn btn-outline btn-primary w-full"
              onClick={() => window.open(inviteUrl, '_blank')}
            >
              <span className="icon-[tabler--external-link] text-lg" aria-hidden="true" />
              Abrir Invitación
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}