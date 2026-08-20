'use client';

import { useEffect, useRef, useState } from 'react';
import calendarjs from '@calendarjs/ce';
import '@calendarjs/ce/dist/style.css';
import { apiFetch } from '@/lib/api';

interface Zona {
  _id: string;
  nombre: string;
  horarios: { dia: string; inicio: string; fin: string }[];
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

function hoyISO() {
  return new Date().toISOString().split('T')[0];
}

function rangoHorario(zonas: Zona[]) {
  const horarios = zonas.flatMap((z) => z.horarios || []);
  if (!horarios.length) return undefined;
  const inicios = horarios.map((h) => h.inicio).sort();
  const fines = horarios.map((h) => h.fin).sort();
  return [inicios[0], fines[fines.length - 1]];
}

interface SchedInstance {
  type: 'week' | 'day';
  value: string;
  setData: (data: unknown[]) => void;
  setRange: (range: string[]) => void;
  render: () => void;
  prev: () => void;
  next: () => void;
  today: () => void;
}

export default function ReservasCalendario({ edificioId }: { edificioId: string }) {
  const contRef = useRef<HTMLDivElement>(null);
  const schedRef = useRef<SchedInstance | null>(null);
  const reservasRef = useRef<Reserva[]>([]);
  const zonasRef = useRef<Zona[]>([]);

  const [zonas, setZonas] = useState<Zona[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [tipo, setTipo] = useState<'week' | 'day'>('week');
  const [fecha, setFecha] = useState(hoyISO());
  const [detalle, setDetalle] = useState<Reserva | null>(null);

  useEffect(() => {
    zonasRef.current = zonas;
  }, [zonas]);

  useEffect(() => {
    reservasRef.current = reservas;
  }, [reservas]);

  useEffect(() => {
    if (!edificioId || !contRef.current) return;
    const cont = contRef.current;
    const inst = calendarjs.Schedule(cont, {
      type: 'week',
      value: hoyISO(),
      grid: 15,
      overlap: true,
      data: [],
    });
    schedRef.current = inst as unknown as SchedInstance;

    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement).closest('.lm-schedule-item') as HTMLElement | null;
      if (el) {
        const r = reservasRef.current.find((x) => x._id === el.id);
        if (r) setDetalle(r);
      }
    };
    cont.addEventListener('click', onClick);

    return () => {
      cont.removeEventListener('click', onClick);
      cont.innerHTML = '';
      schedRef.current = null;
    };
  }, [edificioId]);

  useEffect(() => {
    if (!schedRef.current) return;
    schedRef.current.type = tipo;
    schedRef.current.render();
  }, [tipo]);

  const setData = (data: unknown[]) => {
    if (schedRef.current) schedRef.current.setData(data);
  };

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

  useEffect(() => {
    if (!reservas.length) {
      setData([]);
      return;
    }
    const colorPorZona: Record<string, string> = {};
    zonasRef.current.forEach((z) => {
      colorPorZona[z._id] = colorDeZona(z._id);
    });
    const eventos = reservas
      .filter((r) => r.estado === 'activa')
      .map((r) => {
        const zonaId = r.zonaId?._id || '';
        return {
          guid: r._id,
          title: r.zonaId?.nombre || 'Zona',
          description: `${r.nombreSolicitante} · ${r.torreInmueble || '—'}`,
          date: r.fecha,
          start: r.horaInicio,
          end: r.horaFin,
          color: colorPorZona[zonaId] || '#66b244',
          readonly: true,
        };
      });
    setData(eventos);
  }, [reservas, zonas]);

  const validRange = rangoHorario(zonas);

  useEffect(() => {
    if (!schedRef.current) return;
    if (validRange) {
      try {
        schedRef.current.setRange(validRange);
      } catch {
        /* ignore */
      }
    }
  }, [validRange]);

  const navegar = (dir: 'prev' | 'next') => {
    if (!schedRef.current) return;
    schedRef.current[dir]();
    setFecha(schedRef.current.value || fecha);
  };

  const irHoy = () => {
    if (!schedRef.current) return;
    schedRef.current.today();
    setFecha(schedRef.current.value || hoyISO());
  };

  return (
    <div className="bg-base-100 rounded-box shadow-sm p-4">
      <div className="flex flex-col gap-3 mb-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold">
          Calendario de Reservas
          <span className="block text-sm text-base-content/60 font-normal sm:inline sm:ml-2">{fecha}</span>
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex w-full sm:w-auto">
            <button
              className={`btn btn-sm flex-1 sm:flex-none rounded-none rounded-s-full ${tipo === 'week' ? 'btn-active' : ''}`}
              onClick={() => setTipo('week')}
            >
              Semana
            </button>
            <button
              className={`btn btn-sm flex-1 sm:flex-none rounded-none rounded-e-full ${tipo === 'day' ? 'btn-active' : ''}`}
              onClick={() => setTipo('day')}
            >
              Día
            </button>
          </div>
          <div className="flex w-full sm:w-auto">
            <button className="btn btn-sm flex-1 sm:flex-none rounded-none rounded-s-full" onClick={() => navegar('prev')}>
              ←
            </button>
            <button className="btn btn-sm flex-1 sm:flex-none rounded-none" onClick={irHoy}>
              Hoy
            </button>
            <button className="btn btn-sm flex-1 sm:flex-none rounded-none rounded-e-full" onClick={() => navegar('next')}>
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

      <div ref={contRef} className="cal-responsive" style={{ height: 'clamp(480px, 75vh, 720px)' }} />

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
              <p><strong>Fecha:</strong> {detalle.fecha}</p>
              <p><strong>Horario:</strong> {detalle.horaInicio} - {detalle.horaFin}</p>
              <p>
                <strong>Estado:</strong>{' '}
                <span className={`badge badge-sm ${detalle.estado === 'activa' ? 'badge-success' : 'badge-error'}`}>
                  {detalle.estado === 'activa' ? 'Activa' : 'Cancelada'}
                </span>
              </p>
            </div>
            <div className="modal-action">
              <button className="btn" onClick={() => setDetalle(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
