'use client';

import React, { useState, useEffect } from 'react';
import { residentApiFetch } from '@/lib/api';

export default function CasilleroResidentePage() {
  const [paquetes, setPaquetes] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargarPaquetes = async () => {
    setCargando(true);
    try {
      const data = await residentApiFetch('/portal/paquetes');
      setPaquetes(data || []);
    } catch (err) {
      console.error('Error cargando paquetes del residente:', err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarPaquetes();
  }, []);

  const pendientes = paquetes.filter((p) => p.estado === 'recibido');
  const entregados = paquetes.filter((p) => p.estado === 'entregado');

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
      {/* Encabezado Conciso */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b arch-border">
        <div className="flex items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-black text-base-content flex items-center gap-2">
            <span className="icon-[tabler--package] text-primary text-2xl sm:text-3xl" aria-hidden="true"></span>
            Mi Casillero
          </h1>
          <span className="badge badge-sm badge-warning font-mono font-bold">
            {pendientes.length} pendientes
          </span>
        </div>

        <button
          onClick={cargarPaquetes}
          className="btn btn-xs btn-outline arch-border font-bold gap-1 self-start sm:self-auto cursor-pointer"
        >
          <span className="icon-[tabler--refresh] text-xs"></span>
          Actualizar
        </button>
      </div>

      {/* Paquetes Pendientes por Retirar */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-base-content uppercase tracking-wider flex items-center gap-1.5">
            <span>Paquetes por Retirar</span>
            <span className="badge badge-3xs badge-primary font-bold">{pendientes.length}</span>
          </h2>
        </div>

        {cargando ? (
          <div className="text-center py-10 text-base-content/60 text-xs">
            <span className="loading loading-spinner loading-md text-primary mb-2"></span>
            <p>Consultando casillero...</p>
          </div>
        ) : pendientes.length === 0 ? (
          <div className="arch-panel p-8 text-center shadow-xs">
            <span className="icon-[tabler--package-off] text-3xl text-base-content/30 mb-2 block mx-auto"></span>
            <p className="text-sm font-bold text-base-content">
              No tienes paquetes pendientes por retirar
            </p>
            <p className="text-2xs text-base-content/60 mt-0.5">
              Las nuevas encomiendas recibidas en portería aparecerán aquí.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pendientes.map((p) => (
              <div
                key={p._id}
                className="arch-panel p-4 shadow-xs space-y-2.5 border-l-4 border-l-warning"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-base-content flex items-center gap-1.5">
                    <span className="icon-[tabler--truck-delivery] text-primary" aria-hidden="true"></span>
                    {p.transportadora}
                  </span>
                  <span className="badge badge-3xs badge-warning font-bold">
                    En Portería
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-2xs text-base-content/75">
                  <span className="badge badge-xs badge-ghost capitalize font-medium">
                    {p.tipo}
                  </span>
                  <span className="font-mono text-3xs text-base-content/60">
                    Recibido:{' '}
                    {new Date(p.fechaRecepcion).toLocaleString('es-CO', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                {p.observaciones && (
                  <p className="text-3xs italic text-base-content/65 truncate">
                    &ldquo;{p.observaciones}&rdquo;
                  </p>
                )}

                <div className="pt-2 border-t arch-border text-3xs text-base-content/60 flex items-center justify-between">
                  <span>Recibió: <strong className="text-base-content/80 font-medium">{p.vigilanteRecibioNombre}</strong></span>
                  {p.fotoGuiaUrl && (
                    <a
                      href={p.fotoGuiaUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary font-bold hover:underline flex items-center gap-1"
                    >
                      <span className="icon-[tabler--photo] text-xs"></span>
                      Ver foto
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Historial de Entregas */}
      {entregados.length > 0 && (
        <div className="space-y-3 pt-4 border-t arch-border">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-base-content/70 uppercase tracking-wider flex items-center gap-1.5">
              <span>Historial de Entregas</span>
              <span className="badge badge-3xs badge-neutral font-bold">{entregados.length}</span>
            </h2>
          </div>

          <div className="arch-panel overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="table table-xs w-full text-base-content">
                <thead>
                  <tr className="border-b arch-border bg-base-200/50 text-2xs text-base-content/60 uppercase">
                    <th>Transportadora</th>
                    <th>Tipo</th>
                    <th>Retirado por</th>
                    <th>Fecha Retiro</th>
                    <th>Guardia</th>
                  </tr>
                </thead>
                <tbody>
                  {entregados.map((e) => (
                    <tr key={e._id} className="border-b arch-border hover:bg-base-200/30">
                      <td className="font-bold text-base-content">{e.transportadora}</td>
                      <td className="capitalize">{e.tipo}</td>
                      <td className="font-medium text-success">{e.entregadoA || 'Residente'}</td>
                      <td className="font-mono text-3xs text-base-content/70">
                        {e.fechaEntrega
                          ? new Date(e.fechaEntrega).toLocaleDateString('es-CO', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '-'}
                      </td>
                      <td className="text-base-content/70">{e.vigilanteEntregoNombre || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
