'use client';

import { useState } from 'react';

interface Zona {
  _id: string;
  nombre: string;
  aforoMaximo: number;
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

function nivelAforo(pct: number) {
  if (pct >= 100) return 'progress-error';
  if (pct >= 75) return 'progress-warning';
  return 'progress-success';
}

function textoEstado(pct: number) {
  if (pct >= 100) return 'Lleno';
  if (pct >= 75) return 'Casi lleno';
  return 'Disponible';
}

export default function ReservasDia({
  zonas,
  reservas,
}: {
  zonas: Zona[];
  reservas: Reserva[];
}) {
  const [tab, setTab] = useState<'aforo' | 'reservas'>('aforo');

  const activasPorZona = reservas.reduce<Record<string, number>>((acc, r) => {
    if (r.estado !== 'activa' || !r.zonaId?._id) return acc;
    acc[r.zonaId._id] = (acc[r.zonaId._id] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="bg-base-100 rounded-box shadow-sm mb-6">
      <div className="tabs tabs-bordered px-4 pt-3">
        <button
          className={`tab ${tab === 'aforo' ? 'tab-active' : ''}`}
          onClick={() => setTab('aforo')}
        >
          Aforo Disponible
        </button>
        <button
          className={`tab ${tab === 'reservas' ? 'tab-active' : ''}`}
          onClick={() => setTab('reservas')}
        >
          Reservas del Día
          {reservas.length > 0 && (
            <span className="badge badge-sm badge-primary ml-2">
              {reservas.filter((r) => r.estado === 'activa').length}
            </span>
          )}
        </button>
      </div>

      {tab === 'aforo' && (
        <div className="p-4">
          {!zonas.length ? (
            <p className="text-base-content/60 text-center py-8">
              Aún no has registrado ninguna zona.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {zonas.map((z) => {
                const ocupadas = activasPorZona[z._id] || 0;
                const restantes = Math.max(0, z.aforoMaximo - ocupadas);
                const pct =
                  z.aforoMaximo > 0
                    ? Math.min(100, Math.round((ocupadas / z.aforoMaximo) * 100))
                    : 0;

                return (
                  <div key={z._id} className="bg-base-200 rounded-box p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold">{z.nombre}</h3>
                        <p className="text-sm text-base-content/60">
                          Capacidad: {z.aforoMaximo}
                        </p>
                      </div>
                      <span
                        className={`badge badge-sm ${
                          pct >= 100
                            ? 'badge-error'
                            : pct >= 75
                              ? 'badge-warning'
                              : 'badge-success'
                        }`}
                      >
                        {textoEstado(pct)}
                      </span>
                    </div>

                    <div className="mt-3">
                      <div className="flex items-baseline gap-2">
                        <span
                          className={`text-3xl font-bold ${
                            pct >= 100
                              ? 'text-error'
                              : pct >= 75
                                ? 'text-warning'
                                : 'text-success'
                          }`}
                        >
                          {restantes}
                        </span>
                        <span className="text-sm text-base-content/60">
                          cupos disponibles de {z.aforoMaximo}
                        </span>
                      </div>

                      <div
                        className="progress mt-3"
                        role="progressbar"
                        aria-valuenow={pct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      >
                        <div
                          className={`progress-bar ${nivelAforo(pct)}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      <p className="text-xs text-base-content/60 mt-2">
                        {ocupadas} reserva{ocupadas === 1 ? '' : 's'} activa
                        {ocupadas === 1 ? '' : 's'} hoy
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'reservas' && (
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-base-content/60">
              {reservas.length === 0
                ? 'No hay reservas para hoy.'
                : `Actualizado cada 30s · ${reservas.length} reserva${reservas.length === 1 ? '' : 's'} hoy`}
            </p>
          </div>
          {reservas.length === 0 ? (
            <p className="text-base-content/60 text-center py-8">
              No hay reservas para hoy.
            </p>
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
                      <td>
                        {r.horaInicio} - {r.horaFin}
                      </td>
                      <td>
                        <span
                          className={`badge badge-sm ${r.estado === 'activa' ? 'badge-success' : 'badge-error'}`}
                        >
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
      )}
    </div>
  );
}
