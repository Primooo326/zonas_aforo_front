"use client";

import { apiFetch } from '@/lib/api';
import SolicitarForm from '@/components/SolicitarForm';
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
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (notFound || !building) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="bg-base-100 rounded-box shadow-sm p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold mb-4 text-center">Edificio no encontrado</h1>
          <p className="text-base-content/60 text-center">
            El enlace de invitación no es válido o el edificio ya no existe.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center mb-6 space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 text-primary font-bold text-sm">
            <span className="icon-[tabler--building-community] text-lg" />
            <span>{building.nombre}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-base-content">
            Portal de Reservas de Zonas Comunes
          </h1>
          <p className="text-sm sm:text-base text-base-content/85 font-medium max-w-lg mx-auto">
            Diligencia el formulario a continuación para solicitar tu turno en las áreas sociales del edificio.
          </p>
        </div>

        <div className="flex justify-center">
          <SolicitarForm edificioId={buildingId} />
        </div>
      </div>
    </div>
  );
}
