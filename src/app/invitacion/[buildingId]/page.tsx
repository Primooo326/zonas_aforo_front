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
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">{building.nombre}</h1>
          <p className="text-base-content/60">Formulario de Solicitud de Reserva</p>
        </div>

        <div className="flex justify-center">
          <SolicitarForm edificioId={buildingId} />
        </div>
      </div>
    </div>
  );
}
