'use client';

import React, { useState, useEffect } from 'react';
import { porteriaApiFetch } from '@/lib/api';

export default function ReservasHoyPorteriaPage() {
  const [reservas, setReservas] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);

  const cargarReservas = async () => {
    setCargando(true);
    try {
      const data = await porteriaApiFetch('/porteria/consultas/reservas-hoy');
      setReservas(data || []);
    } catch (err) {
      console.error('Error cargando reservas de hoy:', err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarReservas();
  }, []);

  return (
    <div className="space-y-5">
      {/* Encabezado Conciso */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b arch-border">
        <div className="flex items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-black text-base-content flex items-center gap-2">
            <span className="icon-[tabler--calendar-event] text-primary text-2xl" aria-hidden="true"></span>
            Reservas de Hoy
          </h1>
          <span className="badge badge-sm badge-neutral font-mono font-bold">
            {reservas.length} programadas
          </span>
        </div>

        <button
          onClick={cargarReservas}
          className="btn btn-xs btn-outline arch-border font-bold gap-1 self-start sm:self-auto cursor-pointer"
        >
          <span className="icon-[tabler--refresh] text-xs"></span>
          Actualizar
        </button>
      </div>

      {cargando ? (
        <div className="text-center py-10 text-base-content/50 text-xs">
          <span className="loading loading-spinner loading-md text-primary mb-2"></span>
          <p>Consultando reservas de hoy...</p>
        </div>
      ) : reservas.length === 0 ? (
        <div className="arch-panel p-8 text-center shadow-xs">
          <span className="icon-[tabler--calendar-off] text-3xl text-base-content/30 mb-2 block mx-auto"></span>
          <p className="text-sm font-semibold text-base-content">
            No hay reservas programadas para hoy
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {reservas.map((r) => (
            <div
              key={r._id}
              className="arch-panel p-3.5 flex flex-col justify-between shadow-xs hover:border-primary/40 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="badge badge-3xs badge-primary font-bold uppercase">
                    {r.zonaId?.nombre || 'Zona Común'}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-base-200 text-base-content font-mono text-xs font-bold border arch-border tabular-nums">
                    {r.horaInicio} - {r.horaFin}
                  </span>
                </div>

                <h3 className="font-bold text-sm text-base-content mb-0.5">
                  {r.nombreSolicitante}
                </h3>
                <p className="text-2xs text-base-content/75 font-medium">
                  Unidad: <strong className="text-base-content">{r.torreInmueble}</strong>
                </p>

                {r.telefonoContacto && (
                  <a
                    href={`tel:${r.telefonoContacto}`}
                    className="inline-flex items-center gap-1 text-2xs text-primary font-mono font-bold mt-1 hover:underline"
                  >
                    📞 {r.telefonoContacto}
                  </a>
                )}

                {r.motivoAdmin && (
                  <p className="text-3xs text-base-content/60 italic mt-1.5 truncate">
                    &ldquo;{r.motivoAdmin}&rdquo;
                  </p>
                )}
              </div>

              <div className="pt-2 mt-2 border-t arch-border text-3xs text-base-content/60 flex items-center justify-between">
                <span>Estado: <strong className="text-success capitalize">{r.estado}</strong></span>
                {r.zonaId?.capacidadMaxima && (
                  <span>Aforo máx: {r.zonaId.capacidadMaxima} pers.</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
