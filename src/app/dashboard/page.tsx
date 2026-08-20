'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { fechaLocal } from '@/lib/fecha';
import ReservasCalendario from '@/components/ReservasCalendario';
import ReservasDia from '@/components/ReservasDia';

interface Zona {
  _id: string;
  nombre: string;
  horarios: { dia: string; inicio: string; fin: string }[];
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

function colorPct(pct: number) {
  if (pct >= 100) return 'text-error';
  if (pct >= 75) return 'text-warning';
  return 'text-success';
}

function barraPct(pct: number) {
  if (pct >= 100) return 'progress-error';
  if (pct >= 75) return 'progress-warning';
  return 'progress-success';
}

export default function DashboardPage() {
  const { edificio, isLoading } = useAuth();
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const edificioId = edificio?.id;

  useEffect(() => {
    if (!edificioId) return;
    const hoy = fechaLocal();
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
      const hoy = fechaLocal();
      apiFetch(`/edificio/${edificioId}/reservas?fecha=${hoy}`)
        .then(setReservas)
        .catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [edificioId]);

  if (isLoading || !edificio) return null;

  const activas = reservas.filter((r) => r.estado === 'activa');

  const ahora = new Date();
  const hhmmAhora = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;
  const totalAforo = zonas.reduce((sum, z) => sum + z.aforoMaximo, 0);
  const ocupacionAhora = activas.filter(
    (r) => r.horaInicio <= hhmmAhora && hhmmAhora < r.horaFin,
  ).length;
  const pctOcupacionAhora = totalAforo > 0 ? Math.round((ocupacionAhora / totalAforo) * 100) : 0;

  let picoTurnos = 0;
  let picoHora = '';
  for (const r of activas) {
    const n = activas.filter((s) => s.horaInicio <= r.horaInicio && r.horaInicio < s.horaFin).length;
    if (n > picoTurnos) {
      picoTurnos = n;
      picoHora = r.horaInicio;
    }
  }

  const zonasEnUso = new Set(activas.map((r) => r.zonaId?._id).filter(Boolean)).size;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Panel de Control</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="stat bg-base-100 rounded-box shadow-sm">
          <div className="stat-title flex items-center gap-2">
            <span className="icon-[tabler--gauge] text-lg text-primary" aria-hidden="true" />
            Ocupación Ahora
          </div>
          <div className={`stat-value ${colorPct(pctOcupacionAhora)}`}>{pctOcupacionAhora}%</div>
          <div
            className="progress mt-2"
            role="progressbar"
            aria-valuenow={pctOcupacionAhora}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className={`progress-bar ${barraPct(pctOcupacionAhora)}`}
              style={{ width: `${pctOcupacionAhora}%` }}
            />
          </div>
          <div className="stat-desc">
            {ocupacionAhora} de {totalAforo} cupos en uso
          </div>
        </div>
        <div className="stat bg-base-100 rounded-box shadow-sm">
          <div className="stat-title flex items-center gap-2">
            <span className="icon-[tabler--calendar-check] text-lg text-accent" aria-hidden="true" />
            Reservas Hoy
          </div>
          <div className="stat-value text-accent">{activas.length}</div>
        </div>
        <div className="stat bg-base-100 rounded-box shadow-sm">
          <div className="stat-title flex items-center gap-2">
            <span className="icon-[tabler--chart-bar] text-lg text-secondary" aria-hidden="true" />
            Pico de Ocupación
          </div>
          <div className="stat-value text-secondary">{picoHora || '—'}</div>
          <div className="stat-desc">
            {picoTurnos > 0 ? `${picoTurnos} turnos a la vez` : 'Sin reservas hoy'}
          </div>
        </div>
        <div className="stat bg-base-100 rounded-box shadow-sm">
          <div className="stat-title flex items-center gap-2">
            <span className="icon-[tabler--building-community] text-lg text-warning" aria-hidden="true" />
            Zonas en Uso
          </div>
          <div className="stat-value text-warning">{zonasEnUso}</div>
          <div className="stat-desc">de {zonas.length} zonas registradas</div>
        </div>
      </div>

      <ReservasDia zonas={zonas} reservas={reservas} />

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
                    <td>
                      {(z.horarios || []).map((h) => (
                        <span key={h.dia} className="badge badge-xs badge-success mr-1 mb-1">
                          {h.dia}: {h.inicio} - {h.fin}
                        </span>
                      ))}
                    </td>
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
