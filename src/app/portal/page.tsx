'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useResidentAuth } from '@/contexts/ResidentAuthContext';

export default function PortalIndexPage() {
  const router = useRouter();
  const { resident, isLoading } = useResidentAuth();

  useEffect(() => {
    if (!isLoading) {
      if (resident) {
        router.replace('/portal/hogar');
      } else {
        router.replace('/portal/login');
      }
    }
  }, [resident, isLoading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200">
      <div className="flex flex-col items-center gap-3">
        <span className="loading loading-spinner loading-lg text-primary"></span>
        <p className="text-sm text-base-content/70 font-medium">Cargando Portal de Residentes...</p>
      </div>
    </div>
  );
}
