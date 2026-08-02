'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import {
  addDias,
  diasDeSemana,
  fechaDesdeISO,
  fechaLocal,
  formatoCorto,
  formatoLargo,
  inicioSemana,
} from '@/lib/fecha';

interface Zona {
  _id: string;
  nombre: string;
  horarioInicio: string;
  horarioFin: string;
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

const DIAS_NOMBRE = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const PALETA = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
  '#84cc16',
];

function colorDeZona(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return PALETA[hash % PALETA.length];
}

export default function ReservasCalendario({ edificioId }: { edificioId: string }) {
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [tipo, setTipo] = useState<'week' | 'day'>('week');
  const [fecha, setFecha] = useState(fechaLocal());
  const [detalle, setDetalle] = useState<Reserva | null>(null);

  useEffect(() => {
    if (!edificioId) return;
    let mounted = true;
    const cargar = () => {
      Promise.all([
        apiFetch('/zonas').catch(() => []),
        apiFetch(`/edificio/${edificioId}/reservas`).catch(() => []),
      ]).then(([z, r]) => {
        if (!mounted) return;
        setZonas(z);
        setReservas(r);
      });
    };
    cargar();
    const iv = setInterval(cargar, 30000);
    return () => {
      mounted = false;
      clearInterval(iv);
    };
  }, [edificioId]);

  const hoy = fechaLocal();
  const lunes = inicioSemana(fecha);
  const dias = tipo === 'week' ? diasDeSemana(lunes) : [fecha];
  const esHoy = (d: string) => d === hoy;

  const reservasDelDia = (d: string) =>
    reservas
      .filter((r) => r.fecha === d)
      .sort((a, b) => (a.horaInicio < b.horaInicio ? -1 : 1));

  const titulo =
    tipo === 'week'
      ? `${formatoCorto(dias[0])} – ${formatoCorto(dias[6])} ${dias[0].slice(0, 4)}`
      : formatoLargo(dias[0]);

  const navegar = (dir: 'prev' | 'next') => {
    const diasMovidos = tipo === 'week' ? 7 : 1;
    setFecha(addDias(fecha, dir === 'prev' ? -diasMovidos : diasMovidos));
  };

  return (
    <div className="bg-base-100 rounded-box shadow-sm p-4">
      <div className="flex flex-col gap-3 mb-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold capitalize">
          Calendario de Reservas
          <span className="block text-sm text-base-content/60 font-normal sm:inline sm:ml-2">{titulo}</span>
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex w-full sm:w-auto">
            <button
              type="button"
              className={`btn btn-sm flex-1 sm:flex-none rounded-none rounded-s-full ${tipo === 'week' ? 'btn-active' : ''}`}
              onClick={() => setTipo('week')}
            >
              Semana
            </button>
            <button
              type="button"
              className={`btn btn-sm flex-1 sm:flex-none rounded-none rounded-e-full ${tipo === 'day' ? 'btn-active' : ''}`}
              onClick={() => setTipo('day')}
            >
              Día
            </button>
          </div>
          <div className="flex w-full sm:w-auto">
            <button
              type="button"
              className="btn btn-sm flex-1 sm:flex-none rounded-none rounded-s-full"
              onClick={() => navegar('prev')}
            >
              ←
            </button>
            <button type="button" className="btn btn-sm flex-1 sm:flex-none rounded-none" onClick={() => setFecha(hoy)}>
              Hoy
            </button>
            <button
              type="button"
              className="btn btn-sm flex-1 sm:flex-none rounded-none rounded-e-full"
              onClick={() => navegar('next')}
            >
              →
            </button>
          </div>
        </div>
      </div>

      {zonas.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {zonas.map((z) => (
            <span key={z._id} className="badge gap-1.5">
              <span
                className="w-3 h-3 rounded-full inline-block"
                style={{ backgroundColor: colorDeZona(z._id) }}
              />
              {z.nombre}
            </span>
          ))}
        </div>
      )}

      <div className={`grid gap-3 ${tipo === 'week' ? 'sm:grid-cols-2 lg:grid-cols-7' : 'grid-cols-1 md:grid-cols-2'}`}>
        {dias.map((d) => (
          <div
            key={d}
            className={`rounded-box border p-2 min-h-40 ${
              esHoy(d) ? 'border-primary/40 bg-primary/5' : 'border-base-300'
            }`}
          >
            <div className="flex items-center justify-between px-1 pb-2 border-b border-base-300 mb-2">
              <div className="text-xs uppercase tracking-wide text-base-content/60">
                {DIAS_NOMBRE[fechaDesdeISO(d).getDay()]}
              </div>
              <div className="flex items-center gap-1.5">
                {esHoy(d) && <span className="badge badge-primary badge-sm">Hoy</span>}
                <span className={`font-semibold ${esHoy(d) ? 'text-primary' : ''}`}>{formatoCorto(d)}</span>
              </div>
            </div>

            {reservasDelDia(d).length === 0 ? (
              <p className="text-xs text-base-content/50 px-1">Sin reservas</p>
            ) : (
              <div className="space-y-1.5">
                {reservasDelDia(d).map((r) => {
                  const cancelada = r.estado !== 'activa';
                  return (
                    <button
                      key={r._id}
                      type="button"
                      onClick={() => setDetalle(r)}
                      className="w-full text-left rounded-lg p-2 border border-base-300 bg-base-100 hover:border-primary/50 hover:bg-base-200 transition-colors"
                      style={{
                        borderLeftWidth: 4,
                        borderLeftColor: colorDeZona(r.zonaId?._id || ''),
                        opacity: cancelada ? 0.55 : 1,
                        touchAction: 'manipulation',
                      }}
                    >
                      <div className="text-xs font-semibold text-base-content/70">
                        {r.horaInicio} - {r.horaFin}
                      </div>
                      <div className="text-sm font-bold leading-tight">
                        {r.zonaId?.nombre || 'Zona'}
                      </div>
                      <div className="text-xs text-base-content/60 truncate">
                        {r.nombreSolicitante} · {r.torreInmueble || '—'}
                      </div>
                      {cancelada && (
                        <div className="text-xs mt-0.5">
                          <span className="badge badge-sm badge-error">Cancelada</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {detalle && (
        <div className="modal modal-open" role="dialog">
          <div className="modal-box">
            <div className="flex items-center gap-2 mb-4">
              <span
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: colorDeZona(detalle.zonaId?._id || '') }}
              />
              <h3 className="font-bold text-lg">{detalle.zonaId?.nombre || 'Zona'}</h3>
            </div>
            <div className="space-y-2 text-sm">
              <p><strong>Solicitante:</strong> {detalle.nombreSolicitante}</p>
              <p><strong>Torre/Inmueble:</strong> {detalle.torreInmueble || '—'}</p>
              <p><strong>Fecha:</strong> {formatoLargo(detalle.fecha)}</p>
              <p><strong>Horario:</strong> {detalle.horaInicio} - {detalle.horaFin}</p>
              <p>
                <strong>Estado:</strong>{' '}
                <span className={`badge badge-sm ${detalle.estado === 'activa' ? 'badge-success' : 'badge-error'}`}>
                  {detalle.estado === 'activa' ? 'Activa' : 'Cancelada'}
                </span>
              </p>
            </div>
            <div className="modal-action">
              <button type="button" className="btn" onClick={() => setDetalle(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
