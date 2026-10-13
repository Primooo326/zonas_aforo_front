'use client';

import React from 'react';

interface PaginacionProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange?: (size: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

export default function Paginacion({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  pageSizeOptions = [10, 20, 50],
  className = '',
}: PaginacionProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  // Si no hay ítems o solo 1 página y no se requiere cambio de tamaño, aún se muestra el resumen
  const inicio = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const fin = Math.min(currentPage * itemsPerPage, totalItems);

  // Generar lista de números de página visibles con elipsis
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 p-3 sm:p-4 bg-base-100 border-t border-base-200/80 rounded-b-box text-xs sm:text-sm text-base-content/80 ${className}`}
      aria-label="Paginación de resultados"
    >
      {/* Resumen y Selector de Filas por página */}
      <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
        <span className="text-base-content/70">
          Mostrando{' '}
          <span className="font-semibold text-base-content">
            {inicio}-{fin}
          </span>{' '}
          de <span className="font-semibold text-base-content">{totalItems}</span> registros
        </span>

        {onItemsPerPageChange && (
          <div className="flex items-center gap-1.5">
            <span className="text-2xs text-base-content/60 hidden sm:inline">Por página:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                const nuevo = Number(e.target.value);
                onItemsPerPageChange(nuevo);
                onPageChange(1);
              }}
              className="select select-bordered select-xs text-xs font-medium"
              aria-label="Seleccionar cantidad de elementos por página"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt} / pág
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Controles de Navegación de Páginas */}
      <div className="flex items-center gap-1 w-full sm:w-auto justify-center sm:justify-end">
        {/* Botón Anterior */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="btn btn-xs sm:btn-sm btn-outline gap-1 font-medium disabled:opacity-40"
          aria-label="Página anterior"
        >
          <span className="icon-[tabler--chevron-left] text-base" aria-hidden="true" />
          <span className="hidden xs:inline">Anterior</span>
        </button>

        {/* Números de página */}
        <div className="flex items-center gap-1 mx-1">
          {getPageNumbers().map((p, idx) => {
            if (p === '...') {
              return (
                <span key={`ellipsis-${idx}`} className="px-1 text-base-content/40 select-none">
                  •••
                </span>
              );
            }
            const isActual = p === currentPage;
            return (
              <button
                key={`page-${p}`}
                type="button"
                onClick={() => onPageChange(Number(p))}
                className={`btn btn-xs sm:btn-sm min-w-8 font-semibold ${
                  isActual
                    ? 'btn-primary shadow-xs'
                    : 'btn-ghost hover:bg-base-200 text-base-content/80'
                }`}
                aria-current={isActual ? 'page' : undefined}
                aria-label={`Ir a la página ${p}`}
              >
                {p}
              </button>
            );
          })}
        </div>

        {/* Botón Siguiente */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="btn btn-xs sm:btn-sm btn-outline gap-1 font-medium disabled:opacity-40"
          aria-label="Página siguiente"
        >
          <span className="hidden xs:inline">Siguiente</span>
          <span className="icon-[tabler--chevron-right] text-base" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
