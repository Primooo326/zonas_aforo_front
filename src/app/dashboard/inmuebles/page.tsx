'use client';

import { useEffect, useState, useMemo } from 'react';
import { apiFetch, API_URL } from '@/lib/api';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import QRCode from 'qrcode';
import Paginacion from '@/components/Paginacion';
import BarraBusquedaFiltros from '@/components/BarraBusquedaFiltros';
import BotoneraAccionesTabla from '@/components/BotoneraAccionesTabla';

interface Inmueble {
  _id: string;
  tipo: string;
  transaccion: string;
  precio: number;
  metrosCuadrados?: number;
  piso?: number;
  telefono: string;
  observacion?: string;
  imagenes: string[];
  estado: string;
  createdAt: string;
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
      return 'badge-ghost';
  }
};

export default function InmueblesPage() {
  const { edificio } = useAuth();
  const [todosInmuebles, setTodosInmuebles] = useState<Inmueble[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInmueble, setSearchInmueble] = useState('');
  const [ordenInmuebles, setOrdenInmuebles] = useState('recientes');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroTrans, setFiltroTrans] = useState('');
  const [filtroEstadoInmuebles, setFiltroEstadoInmuebles] = useState('');
  const [drawerFiltros, setDrawerFiltros] = useState(false);
  const [vistaInmuebles, setVistaInmuebles] = useState<'tabla' | 'tarjetas'>('tarjetas');
  const [pageInmuebles, setPageInmuebles] = useState(1);
  const [itemsPerPageInmuebles, setItemsPerPageInmuebles] = useState(10);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('vista_inmuebles') as 'tabla' | 'tarjetas' | null;
      if (saved === 'tabla' || saved === 'tarjetas') {
        setVistaInmuebles(saved);
      }
    }
  }, []);

  const publicUrl = typeof window !== 'undefined' && edificio?.id
    ? `${window.location.origin}/inmuebles/${edificio.id}`
    : '';

  useEffect(() => {
    if (edificio?.id) {
      QRCode.toDataURL(`${window.location.origin}/inmuebles/${edificio.id}`)
        .then(setQrCodeUrl)
        .catch(console.error);
    }
  }, [edificio?.id]);

  const copiarLink = () => {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const descargarQR = () => {
    if (!qrCodeUrl || !edificio) return;
    const a = document.createElement('a');
    a.href = qrCodeUrl;
    a.download = `venta-arriendo-qr-${edificio.nombre || edificio.id}.png`;
    a.click();
  };

  const cargar = () => {
    if (!edificio) return;
    apiFetch(`/inmuebles?edificioId=${edificio.id}&estado=todos`)
      .then((data) => {
        setTodosInmuebles(Array.isArray(data) ? data : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edificio]);

  const stats = useMemo(() => {
    const total = todosInmuebles.length;
    const enVenta = todosInmuebles.filter(
      (i) => i.transaccion === 'venta' && (i.estado === 'activa' || !i.estado),
    ).length;
    const enArriendo = todosInmuebles.filter(
      (i) => i.transaccion === 'arriendo' && (i.estado === 'activa' || !i.estado),
    ).length;
    const cerradas = todosInmuebles.filter(
      (i) => i.estado === 'vendida' || i.estado === 'arrendada',
    ).length;
    return { total, enVenta, enArriendo, cerradas };
  }, [todosInmuebles]);

  const inmueblesFiltrados = useMemo(() => {
    const filtrados = todosInmuebles.filter((item) => {
      if (filtroTipo && item.tipo !== filtroTipo) return false;
      if (filtroTrans && item.transaccion !== filtroTrans) return false;
      if (filtroEstadoInmuebles && item.estado !== filtroEstadoInmuebles) return false;
      if (searchInmueble.trim()) {
        const term = searchInmueble.trim().toLowerCase();
        const matchObs = item.observacion?.toLowerCase().includes(term);
        const matchTel = item.telefono?.toLowerCase().includes(term);
        const matchApto = item.numeroApto?.toLowerCase().includes(term);
        const matchTorre = item.torre?.toLowerCase().includes(term);
        const matchId = item.identificador?.toLowerCase().includes(term);
        const matchRef = item.itemAsignadoRef?.toLowerCase().includes(term);
        if (!matchObs && !matchTel && !matchApto && !matchTorre && !matchId && !matchRef) return false;
      }
      return true;
    });

    filtrados.sort((a, b) => {
      switch (ordenInmuebles) {
        case 'precio_asc':
          return (a.precio || 0) - (b.precio || 0);
        case 'precio_desc':
          return (b.precio || 0) - (a.precio || 0);
        case 'antiguos':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'recientes':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return filtrados;
  }, [todosInmuebles, filtroTipo, filtroTrans, filtroEstadoInmuebles, searchInmueble, ordenInmuebles]);

  const inmueblesPaginados = useMemo(() => {
    const start = (pageInmuebles - 1) * itemsPerPageInmuebles;
    return inmueblesFiltrados.slice(start, start + itemsPerPageInmuebles);
  }, [inmueblesFiltrados, pageInmuebles, itemsPerPageInmuebles]);

  const totalFiltrosActivos = useMemo(() => {
    return [Boolean(filtroTipo), Boolean(filtroTrans), Boolean(filtroEstadoInmuebles)].filter(Boolean).length;
  }, [filtroTipo, filtroTrans, filtroEstadoInmuebles]);

  const eliminar = async (id: string) => {
    if (!confirm('¿Eliminar esta publicación?')) return;
    try {
      await apiFetch(`/inmuebles/${id}`, { method: 'DELETE' });
      cargar();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al eliminar');
    }
  };

  const getImageUrl = (img: string) => {
    if (img.startsWith('/uploads')) return `${API_URL.replace('/api', '')}${img}`;
    return img;
  };

  return (
    <div className="space-y-6">
      {/* Encabezado y Acciones */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-base-content flex items-center gap-2">
            <span className="icon-[tabler--home-dollar] text-primary text-2xl sm:text-3xl shrink-0" aria-hidden="true" />
            <span>Venta y Arriendo</span>
          </h1>
          <p className="text-xs sm:text-sm text-base-content/70 mt-0.5">
            Gestiona las ofertas en venta y arriendo de tu edificio
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 w-full sm:flex sm:flex-wrap sm:items-center sm:w-auto">
          {edificio?.id && (
            <>
              <button
                type="button"
                onClick={() => setQrModalOpen(true)}
                className="btn btn-sm btn-outline btn-primary gap-1.5 px-2.5 sm:px-3 text-xs sm:text-sm font-medium w-full sm:w-auto justify-center"
              >
                <span className="icon-[tabler--qrcode] text-base shrink-0" aria-hidden="true" />
                <span className="truncate">Código QR <span className="hidden sm:inline">& Link</span></span>
              </button>
              <Link
                href={`/inmuebles/${edificio.id}`}
                target="_blank"
                className="btn btn-sm btn-outline gap-1.5 px-2.5 sm:px-3 text-xs sm:text-sm font-medium w-full sm:w-auto justify-center"
              >
                <span className="icon-[tabler--external-link] text-base shrink-0" aria-hidden="true" />
                <span className="truncate">Ver Catálogo</span>
              </Link>
            </>
          )}
          <Link
            href="/dashboard/inmuebles/nuevo"
            className="btn btn-sm btn-primary col-span-2 sm:col-span-1 w-full sm:w-auto gap-1.5 px-3 text-xs sm:text-sm font-medium justify-center"
          >
            <span className="icon-[tabler--plus] text-base shrink-0" aria-hidden="true" />
            <span>Nueva Publicación</span>
          </Link>
        </div>
      </div>

      {/* Modal QR */}
      {qrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-base-100 rounded-box shadow-xl max-w-md w-full p-5 sm:p-6 space-y-4 animate-in fade-in duration-200">
            <div className="flex justify-between items-center">
              <h3 className="text-base sm:text-lg font-bold">Catálogo de Venta y Arriendo</h3>
              <button
                type="button"
                onClick={() => setQrModalOpen(false)}
                className="btn btn-ghost btn-sm btn-circle"
              >
                ✕
              </button>
            </div>
            <p className="text-xs sm:text-sm text-base-content/70">
              Comparte este código QR o enlace para que los interesados puedan consultar las ofertas de tu edificio sin necesidad de iniciar sesión.
            </p>

            <div className="flex flex-col items-center bg-base-200 rounded-box p-4">
              {qrCodeUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrCodeUrl}
                  alt="QR Inmuebles"
                  className="w-44 h-44 sm:w-48 sm:h-48 bg-white p-2 rounded-lg shadow-2xs"
                />
              ) : (
                <div className="w-44 h-44 sm:w-48 sm:h-48 bg-base-300 rounded-lg flex items-center justify-center">
                  <span className="loading loading-spinner"></span>
                </div>
              )}
              <button
                type="button"
                onClick={descargarQR}
                className="btn btn-xs sm:btn-sm btn-outline mt-3 gap-1.5"
              >
                <span className="icon-[tabler--download] text-sm" aria-hidden="true" />
                Descargar QR (PNG)
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-base-content/70">Enlace público</label>
              <div className="join w-full">
                <input
                  type="text"
                  className="input input-bordered input-sm join-item flex-1 text-xs"
                  value={publicUrl}
                  readOnly
                />
                <button
                  type="button"
                  className={`btn btn-sm join-item ${copied ? 'btn-success' : 'btn-primary'}`}
                  onClick={copiarLink}
                >
                  <span className="icon-[tabler--copy] text-base" aria-hidden="true" />
                  {copied ? 'Copiado' : 'Copiar'}
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => window.open(publicUrl, '_blank')}
                className="btn btn-outline btn-primary btn-sm flex-1 gap-1.5"
              >
                <span className="icon-[tabler--external-link] text-base" aria-hidden="true" />
                Abrir en nueva pestaña
              </button>
              <button
                type="button"
                onClick={() => setQrModalOpen(false)}
                className="btn btn-outline btn-sm"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tarjetas KPI Venta y Arriendo */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card bg-base-100 shadow-sm border border-base-200 p-3 sm:p-4">
          <div className="flex items-center gap-1.5 text-primary text-2xs sm:text-xs font-medium">
            <span className="icon-[tabler--building] text-base sm:text-lg" aria-hidden="true" />
            <span>Total Publicaciones</span>
          </div>
          <div className="mt-1.5 text-xl sm:text-2xl font-bold text-base-content">
            {stats.total}
          </div>
          <div className="text-3xs sm:text-xs text-base-content/50 mt-0.5 truncate">
            registradas en catálogo
          </div>
        </div>

        <div className="card bg-base-100 shadow-sm border border-base-200 p-3 sm:p-4">
          <div className="flex items-center gap-1.5 text-success text-2xs sm:text-xs font-medium">
            <span className="icon-[tabler--tag] text-base sm:text-lg" aria-hidden="true" />
            <span>En Venta</span>
          </div>
          <div className="mt-1.5 text-xl sm:text-2xl font-bold text-success">
            {stats.enVenta}
          </div>
          <div className="text-3xs sm:text-xs text-base-content/50 mt-0.5 truncate">
            ofertas activas
          </div>
        </div>

        <div className="card bg-base-100 shadow-sm border border-base-200 p-3 sm:p-4">
          <div className="flex items-center gap-1.5 text-info text-2xs sm:text-xs font-medium">
            <span className="icon-[tabler--key] text-base sm:text-lg" aria-hidden="true" />
            <span>En Arriendo</span>
          </div>
          <div className="mt-1.5 text-xl sm:text-2xl font-bold text-info">
            {stats.enArriendo}
          </div>
          <div className="text-3xs sm:text-xs text-base-content/50 mt-0.5 truncate">
            ofertas activas
          </div>
        </div>

        <div className="card bg-base-100 shadow-sm border border-base-200 p-3 sm:p-4">
          <div className="flex items-center gap-1.5 text-warning text-2xs sm:text-xs font-medium">
            <span className="icon-[tabler--circle-check] text-base sm:text-lg" aria-hidden="true" />
            <span>Cerradas</span>
          </div>
          <div className="mt-1.5 text-xl sm:text-2xl font-bold text-warning">
            {stats.cerradas}
          </div>
          <div className="text-3xs sm:text-xs text-base-content/50 mt-0.5 truncate">
            vendidas o arrendadas
          </div>
        </div>
      </div>

      {/* Barra de Búsqueda y Filtros Compartida (Fila única + Drawer + Toggle Vista) */}
      <BarraBusquedaFiltros
        busqueda={searchInmueble}
        onBusquedaChange={(val) => {
          setSearchInmueble(val);
          setPageInmuebles(1);
        }}
        placeholderBusqueda="Buscar por apartamento, torre, teléfono o descripción..."
        orden={ordenInmuebles}
        onOrdenChange={(val) => {
          setOrdenInmuebles(val);
          setPageInmuebles(1);
        }}
        opcionesOrden={[
          { valor: 'recientes', etiqueta: 'Orden: Más recientes' },
          { valor: 'antiguos', etiqueta: 'Orden: Más antiguos' },
          { valor: 'precio_asc', etiqueta: 'Orden: Menor precio' },
          { valor: 'precio_desc', etiqueta: 'Orden: Mayor precio' },
        ]}
        labelOrden="Criterio de orden de publicaciones"
        vista={vistaInmuebles}
        onVistaChange={(v) => {
          setVistaInmuebles(v);
          if (typeof window !== 'undefined') {
            localStorage.setItem('vista_inmuebles', v);
          }
        }}
        drawerFiltrosAbierto={drawerFiltros}
        onToggleDrawerFiltros={() => setDrawerFiltros((prev) => !prev)}
        filtrosActivosCount={totalFiltrosActivos}
        tituloFiltros="Filtros de publicaciones"
        onLimpiarFiltros={() => {
          setFiltroTipo('');
          setFiltroTrans('');
          setFiltroEstadoInmuebles('');
          setPageInmuebles(1);
        }}
      >
        <div>
          <label className="text-3xs uppercase font-bold text-base-content/50 block mb-1">
            Tipo de Propiedad
          </label>
          <select
            className="select select-sm w-full text-xs"
            value={filtroTipo}
            onChange={(e) => {
              setFiltroTipo(e.target.value);
              setPageInmuebles(1);
            }}
          >
            <option value="">Todos los tipos</option>
            <option value="inmueble">Inmueble / Apartamento</option>
            <option value="parqueadero">Parqueadero</option>
            <option value="habitacion">Habitación</option>
          </select>
        </div>

        <div>
          <label className="text-3xs uppercase font-bold text-base-content/50 block mb-1">
            Transacción
          </label>
          <select
            className="select select-sm w-full text-xs"
            value={filtroTrans}
            onChange={(e) => {
              setFiltroTrans(e.target.value);
              setPageInmuebles(1);
            }}
          >
            <option value="">Todas las transacciones</option>
            <option value="venta">Venta</option>
            <option value="arriendo">Arriendo</option>
          </select>
        </div>

        <div>
          <label className="text-3xs uppercase font-bold text-base-content/50 block mb-1">
            Estado de la Oferta
          </label>
          <select
            className="select select-sm w-full text-xs"
            value={filtroEstadoInmuebles}
            onChange={(e) => {
              setFiltroEstadoInmuebles(e.target.value);
              setPageInmuebles(1);
            }}
          >
            <option value="">Todos los estados</option>
            <option value="activa">Activa</option>
            <option value="pausada">Pausada</option>
            <option value="vendida">Vendida</option>
            <option value="arrendada">Arrendada</option>
          </select>
        </div>
      </BarraBusquedaFiltros>

      {/* Listado */}
      {loading ? (
        <div className="flex justify-center py-16">
          <span className="loading loading-spinner loading-lg text-primary"></span>
        </div>
      ) : inmueblesFiltrados.length === 0 ? (
        <div className="bg-base-100 rounded-box shadow-sm p-8 sm:p-12 text-center">
          <div className="flex justify-center mb-3">
            <span className="icon-[tabler--building] text-5xl text-base-content/30" aria-hidden="true" />
          </div>
          <p className="text-base-content/60 mb-4 text-sm">No hay publicaciones registradas</p>
          <Link href="/dashboard/inmuebles/nuevo" className="btn btn-primary btn-sm gap-1.5">
            <span className="icon-[tabler--plus] text-base" aria-hidden="true" />
            Crear primera publicación
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {vistaInmuebles === 'tabla' ? (
            <div className="card bg-base-100 shadow-sm border border-base-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Inmueble / Unidad</th>
                      <th>Operación y Tipo</th>
                      <th>Precio (COP)</th>
                      <th>Área</th>
                      <th>Contacto</th>
                      <th>Estado</th>
                      <th className="text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inmueblesPaginados.map((item) => (
                      <tr key={item._id}>
                        <td>
                          <div className="font-bold text-base-content flex items-center gap-1.5">
                            {item.identificador || `${item.torre ? item.torre + ' - ' : ''}Apto ${item.numeroApto || '-'}`}
                          </div>
                          <div className="flex items-center gap-1.5 text-2xs text-base-content/60 mt-0.5">
                            {item.itemAsignadoRef && <span>Ref: {item.itemAsignadoRef}</span>}
                            {item.piso !== undefined && <span>• Piso {item.piso}</span>}
                            {item.censoUnidadId && (
                              <Link
                                href={`/dashboard/censo/${typeof item.censoUnidadId === 'object' ? item.censoUnidadId._id : item.censoUnidadId}`}
                                className="badge badge-success badge-2xs gap-0.5 hover:opacity-80"
                                title="Ver censo"
                              >
                                <span className="icon-[tabler--check] text-[10px]" /> Censo
                              </Link>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-1">
                            <span className={`badge badge-xs font-semibold ${tipoBadge(item.tipo)}`}>
                              {item.tipo}
                            </span>
                            <span className="badge badge-xs badge-neutral font-semibold">
                              {item.transaccion}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className="font-bold text-primary text-sm">
                            ${item.precio.toLocaleString('es-CO')}
                          </span>
                        </td>
                        <td>
                          <div className="text-xs text-base-content/70">
                            {item.metrosCuadrados ? `${item.metrosCuadrados} m²` : '-'}
                          </div>
                        </td>
                        <td>
                          <a href={`tel:${item.telefono}`} className="text-xs font-mono text-base-content/80 hover:text-primary inline-flex items-center gap-1">
                            <span className="icon-[tabler--phone] text-xs text-primary" />
                            {item.telefono}
                          </a>
                        </td>
                        <td>
                          <span className={`badge badge-xs font-semibold ${item.estado === 'activa' ? 'badge-success' : 'badge-error'}`}>
                            {item.estado}
                          </span>
                        </td>
                        <td className="text-right">
                          <BotoneraAccionesTabla
                            editarUrl={`/dashboard/inmuebles/${item._id}/edit`}
                            tituloEditar="Editar publicación"
                            onEliminar={() => eliminar(item._id)}
                            tituloEliminar="Eliminar publicación"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {inmueblesPaginados.map((item) => (
                <div
                  key={item._id}
                  className="card bg-base-100 shadow-sm hover:shadow-md transition-all duration-200 border border-base-200 flex flex-col overflow-hidden"
                >
                  {/* Thumbnail */}
                  <div className="relative w-full h-44 sm:h-48 bg-base-200 overflow-hidden">
                    {item.imagenes[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={getImageUrl(item.imagenes[0])}
                        alt={item.tipo}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-base-content/30">
                        <span className="icon-[tabler--photo] text-5xl" aria-hidden="true" />
                        <span className="text-xs mt-1">Sin fotografía</span>
                      </div>
                    )}
                    {/* Badges superpuestos */}
                    <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
                      <span className={`badge badge-sm font-semibold shadow-xs ${tipoBadge(item.tipo)}`}>
                        {item.tipo}
                      </span>
                      <span className="badge badge-sm badge-neutral font-semibold shadow-xs">
                        {item.transaccion}
                      </span>
                      <span
                        className={`badge badge-sm ${item.estado === 'activa' ? 'badge-success' : 'badge-error'}`}
                      >
                        {item.estado}
                      </span>
                    </div>
                  </div>

                  {/* Contenido Card */}
                  <div className="card-body p-4 sm:p-5 flex flex-col flex-1 justify-between gap-3">
                    <div>
                      <div className="flex items-baseline justify-between gap-2 mb-1.5">
                        <h3 className="card-title text-lg font-bold text-primary">
                          ${item.precio.toLocaleString('es-CO')}
                        </h3>
                        <span className="text-xs text-base-content/60">COP</span>
                      </div>

                      {(item.identificador || item.numeroApto) && (
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-base-content/90 mb-1.5 flex-wrap">
                          <span className="icon-[tabler--door] text-sm text-primary" />
                          <span>{item.identificador || `${item.torre ? item.torre + ' - ' : ''}Apto ${item.numeroApto}`}</span>
                          {item.itemAsignadoRef && (
                            <span className="badge badge-outline badge-xs">{item.itemAsignadoRef}</span>
                          )}
                          {item.censoUnidadId && (
                            <Link
                              href={`/dashboard/censo/${typeof item.censoUnidadId === 'object' ? item.censoUnidadId._id : item.censoUnidadId}`}
                              className="badge badge-success badge-xs gap-0.5 hover:opacity-80"
                              title="Ver ficha de censo de la unidad"
                            >
                              <span className="icon-[tabler--check] text-[10px]" /> Censo
                            </Link>
                          )}
                        </div>
                      )}

                      <div className="flex flex-wrap gap-1.5 text-xs text-base-content/70 mb-2">
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
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-base-content/70 mb-2">
                        <span className="icon-[tabler--phone] text-primary" aria-hidden="true" />
                        <span>{item.telefono}</span>
                      </div>

                      {item.observacion && (
                        <p className="text-xs text-base-content/70 line-clamp-2 leading-relaxed">
                          {item.observacion}
                        </p>
                      )}
                    </div>

                    {/* Acciones */}
                    <div className="pt-3 border-t border-base-200">
                      <BotoneraAccionesTabla
                        editarUrl={`/dashboard/inmuebles/${item._id}/edit`}
                        tituloEditar="Editar publicación"
                        onEliminar={() => eliminar(item._id)}
                        tituloEliminar="Eliminar publicación"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Paginacion
            currentPage={pageInmuebles}
            totalItems={inmueblesFiltrados.length}
            itemsPerPage={itemsPerPageInmuebles}
            onPageChange={setPageInmuebles}
            onItemsPerPageChange={setItemsPerPageInmuebles}
            className="rounded-box shadow-sm border border-base-200"
          />
        </div>
      )}
    </div>
  );
}
