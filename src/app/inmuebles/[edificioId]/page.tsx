"use client";

import { use, useEffect, useState } from 'react';
import { apiFetch, API_URL } from '@/lib/api';
import Link from 'next/link';

interface Inmueble {
  _id: string;
  tipo: string;
  transaccion: string;
  precio: number;
  metrosCuadrados?: number;
  piso?: number;
  parqueadero?: boolean;
  balcon?: boolean;
  deposito?: boolean;
  amoblado?: boolean;
  cubierto?: boolean;
  telefono: string;
  emailContacto?: string;
  observacion?: string;
  imagenes: string[];
  estado: string;
  createdAt?: string;
  censoUnidadId?: string | { _id: string; identificador?: string };
  torre?: string;
  numeroApto?: string;
  identificador?: string;
  itemAsignadoRef?: string;
}

const tipoBadge = (tipo: string) => {
  switch (tipo) {
    case 'inmueble':
      return 'badge-primary';
    case 'parqueadero':
      return 'badge-warning';
    case 'habitacion':
      return 'badge-info';
    default:
      return 'badge-neutral';
  }
};

export default function InmueblesPublicPage({ params }: { params: Promise<{ edificioId: string }> }) {
  const { edificioId } = use(params);
  const [inmuebles, setInmuebles] = useState<Inmueble[]>([]);
  const [nombreEdificio, setNombreEdificio] = useState('');
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Filtros avanzados
  const [showFilters, setShowFilters] = useState(false);
  const [tipo, setTipo] = useState('');
  const [transaccion, setTransaccion] = useState('');
  const [precioMin, setPrecioMin] = useState('');
  const [precioMax, setPrecioMax] = useState('');
  const [filtroParqueadero, setFiltroParqueadero] = useState(false);
  const [filtroBalcon, setFiltroBalcon] = useState(false);
  const [filtroAmoblado, setFiltroAmoblado] = useState(false);
  const [filtroDeposito, setFiltroDeposito] = useState(false);
  const [filtroCubierto, setFiltroCubierto] = useState(false);

  useEffect(() => {
    if (edificioId) {
      apiFetch(`/edificio/${edificioId}`)
        .then((b: any) => {
          if (b?.nombre) setNombreEdificio(b.nombre);
        })
        .catch(() => {});
    }
  }, [edificioId]);

  const cargar = () => {
    const p = new URLSearchParams({ edificioId });
    if (tipo) p.set('tipo', tipo);
    if (transaccion) p.set('transaccion', transaccion);
    apiFetch(`/inmuebles?${p.toString()}`)
      .then(setInmuebles)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edificioId, tipo, transaccion]);

  const getImageUrl = (img: string) => (img.startsWith('/uploads') ? `${API_URL.replace('/api', '')}${img}` : img);

  const limpiarFiltros = () => {
    setTipo('');
    setTransaccion('');
    setPrecioMin('');
    setPrecioMax('');
    setFiltroParqueadero(false);
    setFiltroBalcon(false);
    setFiltroAmoblado(false);
    setFiltroDeposito(false);
    setFiltroCubierto(false);
    setBusqueda('');
  };

  const activeFiltersCount = [
    tipo,
    transaccion,
    precioMin,
    precioMax,
    filtroParqueadero,
    filtroBalcon,
    filtroAmoblado,
    filtroDeposito,
    filtroCubierto,
  ].filter(Boolean).length;

  const inmueblesFiltrados = inmuebles.filter((item) => {
    if (busqueda) {
      const term = busqueda.toLowerCase();
      const precioStr = item.precio.toString();
      const telefono = item.telefono?.toLowerCase() || '';
      const obs = item.observacion?.toLowerCase() || '';
      const tipoStr = item.tipo?.toLowerCase() || '';
      const match =
        tipoStr.includes(term) ||
        precioStr.includes(term) ||
        telefono.includes(term) ||
        obs.includes(term);
      if (!match) return false;
    }

    if (precioMin && item.precio < Number(precioMin)) return false;
    if (precioMax && item.precio > Number(precioMax)) return false;
    if (filtroParqueadero && !item.parqueadero) return false;
    if (filtroBalcon && !item.balcon) return false;
    if (filtroAmoblado && !item.amoblado) return false;
    if (filtroDeposito && !item.deposito) return false;
    if (filtroCubierto && !item.cubierto) return false;

    return true;
  });

  return (
    <div className="min-h-screen bg-base-200 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-4">
        
        {/* Encabezado limpio con Nombre del Edificio */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-base-100 p-5 rounded-box shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <span className="icon-[tabler--building-community] text-xl" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                {nombreEdificio || 'Edificio'}
              </h1>
              <p className="text-xs sm:text-sm text-base-content/60">
                Ofertas de venta y arriendo disponibles
              </p>
            </div>
          </div>
          <div>
            <span className="badge badge-primary badge-outline text-xs font-semibold px-3 py-2">
              {inmueblesFiltrados.length} {inmueblesFiltrados.length === 1 ? 'publicación' : 'publicaciones'}
            </span>
          </div>
        </div>

        {/* Barra superior de control (Botón Filtros Collapse + Switcher de Vista) */}
        <div className="bg-base-100 p-3.5 rounded-box shadow-sm flex items-center justify-between gap-3">
          {/* Botón Collapse de Filtros */}
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`btn btn-sm ${showFilters || activeFiltersCount > 0 ? 'btn-primary' : 'btn-outline'} gap-1.5`}
          >
            <span className="icon-[tabler--adjustments-horizontal] text-base" aria-hidden="true" />
            <span className="text-xs font-semibold">Filtros</span>
            {activeFiltersCount > 0 && (
              <span className="badge badge-xs badge-neutral">{activeFiltersCount}</span>
            )}
            <span
              className={`icon-[tabler--chevron-down] text-xs transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </button>

          {/* Selector de Modo de Visualización con join FlyonUI estándar */}
          <div className="join">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`btn btn-sm join-item gap-1.5 ${viewMode === 'table' ? 'btn-primary' : 'btn-outline'}`}
              title="Vista en Tabla"
            >
              <span className="icon-[tabler--table] text-base" aria-hidden="true" />
              <span className="hidden sm:inline text-xs">Tabla</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`btn btn-sm join-item gap-1.5 ${viewMode === 'cards' ? 'btn-primary' : 'btn-outline'}`}
              title="Vista en Tarjetas"
            >
              <span className="icon-[tabler--layout-grid] text-base" aria-hidden="true" />
              <span className="hidden sm:inline text-xs">Tarjetas</span>
            </button>
          </div>
        </div>

        {/* Panel Colapsable de Filtros Avanzados */}
        {showFilters && (
          <div className="bg-base-100 p-4 sm:p-5 rounded-box shadow-sm border border-base-200 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-base-200 pb-3">
              <div className="flex items-center gap-2">
                <span className="icon-[tabler--adjustments] text-lg text-primary" aria-hidden="true" />
                <h3 className="font-semibold text-sm">Filtros Avanzados</h3>
              </div>
              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={limpiarFiltros}
                  className="btn btn-xs btn-ghost text-error gap-1"
                >
                  <span className="icon-[tabler--trash] text-xs" aria-hidden="true" />
                  Limpiar filtros
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
              {/* Buscador de texto dentro de filtros */}
              <div className="form-control sm:col-span-2 lg:col-span-1">
                <label className="label text-xs font-medium py-1">Palabra clave / Teléfono</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center text-base-content/40 pointer-events-none">
                    <span className="icon-[tabler--search] text-sm" aria-hidden="true" />
                  </span>
                  <input
                    type="text"
                    placeholder="Buscar palabra o contacto..."
                    className="input input-bordered input-sm pl-8 pr-7 w-full text-xs"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                  />
                  {busqueda && (
                    <button
                      type="button"
                      onClick={() => setBusqueda('')}
                      className="absolute inset-y-0 right-2 flex items-center text-base-content/40 hover:text-base-content"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Tipo */}
              <div className="form-control">
                <label className="label text-xs font-medium py-1">Tipo de Bien</label>
                <select
                  className="select select-bordered select-sm w-full text-xs"
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                >
                  <option value="">Todos los tipos</option>
                  <option value="inmueble">Inmueble</option>
                  <option value="parqueadero">Parqueadero</option>
                  <option value="habitacion">Habitación</option>
                </select>
              </div>

              {/* Transacción */}
              <div className="form-control">
                <label className="label text-xs font-medium py-1">Transacción</label>
                <select
                  className="select select-bordered select-sm w-full text-xs"
                  value={transaccion}
                  onChange={(e) => setTransaccion(e.target.value)}
                >
                  <option value="">Venta / Arriendo</option>
                  <option value="venta">En Venta</option>
                  <option value="arriendo">En Arriendo</option>
                </select>
              </div>

              {/* Precio Mínimo */}
              <div className="form-control">
                <label className="label text-xs font-medium py-1">Precio Mínimo (COP)</label>
                <input
                  type="number"
                  placeholder="Ej: 50000000"
                  className="input input-bordered input-sm w-full text-xs"
                  value={precioMin}
                  onChange={(e) => setPrecioMin(e.target.value)}
                />
              </div>

              {/* Precio Máximo */}
              <div className="form-control">
                <label className="label text-xs font-medium py-1">Precio Máximo (COP)</label>
                <input
                  type="number"
                  placeholder="Ej: 500000000"
                  className="input input-bordered input-sm w-full text-xs"
                  value={precioMax}
                  onChange={(e) => setPrecioMax(e.target.value)}
                />
              </div>
            </div>

            {/* Características / Checkboxes */}
            <div className="pt-2 border-t border-base-200">
              <label className="label text-xs font-medium py-1 text-base-content/70">
                Características Requeridas
              </label>
              <div className="flex flex-wrap gap-4 pt-1">
                <label className="label cursor-pointer gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={filtroParqueadero}
                    onChange={(e) => setFiltroParqueadero(e.target.checked)}
                    className="checkbox checkbox-primary checkbox-sm"
                  />
                  <span>Con Parqueadero</span>
                </label>

                <label className="label cursor-pointer gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={filtroBalcon}
                    onChange={(e) => setFiltroBalcon(e.target.checked)}
                    className="checkbox checkbox-primary checkbox-sm"
                  />
                  <span>Balcón</span>
                </label>

                <label className="label cursor-pointer gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={filtroAmoblado}
                    onChange={(e) => setFiltroAmoblado(e.target.checked)}
                    className="checkbox checkbox-primary checkbox-sm"
                  />
                  <span>Amoblado</span>
                </label>

                <label className="label cursor-pointer gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={filtroDeposito}
                    onChange={(e) => setFiltroDeposito(e.target.checked)}
                    className="checkbox checkbox-primary checkbox-sm"
                  />
                  <span>Depósito</span>
                </label>

                <label className="label cursor-pointer gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={filtroCubierto}
                    onChange={(e) => setFiltroCubierto(e.target.checked)}
                    className="checkbox checkbox-primary checkbox-sm"
                  />
                  <span>Cubierto</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Contenido Principal */}
        {loading ? (
          <div className="bg-base-100 rounded-box shadow-sm flex flex-col items-center justify-center py-20">
            <span className="loading loading-spinner loading-lg text-primary"></span>
            <p className="text-sm text-base-content/60 mt-4">Cargando catálogo...</p>
          </div>
        ) : inmueblesFiltrados.length === 0 ? (
          <div className="bg-base-100 rounded-box shadow-sm p-12 text-center">
            <div className="flex justify-center mb-3">
              <span className="icon-[tabler--home-search] text-5xl text-base-content/30" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No se encontraron publicaciones</h3>
            <p className="text-sm text-base-content/60 mb-4">
              {activeFiltersCount > 0 || busqueda
                ? 'Prueba ajustando los filtros de búsqueda.'
                : 'Aún no hay publicaciones disponibles en este edificio.'}
            </p>
            {(activeFiltersCount > 0 || busqueda) && (
              <button
                type="button"
                onClick={limpiarFiltros}
                className="btn btn-sm btn-outline btn-primary"
              >
                Restablecer todos los filtros
              </button>
            )}
          </div>
        ) : viewMode === 'table' ? (
          /* ================= VISTA TABLA (POR DEFECTO) ================= */
          <div className="bg-base-100 rounded-box shadow-sm overflow-hidden border border-base-200">
            <div className="overflow-x-auto">
              <table className="table table-hover w-full min-w-[620px]">
                <thead>
                  <tr className="bg-base-200/60 text-xs text-base-content/70 uppercase">
                    <th className="py-3 px-4">Bien / Foto</th>
                    <th className="py-3 px-4">Tipo & Transacción</th>
                    <th className="py-3 px-4">Precio</th>
                    <th className="py-3 px-4">Características</th>
                    <th className="py-3 px-4">Contacto</th>
                    <th className="py-3 px-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-base-200 text-sm">
                  {inmueblesFiltrados.map((item) => (
                    <tr key={item._id} className="transition-colors hover:bg-base-200/40">
                      {/* Foto / Thumbnail */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {item.imagenes && item.imagenes[0] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={getImageUrl(item.imagenes[0])}
                              alt={item.tipo}
                              className="w-14 h-14 object-cover rounded-lg shadow-2xs border border-base-200"
                            />
                          ) : (
                            <div className="w-14 h-14 bg-base-200 rounded-lg flex items-center justify-center text-base-content/30 border border-base-200">
                              <span className="icon-[tabler--photo] text-2xl" aria-hidden="true" />
                            </div>
                          )}
                          <div className="hidden sm:block">
                            <span className="font-semibold capitalize text-base-content">{item.tipo}</span>
                            {(item.identificador || item.numeroApto) && (
                              <p className="text-xs text-primary font-medium">
                                {item.identificador || `${item.torre ? item.torre + ' - ' : ''}Apto ${item.numeroApto}`}
                                {item.itemAsignadoRef && ` (${item.itemAsignadoRef})`}
                              </p>
                            )}
                            {item.piso !== undefined && (
                              <p className="text-xs text-base-content/60">Piso {item.piso}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Tipo & Transacción */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1 items-start">
                          <span className={`badge badge-sm ${tipoBadge(item.tipo)}`}>
                            {item.tipo}
                          </span>
                          <span className="badge badge-sm badge-outline">
                            {item.transaccion === 'venta' ? 'En Venta' : 'En Arriendo'}
                          </span>
                        </div>
                      </td>

                      {/* Precio */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-base text-primary">
                          ${item.precio.toLocaleString('es-CO')}
                        </div>
                        <span className="text-xs text-base-content/50">COP</span>
                      </td>

                      {/* Características */}
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1.5 max-w-xs">
                          {item.metrosCuadrados && (
                            <span className="badge badge-neutral badge-xs">
                              {item.metrosCuadrados} m²
                            </span>
                          )}
                          {item.parqueadero && (
                            <span className="badge badge-neutral badge-xs">
                              Parqueadero
                            </span>
                          )}
                          {item.cubierto && (
                            <span className="badge badge-neutral badge-xs">
                              Cubierto
                            </span>
                          )}
                          {item.balcon && (
                            <span className="badge badge-neutral badge-xs">
                              Balcón
                            </span>
                          )}
                          {item.amoblado && (
                            <span className="badge badge-neutral badge-xs">
                              Amoblado
                            </span>
                          )}
                          {item.deposito && (
                            <span className="badge badge-neutral badge-xs">
                              Depósito
                            </span>
                          )}
                          {!item.metrosCuadrados && !item.parqueadero && !item.balcon && !item.amoblado && !item.deposito && !item.cubierto && (
                            <span className="text-xs text-base-content/40">—</span>
                          )}
                        </div>
                      </td>

                      {/* Contacto */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5 text-xs font-medium text-base-content">
                            <span className="icon-[tabler--phone] text-primary" aria-hidden="true" />
                            {item.telefono}
                          </div>
                          {item.emailContacto && (
                            <div className="flex items-center gap-1.5 text-xs text-base-content/60 truncate max-w-[160px]">
                              <span className="icon-[tabler--mail]" aria-hidden="true" />
                              {item.emailContacto}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Acción */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <Link
                          href={`/inmuebles/detalle/${item._id}`}
                          className="btn btn-primary btn-sm gap-1"
                        >
                          Ver Detalle
                          <span className="icon-[tabler--chevron-right] text-base" aria-hidden="true" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* ================= VISTA TARJETAS (CARDS) ================= */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {inmueblesFiltrados.map((item) => (
              <div
                key={item._id}
                className="card bg-base-100 shadow-sm hover:shadow-md transition-all duration-200 border border-base-200 flex flex-col overflow-hidden"
              >
                {/* Imagen Principal */}
                <div className="relative w-full h-48 bg-base-200 overflow-hidden">
                  {item.imagenes && item.imagenes[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={getImageUrl(item.imagenes[0])}
                      alt={item.tipo}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-base-content/30">
                      <span className="icon-[tabler--photo] text-5xl" aria-hidden="true" />
                      <span className="text-xs mt-1">Sin fotografía</span>
                    </div>
                  )}
                  {/* Badges superpuestos con FlyonUI estándar */}
                  <div className="absolute top-3 left-3 flex gap-1.5">
                    <span className={`badge badge-sm ${tipoBadge(item.tipo)}`}>
                      {item.tipo}
                    </span>
                    <span className="badge badge-sm badge-neutral">
                      {item.transaccion === 'venta' ? 'Venta' : 'Arriendo'}
                    </span>
                  </div>
                </div>

                {/* Contenido Card */}
                <div className="card-body p-5 flex flex-col flex-1 justify-between gap-4">
                  <div>
                    <div className="flex items-baseline justify-between gap-2 mb-2">
                      <h3 className="card-title text-xl font-bold text-primary">
                        ${item.precio.toLocaleString('es-CO')}
                      </h3>
                      <span className="text-xs text-base-content/60 font-medium">COP</span>
                    </div>

                    {(item.identificador || item.numeroApto) && (
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-base-content/90 mb-2 flex-wrap">
                        <span className="icon-[tabler--door] text-sm text-primary" />
                        <span>{item.identificador || `${item.torre ? item.torre + ' - ' : ''}Apto ${item.numeroApto}`}</span>
                        {item.itemAsignadoRef && (
                          <span className="badge badge-outline badge-xs">{item.itemAsignadoRef}</span>
                        )}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-1.5 text-xs text-base-content/70 mb-3">
                      {item.metrosCuadrados && (
                        <span className="badge badge-neutral badge-xs">
                          {item.metrosCuadrados} m²
                        </span>
                      )}
                      {item.piso !== undefined && (
                        <span className="badge badge-neutral badge-xs">
                          Piso {item.piso}
                        </span>
                      )}
                      {item.parqueadero && (
                        <span className="badge badge-neutral badge-xs">
                          Parqueadero
                        </span>
                      )}
                      {item.amoblado && (
                        <span className="badge badge-neutral badge-xs">
                          Amoblado
                        </span>
                      )}
                    </div>

                    {item.observacion && (
                      <p className="text-xs text-base-content/70 line-clamp-2 leading-relaxed">
                        {item.observacion}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-base-200 flex items-center justify-between gap-2">
                    <div className="text-xs font-medium text-base-content flex items-center gap-1">
                      <span className="icon-[tabler--phone] text-primary" aria-hidden="true" />
                      {item.telefono}
                    </div>
                    <Link
                      href={`/inmuebles/detalle/${item._id}`}
                      className="btn btn-primary btn-sm gap-1"
                    >
                      Ver Detalle
                      <span className="icon-[tabler--chevron-right] text-base" aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


