'use client';

import React from 'react';

export type ModoVista = 'tabla' | 'tarjetas';

export interface OpcionOrden {
  valor: string;
  etiqueta: string;
}

export interface BarraBusquedaFiltrosProps {
  /** Valor de la búsqueda de texto */
  busqueda: string;
  /** Callback al cambiar la búsqueda */
  onBusquedaChange: (valor: string) => void;
  /** Placeholder descriptivo */
  placeholderBusqueda?: string;

  /** Criterio de orden seleccionado */
  orden: string;
  /** Callback al cambiar el orden */
  onOrdenChange: (orden: string) => void;
  /** Opciones de ordenamiento disponibles */
  opcionesOrden: OpcionOrden[];
  /** Etiqueta de accesibilidad para el select de orden */
  labelOrden?: string;

  /** Modo de vista actual: 'tabla' o 'tarjetas' */
  vista: ModoVista;
  /** Callback para alternar modo de vista */
  onVistaChange: (vista: ModoVista) => void;

  /** Estado del drawer o panel desplegable de filtros */
  drawerFiltrosAbierto: boolean;
  /** Callback para alternar el drawer de filtros */
  onToggleDrawerFiltros: () => void;
  /** Cantidad de filtros secundarios activos actualmente */
  filtrosActivosCount?: number;
  /** Título del panel de filtros */
  tituloFiltros?: string;
  /** Callback opcional para limpiar todos los filtros del drawer */
  onLimpiarFiltros?: () => void;

  /** Campos y selectores de filtro que se renderizan dentro del drawer */
  children?: React.ReactNode;
}

/**
 * Barra unificada de búsqueda, ordenamiento, toggle de vista (Tabla vs Tarjetas)
 * y panel desplegable de filtros. Diseñada con alta visibilidad y ergonomía táctil
 * para adultos mayores y administradores.
 */
export default function BarraBusquedaFiltros({
  busqueda,
  onBusquedaChange,
  placeholderBusqueda = 'Buscar...',
  orden,
  onOrdenChange,
  opcionesOrden,
  labelOrden = 'Criterio de orden',
  vista,
  onVistaChange,
  drawerFiltrosAbierto,
  onToggleDrawerFiltros,
  filtrosActivosCount = 0,
  tituloFiltros = 'Filtros avanzados',
  onLimpiarFiltros,
  children,
}: BarraBusquedaFiltrosProps) {
  return (
    <div className="card bg-base-100 shadow-sm border border-base-200 p-3 sm:p-4 space-y-3">
      {/* Fila principal: Búsqueda + Selector de Orden + Botonera de Vista + Botón Filtros */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5">
        {/* 1. Input de Búsqueda Principal */}
        <div className="relative flex-1">
          <span
            className="icon-[tabler--search] absolute left-3 top-1/2 -translate-y-1/2 text-base-content/60 text-lg pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => onBusquedaChange(e.target.value)}
            placeholder={placeholderBusqueda}
            className="input input-sm sm:input-md w-full pl-9.5 pr-8 text-xs sm:text-sm font-medium focus:border-primary"
            aria-label="Campo de búsqueda"
          />
          {busqueda && (
            <button
              type="button"
              onClick={() => onBusquedaChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content text-xs p-1"
              title="Borrar búsqueda"
              aria-label="Borrar texto de búsqueda"
            >
              ✕
            </button>
          )}
        </div>

        {/* 2. Controles de Derecha: Orden + Switcher Vista + Botón Filtros */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
          {/* Selector de Orden */}
          {opcionesOrden.length > 0 && (
            <div className="flex-1 sm:flex-initial min-w-[170px]">
              <select
                value={orden}
                onChange={(e) => onOrdenChange(e.target.value)}
                className="select select-sm sm:select-md text-xs sm:text-sm font-medium w-full"
                aria-label={labelOrden}
              >
                {opcionesOrden.map((op) => (
                  <option key={op.valor} value={op.valor}>
                    {op.etiqueta}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Botonera Agrupada de Alternancia de Vista: [ Lista / Tabla | Grilla / Tarjetas ] */}
          <div
            className="inline-flex items-center p-0.5 rounded-lg border border-base-300 bg-base-200/60 shrink-0"
            role="group"
            aria-label="Modo de visualización"
          >
            <button
              type="button"
              onClick={() => onVistaChange('tabla')}
              className={`inline-flex items-center justify-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-md text-xs sm:text-sm font-semibold transition-all duration-150 ${
                vista === 'tabla'
                  ? 'bg-primary text-primary-content shadow-xs'
                  : 'text-base-content/70 hover:text-base-content hover:bg-base-100/50'
              }`}
              title="Visualización en Tabla / Lista"
              aria-label="Cambiar a vista de tabla"
              aria-pressed={vista === 'tabla'}
            >
              <span className="icon-[tabler--list] text-base sm:text-lg" aria-hidden="true" />
              <span className="hidden sm:inline">Tabla</span>
            </button>

            <button
              type="button"
              onClick={() => onVistaChange('tarjetas')}
              className={`inline-flex items-center justify-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-md text-xs sm:text-sm font-semibold transition-all duration-150 ${
                vista === 'tarjetas'
                  ? 'bg-primary text-primary-content shadow-xs'
                  : 'text-base-content/70 hover:text-base-content hover:bg-base-100/50'
              }`}
              title="Visualización en Tarjetas / Cuadrícula"
              aria-label="Cambiar a vista de tarjetas"
              aria-pressed={vista === 'tarjetas'}
            >
              <span className="icon-[tabler--layout-grid] text-base sm:text-lg" aria-hidden="true" />
              <span className="hidden sm:inline">Tarjetas</span>
            </button>
          </div>

          {/* Botón Desplegable de Filtros Drawer */}
          {children && (
            <button
              type="button"
              onClick={onToggleDrawerFiltros}
              className={`btn btn-sm sm:btn-md gap-1.5 font-semibold transition-colors shrink-0 ${
                drawerFiltrosAbierto || filtrosActivosCount > 0
                  ? 'btn-primary'
                  : 'btn-outline border-base-300'
              }`}
              aria-expanded={drawerFiltrosAbierto}
              aria-label="Abrir panel de filtros secundarios"
            >
              <span
                className="icon-[tabler--adjustments-horizontal] text-base sm:text-lg"
                aria-hidden="true"
              />
              <span className="text-xs sm:text-sm">Filtros</span>
              {filtrosActivosCount > 0 && (
                <span className="badge badge-xs badge-warning font-bold px-1.5 py-0.5">
                  {filtrosActivosCount}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Panel Desplegable (Drawer) de Filtros */}
      {drawerFiltrosAbierto && children && (
        <div className="pt-3 border-t border-base-200/80 animate-in fade-in slide-in-from-top-2 duration-150 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-bold text-base-content/80 flex items-center gap-1.5">
              <span className="icon-[tabler--filter] text-primary" aria-hidden="true" />
              {tituloFiltros}
            </span>
            <div className="flex items-center gap-2">
              {filtrosActivosCount > 0 && onLimpiarFiltros && (
                <button
                  type="button"
                  onClick={onLimpiarFiltros}
                  className="text-xs text-error hover:underline font-semibold"
                >
                  Limpiar filtros ({filtrosActivosCount})
                </button>
              )}
              <button
                type="button"
                onClick={onToggleDrawerFiltros}
                className="btn btn-ghost btn-xs btn-circle text-base-content/60"
                aria-label="Cerrar panel de filtros"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Contenido inyectado de filtros */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
