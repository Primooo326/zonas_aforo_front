'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/api';
import {
  CensoUnidad,
  calcularEdad,
  categorizarEdad,
  exportarCensoXLSX,
  Vehiculo,
} from '@/lib/censo-helpers';
import ModalCargaExcel from '@/components/censo/ModalCargaExcel';

interface CensoStats {
  totalUnidades: number;
  totalPersonas: number;
  menores: number;
  adultos: number;
  adultosMayores: number;
  totalMascotas: number;
  mascotasPeligrosas: number;
  totalVehiculos: number;
  pendientes: number;
}

interface ParqueaderoItem {
  _id: string;
  numero: string;
  tipo: string;
  esVisitante: boolean;
  esCubierto: boolean;
  torreAsignada?: string;
  aptoAsignado?: string;
}

interface BodegaItem {
  _id: string;
  numero: string;
  ubicacion?: string;
  metrosCuadrados?: number;
  torreAsignada?: string;
  aptoAsignado?: string;
}

type TabType = 'inmuebles' | 'residentes' | 'parqueaderos' | 'bodegas';

interface ResidenteFila {
  unidadId: string;
  identificador: string;
  torre?: string;
  numeroApto?: string;
  nombreCompleto: string;
  documento?: string;
  condicion: string;
  esContactoPrincipal: boolean;
  fechaNacimiento: string;
  edad: number | null;
  categoria: { label: string; badgeClass: string } | null;
  telefono?: string;
  email?: string;
}

export default function CensoDashboardPage() {
  const { edificio } = useAuth();
  const [unidades, setUnidades] = useState<CensoUnidad[]>([]);
  const [parqueaderos, setParqueaderos] = useState<ParqueaderoItem[]>([]);
  const [bodegas, setBodegas] = useState<BodegaItem[]>([]);
  const [stats, setStats] = useState<CensoStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Tab activo
  const [activeTab, setActiveTab] = useState<TabType>('inmuebles');

  // Filtros y Orden Inmuebles
  const [search, setSearch] = useState('');
  const [filtroTorreInmuebles, setFiltroTorreInmuebles] = useState('todos');
  const [filtroOcupacionInmuebles, setFiltroOcupacionInmuebles] = useState('todos');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroEspecial, setFiltroEspecial] = useState('todos');
  const [ordenInmuebles, setOrdenInmuebles] = useState('identificador_asc');

  // Filtros y Orden Residentes
  const [searchResidente, setSearchResidente] = useState('');
  const [filtroTorreResidentes, setFiltroTorreResidentes] = useState('todos');
  const [filtroCondicionResidente, setFiltroCondicionResidente] = useState('todos');
  const [filtroGrupoEtarioResidente, setFiltroGrupoEtarioResidente] = useState('todos');
  const [filtroContactoPrincipal, setFiltroContactoPrincipal] = useState('todos');
  const [ordenResidentes, setOrdenResidentes] = useState('nombre_asc');

  // Filtros y Orden Parqueaderos
  const [searchParq, setSearchParq] = useState('');
  const [filtroTorreParq, setFiltroTorreParq] = useState('todos');
  const [filtroTipoParq, setFiltroTipoParq] = useState('todos');
  const [filtroModoParq, setFiltroModoParq] = useState('todos');
  const [filtroAsignacionParq, setFiltroAsignacionParq] = useState('todos');
  const [ordenParq, setOrdenParq] = useState('numero_asc');

  // Filtros y Orden Bodegas
  const [searchBodega, setSearchBodega] = useState('');
  const [filtroTorreBodega, setFiltroTorreBodega] = useState('todos');
  const [filtroAsignacionBodega, setFiltroAsignacionBodega] = useState('todos');
  const [ordenBodegas, setOrdenBodegas] = useState('numero_asc');

  // Modal QR
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrUrl, setQrUrl] = useState('');
  const [copied, setCopied] = useState(false);

  // Modal Carga Masiva Excel
  const [excelModalOpen, setExcelModalOpen] = useState(false);

  // Acciones en proceso
  const [procesandoId, setProcesandoId] = useState<string | null>(null);

  const publicCensusUrl =
    typeof window !== 'undefined' && edificio?.id
      ? `${window.location.origin}/censo/${edificio.id}`
      : '';

  useEffect(() => {
    if (edificio?.id) {
      QRCode.toDataURL(`${window.location.origin}/censo/${edificio.id}`, { width: 320 })
        .then(setQrUrl)
        .catch(console.error);
    }
  }, [edificio?.id]);

  const cargarDatos = () => {
    if (!edificio) return;
    Promise.all([
      apiFetch('/censo'),
      apiFetch('/censo/stats'),
      apiFetch('/censo/parqueaderos').catch(() => []),
      apiFetch('/censo/bodegas').catch(() => []),
    ])
      .then(([unidadesData, statsData, parqData, bodegasData]) => {
        setUnidades(unidadesData || []);
        setStats(statsData || null);
        setParqueaderos(Array.isArray(parqData) ? parqData : []);
        setBodegas(Array.isArray(bodegasData) ? bodegasData : []);
      })
      .catch((e) => {
        console.error('Error al cargar datos de censo:', e);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    cargarDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edificio]);

  const copiarLink = () => {
    if (!publicCensusUrl) return;
    navigator.clipboard.writeText(publicCensusUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const descargarQR = () => {
    if (!qrUrl || !edificio) return;
    const a = document.createElement('a');
    a.href = qrUrl;
    a.download = `censo_qr_${edificio.nombre || edificio.id}.png`;
    a.click();
  };

  const aprobarUnidad = async (id: string) => {
    if (!confirm('¿Deseas aprobar esta solicitud de censo?')) return;
    try {
      setProcesandoId(id);
      await apiFetch(`/censo/${id}/aprobar`, { method: 'PATCH' });
      await cargarDatos();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al aprobar');
    } finally {
      setProcesandoId(null);
    }
  };

  const rechazarUnidad = async (id: string) => {
    if (!confirm('¿Deseas rechazar esta solicitud de censo?')) return;
    try {
      setProcesandoId(id);
      await apiFetch(`/censo/${id}/rechazar`, { method: 'PATCH' });
      await cargarDatos();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al rechazar');
    } finally {
      setProcesandoId(null);
    }
  };

  const eliminarUnidad = async (id: string, nombre: string) => {
    if (!confirm(`¿Estás seguro de eliminar el registro de la unidad "${nombre}"?`)) return;
    try {
      setProcesandoId(id);
      await apiFetch(`/censo/${id}`, { method: 'DELETE' });
      await cargarDatos();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al eliminar');
    } finally {
      setProcesandoId(null);
    }
  };

  // Lista dinámica de torres disponibles en el conjunto
  const torresDisponibles = useMemo(() => {
    const setTorres = new Set<string>();
    unidades.forEach((u) => {
      if (u.torre?.trim()) setTorres.add(u.torre.trim());
    });
    parqueaderos.forEach((p) => {
      if (p.torreAsignada?.trim()) setTorres.add(p.torreAsignada.trim());
    });
    bodegas.forEach((b) => {
      if (b.torreAsignada?.trim()) setTorres.add(b.torreAsignada.trim());
    });
    return Array.from(setTorres).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }),
    );
  }, [unidades, parqueaderos, bodegas]);

  // Mapas de relación en memoria para vincular Parqueaderos y Bodegas con Inmuebles y Vehículos
  const { mapaUnidadesPorParq, mapaVehiculosPorParq, mapaUnidadesPorBodega } = useMemo(() => {
    const mapaUnidadesPorParq = new Map<string, CensoUnidad>();
    const mapaVehiculosPorParq = new Map<string, Vehiculo>();
    const mapaUnidadesPorBodega = new Map<string, CensoUnidad>();
    const mapaPorTorreApto = new Map<string, CensoUnidad>();

    for (const u of unidades) {
      if (u.torre && u.numeroApto) {
        const key = `${u.torre.trim().toLowerCase()}:::${u.numeroApto.trim().toLowerCase()}`;
        mapaPorTorreApto.set(key, u);
      }
      if (u.numeroApto) {
        mapaPorTorreApto.set(u.numeroApto.trim().toLowerCase(), u);
      }

      // Asignaciones directas en la unidad
      for (const p of u.parqueaderosAsignados || []) {
        if (p.numero?.trim()) {
          mapaUnidadesPorParq.set(p.numero.trim().toUpperCase(), u);
        }
      }

      for (const b of u.bodegasAsignadas || []) {
        if (b.numero?.trim()) {
          mapaUnidadesPorBodega.set(b.numero.trim().toUpperCase(), u);
        }
      }

      // Vehículos con cupo explícito
      for (const v of u.vehiculos || []) {
        if (v.numeroParqueadero?.trim()) {
          mapaVehiculosPorParq.set(v.numeroParqueadero.trim().toUpperCase(), v);
        }
      }
    }

    // Complementar con inventario de parqueaderos
    for (const p of parqueaderos) {
      const num = p.numero.trim().toUpperCase();
      if (!mapaUnidadesPorParq.has(num)) {
        if (p.torreAsignada && p.aptoAsignado) {
          const key = `${p.torreAsignada.trim().toLowerCase()}:::${p.aptoAsignado.trim().toLowerCase()}`;
          const u = mapaPorTorreApto.get(key);
          if (u) mapaUnidadesPorParq.set(num, u);
        } else if (p.aptoAsignado) {
          const u = mapaPorTorreApto.get(p.aptoAsignado.trim().toLowerCase());
          if (u) mapaUnidadesPorParq.set(num, u);
        }
      }

      // Si no hay vehículo explícito asignado por placa, buscar vehículo de la unidad que parquée adentro
      if (!mapaVehiculosPorParq.has(num)) {
        const u = mapaUnidadesPorParq.get(num);
        if (u && u.vehiculos && u.vehiculos.length > 0) {
          const candidatos = u.vehiculos.filter((v) => {
            if (!v.numeroParqueadero) return true;
            return v.numeroParqueadero.trim().toUpperCase() === num;
          });
          const tipoCupo = (p.tipo || 'carro').toLowerCase();
          const coincidente =
            candidatos.find((v) => (v.tipo || 'carro').toLowerCase() === tipoCupo) || candidatos[0];
          if (coincidente) {
            mapaVehiculosPorParq.set(num, coincidente);
          }
        }
      }
    }

    // Complementar con inventario de bodegas
    for (const b of bodegas) {
      const num = b.numero.trim().toUpperCase();
      if (!mapaUnidadesPorBodega.has(num)) {
        if (b.torreAsignada && b.aptoAsignado) {
          const key = `${b.torreAsignada.trim().toLowerCase()}:::${b.aptoAsignado.trim().toLowerCase()}`;
          const u = mapaPorTorreApto.get(key);
          if (u) mapaUnidadesPorBodega.set(num, u);
        } else if (b.aptoAsignado) {
          const u = mapaPorTorreApto.get(b.aptoAsignado.trim().toLowerCase());
          if (u) mapaUnidadesPorBodega.set(num, u);
        }
      }
    }

    return { mapaUnidadesPorParq, mapaVehiculosPorParq, mapaUnidadesPorBodega };
  }, [unidades, parqueaderos, bodegas]);

  // Filtrado y Ordenamiento de Unidades
  const unidadesFiltradas = useMemo(() => {
    const filtradas = unidades.filter((u) => {
      if (filtroTorreInmuebles !== 'todos' && u.torre?.trim() !== filtroTorreInmuebles) {
        return false;
      }

      if (filtroOcupacionInmuebles !== 'todos' && u.tipoOcupacion !== filtroOcupacionInmuebles) {
        return false;
      }

      if (filtroEstado !== 'todos') {
        if (filtroEstado === 'pendientes' && u.estado !== 'pendiente' && u.estado !== 'pendiente_actualizacion') {
          return false;
        }
        if (filtroEstado === 'aprobados' && u.estado !== 'aprobado') {
          return false;
        }
      }

      if (filtroEspecial === 'con_menores') {
        const tieneMenores = u.personas?.some((p) => calcularEdad(p.fechaNacimiento) < 18);
        if (!tieneMenores) return false;
      }
      if (filtroEspecial === 'con_mayores') {
        const tieneMayores = u.personas?.some((p) => calcularEdad(p.fechaNacimiento) >= 60);
        if (!tieneMayores) return false;
      }
      if (filtroEspecial === 'mascotas_peligrosas') {
        const tienePeligrosas = u.mascotas?.some((m) => m.esPeligroso);
        if (!tienePeligrosas) return false;
      }
      if (filtroEspecial === 'arrendatarios') {
        const tieneArrendatarios = u.personas?.some((p) => p.condicion === 'arrendatario');
        if (!tieneArrendatarios) return false;
      }

      if (search.trim()) {
        const term = search.trim().toLowerCase();
        const matchIdentificador = u.identificador?.toLowerCase().includes(term);
        const matchTorre = u.torre?.toLowerCase().includes(term);
        const matchApto = u.numeroApto?.toLowerCase().includes(term);
        const matchPersona = u.personas?.some(
          (p) =>
            p.nombreCompleto?.toLowerCase().includes(term) ||
            p.telefono?.toLowerCase().includes(term) ||
            p.documento?.toLowerCase().includes(term),
        );
        const matchVehiculo = u.vehiculos?.some((v) => v.placa?.toLowerCase().includes(term));
        if (!matchIdentificador && !matchTorre && !matchApto && !matchPersona && !matchVehiculo) {
          return false;
        }
      }

      return true;
    });

    filtradas.sort((a, b) => {
      switch (ordenInmuebles) {
        case 'identificador_desc':
          return b.identificador.localeCompare(a.identificador, undefined, { numeric: true });
        case 'torre_asc':
          return (
            (a.torre || '').localeCompare(b.torre || '', undefined, { numeric: true }) ||
            (a.numeroApto || '').localeCompare(b.numeroApto || '', undefined, { numeric: true })
          );
        case 'piso_asc':
          return (a.piso ?? 0) - (b.piso ?? 0);
        case 'piso_desc':
          return (b.piso ?? 0) - (a.piso ?? 0);
        case 'metros_desc':
          return (b.metrosCuadrados ?? 0) - (a.metrosCuadrados ?? 0);
        case 'metros_asc':
          return (a.metrosCuadrados ?? 0) - (b.metrosCuadrados ?? 0);
        case 'personas_desc':
          return (b.personas?.length ?? 0) - (a.personas?.length ?? 0);
        case 'mascotas_desc':
          return (b.mascotas?.length ?? 0) - (a.mascotas?.length ?? 0);
        case 'vehiculos_desc':
          return (b.vehiculos?.length ?? 0) - (a.vehiculos?.length ?? 0);
        case 'identificador_asc':
        default:
          return a.identificador.localeCompare(b.identificador, undefined, { numeric: true });
      }
    });

    return filtradas;
  }, [
    unidades,
    search,
    filtroTorreInmuebles,
    filtroOcupacionInmuebles,
    filtroEstado,
    filtroEspecial,
    ordenInmuebles,
  ]);

  // Aplanamiento de Residentes
  const todosResidentes = useMemo<ResidenteFila[]>(() => {
    const lista: ResidenteFila[] = [];
    unidades.forEach((u) => {
      (u.personas || []).forEach((p) => {
        const edad = p.fechaNacimiento ? calcularEdad(p.fechaNacimiento) : null;
        const categoria = edad !== null ? categorizarEdad(edad) : null;
        lista.push({
          unidadId: u._id,
          identificador: u.identificador,
          torre: u.torre,
          numeroApto: u.numeroApto,
          nombreCompleto: p.nombreCompleto,
          documento: p.documento,
          condicion: p.condicion,
          esContactoPrincipal: !!p.esContactoPrincipal,
          fechaNacimiento: p.fechaNacimiento,
          edad,
          categoria,
          telefono: p.telefono,
          email: p.email,
        });
      });
    });
    return lista;
  }, [unidades]);

  // Filtrado y Ordenamiento de Residentes
  const residentesFiltrados = useMemo(() => {
    const filtrados = todosResidentes.filter((r) => {
      if (filtroTorreResidentes !== 'todos' && r.torre?.trim() !== filtroTorreResidentes) {
        return false;
      }
      if (filtroCondicionResidente !== 'todos' && r.condicion !== filtroCondicionResidente) {
        return false;
      }
      if (filtroGrupoEtarioResidente !== 'todos') {
        if (filtroGrupoEtarioResidente === 'menor' && (r.edad === null || r.edad >= 18)) return false;
        if (filtroGrupoEtarioResidente === 'adulto' && (r.edad === null || r.edad < 18 || r.edad >= 60)) return false;
        if (filtroGrupoEtarioResidente === 'adulto_mayor' && (r.edad === null || r.edad < 60)) return false;
      }
      if (filtroContactoPrincipal === 'solo_principales' && !r.esContactoPrincipal) {
        return false;
      }
      if (searchResidente.trim()) {
        const term = searchResidente.trim().toLowerCase();
        const matchNombre = r.nombreCompleto.toLowerCase().includes(term);
        const matchTel = r.telefono?.toLowerCase().includes(term);
        const matchEmail = r.email?.toLowerCase().includes(term);
        const matchDoc = r.documento?.toLowerCase().includes(term);
        const matchUnidad = r.identificador.toLowerCase().includes(term);
        if (!matchNombre && !matchTel && !matchEmail && !matchDoc && !matchUnidad) {
          return false;
        }
      }
      return true;
    });

    filtrados.sort((a, b) => {
      switch (ordenResidentes) {
        case 'nombre_desc':
          return b.nombreCompleto.localeCompare(a.nombreCompleto);
        case 'edad_asc':
          return (a.edad ?? 999) - (b.edad ?? 999);
        case 'edad_desc':
          return (b.edad ?? -1) - (a.edad ?? -1);
        case 'unidad_asc':
          return a.identificador.localeCompare(b.identificador, undefined, { numeric: true });
        case 'condicion_asc':
          return a.condicion.localeCompare(b.condicion);
        case 'nombre_asc':
        default:
          return a.nombreCompleto.localeCompare(b.nombreCompleto);
      }
    });

    return filtrados;
  }, [
    todosResidentes,
    searchResidente,
    filtroTorreResidentes,
    filtroCondicionResidente,
    filtroGrupoEtarioResidente,
    filtroContactoPrincipal,
    ordenResidentes,
  ]);

  // Métricas de Residentes
  const statsResidentes = useMemo(() => {
    const total = todosResidentes.length;
    const propietarios = todosResidentes.filter((r) => r.condicion === 'propietario').length;
    const arrendatarios = todosResidentes.filter((r) => r.condicion === 'arrendatario').length;
    const convivientes = todosResidentes.filter((r) => r.condicion === 'conviviente').length;
    const menores = todosResidentes.filter((r) => r.edad !== null && r.edad < 18).length;
    const adultosMayores = todosResidentes.filter((r) => r.edad !== null && r.edad >= 60).length;
    return { total, propietarios, arrendatarios, convivientes, menores, adultosMayores };
  }, [todosResidentes]);

  // Filtrado y Ordenamiento de Parqueaderos
  const parqueaderosFiltrados = useMemo(() => {
    const filtrados = parqueaderos.filter((p) => {
      const num = p.numero.trim().toUpperCase();
      const u = mapaUnidadesPorParq.get(num);
      const tieneUnidad = Boolean(p.aptoAsignado || p.torreAsignada || u);
      const tieneVehiculo = mapaVehiculosPorParq.has(num);

      if (filtroTorreParq !== 'todos') {
        const torreParq = p.torreAsignada?.trim() || u?.torre?.trim();
        if (torreParq !== filtroTorreParq) return false;
      }

      if (filtroTipoParq !== 'todos' && p.tipo?.toLowerCase() !== filtroTipoParq.toLowerCase()) {
        return false;
      }

      if (filtroModoParq === 'visitantes' && !p.esVisitante) return false;
      if (filtroModoParq === 'privados' && p.esVisitante) return false;
      if (filtroModoParq === 'cubiertos' && !p.esCubierto) return false;

      if (filtroAsignacionParq === 'asignados' && !tieneUnidad) return false;
      if (filtroAsignacionParq === 'libres' && (tieneUnidad || p.esVisitante)) return false;
      if (filtroAsignacionParq === 'visitantes' && !p.esVisitante) return false;
      if (filtroAsignacionParq === 'con_vehiculo' && !tieneVehiculo) return false;
      if (filtroAsignacionParq === 'sin_vehiculo' && (tieneVehiculo || p.esVisitante)) return false;

      if (searchParq.trim()) {
        const term = searchParq.trim().toLowerCase();
        const matchNum = p.numero?.toLowerCase().includes(term);
        const matchTorre = (p.torreAsignada || u?.torre)?.toLowerCase().includes(term);
        const matchApto = (p.aptoAsignado || u?.numeroApto)?.toLowerCase().includes(term);
        const veh = mapaVehiculosPorParq.get(num);
        const matchPlaca = veh?.placa?.toLowerCase().includes(term);
        const matchMarca = veh?.marca?.toLowerCase().includes(term);
        if (!matchNum && !matchTorre && !matchApto && !matchPlaca && !matchMarca) return false;
      }

      return true;
    });

    filtrados.sort((a, b) => {
      const numA = a.numero.trim().toUpperCase();
      const numB = b.numero.trim().toUpperCase();
      switch (ordenParq) {
        case 'numero_desc':
          return b.numero.localeCompare(a.numero, undefined, { numeric: true });
        case 'tipo_asc':
          return (
            (a.tipo || '').localeCompare(b.tipo || '') ||
            a.numero.localeCompare(b.numero, undefined, { numeric: true })
          );
        case 'unidad_asc': {
          const uA = a.aptoAsignado || a.torreAsignada ? `${a.torreAsignada || ''} ${a.aptoAsignado || ''}` : 'ZZZ';
          const uB = b.aptoAsignado || b.torreAsignada ? `${b.torreAsignada || ''} ${b.aptoAsignado || ''}` : 'ZZZ';
          return (
            uA.localeCompare(uB, undefined, { numeric: true }) ||
            a.numero.localeCompare(b.numero, undefined, { numeric: true })
          );
        }
        case 'placa_asc': {
          const pA = mapaVehiculosPorParq.get(numA)?.placa || 'ZZZ';
          const pB = mapaVehiculosPorParq.get(numB)?.placa || 'ZZZ';
          return (
            pA.localeCompare(pB) ||
            a.numero.localeCompare(b.numero, undefined, { numeric: true })
          );
        }
        case 'numero_asc':
        default:
          return a.numero.localeCompare(b.numero, undefined, { numeric: true });
      }
    });

    return filtrados;
  }, [
    parqueaderos,
    searchParq,
    filtroTorreParq,
    filtroTipoParq,
    filtroModoParq,
    filtroAsignacionParq,
    ordenParq,
    mapaUnidadesPorParq,
    mapaVehiculosPorParq,
  ]);

  // Filtrado y Ordenamiento de Bodegas
  const bodegasFiltradas = useMemo(() => {
    const filtradas = bodegas.filter((b) => {
      const num = b.numero.trim().toUpperCase();
      const u = mapaUnidadesPorBodega.get(num);
      const tieneUnidad = Boolean(b.aptoAsignado || b.torreAsignada || u);

      if (filtroTorreBodega !== 'todos') {
        const torreBod = b.torreAsignada?.trim() || u?.torre?.trim();
        if (torreBod !== filtroTorreBodega) return false;
      }

      if (filtroAsignacionBodega === 'asignadas' && !tieneUnidad) return false;
      if (filtroAsignacionBodega === 'libres' && tieneUnidad) return false;

      if (searchBodega.trim()) {
        const term = searchBodega.trim().toLowerCase();
        const matchNum = b.numero?.toLowerCase().includes(term);
        const matchUbicacion = b.ubicacion?.toLowerCase().includes(term);
        const matchTorre = (b.torreAsignada || u?.torre)?.toLowerCase().includes(term);
        const matchApto = (b.aptoAsignado || u?.numeroApto)?.toLowerCase().includes(term);
        if (!matchNum && !matchUbicacion && !matchTorre && !matchApto) return false;
      }
      return true;
    });

    filtradas.sort((a, b) => {
      switch (ordenBodegas) {
        case 'numero_desc':
          return b.numero.localeCompare(a.numero, undefined, { numeric: true });
        case 'area_desc':
          return (
            (b.metrosCuadrados ?? 0) - (a.metrosCuadrados ?? 0) ||
            a.numero.localeCompare(b.numero, undefined, { numeric: true })
          );
        case 'area_asc':
          return (
            (a.metrosCuadrados ?? 0) - (b.metrosCuadrados ?? 0) ||
            a.numero.localeCompare(b.numero, undefined, { numeric: true })
          );
        case 'unidad_asc': {
          const uA = b.aptoAsignado || b.torreAsignada ? `${b.torreAsignada || ''} ${b.aptoAsignado || ''}` : 'ZZZ';
          const uB = b.aptoAsignado || b.torreAsignada ? `${b.torreAsignada || ''} ${b.aptoAsignado || ''}` : 'ZZZ';
          return (
            uA.localeCompare(uB, undefined, { numeric: true }) ||
            a.numero.localeCompare(b.numero, undefined, { numeric: true })
          );
        }
        case 'ubicacion_asc':
          return (
            (a.ubicacion || '').localeCompare(b.ubicacion || '') ||
            a.numero.localeCompare(b.numero, undefined, { numeric: true })
          );
        case 'numero_asc':
        default:
          return a.numero.localeCompare(b.numero, undefined, { numeric: true });
      }
    });

    return filtradas;
  }, [
    bodegas,
    searchBodega,
    filtroTorreBodega,
    filtroAsignacionBodega,
    ordenBodegas,
    mapaUnidadesPorBodega,
  ]);

  // Métricas de Parqueaderos
  const statsParq = useMemo(() => {
    const total = parqueaderos.length;
    const visitantes = parqueaderos.filter((p) => p.esVisitante).length;
    const privados = total - visitantes;
    const cubiertos = parqueaderos.filter((p) => p.esCubierto).length;
    const carros = parqueaderos.filter((p) => (p.tipo || 'carro').toLowerCase() === 'carro').length;
    const motosBicis = total - carros;
    return { total, visitantes, privados, cubiertos, carros, motosBicis };
  }, [parqueaderos]);

  // Métricas de Bodegas
  const statsBodegas = useMemo(() => {
    const total = bodegas.length;
    const asignadas = bodegas.filter((b) => b.aptoAsignado || b.torreAsignada).length;
    const libres = total - asignadas;
    const areaTotal = bodegas.reduce((acc, b) => acc + (b.metrosCuadrados || 0), 0);
    return { total, asignadas, libres, areaTotal: Math.round(areaTotal * 10) / 10 };
  }, [bodegas]);

  return (
    <div className="space-y-6">
      {/* Encabezado y Acciones */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-base-content flex items-center gap-2">
            <span className="icon-[tabler--users-group] text-primary text-2xl sm:text-3xl shrink-0" aria-hidden="true" />
            <span>Censo y Base de Datos de Residentes</span>
          </h1>
          <p className="text-xs sm:text-sm text-base-content/70 mt-0.5">
            Control de habitantes, parque automotor e inventario de parqueaderos y bodegas.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 w-full lg:flex lg:flex-wrap lg:items-center lg:w-auto">
          {edificio?.id && (
            <>
              <button
                type="button"
                onClick={() => setQrModalOpen(true)}
                className="btn btn-sm btn-outline btn-primary gap-1.5 px-2.5 sm:px-3 text-xs sm:text-sm font-medium w-full lg:w-auto justify-center"
              >
                <span className="icon-[tabler--qrcode] text-base shrink-0" aria-hidden="true" />
                <span className="truncate">Código QR <span className="hidden sm:inline">& Link</span></span>
              </button>
              <Link
                href={`/censo/${edificio.id}`}
                target="_blank"
                className="btn btn-sm btn-outline gap-1.5 px-2.5 sm:px-3 text-xs sm:text-sm font-medium w-full lg:w-auto justify-center"
              >
                <span className="icon-[tabler--external-link] text-base shrink-0" aria-hidden="true" />
                <span className="truncate">Portal de Censo</span>
              </Link>
            </>
          )}
          <button
            type="button"
            onClick={() => setExcelModalOpen(true)}
            className="btn btn-sm btn-outline gap-1.5 px-2.5 sm:px-3 text-xs sm:text-sm font-medium w-full lg:w-auto justify-center"
          >
            <span className="icon-[tabler--file-spreadsheet] text-base shrink-0" aria-hidden="true" />
            <span className="truncate">Carga Masiva <span className="hidden sm:inline">Excel</span></span>
          </button>
          <button
            type="button"
            onClick={() => exportarCensoXLSX(unidades, parqueaderos, bodegas, edificio?.nombre)}
            className="btn btn-sm btn-outline gap-1.5 px-2.5 sm:px-3 text-xs sm:text-sm font-medium w-full lg:w-auto justify-center"
            disabled={unidades.length === 0}
            title="Descargar libro Excel (.xlsx) con hojas estructuradas"
          >
            <span className="icon-[tabler--file-spreadsheet] text-base text-success shrink-0" aria-hidden="true" />
            <span className="truncate">Exportar Excel <span className="hidden sm:inline">(.xlsx)</span></span>
          </button>
          <Link
            href="/dashboard/censo/nuevo"
            className="btn btn-sm btn-primary col-span-2 lg:col-span-1 w-full lg:w-auto gap-1.5 px-3 text-xs sm:text-sm font-medium justify-center"
          >
            <span className="icon-[tabler--plus] text-base shrink-0" aria-hidden="true" />
            <span>Nueva Unidad</span>
          </Link>
        </div>
      </div>

      {/* Alerta de Solicitudes Pendientes */}
      {stats && stats.pendientes > 0 && (
        <div className="alert alert-warning shadow-xs">
          <span className="icon-[tabler--alert-circle] text-2xl" aria-hidden="true" />
          <div className="flex-1">
            <span className="font-semibold">
              Tienes {stats.pendientes} solicitud{stats.pendientes > 1 ? 'es' : ''} de censo pendiente{stats.pendientes > 1 ? 's' : ''} de revisión.
            </span>
            <p className="text-xs">
              Revisa la bandeja para aprobar o rechazar los registros enviados por los residentes.
            </p>
          </div>
          <button
            onClick={() => {
              setActiveTab('inmuebles');
              setFiltroEstado('pendientes');
            }}
            className="btn btn-sm btn-outline"
          >
            Ver pendientes
          </button>
        </div>
      )}

      {/* TABS DE NAVEGACIÓN */}
      <div className="flex border-b border-base-200 overflow-x-auto gap-1 pb-0.5">
        <button
          type="button"
          onClick={() => setActiveTab('inmuebles')}
          className={`inline-flex items-center gap-1.5 sm:gap-2 border-b-2 px-3 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition-colors ${
            activeTab === 'inmuebles'
              ? 'border-primary text-primary'
              : 'border-transparent text-base-content/60 hover:text-base-content'
          }`}
        >
          <span className="icon-[tabler--home] text-base sm:text-lg" />
          <span>Inmuebles ({unidades.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('residentes')}
          className={`inline-flex items-center gap-1.5 sm:gap-2 border-b-2 px-3 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition-colors ${
            activeTab === 'residentes'
              ? 'border-primary text-primary'
              : 'border-transparent text-base-content/60 hover:text-base-content'
          }`}
        >
          <span className="icon-[tabler--users] text-base sm:text-lg" />
          <span>Residentes ({todosResidentes.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('parqueaderos')}
          className={`inline-flex items-center gap-1.5 sm:gap-2 border-b-2 px-3 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition-colors ${
            activeTab === 'parqueaderos'
              ? 'border-primary text-primary'
              : 'border-transparent text-base-content/60 hover:text-base-content'
          }`}
        >
          <span className="icon-[tabler--car] text-base sm:text-lg" />
          <span>Parqueaderos ({parqueaderos.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('bodegas')}
          className={`inline-flex items-center gap-1.5 sm:gap-2 border-b-2 px-3 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition-colors ${
            activeTab === 'bodegas'
              ? 'border-primary text-primary'
              : 'border-transparent text-base-content/60 hover:text-base-content'
          }`}
        >
          <span className="icon-[tabler--package] text-base sm:text-lg" />
          <span>Bodegas ({bodegas.length})</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* VISTA 1: TAB INMUEBLES                                          */}
      {/* ============================================================== */}
      {activeTab === 'inmuebles' && (
        <div className="space-y-6">
          {/* Tarjetas KPI Inmuebles */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <div className="card bg-base-100 shadow-sm border border-base-200 p-3 sm:p-4">
              <div className="flex items-center gap-1.5 text-base-content/60 text-2xs sm:text-xs font-medium">
                <span className="icon-[tabler--users] text-primary text-base sm:text-lg" aria-hidden="true" />
                <span>Habitantes</span>
              </div>
              <div className="mt-1.5 text-xl sm:text-2xl font-bold text-base-content">
                {stats ? stats.totalPersonas : '-'}
              </div>
              <div className="text-3xs sm:text-xs text-base-content/50 mt-0.5 truncate">
                en {stats ? stats.totalUnidades : '-'} unidades
              </div>
            </div>

            <div className="card bg-base-100 shadow-sm border border-base-200 p-3 sm:p-4">
              <div className="flex items-center gap-1.5 text-info text-2xs sm:text-xs font-medium">
                <span className="icon-[tabler--mood-kid] text-base sm:text-lg" aria-hidden="true" />
                <span>Menores (&lt;18)</span>
              </div>
              <div className="mt-1.5 text-xl sm:text-2xl font-bold text-info">
                {stats ? stats.menores : '-'}
              </div>
              <div className="text-3xs sm:text-xs text-base-content/50 mt-0.5 truncate">
                niños y jóvenes
              </div>
            </div>

            <div className="card bg-base-100 shadow-sm border border-base-200 p-3 sm:p-4">
              <div className="flex items-center gap-1.5 text-warning text-2xs sm:text-xs font-medium">
                <span className="icon-[tabler--user-heart] text-base sm:text-lg" aria-hidden="true" />
                <span>Adultos Mayores</span>
              </div>
              <div className="mt-1.5 text-xl sm:text-2xl font-bold text-warning">
                {stats ? stats.adultosMayores : '-'}
              </div>
              <div className="text-3xs sm:text-xs text-base-content/50 mt-0.5 truncate">
                60+ años prioritarios
              </div>
            </div>

            <div className="card bg-base-100 shadow-sm border border-base-200 p-3 sm:p-4">
              <div className="flex items-center gap-1.5 text-secondary text-2xs sm:text-xs font-medium">
                <span className="icon-[tabler--paw] text-base sm:text-lg" aria-hidden="true" />
                <span>Mascotas</span>
              </div>
              <div className="mt-1.5 text-xl sm:text-2xl font-bold text-secondary">
                {stats ? stats.totalMascotas : '-'}
              </div>
              <div className="text-3xs sm:text-xs text-base-content/50 mt-0.5 truncate">
                {stats && stats.mascotasPeligrosas > 0 ? (
                  <span className="text-error font-semibold">{stats.mascotasPeligrosas} de manejo especial</span>
                ) : (
                  '0 de manejo especial'
                )}
              </div>
            </div>

            <div className="card bg-base-100 shadow-sm border border-base-200 p-3 sm:p-4">
              <div className="flex items-center gap-1.5 text-success text-2xs sm:text-xs font-medium">
                <span className="icon-[tabler--car] text-base sm:text-lg" aria-hidden="true" />
                <span>Vehículos</span>
              </div>
              <div className="mt-1.5 text-xl sm:text-2xl font-bold text-success">
                {stats ? stats.totalVehiculos : '-'}
              </div>
              <div className="text-3xs sm:text-xs text-base-content/50 mt-0.5 truncate">
                registrados
              </div>
            </div>

            <div className="card bg-base-100 shadow-sm border border-base-200 p-3 sm:p-4">
              <div className="flex items-center gap-1.5 text-error text-2xs sm:text-xs font-medium">
                <span className="icon-[tabler--clock] text-base sm:text-lg" aria-hidden="true" />
                <span>Pendientes</span>
              </div>
              <div className="mt-1.5 text-xl sm:text-2xl font-bold text-error">
                {stats ? stats.pendientes : '-'}
              </div>
              <div className="text-3xs sm:text-xs text-base-content/50 mt-0.5 truncate">
                por validar
              </div>
            </div>
          </div>

          {/* Barra de Búsqueda y Filtros Inmuebles */}
          <div className="card bg-base-100 shadow-sm border border-base-200 p-3 sm:p-4">
            <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative flex-1">
                <span className="icon-[tabler--search] absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50 text-base" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por placa vehicular, apartamento, torre, nombre o teléfono..."
                  className="input input-sm w-full pl-9 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                {torresDisponibles.length > 0 && (
                  <select
                    value={filtroTorreInmuebles}
                    onChange={(e) => setFiltroTorreInmuebles(e.target.value)}
                    className="select select-sm text-xs w-full"
                  >
                    <option value="todos">Torre: Todas</option>
                    {torresDisponibles.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                )}

                <select
                  value={filtroOcupacionInmuebles}
                  onChange={(e) => setFiltroOcupacionInmuebles(e.target.value)}
                  className="select select-sm text-xs w-full"
                >
                  <option value="todos">Ocupación: Todas</option>
                  <option value="habitada">Habitada</option>
                  <option value="desocupada">Desocupada</option>
                </select>

                <select
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value)}
                  className="select select-sm text-xs w-full"
                >
                  <option value="todos">Aprobación: Todos</option>
                  <option value="aprobados">Solo Aprobados</option>
                  <option value="pendientes">Solo Pendientes</option>
                </select>

                <select
                  value={filtroEspecial}
                  onChange={(e) => setFiltroEspecial(e.target.value)}
                  className="select select-sm text-xs w-full"
                >
                  <option value="todos">Demografía: Todos</option>
                  <option value="con_menores">🧒 Con menores</option>
                  <option value="con_mayores">🧓 Con adultos mayores</option>
                  <option value="mascotas_peligrosas">🐾 Manejo especial</option>
                  <option value="arrendatarios">📄 Arrendatarios</option>
                </select>

                <select
                  value={ordenInmuebles}
                  onChange={(e) => setOrdenInmuebles(e.target.value)}
                  className="select select-sm text-xs w-full font-medium"
                >
                  <option value="identificador_asc">Orden: Apto (Ascendente)</option>
                  <option value="identificador_desc">Orden: Apto (Descendente)</option>
                  <option value="torre_asc">Orden: Por Torre</option>
                  <option value="piso_asc">Orden: Piso (Menor a Mayor)</option>
                  <option value="piso_desc">Orden: Piso (Mayor a Menor)</option>
                  <option value="metros_desc">Orden: Mayor Área</option>
                  <option value="metros_asc">Orden: Menor Área</option>
                  <option value="personas_desc">Orden: Más Residentes</option>
                  <option value="mascotas_desc">Orden: Más Mascotas</option>
                  <option value="vehiculos_desc">Orden: Más Vehículos</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tabla de Unidades Inmuebles */}
          <div className="card bg-base-100 shadow-sm border border-base-200 overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-base-content/50">Cargando censo...</div>
            ) : unidadesFiltradas.length === 0 ? (
              <div className="p-8 text-center text-base-content/50">
                No se encontraron unidades residenciales con los criterios aplicados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Unidad / Apto</th>
                      <th>Residentes ({unidadesFiltradas.reduce((acc, u) => acc + (u.personas?.length || 0), 0)})</th>
                      <th>Mascotas</th>
                      <th>Vehículos (Placas)</th>
                      <th>Estado</th>
                      <th className="text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unidadesFiltradas.map((u) => {
                      const numMenores = u.personas?.filter((p) => calcularEdad(p.fechaNacimiento) < 18).length || 0;
                      const numMayores = u.personas?.filter((p) => calcularEdad(p.fechaNacimiento) >= 60).length || 0;

                      return (
                        <tr key={u._id} className={u.estado !== 'aprobado' ? 'bg-warning/5' : ''}>
                          {/* Identificador y Características */}
                          <td>
                            <div className="font-bold text-base-content">{u.identificador}</div>
                            <div className="flex flex-wrap items-center gap-1.5 text-2xs text-base-content/70 mt-0.5">
                              {u.torre && <span>Torre: {u.torre}</span>}
                              {u.piso !== undefined && <span>• Piso {u.piso}</span>}
                              {u.metrosCuadrados && <span>• {u.metrosCuadrados} m²</span>}
                              {u.cuartos && <span>• {u.cuartos} hab.</span>}
                            </div>
                            <div className="flex flex-wrap items-center gap-1 mt-1.5">
                              <span className={`badge badge-2xs ${u.tipoOcupacion === 'habitada' ? 'badge-soft badge-success' : 'badge-soft badge-ghost'}`}>
                                {u.tipoOcupacion}
                              </span>
                              {u.parqueaderosAsignados && u.parqueaderosAsignados.length > 0 && (
                                <span className="badge badge-2xs badge-soft badge-primary font-mono" title="Parqueadero asignado">
                                  🚗 {u.parqueaderosAsignados.map((p) => p.numero).join(', ')}
                                </span>
                              )}
                              {u.bodegasAsignadas && u.bodegasAsignadas.length > 0 && (
                                <span className="badge badge-2xs badge-soft badge-info font-mono" title="Bodega asignada">
                                  📦 {u.bodegasAsignadas.map((b) => b.numero).join(', ')}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Residentes */}
                          <td>
                            <div className="text-sm font-semibold">
                              {u.personas?.length || 0} personas
                            </div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {numMenores > 0 && (
                                <span className="badge badge-xs badge-soft badge-info">
                                  {numMenores} menor{numMenores > 1 ? 'es' : ''}
                                </span>
                              )}
                              {numMayores > 0 && (
                                <span className="badge badge-xs badge-soft badge-warning">
                                  {numMayores} ad. mayor{numMayores > 1 ? 'es' : ''}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-base-content/60 truncate max-w-xs mt-1">
                              {u.personas?.map((p) => p.nombreCompleto).join(', ')}
                            </div>
                          </td>

                          {/* Mascotas */}
                          <td>
                            {u.mascotas && u.mascotas.length > 0 ? (
                              <div className="space-y-1">
                                <span className="badge badge-xs badge-soft badge-secondary">
                                  {u.mascotas.length} mascota{u.mascotas.length > 1 ? 's' : ''}
                                </span>
                                {u.mascotas.some((m) => m.esPeligroso) && (
                                  <div className="text-2xs text-error font-semibold flex items-center gap-0.5">
                                    <span className="icon-[tabler--alert-triangle]" />
                                    Raza especial
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-base-content/40">-</span>
                            )}
                          </td>

                          {/* Vehículos */}
                          <td>
                            {u.vehiculos && u.vehiculos.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {u.vehiculos.map((v, i) => (
                                  <span key={i} className="badge badge-xs badge-soft badge-primary font-mono">
                                    {v.placa}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-base-content/40">-</span>
                            )}
                          </td>

                          {/* Estado */}
                          <td>
                            {u.estado === 'aprobado' && (
                              <span className="badge badge-xs badge-soft badge-success">Aprobado</span>
                            )}
                            {u.estado === 'pendiente' && (
                              <span className="badge badge-xs badge-soft badge-warning">Pendiente</span>
                            )}
                            {u.estado === 'pendiente_actualizacion' && (
                              <span className="badge badge-xs badge-soft badge-info">Actualización</span>
                            )}
                            {u.estado === 'rechazado' && (
                              <span className="badge badge-xs badge-soft badge-error">Rechazado</span>
                            )}
                          </td>

                          {/* Acciones */}
                          <td className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {u.estado !== 'aprobado' && (
                                <>
                                  <button
                                    onClick={() => aprobarUnidad(u._id)}
                                    disabled={procesandoId === u._id}
                                    className="btn btn-square btn-ghost btn-xs text-success"
                                    title="Aprobar censo"
                                  >
                                    <span className="icon-[tabler--check] text-lg" />
                                  </button>
                                  <button
                                    onClick={() => rechazarUnidad(u._id)}
                                    disabled={procesandoId === u._id}
                                    className="btn btn-square btn-ghost btn-xs text-error"
                                    title="Rechazar censo"
                                  >
                                    <span className="icon-[tabler--x] text-lg" />
                                  </button>
                                </>
                              )}
                              <Link
                                href={`/dashboard/censo/${u._id}`}
                                className="btn btn-square btn-ghost btn-xs text-info"
                                title="Ver ficha completa"
                              >
                                <span className="icon-[tabler--eye] text-lg" />
                              </Link>
                              <Link
                                href={`/dashboard/censo/${u._id}/edit`}
                                className="btn btn-square btn-ghost btn-xs"
                                title="Editar"
                              >
                                <span className="icon-[tabler--edit] text-lg" />
                              </Link>
                              <button
                                onClick={() => eliminarUnidad(u._id, u.identificador)}
                                disabled={procesandoId === u._id}
                                className="btn btn-square btn-ghost btn-xs text-error"
                                title="Eliminar"
                              >
                                <span className="icon-[tabler--trash] text-lg" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* VISTA 2: TAB RESIDENTES                                         */}
      {/* ============================================================== */}
      {activeTab === 'residentes' && (
        <div className="space-y-6">
          {/* Tarjetas KPI Residentes */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <div className="card bg-base-100 shadow-sm border border-base-200 p-3 sm:p-4">
              <div className="flex items-center gap-1.5 text-primary text-2xs sm:text-xs font-medium">
                <span className="icon-[tabler--users] text-base sm:text-lg" />
                <span>Total Habitantes</span>
              </div>
              <div className="mt-1.5 text-xl sm:text-2xl font-bold text-base-content">
                {statsResidentes.total}
              </div>
              <div className="text-3xs sm:text-xs text-base-content/50 mt-0.5 truncate">personas registradas</div>
            </div>

            <div className="card bg-base-100 shadow-sm border border-base-200 p-3 sm:p-4">
              <div className="flex items-center gap-1.5 text-success text-2xs sm:text-xs font-medium">
                <span className="icon-[tabler--certificate] text-base sm:text-lg" />
                <span>Propietarios</span>
              </div>
              <div className="mt-1.5 text-xl sm:text-2xl font-bold text-success">
                {statsResidentes.propietarios}
              </div>
              <div className="text-3xs sm:text-xs text-base-content/50 mt-0.5 truncate">titulares de vivienda</div>
            </div>

            <div className="card bg-base-100 shadow-sm border border-base-200 p-3 sm:p-4">
              <div className="flex items-center gap-1.5 text-info text-2xs sm:text-xs font-medium">
                <span className="icon-[tabler--file-certificate] text-base sm:text-lg" />
                <span>Arrendatarios</span>
              </div>
              <div className="mt-1.5 text-xl sm:text-2xl font-bold text-info">
                {statsResidentes.arrendatarios}
              </div>
              <div className="text-3xs sm:text-xs text-base-content/50 mt-0.5 truncate">inquilinos censados</div>
            </div>

            <div className="card bg-base-100 shadow-sm border border-base-200 p-3 sm:p-4">
              <div className="flex items-center gap-1.5 text-secondary text-2xs sm:text-xs font-medium">
                <span className="icon-[tabler--users-group] text-base sm:text-lg" />
                <span>Convivientes</span>
              </div>
              <div className="mt-1.5 text-xl sm:text-2xl font-bold text-secondary">
                {statsResidentes.convivientes}
              </div>
              <div className="text-3xs sm:text-xs text-base-content/50 mt-0.5 truncate">familiares / dependientes</div>
            </div>

            <div className="card bg-base-100 shadow-sm border border-base-200 p-3 sm:p-4">
              <div className="flex items-center gap-1.5 text-info text-2xs sm:text-xs font-medium">
                <span className="icon-[tabler--mood-kid] text-base sm:text-lg" />
                <span>Menores (&lt;18)</span>
              </div>
              <div className="mt-1.5 text-xl sm:text-2xl font-bold text-info">
                {statsResidentes.menores}
              </div>
              <div className="text-3xs sm:text-xs text-base-content/50 mt-0.5 truncate">niños y jóvenes</div>
            </div>

            <div className="card bg-base-100 shadow-sm border border-base-200 p-3 sm:p-4">
              <div className="flex items-center gap-1.5 text-warning text-2xs sm:text-xs font-medium">
                <span className="icon-[tabler--user-heart] text-base sm:text-lg" />
                <span>Adultos Mayores</span>
              </div>
              <div className="mt-1.5 text-xl sm:text-2xl font-bold text-warning">
                {statsResidentes.adultosMayores}
              </div>
              <div className="text-3xs sm:text-xs text-base-content/50 mt-0.5 truncate">60+ años prioritarios</div>
            </div>
          </div>

          {/* Filtros Residentes */}
          <div className="card bg-base-100 shadow-sm border border-base-200 p-3 sm:p-4">
            <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative flex-1">
                <span className="icon-[tabler--search] absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50 text-base" />
                <input
                  type="text"
                  value={searchResidente}
                  onChange={(e) => setSearchResidente(e.target.value)}
                  placeholder="Buscar por nombre, teléfono, correo, documento o apartamento..."
                  className="input input-sm w-full pl-9 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                {torresDisponibles.length > 0 && (
                  <select
                    value={filtroTorreResidentes}
                    onChange={(e) => setFiltroTorreResidentes(e.target.value)}
                    className="select select-sm text-xs w-full"
                  >
                    <option value="todos">Torre: Todas</option>
                    {torresDisponibles.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                )}

                <select
                  value={filtroCondicionResidente}
                  onChange={(e) => setFiltroCondicionResidente(e.target.value)}
                  className="select select-sm text-xs w-full"
                >
                  <option value="todos">Condición: Todos</option>
                  <option value="propietario">Propietario</option>
                  <option value="arrendatario">Arrendatario</option>
                  <option value="conviviente">Conviviente / Familiar</option>
                </select>

                <select
                  value={filtroGrupoEtarioResidente}
                  onChange={(e) => setFiltroGrupoEtarioResidente(e.target.value)}
                  className="select select-sm text-xs w-full"
                >
                  <option value="todos">Edad: Todos</option>
                  <option value="menor">🧒 Menores (&lt;18)</option>
                  <option value="adulto">🧑 Adultos (18-59)</option>
                  <option value="adulto_mayor">🧓 Adultos Mayores (60+)</option>
                </select>

                <select
                  value={filtroContactoPrincipal}
                  onChange={(e) => setFiltroContactoPrincipal(e.target.value)}
                  className="select select-sm text-xs w-full"
                >
                  <option value="todos">Contactos: Todos</option>
                  <option value="solo_principales">★ Solo Principal</option>
                </select>

                <select
                  value={ordenResidentes}
                  onChange={(e) => setOrdenResidentes(e.target.value)}
                  className="select select-sm text-xs w-full font-medium"
                >
                  <option value="nombre_asc">Orden: Nombre (A - Z)</option>
                  <option value="nombre_desc">Orden: Nombre (Z - A)</option>
                  <option value="unidad_asc">Orden: Por Apto / Torre</option>
                  <option value="edad_asc">Orden: Menor a Mayor Edad</option>
                  <option value="edad_desc">Orden: Mayor a Menor Edad</option>
                  <option value="condicion_asc">Orden: Por Condición</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tabla Residentes */}
          <div className="card bg-base-100 shadow-sm border border-base-200 overflow-hidden">
            {residentesFiltrados.length === 0 ? (
              <div className="p-8 text-center text-base-content/50">
                No se encontraron residentes con los criterios de búsqueda aplicados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Nombre del Residente</th>
                      <th>Unidad / Apto</th>
                      <th>Condición</th>
                      <th>Edad / Grupo Etario</th>
                      <th>Teléfono</th>
                      <th>Correo Electrónico</th>
                      <th className="text-right">Ficha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {residentesFiltrados.map((r, idx) => (
                      <tr key={`${r.unidadId}-${idx}`}>
                        <td>
                          <div className="font-bold text-base-content flex items-center gap-1.5">
                            {r.nombreCompleto}
                            {r.esContactoPrincipal && (
                              <span
                                className="badge badge-xs badge-primary font-medium"
                                title="Contacto Principal de la Unidad"
                              >
                                ★ Principal
                              </span>
                            )}
                          </div>
                          {r.documento && (
                            <div className="text-2xs text-base-content/60 font-mono">
                              Doc: {r.documento}
                            </div>
                          )}
                        </td>
                        <td>
                          <Link
                            href={`/dashboard/censo/${r.unidadId}`}
                            className="font-semibold text-primary hover:underline text-xs"
                          >
                            {r.identificador}
                          </Link>
                          {r.torre && (
                            <div className="text-2xs text-base-content/60">{r.torre}</div>
                          )}
                        </td>
                        <td>
                          {r.condicion === 'propietario' ? (
                            <span className="badge badge-xs badge-soft badge-success">Propietario</span>
                          ) : r.condicion === 'arrendatario' ? (
                            <span className="badge badge-xs badge-soft badge-info">Arrendatario</span>
                          ) : (
                            <span className="badge badge-xs badge-soft badge-ghost">Conviviente</span>
                          )}
                        </td>
                        <td>
                          {r.edad !== null ? (
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-xs">{r.edad} años</span>
                              {r.categoria && (
                                <span className={`badge badge-2xs ${r.categoria.badgeClass}`}>
                                  {r.categoria.label}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-base-content/40">-</span>
                          )}
                        </td>
                        <td>
                          {r.telefono ? (
                            <a
                              href={`tel:${r.telefono}`}
                              className="text-xs font-mono text-base-content hover:text-primary inline-flex items-center gap-1"
                            >
                              <span className="icon-[tabler--phone] text-sm text-primary" />
                              {r.telefono}
                            </a>
                          ) : (
                            <span className="text-xs text-base-content/40">-</span>
                          )}
                        </td>
                        <td>
                          {r.email ? (
                            <a
                              href={`mailto:${r.email}`}
                              className="text-xs text-base-content hover:text-primary inline-flex items-center gap-1 truncate max-w-xs"
                            >
                              <span className="icon-[tabler--mail] text-sm text-secondary" />
                              {r.email}
                            </a>
                          ) : (
                            <span className="text-xs text-base-content/40">-</span>
                          )}
                        </td>
                        <td className="text-right">
                          <Link
                            href={`/dashboard/censo/${r.unidadId}`}
                            className="btn btn-square btn-ghost btn-xs text-info"
                            title="Ver ficha de la vivienda"
                          >
                            <span className="icon-[tabler--eye] text-base" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* VISTA 3: TAB PARQUEADEROS                                       */}
      {/* ============================================================== */}
      {activeTab === 'parqueaderos' && (
        <div className="space-y-6">
          {/* Tarjetas KPI Parqueaderos */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <div className="card bg-base-100 shadow-sm border border-base-200 p-3 sm:p-4">
              <div className="flex items-center gap-1.5 text-primary text-2xs sm:text-xs font-medium">
                <span className="icon-[tabler--car] text-base sm:text-lg" />
                <span>Total Espacios</span>
              </div>
              <div className="mt-1.5 text-xl sm:text-2xl font-bold text-base-content">
                {statsParq.total}
              </div>
              <div className="text-3xs sm:text-xs text-base-content/50 mt-0.5 truncate">inventario global</div>
            </div>

            <div className="card bg-base-100 shadow-sm border border-base-200 p-3 sm:p-4">
              <div className="flex items-center gap-1.5 text-success text-2xs sm:text-xs font-medium">
                <span className="icon-[tabler--user-check] text-base sm:text-lg" />
                <span>Privados</span>
              </div>
              <div className="mt-1.5 text-xl sm:text-2xl font-bold text-success">
                {statsParq.privados}
              </div>
              <div className="text-3xs sm:text-xs text-base-content/50 mt-0.5 truncate">asignados a unidades</div>
            </div>

            <div className="card bg-base-100 shadow-sm border border-base-200 p-3 sm:p-4">
              <div className="flex items-center gap-1.5 text-warning text-2xs sm:text-xs font-medium">
                <span className="icon-[tabler--users] text-base sm:text-lg" />
                <span>Visitantes</span>
              </div>
              <div className="mt-1.5 text-xl sm:text-2xl font-bold text-warning">
                {statsParq.visitantes}
              </div>
              <div className="text-3xs sm:text-xs text-base-content/50 mt-0.5 truncate">uso rotativo / libre</div>
            </div>

            <div className="card bg-base-100 shadow-sm border border-base-200 p-3 sm:p-4">
              <div className="flex items-center gap-1.5 text-info text-2xs sm:text-xs font-medium">
                <span className="icon-[tabler--umbrella] text-base sm:text-lg" />
                <span>Cubiertos</span>
              </div>
              <div className="mt-1.5 text-xl sm:text-2xl font-bold text-info">
                {statsParq.cubiertos}
              </div>
              <div className="text-3xs sm:text-xs text-base-content/50 mt-0.5 truncate">
                {statsParq.total - statsParq.cubiertos} descubiertos
              </div>
            </div>

            <div className="card bg-base-100 shadow-sm border border-base-200 p-3 sm:p-4">
              <div className="flex items-center gap-1.5 text-secondary text-2xs sm:text-xs font-medium">
                <span className="icon-[tabler--car] text-base sm:text-lg" />
                <span>Para Carros</span>
              </div>
              <div className="mt-1.5 text-xl sm:text-2xl font-bold text-secondary">
                {statsParq.carros}
              </div>
              <div className="text-3xs sm:text-xs text-base-content/50 mt-0.5 truncate">convencionales</div>
            </div>

            <div className="card bg-base-100 shadow-sm border border-base-200 p-3 sm:p-4">
              <div className="flex items-center gap-1.5 text-accent text-2xs sm:text-xs font-medium">
                <span className="icon-[tabler--motorbike] text-base sm:text-lg" />
                <span>Motos / Bicis</span>
              </div>
              <div className="mt-1.5 text-xl sm:text-2xl font-bold text-accent">
                {statsParq.motosBicis}
              </div>
              <div className="text-3xs sm:text-xs text-base-content/50 mt-0.5 truncate">bahías especiales</div>
            </div>
          </div>

          {/* Filtros Parqueaderos */}
          <div className="card bg-base-100 shadow-sm border border-base-200 p-3 sm:p-4">
            <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative flex-1">
                <span className="icon-[tabler--search] absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50 text-base" />
                <input
                  type="text"
                  value={searchParq}
                  onChange={(e) => setSearchParq(e.target.value)}
                  placeholder="Buscar por número (ej. P-101), torre, apartamento, placa o vehículo..."
                  className="input input-sm w-full pl-9 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                {torresDisponibles.length > 0 && (
                  <select
                    value={filtroTorreParq}
                    onChange={(e) => setFiltroTorreParq(e.target.value)}
                    className="select select-sm text-xs w-full"
                  >
                    <option value="todos">Torre: Todas</option>
                    {torresDisponibles.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                )}

                <select
                  value={filtroTipoParq}
                  onChange={(e) => setFiltroTipoParq(e.target.value)}
                  className="select select-sm text-xs w-full"
                >
                  <option value="todos">Tipo: Todos</option>
                  <option value="carro">Carro</option>
                  <option value="moto">Moto</option>
                  <option value="bicicleta">Bicicleta</option>
                </select>

                <select
                  value={filtroModoParq}
                  onChange={(e) => setFiltroModoParq(e.target.value)}
                  className="select select-sm text-xs w-full"
                >
                  <option value="todos">Modalidad: Todos</option>
                  <option value="privados">Solo Privados</option>
                  <option value="visitantes">Solo Visitantes</option>
                  <option value="cubiertos">Solo Cubiertos</option>
                </select>

                <select
                  value={filtroAsignacionParq}
                  onChange={(e) => setFiltroAsignacionParq(e.target.value)}
                  className="select select-sm text-xs w-full"
                >
                  <option value="todos">Asignación: Todos</option>
                  <option value="asignados">Asignados a Vivienda</option>
                  <option value="libres">Libres / Sin Asignar</option>
                  <option value="con_vehiculo">Con Vehículo</option>
                  <option value="sin_vehiculo">Sin Vehículo</option>
                </select>

                <select
                  value={ordenParq}
                  onChange={(e) => setOrdenParq(e.target.value)}
                  className="select select-sm text-xs w-full font-medium"
                >
                  <option value="numero_asc">Orden: Número (1 - 9 / A - Z)</option>
                  <option value="numero_desc">Orden: Número (9 - 1 / Z - A)</option>
                  <option value="tipo_asc">Orden: Por Tipo de Cupo</option>
                  <option value="unidad_asc">Orden: Por Unidad / Apto</option>
                  <option value="placa_asc">Orden: Por Placa Vehicular</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tabla Parqueaderos */}
          <div className="card bg-base-100 shadow-sm border border-base-200 overflow-hidden">
            {parqueaderosFiltrados.length === 0 ? (
              <div className="p-8 text-center text-base-content/50">
                No hay parqueaderos registrados que coincidan con la búsqueda. Puedes cargarlos usando el botón &quot;Carga Masiva Excel&quot;.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Número</th>
                      <th>Tipo</th>
                      <th>Modalidad</th>
                      <th>Cubierto</th>
                      <th>Asignado a Unidad</th>
                      <th>Vehículo Asignado</th>
                      <th className="text-right">Ficha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parqueaderosFiltrados.map((p) => {
                      const num = p.numero.trim().toUpperCase();
                      const vehiculo = mapaVehiculosPorParq.get(num);
                      const u = mapaUnidadesPorParq.get(num);

                      return (
                        <tr key={p._id}>
                          <td>
                            <span className="font-mono font-bold text-sm text-primary">
                              {p.numero}
                            </span>
                          </td>
                          <td>
                            <span className="inline-flex items-center gap-1.5 capitalize text-xs">
                              {p.tipo === 'moto' ? (
                                <span className="icon-[tabler--motorbike] text-base text-accent" />
                              ) : p.tipo === 'bicicleta' ? (
                                <span className="icon-[tabler--bike] text-base text-info" />
                              ) : (
                                <span className="icon-[tabler--car] text-base text-primary" />
                              )}
                              {p.tipo || 'Carro'}
                            </span>
                          </td>
                          <td>
                            {p.esVisitante ? (
                              <span className="badge badge-xs badge-soft badge-warning font-semibold">
                                Visitante
                              </span>
                            ) : (
                              <span className="badge badge-xs badge-soft badge-success font-semibold">
                                Privado
                              </span>
                            )}
                          </td>
                          <td>
                            {p.esCubierto ? (
                              <span className="badge badge-xs badge-soft badge-info">Cubierto</span>
                            ) : (
                              <span className="badge badge-xs badge-soft badge-ghost">Descubierto</span>
                            )}
                          </td>
                          <td>
                            {u ? (
                              <Link
                                href={`/dashboard/censo/${u._id}`}
                                className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
                              >
                                {p.torreAsignada ? `${p.torreAsignada} - ` : u.torre ? `${u.torre} - ` : ''}
                                Apto {p.aptoAsignado || u.numeroApto}
                              </Link>
                            ) : p.aptoAsignado || p.torreAsignada ? (
                              <div className="text-xs font-semibold text-base-content">
                                {p.torreAsignada ? `${p.torreAsignada} - ` : ''}Apto {p.aptoAsignado}
                              </div>
                            ) : p.esVisitante ? (
                              <span className="text-xs text-base-content/50 italic">Uso común visitantes</span>
                            ) : (
                              <span className="text-xs text-base-content/50 italic">Sin unidad asignada</span>
                            )}
                          </td>
                          <td>
                            {vehiculo ? (
                              <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={`inline-flex items-center gap-1 font-mono font-bold text-xs px-2 py-0.5 rounded border ${
                                      vehiculo.tipo === 'moto'
                                        ? 'bg-accent/10 border-accent/30 text-accent'
                                        : vehiculo.tipo === 'bicicleta'
                                          ? 'bg-info/10 border-info/30 text-info'
                                          : 'bg-primary/10 border-primary/30 text-primary'
                                    }`}
                                  >
                                    {vehiculo.tipo === 'moto' ? (
                                      <span className="icon-[tabler--motorbike] text-sm" />
                                    ) : vehiculo.tipo === 'bicicleta' ? (
                                      <span className="icon-[tabler--bike] text-sm" />
                                    ) : (
                                      <span className="icon-[tabler--car] text-sm" />
                                    )}
                                    {vehiculo.placa}
                                  </span>
                                  <span className="text-3xs uppercase tracking-wider text-base-content/60 font-semibold">
                                    {vehiculo.tipo}
                                  </span>
                                </div>
                                {(vehiculo.marca || vehiculo.modelo || vehiculo.color) && (
                                  <div className="text-2xs text-base-content/60 truncate max-w-xs">
                                    {[vehiculo.marca, vehiculo.modelo, vehiculo.color].filter(Boolean).join(' • ')}
                                  </div>
                                )}
                              </div>
                            ) : p.esVisitante ? (
                              <span className="badge badge-xs badge-soft badge-warning font-semibold">
                                Uso común visitantes
                              </span>
                            ) : u ? (
                              <span className="badge badge-xs badge-soft badge-ghost text-base-content/50">
                                Sin vehículo registrado
                              </span>
                            ) : (
                              <span className="badge badge-xs badge-soft badge-neutral text-base-content/40">
                                Cupo libre
                              </span>
                            )}
                          </td>
                          <td className="text-right">
                            {u ? (
                              <Link
                                href={`/dashboard/censo/${u._id}`}
                                className="btn btn-square btn-ghost btn-xs text-info"
                                title={`Ver ficha de la vivienda (${u.identificador})`}
                              >
                                <span className="icon-[tabler--eye] text-base" />
                              </Link>
                            ) : (
                              <button
                                disabled
                                className="btn btn-square btn-ghost btn-xs opacity-30 cursor-not-allowed"
                                title={p.esVisitante ? 'Uso común visitantes' : 'Sin unidad vinculada'}
                              >
                                <span className="icon-[tabler--eye-off] text-base" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* VISTA 4: TAB BODEGAS                                            */}
      {/* ============================================================== */}
      {activeTab === 'bodegas' && (
        <div className="space-y-6">
          {/* Tarjetas KPI Bodegas */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-4">
            <div className="card bg-base-100 shadow-sm border border-base-200 p-3 sm:p-4">
              <div className="flex items-center gap-1.5 text-primary text-2xs sm:text-xs font-medium">
                <span className="icon-[tabler--package] text-base sm:text-lg" />
                <span>Total Bodegas</span>
              </div>
              <div className="mt-1.5 text-xl sm:text-2xl font-bold text-base-content">
                {statsBodegas.total}
              </div>
              <div className="text-3xs sm:text-xs text-base-content/50 mt-0.5 truncate">unidades de depósito</div>
            </div>

            <div className="card bg-base-100 shadow-sm border border-base-200 p-3 sm:p-4">
              <div className="flex items-center gap-1.5 text-success text-2xs sm:text-xs font-medium">
                <span className="icon-[tabler--check] text-base sm:text-lg" />
                <span>Asignadas</span>
              </div>
              <div className="mt-1.5 text-xl sm:text-2xl font-bold text-success">
                {statsBodegas.asignadas}
              </div>
              <div className="text-3xs sm:text-xs text-base-content/50 mt-0.5 truncate">vinculadas a apartamentos</div>
            </div>

            <div className="card bg-base-100 shadow-sm border border-base-200 p-3 sm:p-4">
              <div className="flex items-center gap-1.5 text-warning text-2xs sm:text-xs font-medium">
                <span className="icon-[tabler--box] text-base sm:text-lg" />
                <span>Libres / Sin Asignar</span>
              </div>
              <div className="mt-1.5 text-xl sm:text-2xl font-bold text-warning">
                {statsBodegas.libres}
              </div>
              <div className="text-3xs sm:text-xs text-base-content/50 mt-0.5 truncate">disponibles</div>
            </div>

            <div className="card bg-base-100 shadow-sm border border-base-200 p-3 sm:p-4">
              <div className="flex items-center gap-1.5 text-info text-2xs sm:text-xs font-medium">
                <span className="icon-[tabler--ruler-2] text-base sm:text-lg" />
                <span>Área Total</span>
              </div>
              <div className="mt-1.5 text-xl sm:text-2xl font-bold text-info">
                {statsBodegas.areaTotal} m²
              </div>
              <div className="text-3xs sm:text-xs text-base-content/50 mt-0.5 truncate">superficie útil</div>
            </div>
          </div>

          {/* Filtros Bodegas */}
          <div className="card bg-base-100 shadow-sm border border-base-200 p-3 sm:p-4">
            <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative flex-1">
                <span className="icon-[tabler--search] absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50 text-base" />
                <input
                  type="text"
                  value={searchBodega}
                  onChange={(e) => setSearchBodega(e.target.value)}
                  placeholder="Buscar por número de bodega (ej. B-01), ubicación, torre o apartamento..."
                  className="input input-sm w-full pl-9 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {torresDisponibles.length > 0 && (
                  <select
                    value={filtroTorreBodega}
                    onChange={(e) => setFiltroTorreBodega(e.target.value)}
                    className="select select-sm text-xs w-full"
                  >
                    <option value="todos">Torre: Todas</option>
                    {torresDisponibles.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                )}

                <select
                  value={filtroAsignacionBodega}
                  onChange={(e) => setFiltroAsignacionBodega(e.target.value)}
                  className="select select-sm text-xs w-full"
                >
                  <option value="todos">Asignación: Todas</option>
                  <option value="asignadas">Asignadas a Unidad</option>
                  <option value="libres">Libres / Sin Asignar</option>
                </select>

                <select
                  value={ordenBodegas}
                  onChange={(e) => setOrdenBodegas(e.target.value)}
                  className="select select-sm text-xs w-full font-medium"
                >
                  <option value="numero_asc">Orden: Número (1 - 9 / A - Z)</option>
                  <option value="numero_desc">Orden: Número (9 - 1 / Z - A)</option>
                  <option value="area_desc">Orden: Mayor Área (m²)</option>
                  <option value="area_asc">Orden: Menor Área (m²)</option>
                  <option value="unidad_asc">Orden: Por Unidad / Apto</option>
                  <option value="ubicacion_asc">Orden: Por Ubicación</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tabla Bodegas */}
          <div className="card bg-base-100 shadow-sm border border-base-200 overflow-hidden">
            {bodegasFiltradas.length === 0 ? (
              <div className="p-8 text-center text-base-content/50">
                No hay bodegas registradas que coincidan con la búsqueda. Puedes cargarlas usando el botón &quot;Carga Masiva Excel&quot;.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Número de Bodega</th>
                      <th>Ubicación</th>
                      <th>Área (m²)</th>
                      <th>Asignada a Unidad</th>
                      <th className="text-right">Ficha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bodegasFiltradas.map((b) => {
                      const num = b.numero.trim().toUpperCase();
                      const u = mapaUnidadesPorBodega.get(num);

                      return (
                        <tr key={b._id}>
                          <td>
                            <span className="font-mono font-bold text-sm text-info">
                              {b.numero}
                            </span>
                          </td>
                          <td>
                            <span className="text-xs text-base-content/80">
                              {b.ubicacion || 'No especificada'}
                            </span>
                          </td>
                          <td>
                            {b.metrosCuadrados ? (
                              <span className="badge badge-xs badge-soft font-mono">
                                {b.metrosCuadrados} m²
                              </span>
                            ) : (
                              <span className="text-xs text-base-content/40">-</span>
                            )}
                          </td>
                          <td>
                            {u ? (
                              <Link
                                href={`/dashboard/censo/${u._id}`}
                                className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
                              >
                                {b.torreAsignada ? `${b.torreAsignada} - ` : u.torre ? `${u.torre} - ` : ''}
                                Apto {b.aptoAsignado || u.numeroApto}
                              </Link>
                            ) : b.aptoAsignado || b.torreAsignada ? (
                              <div className="text-xs font-semibold text-base-content">
                                {b.torreAsignada ? `${b.torreAsignada} - ` : ''}Apto {b.aptoAsignado}
                              </div>
                            ) : (
                              <span className="badge badge-xs badge-soft badge-ghost">Libre / Sin asignar</span>
                            )}
                          </td>
                          <td className="text-right">
                            {u ? (
                              <Link
                                href={`/dashboard/censo/${u._id}`}
                                className="btn btn-square btn-ghost btn-xs text-info"
                                title={`Ver ficha de la vivienda (${u.identificador})`}
                              >
                                <span className="icon-[tabler--eye] text-base" />
                              </Link>
                            ) : (
                              <button
                                disabled
                                className="btn btn-square btn-ghost btn-xs opacity-30 cursor-not-allowed"
                                title="Sin unidad vinculada"
                              >
                                <span className="icon-[tabler--eye-off] text-base" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal QR */}
      {qrModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200"
          onClick={() => setQrModalOpen(false)}
        >
          <div
            className="card bg-base-100 rounded-box shadow-xl border border-base-200 max-w-sm w-full p-4 sm:p-6 text-center space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-2 border-base-content/10">
              <h3 className="font-bold text-base text-base-content flex items-center gap-2">
                <span className="icon-[tabler--qrcode] text-primary" />
                QR Censo Residentes
              </h3>
              <button
                type="button"
                onClick={() => setQrModalOpen(false)}
                className="btn btn-circle btn-xs btn-ghost"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-base-content/70">
              Imprime o comparte este código QR en portería, ascensores o carteleras para que los residentes registren su información.
            </p>

            {qrUrl && (
              <div className="p-3 bg-white rounded-lg border border-base-200 inline-block mx-auto shadow-xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrUrl} alt="QR Censo" className="w-48 h-48 sm:w-56 sm:h-56 mx-auto" />
              </div>
            )}

            <div className="space-y-2">
              <button
                onClick={copiarLink}
                className="btn btn-sm btn-outline btn-primary w-full gap-2"
              >
                <span className={`icon-[tabler--${copied ? 'check' : 'copy'}] text-base`} />
                {copied ? '¡Enlace copiado!' : 'Copiar Enlace Directo'}
              </button>

              <button
                onClick={descargarQR}
                className="btn btn-sm btn-outline w-full gap-2"
              >
                <span className="icon-[tabler--download] text-base" />
                Descargar Imagen PNG
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Carga Masiva Excel */}
      <ModalCargaExcel
        isOpen={excelModalOpen}
        onClose={() => setExcelModalOpen(false)}
        onSuccess={() => {
          cargarDatos();
        }}
        edificioNombre={edificio?.nombre}
      />
    </div>
  );
}
