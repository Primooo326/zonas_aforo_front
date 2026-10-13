'use client';

import React, { useState, useMemo, useEffect } from 'react';

export interface ParqueaderoOpcion {
  _id?: string;
  numero: string;
  tipo?: string;
  esCubierto?: boolean;
  esVisitante?: boolean;
  torreAsignada?: string;
  aptoAsignado?: string;
}

export interface SelectorParqueaderoProps {
  value: string;
  onChange: (value: string) => void;
  tipoVehiculo?: string;
  parqueaderosInventario?: ParqueaderoOpcion[];
  parqueaderosAsignadosUnidad?: { numero: string; tipo?: string; esCubierto?: boolean }[];
  torreUnidad?: string;
  aptoUnidad?: string;
  vehiculosEnFormulario?: { placa?: string; numeroParqueadero?: string }[];
  vehiculoIndex?: number;
  disabled?: boolean;
  size?: 'xs' | 'sm';
}

export default function SelectorParqueadero({
  value,
  onChange,
  tipoVehiculo,
  parqueaderosInventario = [],
  parqueaderosAsignadosUnidad = [],
  torreUnidad = '',
  aptoUnidad = '',
  vehiculosEnFormulario = [],
  vehiculoIndex = 0,
  disabled = false,
  size = 'xs',
}: SelectorParqueaderoProps) {
  // Lista unificada de todos los números conocidos
  const todosLosNumeros = useMemo(() => {
    const set = new Set<string>();
    parqueaderosAsignadosUnidad.forEach((p) => p.numero && set.add(p.numero.trim()));
    parqueaderosInventario.forEach((p) => p.numero && set.add(p.numero.trim()));
    return set;
  }, [parqueaderosAsignadosUnidad, parqueaderosInventario]);

  // Si el valor actual no está en la lista conocida y no está vacío, entrar en modo manual
  const [modoManual, setModoManual] = useState<boolean>(() => {
    if (!value || value.trim() === '') return false;
    return !todosLosNumeros.has(value.trim());
  });

  useEffect(() => {
    if (value && value.trim() !== '' && !todosLosNumeros.has(value.trim())) {
      setModoManual(true);
    }
  }, [value, todosLosNumeros]);

  // Parqueaderos asignados a este inmueble
  const asignadosApto = useMemo(() => {
    const mapa = new Map<string, ParqueaderoOpcion>();

    // Primero los de la unidad
    parqueaderosAsignadosUnidad.forEach((p) => {
      if (p.numero) {
        mapa.set(p.numero.trim(), {
          numero: p.numero.trim(),
          tipo: p.tipo || 'carro',
          esCubierto: p.esCubierto ?? true,
          torreAsignada: torreUnidad,
          aptoAsignado: aptoUnidad,
        });
      }
    });

    // Luego los del inventario asignados a esta torre y apto
    parqueaderosInventario.forEach((p) => {
      const matchApto = aptoUnidad && p.aptoAsignado && p.aptoAsignado.toLowerCase() === aptoUnidad.toLowerCase();
      const matchTorre = !torreUnidad || !p.torreAsignada || p.torreAsignada.toLowerCase() === torreUnidad.toLowerCase();
      if (matchApto && matchTorre && p.numero) {
        mapa.set(p.numero.trim(), {
          ...p,
          numero: p.numero.trim(),
        });
      }
    });

    return Array.from(mapa.values()).sort((a, b) => a.numero.localeCompare(b.numero, undefined, { numeric: true }));
  }, [parqueaderosAsignadosUnidad, parqueaderosInventario, torreUnidad, aptoUnidad]);

  const asignadosAptoNumeros = useMemo(() => {
    return new Set(asignadosApto.map((p) => p.numero));
  }, [asignadosApto]);

  // Libres en el conjunto (sin apartamento asignado y no visitantes)
  const libresConjunto = useMemo(() => {
    return parqueaderosInventario
      .filter((p) => {
        if (!p.numero) return false;
        if (asignadosAptoNumeros.has(p.numero.trim())) return false;
        if (p.esVisitante) return false;
        return !p.aptoAsignado || p.aptoAsignado.trim() === '';
      })
      .sort((a, b) => a.numero.localeCompare(b.numero, undefined, { numeric: true }));
  }, [parqueaderosInventario, asignadosAptoNumeros]);

  // Comunales / Visitantes
  const comunalesVisitantes = useMemo(() => {
    return parqueaderosInventario
      .filter((p) => {
        if (!p.numero) return false;
        if (asignadosAptoNumeros.has(p.numero.trim())) return false;
        return Boolean(p.esVisitante);
      })
      .sort((a, b) => a.numero.localeCompare(b.numero, undefined, { numeric: true }));
  }, [parqueaderosInventario, asignadosAptoNumeros]);

  // Otros asignados en el conjunto (por si administración necesita reasignar)
  const otrosAsignados = useMemo(() => {
    return parqueaderosInventario
      .filter((p) => {
        if (!p.numero) return false;
        if (asignadosAptoNumeros.has(p.numero.trim())) return false;
        if (p.esVisitante) return false;
        return Boolean(p.aptoAsignado && p.aptoAsignado.trim() !== '');
      })
      .sort((a, b) => a.numero.localeCompare(b.numero, undefined, { numeric: true }));
  }, [parqueaderosInventario, asignadosAptoNumeros]);

  // Detección de uso por otro vehículo en el mismo formulario
  const getUsoVehiculoTexto = (numero: string): string => {
    const otroVehiculoIdx = vehiculosEnFormulario.findIndex(
      (v, idx) => idx !== vehiculoIndex && v.numeroParqueadero && v.numeroParqueadero.trim().toUpperCase() === numero.trim().toUpperCase(),
    );
    if (otroVehiculoIdx !== -1) {
      const otro = vehiculosEnFormulario[otroVehiculoIdx];
      const placa = otro.placa ? ` (${otro.placa})` : '';
      return ` • ⚠️ En uso por Vehículo #${otroVehiculoIdx + 1}${placa}`;
    }
    return '';
  };

  const getTipoIcono = (tipo?: string) => {
    if (!tipo) return '🚗';
    const t = tipo.toLowerCase();
    if (t.includes('moto')) return '🏍️';
    if (t.includes('bici')) return '🚲';
    return '🚗';
  };

  const hayOpciones = asignadosApto.length > 0 || libresConjunto.length > 0 || comunalesVisitantes.length > 0 || otrosAsignados.length > 0;

  // Si no hay ningún parqueadero en el sistema o está en modo manual
  if (!hayOpciones || modoManual) {
    return (
      <div className="space-y-1 w-full">
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            placeholder="N° parqueadero asignado"
            className={`input ${size === 'xs' ? 'input-xs' : 'input-sm'} w-full`}
          />
          {hayOpciones && (
            <button
              type="button"
              onClick={() => {
                setModoManual(false);
              }}
              title="Seleccionar de la lista de parqueaderos disponibles"
              className="btn btn-ghost btn-xs text-primary shrink-0"
            >
              <span className="icon-[tabler--list] text-sm" />
              <span className="text-2xs hidden sm:inline">Ver lista</span>
            </button>
          )}
        </div>
        {!hayOpciones && (
          <p className="text-3xs text-base-content/50 italic">
            Sin inventario de parqueaderos registrado en el edificio.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1 w-full">
      <div className="flex items-center gap-1.5">
        <select
          value={value}
          disabled={disabled}
          onChange={(e) => {
            const val = e.target.value;
            if (val === '__manual__') {
              setModoManual(true);
            } else {
              onChange(val);
            }
          }}
          className={`select ${size === 'xs' ? 'select-xs' : 'select-sm'} w-full font-medium ${
            !value ? 'text-base-content/60' : 'text-base-content'
          }`}
        >
          <option value="">-- Seleccionar parqueadero disponible --</option>

          {/* Grupo 1: Asignados a este apartamento */}
          {asignadosApto.length > 0 && (
            <optgroup label="⭐ Asignados a este apartamento">
              {asignadosApto.map((p) => {
                const cubierto = p.esCubierto ? 'Cubierto' : 'Descubierto';
                const uso = getUsoVehiculoTexto(p.numero);
                return (
                  <option key={p.numero} value={p.numero}>
                    {p.numero} · {getTipoIcono(p.tipo)} {p.tipo || 'Carro'} · {cubierto} (Asignado al Apto){uso}
                  </option>
                );
              })}
            </optgroup>
          )}

          {/* Grupo 2: Libres en el conjunto */}
          {libresConjunto.length > 0 && (
            <optgroup label="🟢 Disponibles / Libres en el conjunto">
              {libresConjunto.map((p) => {
                const cubierto = p.esCubierto ? 'Cubierto' : 'Descubierto';
                const uso = getUsoVehiculoTexto(p.numero);
                return (
                  <option key={p.numero} value={p.numero}>
                    {p.numero} · {getTipoIcono(p.tipo)} {p.tipo || 'Carro'} · {cubierto} (Libre){uso}
                  </option>
                );
              })}
            </optgroup>
          )}

          {/* Grupo 3: Comunales o Visitantes */}
          {comunalesVisitantes.length > 0 && (
            <optgroup label="🔵 Comunales / Visitantes">
              {comunalesVisitantes.map((p) => {
                const cubierto = p.esCubierto ? 'Cubierto' : 'Descubierto';
                const uso = getUsoVehiculoTexto(p.numero);
                return (
                  <option key={p.numero} value={p.numero}>
                    {p.numero} · {getTipoIcono(p.tipo)} Comunal · {cubierto}{uso}
                  </option>
                );
              })}
            </optgroup>
          )}

          {/* Grupo 4: Otros asignados (por reasignación o subarriendo) */}
          {otrosAsignados.length > 0 && (
            <optgroup label="⚪ Asignados a otros apartamentos">
              {otrosAsignados.map((p) => {
                const asignadoA = [p.torreAsignada, p.aptoAsignado ? `Apto ${p.aptoAsignado}` : ''].filter(Boolean).join(' ');
                const uso = getUsoVehiculoTexto(p.numero);
                return (
                  <option key={p.numero} value={p.numero}>
                    {p.numero} · {getTipoIcono(p.tipo)} ({asignadoA || 'Ocupado'}){uso}
                  </option>
                );
              })}
            </optgroup>
          )}

          <option value="__manual__">✏️ Ingresar otro número manualmente...</option>
        </select>

        <button
          type="button"
          onClick={() => setModoManual(true)}
          title="Escribir número manualmente"
          className="btn btn-ghost btn-xs text-base-content/60 shrink-0"
        >
          <span className="icon-[tabler--pencil] text-xs" />
        </button>
      </div>

      {value && (
        <div className="flex items-center gap-1.5 text-3xs text-base-content/65">
          <span className="icon-[tabler--check] text-success text-xs shrink-0" />
          <span>Parqueadero seleccionado: <strong className="text-base-content font-mono">{value}</strong></span>
          {asignadosAptoNumeros.has(value) && (
            <span className="badge badge-3xs badge-primary">Asignado al Apto</span>
          )}
        </div>
      )}
    </div>
  );
}
