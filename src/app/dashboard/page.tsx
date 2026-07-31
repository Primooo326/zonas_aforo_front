'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import ReservasCalendario from '@/components/ReservasCalendario';

interface Zona {
  _id: string;
  nombre: string;
  horarioInicio: string;
  horarioFin: string;
  aforoMaximo: number;
  lapsoMinutos: number;
}

interface Reserva {
  _id: string;
  zonaId?: { _id: string; nombre: string } | null;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  nombreSolicitante: string;
  torreInmueble: string;
  estado: string;
}

export default function DashboardPage() {
  const { edificio, isLoading } = useAuth();
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const edificioId = edificio?.id;

  useEffect(() => {
    if (!edificioId) return;
    const hoy = new Date().toISOString().split('T')[0];
    apiFetch(`/edificio/${edificioId}/reservas?fecha=${hoy}`)
      .then(setReservas)
      .catch(() => {});
  }, [edificioId]);

  useEffect(() => {
    apiFetch('/zonas')
      .then(setZonas)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!edificioId) return;
    const interval = setInterval(() => {
      const hoy = new Date().toISOString().split('T')[0];
      apiFetch(`/edificio/${edificioId}/reservas?fecha=${hoy}`)
        .then(setReservas)
        .catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [edificioId]);

  if (isLoading || !edificio) return null;

  const activas = reservas.filter((r) => r.estado === 'activa');
  const canceladas = reservas.filter((r) => r.estado === 'cancelada');

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Panel de Control</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="stat bg-base-100 rounded-box shadow-sm">
          <div className="stat-title">Zonas Registradas</div>
          <div className="stat-value text-primary">{zonas.length}</div>
        </div>
        <div className="stat bg-base-100 rounded-box shadow-sm">
          <div className="stat-title">Aforo Total</div>
          <div className="stat-value text-secondary">
            {zonas.reduce((sum, z) => sum + z.aforoMaximo, 0)}
          </div>
        </div>
        <div className="stat bg-base-100 rounded-box shadow-sm">
          <div className="stat-title">Reservas Hoy</div>
          <div className="stat-value text-accent">{activas.length}</div>
        </div>
        <div className="stat bg-base-100 rounded-box shadow-sm">
          <div className="stat-title">Canceladas Hoy</div>
          <div className="stat-value text-error">{canceladas.length}</div>
        </div>
      </div>

      <div className="bg-base-100 rounded-box shadow-sm p-4 mb-6">
        <h2 className="text-lg font-semibold mb-3">
          Reservas del Día
          <span className="text-sm text-base-content/60 ml-2 font-normal">(actualizado cada 30s)</span>
        </h2>
        {reservas.length === 0 ? (
          <p className="text-base-content/60">No hay reservas para hoy.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Zona</th>
                  <th>Solicitante</th>
                  <th>Torre</th>
                  <th>Hora</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {reservas.map((r) => (
                  <tr key={r._id}>
                    <td>{r.zonaId?.nombre || '—'}</td>
                    <td>{r.nombreSolicitante}</td>
                    <td>{r.torreInmueble}</td>
                    <td>{r.horaInicio} - {r.horaFin}</td>
                    <td>
                      <span className={`badge badge-sm ${r.estado === 'activa' ? 'badge-success' : 'badge-error'}`}>
                        {r.estado === 'activa' ? 'Activa' : 'Cancelada'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mb-6">
        <ReservasCalendario edificioId={edificio.id} />
      </div>

      <div className="bg-base-100 rounded-box shadow-sm p-4">
        <h2 className="text-lg font-semibold mb-3">Resumen de Zonas</h2>
        {zonas.length === 0 ? (
          <p className="text-base-content/60">Aún no has registrado ninguna zona.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Horario</th>
                  <th>Aforo</th>
                  <th>Lapso</th>
                </tr>
              </thead>
              <tbody>
                {zonas.map((z) => (
                  <tr key={z._id}>
                    <td>{z.nombre}</td>
                    <td>{z.horarioInicio} - {z.horarioFin}</td>
                    <td>{z.aforoMaximo}</td>
                    <td>{z.lapsoMinutos} min</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
