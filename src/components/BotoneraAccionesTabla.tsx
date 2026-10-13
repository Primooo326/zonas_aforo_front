'use client';

import React from 'react';
import Link from 'next/link';

export interface BotoneraAccionesTablaProps {
  verUrl?: string;
  onVer?: () => void;
  tituloVer?: string;

  editarUrl?: string;
  onEditar?: () => void;
  tituloEditar?: string;

  onEliminar?: () => void;
  tituloEliminar?: string;
  deshabilitarEliminar?: boolean;

  onAprobar?: () => void;
  tituloAprobar?: string;
  deshabilitarAprobar?: boolean;

  onRechazar?: () => void;
  tituloRechazar?: string;
  deshabilitarRechazar?: boolean;

  /** Acciones adicionales personalizadas (ej. tags, mantenimientos) */
  children?: React.ReactNode;
}

/**
 * Componente reutilizable y accesible para la columna de acciones en tablas.
 * Garantiza botones con fondo suave (soft), bordes visibles y tamaño mínimo de 36px
 * para facilitar el clic a personas adultas y evitar botones invisibles o colapsados.
 */
export default function BotoneraAccionesTabla({
  verUrl,
  onVer,
  tituloVer = 'Ver detalle',
  editarUrl,
  onEditar,
  tituloEditar = 'Editar',
  onEliminar,
  tituloEliminar = 'Eliminar',
  deshabilitarEliminar = false,
  onAprobar,
  tituloAprobar = 'Aprobar',
  deshabilitarAprobar = false,
  onRechazar,
  tituloRechazar = 'Rechazar',
  deshabilitarRechazar = false,
  children,
}: BotoneraAccionesTablaProps) {
  const baseBtnClass =
    'inline-flex items-center justify-center w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-lg transition-all duration-150 focus:outline-hidden focus:ring-2 focus:ring-offset-1 text-sm shrink-0';

  return (
    <div className="flex items-center justify-end gap-1.5 flex-wrap">
      {/* Botones personalizados previos (si los hay) */}
      {children}

      {/* Botón Aprobar (opcional) */}
      {onAprobar && (
        <button
          type="button"
          onClick={onAprobar}
          disabled={deshabilitarAprobar}
          title={tituloAprobar}
          aria-label={tituloAprobar}
          className={`${baseBtnClass} bg-success/15 hover:bg-success text-success hover:text-success-content border border-success/30 focus:ring-success disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <span className="icon-[tabler--check] text-lg font-bold" aria-hidden="true" />
        </button>
      )}

      {/* Botón Rechazar (opcional) */}
      {onRechazar && (
        <button
          type="button"
          onClick={onRechazar}
          disabled={deshabilitarRechazar}
          title={tituloRechazar}
          aria-label={tituloRechazar}
          className={`${baseBtnClass} bg-error/15 hover:bg-error text-error hover:text-error-content border border-error/30 focus:ring-error disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <span className="icon-[tabler--x] text-lg font-bold" aria-hidden="true" />
        </button>
      )}

      {/* Botón Ver */}
      {verUrl && (
        <Link
          href={verUrl}
          title={tituloVer}
          aria-label={tituloVer}
          className={`${baseBtnClass} bg-info/15 hover:bg-info text-info hover:text-info-content border border-info/30 focus:ring-info`}
        >
          <span className="icon-[tabler--eye] text-lg" aria-hidden="true" />
        </Link>
      )}
      {!verUrl && onVer && (
        <button
          type="button"
          onClick={onVer}
          title={tituloVer}
          aria-label={tituloVer}
          className={`${baseBtnClass} bg-info/15 hover:bg-info text-info hover:text-info-content border border-info/30 focus:ring-info`}
        >
          <span className="icon-[tabler--eye] text-lg" aria-hidden="true" />
        </button>
      )}

      {/* Botón Editar */}
      {editarUrl && (
        <Link
          href={editarUrl}
          title={tituloEditar}
          aria-label={tituloEditar}
          className={`${baseBtnClass} bg-base-200 hover:bg-base-300 text-base-content border border-base-300 focus:ring-primary`}
        >
          <span className="icon-[tabler--edit] text-lg" aria-hidden="true" />
        </Link>
      )}
      {!editarUrl && onEditar && (
        <button
          type="button"
          onClick={onEditar}
          title={tituloEditar}
          aria-label={tituloEditar}
          className={`${baseBtnClass} bg-base-200 hover:bg-base-300 text-base-content border border-base-300 focus:ring-primary`}
        >
          <span className="icon-[tabler--edit] text-lg" aria-hidden="true" />
        </button>
      )}

      {/* Botón Eliminar */}
      {onEliminar && (
        <button
          type="button"
          onClick={onEliminar}
          disabled={deshabilitarEliminar}
          title={tituloEliminar}
          aria-label={tituloEliminar}
          className={`${baseBtnClass} bg-error/15 hover:bg-error text-error hover:text-error-content border border-error/30 focus:ring-error disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <span className="icon-[tabler--trash] text-lg" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
