'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePorteria } from '@/contexts/PorteriaContext';
import { porteriaApiFetch } from '@/lib/api';

export default function PorteriaOperacionesPage() {
  const { puesto, vigilanteActivo, vigilantes } = usePorteria();
  const [searchTerm, setSearchTerm] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [resultados, setResultados] = useState<any[]>([]);
  const [resultadosPlacas, setResultadosPlacas] = useState<any[]>([]);

  // Métricas
  const [metricas, setMetricas] = useState({
    paquetesPendientes: 0,
    visitasActivas: 0,
    novedadesHoy: 0,
    reservasHoy: 0,
  });

  const cargarMetricas = async () => {
    try {
      const [paquetes, visitas, minuta, reservas] = await Promise.all([
        porteriaApiFetch('/porteria/paquetes/pendientes').catch(() => []),
        porteriaApiFetch('/porteria/visitas/activas').catch(() => []),
        porteriaApiFetch('/porteria/minuta?limit=10').catch(() => []),
        porteriaApiFetch('/porteria/consultas/reservas-hoy').catch(() => []),
      ]);

      setMetricas({
        paquetesPendientes: (paquetes || []).length,
        visitasActivas: (visitas || []).length,
        novedadesHoy: (minuta || []).length,
        reservasHoy: (reservas || []).length,
      });
    } catch (err) {
      console.error('Error cargando métricas:', err);
    }
  };

  useEffect(() => {
    cargarMetricas();
  }, []);

  const handleBuscar = async (term: string) => {
    setSearchTerm(term);
    if (!term || term.trim().length < 2) {
      setResultados([]);
      setResultadosPlacas([]);
      return;
    }

    setBuscando(true);
    try {
      const [dir, vehs] = await Promise.all([
        porteriaApiFetch(`/porteria/consultas/directorio?q=${encodeURIComponent(term.trim())}`).catch(() => []),
        porteriaApiFetch(`/porteria/consultas/vehiculos?placa=${encodeURIComponent(term.trim())}`).catch(() => []),
      ]);
      setResultados(dir || []);
      setResultadosPlacas(vehs || []);
    } catch (err) {
      console.error('Error en búsqueda:', err);
    } finally {
      setBuscando(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Alerta si no hay vigilante seleccionado */}
      {!vigilanteActivo && vigilantes.length > 0 && (
        <div className="bg-warning/10 border border-warning/30 text-warning px-3.5 py-2.5 rounded-md flex items-center justify-between text-xs font-medium">
          <div className="flex items-center gap-2">
            <span className="icon-[tabler--alert-triangle] text-base text-warning shrink-0" aria-hidden="true"></span>
            <span>
              <strong>Turno sin asignar:</strong> Selecciona el vigilante en servicio en la barra superior.
            </span>
          </div>
        </div>
      )}

      {/* Tarjetas de Resumen Operativo Táctico */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
        <Link
          href="/porteria/casillero"
          className="arch-panel p-3 hover:border-primary/50 transition-colors shadow-xs group flex items-center justify-between"
        >
          <div>
            <span className="text-3xs font-bold text-base-content/60 uppercase tracking-wider block">
              Casillero
            </span>
            <div className="text-xl sm:text-2xl font-black text-base-content tabular-nums mt-0.5">
              {metricas.paquetesPendientes} <span className="text-3xs font-normal text-base-content/50">pendientes</span>
            </div>
          </div>
          <span className="w-8 h-8 rounded-md bg-primary/10 text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
            <span className="icon-[tabler--package] text-lg" aria-hidden="true"></span>
          </span>
        </Link>

        <Link
          href="/porteria/visitas"
          className="arch-panel p-3 hover:border-primary/50 transition-colors shadow-xs group flex items-center justify-between"
        >
          <div>
            <span className="text-3xs font-bold text-base-content/60 uppercase tracking-wider block">
              Visitas
            </span>
            <div className="text-xl sm:text-2xl font-black text-base-content tabular-nums mt-0.5">
              {metricas.visitasActivas} <span className="text-3xs font-normal text-base-content/50">adentro</span>
            </div>
          </div>
          <span className="w-8 h-8 rounded-md bg-primary/10 text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
            <span className="icon-[tabler--users] text-lg" aria-hidden="true"></span>
          </span>
        </Link>

        <Link
          href="/porteria/minuta"
          className="arch-panel p-3 hover:border-primary/50 transition-colors shadow-xs group flex items-center justify-between"
        >
          <div>
            <span className="text-3xs font-bold text-base-content/60 uppercase tracking-wider block">
              Minuta
            </span>
            <div className="text-xl sm:text-2xl font-black text-base-content tabular-nums mt-0.5">
              {metricas.novedadesHoy} <span className="text-3xs font-normal text-base-content/50">eventos</span>
            </div>
          </div>
          <span className="w-8 h-8 rounded-md bg-primary/10 text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
            <span className="icon-[tabler--notebook] text-lg" aria-hidden="true"></span>
          </span>
        </Link>

        <Link
          href="/porteria/reservas-hoy"
          className="arch-panel p-3 hover:border-primary/50 transition-colors shadow-xs group flex items-center justify-between"
        >
          <div>
            <span className="text-3xs font-bold text-base-content/60 uppercase tracking-wider block">
              Reservas Hoy
            </span>
            <div className="text-xl sm:text-2xl font-black text-base-content tabular-nums mt-0.5">
              {metricas.reservasHoy} <span className="text-3xs font-normal text-base-content/50">zonas</span>
            </div>
          </div>
          <span className="w-8 h-8 rounded-md bg-primary/10 text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
            <span className="icon-[tabler--calendar-event] text-lg" aria-hidden="true"></span>
          </span>
        </Link>
      </div>

      {/* Buscador Rápido de Citofonía y Vehículos */}
      <div className="arch-panel p-3.5 sm:p-4 shadow-xs">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-base-content/40">
            <span className="icon-[tabler--search] text-lg" aria-hidden="true"></span>
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => handleBuscar(e.target.value)}
            placeholder="Buscar por placa, apartamento o habitante..."
            className="input input-bordered arch-border bg-base-100 text-base-content w-full rounded-md pl-10 pr-10 py-2.5 text-sm sm:text-base focus:border-primary font-mono tracking-wide"
            autoFocus
          />
          {searchTerm && (
            <button
              onClick={() => handleBuscar('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-base-content/40 hover:text-base-content cursor-pointer"
            >
              <span className="icon-[tabler--x] text-base" aria-hidden="true"></span>
            </button>
          )}
        </div>

        {/* Acciones Rápidas */}
        <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-2.5 border-t arch-border">
          <span className="text-2xs font-bold text-base-content/50 uppercase tracking-wider mr-1">
            Accesos directos:
          </span>
          <Link
            href="/porteria/casillero"
            className="btn btn-xs btn-outline arch-border text-base-content/80 hover:bg-base-200 font-semibold"
          >
            <span className="icon-[tabler--package-import] text-primary" aria-hidden="true"></span>
            + Recibir Paquete
          </Link>
          <Link
            href="/porteria/visitas"
            className="btn btn-xs btn-outline arch-border text-base-content/80 hover:bg-base-200 font-semibold"
          >
            <span className="icon-[tabler--user-plus] text-primary" aria-hidden="true"></span>
            + Ingreso Visita
          </Link>
          <Link
            href="/porteria/minuta"
            className="btn btn-xs btn-outline arch-border text-base-content/80 hover:bg-base-200 font-semibold"
          >
            <span className="icon-[tabler--pencil-plus] text-primary" aria-hidden="true"></span>
            + Anotar Minuta
          </Link>
        </div>
      </div>

      {/* Resultados de Coincidencias de Vehículos */}
      {resultadosPlacas.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-base-content/70 uppercase tracking-wider flex items-center gap-1.5">
            <span className="icon-[tabler--car] text-primary text-base" aria-hidden="true"></span>
            Vehículos encontrados ({resultadosPlacas.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {resultadosPlacas.map((v, idx) => (
              <div
                key={idx}
                className="arch-panel p-4 flex flex-col justify-between hover:border-primary/40 transition-colors shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="px-2.5 py-0.5 rounded bg-amber-400 text-neutral font-mono font-bold text-sm tracking-widest border border-amber-500/40 shadow-xs">
                      {v.placa}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="badge badge-sm badge-outline arch-border font-bold text-base-content">
                        {v.identificador || `Torre ${v.torre} - ${v.numeroApto}`}
                      </span>
                      {v.esMoroso ? (
                        <span className="badge badge-sm badge-error font-bold">
                          Restricción
                        </span>
                      ) : (
                        <span className="badge badge-sm badge-success font-bold">
                          Al día
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-base-content/80 font-medium">
                    {v.marca || 'Vehículo'} {v.modelo || ''} {v.color ? `&bull; Color ${v.color}` : ''}
                    {v.numeroParqueadero ? ` &bull; Parqueadero ${v.numeroParqueadero}` : ''}
                  </p>
                </div>

                {v.contactos && v.contactos.length > 0 && (
                  <div className="mt-3 pt-3 border-t arch-border flex items-center justify-between text-xs">
                    <span className="text-base-content/70 font-medium">
                      Contacto: <strong className="text-base-content">{v.contactos[0].nombre}</strong>
                    </span>
                    {v.contactos[0].telefono && (
                      <a
                        href={`tel:${v.contactos[0].telefono}`}
                        className="text-primary hover:underline flex items-center gap-1 font-mono font-bold"
                      >
                        <span className="icon-[tabler--phone] text-sm" aria-hidden="true"></span>
                        {v.contactos[0].telefono}
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resultados de Coincidencias de Directorio Habitacional */}
      {resultados.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-base-content/70 uppercase tracking-wider flex items-center gap-1.5">
            <span className="icon-[tabler--home] text-primary text-base" aria-hidden="true"></span>
            Unidades habitacionales encontradas ({resultados.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {resultados.map((u) => (
              <div
                key={u._id}
                className="arch-panel p-4 flex flex-col justify-between hover:border-primary/40 transition-colors shadow-xs"
              >
                <div>
                  {/* Encabezado Unidad */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-base text-base-content">
                      {u.identificador || `Torre ${u.torre} - ${u.numeroApto}`}
                    </span>
                    {u.esMoroso ? (
                      <span className="badge badge-xs badge-error font-bold px-2 py-0.5">
                        Restricción Zonas
                      </span>
                    ) : (
                      <span className="badge badge-xs badge-success font-bold px-2 py-0.5">
                        Al día
                      </span>
                    )}
                  </div>

                  {/* Residentes */}
                  <div className="space-y-1.5 mb-3">
                    <span className="text-3xs font-bold text-base-content/50 uppercase tracking-wider block">
                      Residentes autorizados:
                    </span>
                    {u.residentes.length === 0 ? (
                      <p className="text-xs text-base-content/50 italic">Sin personas registradas</p>
                    ) : (
                      u.residentes.map((p: any, i: number) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="text-base-content/85 font-medium">
                            {p.nombreCompleto}
                            {p.esContactoEmergencia && (
                              <span className="text-2xs text-warning font-bold ml-1">
                                (Emergencia)
                              </span>
                            )}
                          </span>
                          {p.telefono && (
                            <a
                              href={`tel:${p.telefono}`}
                              className="text-primary hover:underline font-mono text-2xs"
                            >
                              {p.telefono}
                            </a>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  {/* Vehículos y Mascotas mini-badges */}
                  <div className="flex flex-wrap gap-1.5 pt-2 border-t arch-border">
                    {u.vehiculos.map((v: any, vi: number) => (
                      <span
                        key={vi}
                        className="badge badge-xs badge-outline arch-border font-mono text-3xs text-base-content/80"
                      >
                        🚗 {v.placa}
                      </span>
                    ))}
                    {u.mascotas.map((m: any, mi: number) => (
                      <span
                        key={mi}
                        className="badge badge-xs badge-outline arch-border text-3xs text-base-content/80"
                      >
                        🐾 {m.nombre} ({m.tipo})
                      </span>
                    ))}
                  </div>
                </div>

                {/* Acciones para esa unidad */}
                <div className="mt-4 pt-3 border-t arch-border flex items-center justify-end gap-2">
                  <Link
                    href={`/porteria/casillero?torre=${encodeURIComponent(u.torre)}&apto=${encodeURIComponent(u.numeroApto)}`}
                    className="btn btn-xs btn-outline btn-primary font-semibold"
                  >
                    + Paquete
                  </Link>
                  <Link
                    href={`/porteria/visitas?torre=${encodeURIComponent(u.torre)}&apto=${encodeURIComponent(u.numeroApto)}`}
                    className="btn btn-xs btn-outline arch-border text-base-content/80 hover:bg-base-200 font-semibold"
                  >
                    + Visita
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Si buscó y no encontró nada */}
      {searchTerm.length >= 2 && !buscando && resultados.length === 0 && resultadosPlacas.length === 0 && (
        <div className="arch-panel p-8 text-center shadow-xs">
          <span className="icon-[tabler--search-off] text-3xl text-base-content/30 mb-2 block mx-auto" aria-hidden="true"></span>
          <p className="text-sm font-semibold text-base-content">
            No se encontraron registros para &quot;{searchTerm}&quot;
          </p>
          <p className="text-xs text-base-content/60 mt-1">
            Verifica el número de apartamento o la placa sin guiones ni espacios.
          </p>
        </div>
      )}
    </div>
  );
}
