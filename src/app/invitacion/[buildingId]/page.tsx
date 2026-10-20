'use client';

import { apiFetch } from '@/lib/api';
import SolicitarForm from '@/components/SolicitarForm';
import BuildingPlaque from '@/components/BuildingPlaque';
import { use, useEffect, useState } from 'react';

interface Building {
  id: string;
  nombre: string;
  email: string;
}

export default function InvitacionPage({ params }: { params: Promise<{ buildingId: string }> }) {
  const { buildingId } = use(params);
  const [building, setBuilding] = useState<Building | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    apiFetch(`/edificio/${buildingId}`)
      .then((b) => setBuilding(b as Building))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [buildingId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  if (notFound || !building) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
        <div className="arch-panel p-8 max-w-md w-full text-center">
          <div className="w-12 h-12 rounded-md bg-error/10 text-error flex items-center justify-center mx-auto mb-3">
            <span className="icon-[tabler--building-off] text-2xl" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-bold text-base-content">Edificio no encontrado</h1>
          <p className="text-sm text-base-content/70 mt-2">
            El enlace de invitación no es válido o la copropiedad no se encuentra disponible.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200 py-6 sm:py-10 px-4">
      <div className="container mx-auto max-w-2xl flex flex-col gap-6">
        <BuildingPlaque
          nombreEdificio={building.nombre}
          tipoEdificio="Portal de Copropietarios"
          subtitulo="Diligencia los datos a continuación para reservar tu turno en las zonas comunes autorizadas."
        />

        <div className="w-full">
          <SolicitarForm edificioId={buildingId} />
        </div>
      </div>
    </div>
  );
}
