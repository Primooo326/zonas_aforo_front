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
    <div className="space-y-6">
      {/* Encabezado Arquitectónico */}
      <div className="arch-panel p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-base-content flex items-center gap-2">
            <span className="icon-[tabler--calendar-event] text-primary text-2xl" aria-hidden="true"></span>
            Reservas de Zonas Comunes &bull; Hoy
          </h1>
          <p className="text-xs text-base-content/65 mt-0.5">
            Consulta operativa de uso autorizado de piscinas, salones comunales, BBQ y canchas para control de aforo.
          </p>
        </div>

        <button
          onClick={cargarReservas}
          className="btn btn-xs btn-outline arch-border text-base-content/80 hover:bg-base-200 font-semibold self-start sm:self-auto cursor-pointer"
        >
          <span className="icon-[tabler--refresh] text-sm" aria-hidden="true"></span>
          Actualizar
        </button>
      </div>

      {cargando ? (
        <div className="text-center py-12 text-base-content/50 text-sm">
          <span className="loading loading-spinner loading-md text-primary mb-2"></span>
          <p>Consultando calendario de zonas comunes...</p>
        </div>
      ) : reservas.length === 0 ? (
        <div className="arch-panel p-10 text-center shadow-xs">
          <span className="icon-[tabler--calendar-off] text-4xl text-base-content/30 mb-3 block mx-auto" aria-hidden="true"></span>
          <h3 className="text-base font-bold text-base-content">
            No hay reservas programadas para hoy
          </h3>
          <p className="text-xs text-base-content/60 mt-1">
            Ninguna zona común cuenta con reservas activas para la fecha en curso.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {reservas.map((r) => (
            <div
              key={r._id}
              className="arch-panel p-4 flex flex-col justify-between shadow-xs hover:border-primary/40 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="badge badge-sm badge-primary font-bold uppercase text-3xs">
                    {r.zonaId?.nombre || 'Zona Común'}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-base-200 text-base-content font-mono text-xs font-bold border arch-border tabular-nums">
                    {r.horaInicio} - {r.horaFin}
                  </span>
                </div>

                <h3 className="font-bold text-sm text-base-content mb-1">
                  {r.nombreSolicitante}
                </h3>
                <p className="text-xs text-base-content/75 font-medium">
                  Unidad: <strong className="text-base-content">{r.torreInmueble}</strong>
                </p>

                {r.telefonoContacto && (
                  <p className="text-xs text-primary font-mono mt-1 font-medium">
                    📞 {r.telefonoContacto}
                  </p>
                )}

                {r.motivoAdmin && (
                  <p className="text-2xs text-base-content/60 italic mt-2">
                    &ldquo;{r.motivoAdmin}&rdquo;
                  </p>
                )}
              </div>

              <div className="pt-3 mt-3 border-t arch-border text-2xs text-base-content/60 flex items-center justify-between">
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
