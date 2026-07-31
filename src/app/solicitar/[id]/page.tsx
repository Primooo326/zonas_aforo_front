'use client';

import { useParams } from 'next/navigation';
import SolicitarForm from '@/components/SolicitarForm';

export default function SolicitarPage() {
  const { id } = useParams();

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200 p-4">
      <SolicitarForm edificioId={String(id)} />
    </div>
  );
}
