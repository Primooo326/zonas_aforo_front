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
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Encabezado */}
      <div className="bg-base-100 p-6 rounded-2xl border border-base-300 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-xl font-bold">
              📦
            </div>
            <div>
              <h1 className="text-xl font-black text-base-content tracking-tight">
                Mi Casillero Digital
              </h1>
              <p className="text-xs text-base-content/70 mt-0.5">
                Seguimiento de correspondencia física, paquetes y encomiendas recibidas en portería.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={cargarPaquetes}
          className="btn btn-sm btn-ghost gap-1.5 self-start sm:self-auto"
        >
          <span className="icon-[tabler--refresh] text-base"></span>
          Actualizar
        </button>
      </div>

      {/* Paquetes Pendientes por Retirar */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-base-content uppercase tracking-wider flex items-center gap-2">
          <span>Por Retirar en Portería</span>
          <span className="badge badge-sm badge-primary font-bold">
            {pendientes.length}
          </span>
        </h2>

        {cargando ? (
          <div className="text-center py-12 text-base-content/60 text-sm">
            <span className="loading loading-spinner loading-md text-primary mb-2"></span>
            <p>Consultando casillero en portería...</p>
          </div>
        ) : pendientes.length === 0 ? (
          <div className="bg-base-100 border border-base-300 rounded-2xl p-8 text-center">
            <span className="text-3xl mb-2 block">📭</span>
            <p className="text-sm font-bold text-base-content">
              No tienes paquetes pendientes por retirar
            </p>
            <p className="text-xs text-base-content/60 mt-0.5">
              Cuando la portería reciba una encomienda a tu nombre o apartamento, aparecerá aquí inmediatamente.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendientes.map((p) => (
              <div
                key={p._id}
                className="bg-base-100 border-2 border-primary/40 rounded-2xl p-5 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-base-content flex items-center gap-1.5">
                    🚚 {p.transportadora}
                  </span>
                  <span className="badge badge-sm badge-warning font-bold animate-pulse">
                    Disponible en Portería
                  </span>
                </div>

                <div className="text-xs text-base-content/80 space-y-1">
                  <p>
                    Tipo: <strong className="capitalize">{p.tipo}</strong>
                  </p>
                  {p.observaciones && (
                    <p className="italic text-base-content/70">
                      &ldquo;{p.observaciones}&rdquo;
                    </p>
                  )}
                  <p className="text-base-content/60">
                    Recibido el:{' '}
                    {new Date(p.fechaRecepcion).toLocaleString('es-CO', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </p>
                </div>

                {p.fotoGuiaUrl && (
                  <div className="pt-2">
                    <a
                      href={p.fotoGuiaUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-primary font-bold hover:underline flex items-center gap-1"
                    >
                      📷 Ver foto de la guía o paquete
                    </a>
                  </div>
                )}

                <div className="pt-2 border-t border-base-300 text-[11px] text-base-content/60 flex items-center justify-between">
                  <span>Recibió en portería: {p.vigilanteRecibioNombre}</span>
                  <span className="font-semibold text-primary">
                    Pasa a portería con tu documento
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Historial de Entregas */}
      {entregados.length > 0 && (
        <div className="space-y-3 pt-6 border-t border-base-300">
          <h2 className="text-sm font-bold text-base-content uppercase tracking-wider flex items-center gap-2">
            <span>Histórico de Entregas Anteriores</span>
            <span className="badge badge-sm badge-ghost font-bold">
              {entregados.length}
            </span>
          </h2>

          <div className="bg-base-100 border border-base-300 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="table table-sm w-full text-xs">
                <thead>
                  <tr className="border-b border-base-300 bg-base-200/50 text-base-content/70">
                    <th>Transportadora</th>
                    <th>Tipo</th>
                    <th>Retirado por</th>
                    <th>Fecha de Entrega</th>
                    <th>Guardia que entregó</th>
                  </tr>
                </thead>
                <tbody>
                  {entregados.map((e) => (
                    <tr key={e._id} className="border-b border-base-300 hover:bg-base-200/30">
                      <td className="font-bold text-base-content">{e.transportadora}</td>
                      <td className="capitalize">{e.tipo}</td>
                      <td className="font-semibold text-success">{e.entregadoA || 'Residente'}</td>
                      <td className="text-base-content/70">
                        {e.fechaEntrega
                          ? new Date(e.fechaEntrega).toLocaleString('es-CO', {
                              dateStyle: 'short',
                              timeStyle: 'short',
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
