'use client';

import React, { useState, useEffect, useRef } from 'react';
import { porteriaApiFetch } from '@/lib/api';

export interface UnidadSeleccionada {
  identificador: string;
  torre: string;
  numeroApto: string;
  piso?: number;
  esMoroso: boolean;
  residentes: Array<{
    nombreCompleto: string;
    telefono?: string;
    condicion?: string;
    esContactoEmergencia?: boolean;
  }>;
}

interface SelectorUnidadPorteriaProps {
  onSelect: (unidad: UnidadSeleccionada | null) => void;
  unidadActual?: { torre: string; apartamento: string } | null;
  label?: string;
  required?: boolean;
}

export default function SelectorUnidadPorteria({
  onSelect,
  unidadActual,
  label = 'Inmueble de Destino (Torre / Apartamento)',
  required = true,
}: SelectorUnidadPorteriaProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sugerencias, setSugerencias] = useState<UnidadSeleccionada[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [mostrarDropdown, setMostrarDropdown] = useState(false);
  const [unidadSeleccionada, setUnidadSeleccionada] = useState<UnidadSeleccionada | null>(null);
  const [modoManual, setModoManual] = useState(false);
  const [torreManual, setTorreManual] = useState(unidadActual?.torre || '');
  const [aptoManual, setAptoManual] = useState(unidadActual?.apartamento || '');

  const dropdownRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cerrar dropdown al hacer click afuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setMostrarDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Si viene una unidad predefinida en los searchParams
  useEffect(() => {
    if (unidadActual?.apartamento && !unidadSeleccionada && !modoManual) {
      const cargarPredefinida = async () => {
        try {
          const res = await porteriaApiFetch(
            `/porteria/consultas/directorio?q=${encodeURIComponent(unidadActual.apartamento)}`,
          );
          const match = (res || []).find(
            (u: any) =>
              u.numeroApto?.toUpperCase() === unidadActual.apartamento.toUpperCase() &&
              (!unidadActual.torre || u.torre?.toUpperCase() === unidadActual.torre.toUpperCase()),
          );
          if (match) {
            handleSeleccionar(match);
          } else {
            setTorreManual(unidadActual.torre);
            setAptoManual(unidadActual.apartamento);
            setModoManual(true);
            onSelect({
              identificador: unidadActual.torre ? `Torre ${unidadActual.torre} - ${unidadActual.apartamento}` : `Apto ${unidadActual.apartamento}`,
              torre: unidadActual.torre,
              numeroApto: unidadActual.apartamento,
              esMoroso: false,
              residentes: [],
            });
          }
        } catch {
          // fallback manual
          setModoManual(true);
        }
      };
      cargarPredefinida();
    }
  }, [unidadActual]);

  const handleBuscar = (val: string) => {
    setSearchTerm(val);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (!val || val.trim().length < 1) {
      setSugerencias([]);
      setMostrarDropdown(false);
      return;
    }

    setBuscando(true);
    setMostrarDropdown(true);

    timeoutRef.current = setTimeout(async () => {
      try {
        const data = await porteriaApiFetch(
          `/porteria/consultas/directorio?q=${encodeURIComponent(val.trim())}`,
        );
        setSugerencias(data || []);
      } catch (err) {
        console.error('Error buscando unidades:', err);
        setSugerencias([]);
      } finally {
        setBuscando(false);
      }
    }, 150);
  };

  const handleSeleccionar = (u: UnidadSeleccionada) => {
    setUnidadSeleccionada(u);
    setSearchTerm('');
    setSugerencias([]);
    setMostrarDropdown(false);
    setModoManual(false);
    onSelect(u);
  };

  const handleLimpiar = () => {
    setUnidadSeleccionada(null);
    setSearchTerm('');
    setSugerencias([]);
    setModoManual(false);
    onSelect(null);
  };

  const handleManualChange = (torreVal: string, aptoVal: string) => {
    setTorreManual(torreVal);
    setAptoManual(aptoVal);
    if (aptoVal.trim()) {
      onSelect({
        identificador: torreVal ? `Torre ${torreVal} - Apto ${aptoVal}` : `Apto ${aptoVal}`,
        torre: torreVal.trim(),
        numeroApto: aptoVal.trim(),
        esMoroso: false,
        residentes: [],
      });
    } else {
      onSelect(null);
    }
  };

  return (
    <div className="space-y-2" ref={dropdownRef}>
      <div className="flex items-center justify-between">
        <label className="block text-2xs font-bold text-base-content/70 uppercase tracking-wider">
          {label} {required && <span className="text-error">*</span>}
        </label>
        {!unidadSeleccionada && (
          <button
            type="button"
            onClick={() => setModoManual(!modoManual)}
            className="text-3xs text-primary hover:underline font-semibold"
          >
            {modoManual ? 'Volver al buscador' : 'Ingresar torre/apto manual'}
          </button>
        )}
      </div>

      {/* 1. MODO MANUAL */}
      {modoManual && !unidadSeleccionada && (
        <div className="grid grid-cols-2 gap-3 p-3 rounded-md bg-base-200/50 border arch-border">
          <div>
            <label className="block text-3xs font-semibold text-base-content/60 mb-1">
              Torre
            </label>
            <input
              type="text"
              value={torreManual}
              onChange={(e) => handleManualChange(e.target.value, aptoManual)}
              placeholder="ej: Bogotá, 1"
              className="input input-sm input-bordered arch-border bg-base-100 text-base-content w-full rounded-md font-bold uppercase"
              required={required}
            />
          </div>
          <div>
            <label className="block text-3xs font-semibold text-base-content/60 mb-1">
              Apartamento
            </label>
            <input
              type="text"
              value={aptoManual}
              onChange={(e) => handleManualChange(torreManual, e.target.value)}
              placeholder="ej: 302, 101A"
              className="input input-sm input-bordered arch-border bg-base-100 text-base-content w-full rounded-md font-bold uppercase"
              required={required}
            />
          </div>
        </div>
      )}

      {/* 2. UNIDAD SELECCIONADA: TARJETA COMPACTA CON CITOFONÍA */}
      {unidadSeleccionada && (
        <div className="arch-panel p-3.5 bg-base-100 border arch-border rounded-md shadow-2xs space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-md bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                🏢
              </span>
              <div>
                <h4 className="font-bold text-sm text-base-content leading-tight">
                  {unidadSeleccionada.identificador || `Torre ${unidadSeleccionada.torre} - Apto ${unidadSeleccionada.numeroApto}`}
                </h4>
                {unidadSeleccionada.piso && (
                  <span className="text-3xs text-base-content/50">
                    Piso {unidadSeleccionada.piso}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {unidadSeleccionada.esMoroso ? (
                <span className="badge badge-xs badge-error font-bold px-2 py-0.5">
                  Restricción
                </span>
              ) : (
                <span className="badge badge-xs badge-success font-bold px-2 py-0.5">
                  Al día
                </span>
              )}
              <button
                type="button"
                onClick={handleLimpiar}
                className="btn btn-xs btn-ghost text-base-content/60 hover:text-error"
                title="Cambiar inmueble"
              >
                Cambiar
              </button>
            </div>
          </div>

          {/* Citofonía y Contacto Principal */}
          {unidadSeleccionada.residentes.length > 0 && (
            <div className="pt-2 border-t arch-border flex flex-wrap items-center justify-between gap-1 text-2xs">
              <span className="text-base-content/60">
                Citofonía / Contacto:{' '}
                <strong className="text-base-content">
                  {unidadSeleccionada.residentes[0].nombreCompleto}
                </strong>
              </span>

              {unidadSeleccionada.residentes[0].telefono && (
                <a
                  href={`tel:${unidadSeleccionada.residentes[0].telefono}`}
                  className="text-primary hover:underline font-mono font-bold flex items-center gap-1 bg-primary/10 px-2 py-0.5 rounded"
                  title="Llamar para verificar autorización"
                >
                  <span className="icon-[tabler--phone] text-xs" aria-hidden="true"></span>
                  {unidadSeleccionada.residentes[0].telefono}
                </a>
              )}
            </div>
          )}
        </div>
      )}

      {/* 3. BUSCADOR PREDICTIVO AUTOCOMPLETE */}
      {!unidadSeleccionada && !modoManual && (
        <div className="relative">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-base-content/40">
              <span className="icon-[tabler--search] text-base" aria-hidden="true"></span>
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => handleBuscar(e.target.value)}
              onFocus={() => {
                if (searchTerm.trim().length > 0) setMostrarDropdown(true);
              }}
              placeholder="Digita torre, apartamento o residente (ej: 101, Madrid, Carlos)..."
              className="input input-bordered arch-border bg-base-100 text-base-content w-full rounded-md pl-9 pr-9 py-2.5 text-sm focus:border-primary font-medium"
              required={required}
            />
            {buscando && (
              <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-primary">
                <span className="loading loading-spinner loading-xs"></span>
              </span>
            )}
            {searchTerm && !buscando && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setSugerencias([]);
                  setMostrarDropdown(false);
                }}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-base-content/40 hover:text-base-content"
              >
                <span className="icon-[tabler--x] text-base" aria-hidden="true"></span>
              </button>
            )}
          </div>

          {/* Menú flotante de sugerencias */}
          {mostrarDropdown && (
            <div className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto arch-panel bg-base-100 border arch-border rounded-md shadow-lg py-1 divide-y arch-border">
              {sugerencias.length === 0 ? (
                <div className="p-3 text-center text-xs text-base-content/50">
                  {buscando ? 'Buscando inmuebles...' : 'No se encontraron unidades con ese criterio'}
                </div>
              ) : (
                sugerencias.map((u, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSeleccionar(u)}
                    className="w-full text-left p-2.5 hover:bg-base-200 transition-colors flex items-center justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-base-content font-mono">
                          {u.identificador || `Torre ${u.torre} - ${u.numeroApto}`}
                        </span>
                        {u.esMoroso ? (
                          <span className="badge badge-3xs badge-error font-bold">
                            Restricción
                          </span>
                        ) : (
                          <span className="badge badge-3xs badge-success font-bold">
                            Al día
                          </span>
                        )}
                      </div>
                      <p className="text-3xs text-base-content/60 mt-0.5 truncate max-w-xs sm:max-w-md">
                        {u.residentes.length > 0
                          ? `Residentes: ${u.residentes.map((r) => r.nombreCompleto).join(', ')}`
                          : 'Sin residentes censados'}
                      </p>
                    </div>

                    <span className="text-3xs font-bold text-primary shrink-0">
                      Seleccionar &rarr;
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
