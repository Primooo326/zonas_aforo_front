'use client';

import React from 'react';

interface BuildingPlaqueProps {
  nombreEdificio: string;
  direccion?: string;
  tipoEdificio?: string;
  subtitulo?: string;
  acciones?: React.ReactNode;
  className?: string;
  compacto?: boolean;
}

export default function BuildingPlaque({
  nombreEdificio,
  direccion,
  tipoEdificio = 'Copropiedad Residencial',
  subtitulo,
  acciones,
  className = '',
  compacto = false,
}: BuildingPlaqueProps) {
  return (
    <header
      className={`arch-plaque p-4 sm:p-5 relative transition-all ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3.5 min-w-0">
          <div
            className="flex-none w-10 h-10 sm:w-11 sm:h-11 rounded-md bg-primary/10 border border-primary/20 text-primary flex items-center justify-center"
            aria-hidden="true"
          >
            <span className="icon-[tabler--building] text-2xl" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-2xs font-medium uppercase tracking-wider text-primary">
                {tipoEdificio}
              </span>
              {direccion && (
                <>
                  <span className="text-base-content/40 text-2xs">/</span>
                  <span className="text-2xs text-base-content/70 font-normal">
                    {direccion}
                  </span>
                </>
              )}
            </div>
            <h1
              className={`${
                compacto ? 'text-lg sm:text-xl' : 'text-xl sm:text-2xl'
              } font-bold text-base-content tracking-tight truncate mt-0.5`}
            >
              {nombreEdificio}
            </h1>
            {subtitulo && (
              <p className="text-xs sm:text-sm text-base-content/70 mt-1 line-clamp-1">
                {subtitulo}
              </p>
            )}
          </div>
        </div>

        {acciones && (
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap flex-none">
            {acciones}
          </div>
        )}
      </div>
    </header>
  );
}
