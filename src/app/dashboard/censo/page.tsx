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
import Paginacion from '@/components/Paginacion';
import BarraBusquedaFiltros from '@/components/BarraBusquedaFiltros';
import BotoneraAccionesTabla from '@/components/BotoneraAccionesTabla';

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
  const [filtroDemografia, setFiltroDemografia] = useState('todos');
  const [filtroTipoResidente, setFiltroTipoResidente] = useState('todos');
  const [filtroMascotas, setFiltroMascotas] = useState('todos');
  const [filtroTag, setFiltroTag] = useState('todos');
  const [ordenInmuebles, setOrdenInmuebles] = useState('identificador_asc');
  const [pageInmuebles, setPageInmuebles] = useState(1);
  const [itemsPerPageInmuebles, setItemsPerPageInmuebles] = useState(10);
  const [drawerFiltrosInmuebles, setDrawerFiltrosInmuebles] = useState(false);
  const [vistaInmuebles, setVistaInmuebles] = useState<'tabla' | 'tarjetas'>('tabla');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('vista_censo_inmuebles') as 'tabla' | 'tarjetas' | null;
      if (saved === 'tabla' || saved === 'tarjetas') {
        setVistaInmuebles(saved);
      }
    }
  }, []);

  // Invitación con caducidad
  const [inviteToken, setInviteToken] = useState('');
  const [inviteExpira, setInviteExpira] = useState('');
  const [generandoInvite, setGenerandoInvite] = useState(false);

  // Filtros y Orden Residentes
  const [searchResidente, setSearchResidente] = useState('');
  const [filtroTorreResidentes, setFiltroTorreResidentes] = useState('todos');
  const [filtroCondicionResidente, setFiltroCondicionResidente] = useState('todos');
  const [filtroGrupoEtarioResidente, setFiltroGrupoEtarioResidente] = useState('todos');
  const [filtroContactoPrincipal, setFiltroContactoPrincipal] = useState('todos');
  const [ordenResidentes, setOrdenResidentes] = useState('nombre_asc');
  const [pageResidentes, setPageResidentes] = useState(1);
  const [itemsPerPageResidentes, setItemsPerPageResidentes] = useState(10);
  const [drawerFiltrosResidentes, setDrawerFiltrosResidentes] = useState(false);

  // Filtros y Orden Parqueaderos
  const [searchParq, setSearchParq] = useState('');
  const [filtroTorreParq, setFiltroTorreParq] = useState('todos');
  const [filtroTipoParq, setFiltroTipoParq] = useState('todos');
  const [filtroModoParq, setFiltroModoParq] = useState('todos');
  const [filtroAsignacionParq, setFiltroAsignacionParq] = useState('todos');
  const [ordenParq, setOrdenParq] = useState('numero_asc');
  const [pageParq, setPageParq] = useState(1);
  const [itemsPerPageParq, setItemsPerPageParq] = useState(10);

  // Filtros y Orden Bodegas
  const [searchBodega, setSearchBodega] = useState('');
  const [filtroTorreBodega, setFiltroTorreBodega] = useState('todos');
  const [filtroAsignacionBodega, setFiltroAsignacionBodega] = useState('todos');
  const [ordenBodegas, setOrdenBodegas] = useState('numero_asc');
  const [pageBodegas, setPageBodegas] = useState(1);
  const [itemsPerPageBodegas, setItemsPerPageBodegas] = useState(10);

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
    const url = inviteToken
      ? `${window.location.origin}/censo/invitacion/${inviteToken}`
      : publicCensusUrl;
    if (!url) return;
    navigator.clipboard.writeText(url);
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

  const generarInvitacionSegura = async () => {
    try {
      setGenerandoInvite(true);
      const res = await apiFetch('/censo/invitaciones', {
        method: 'POST',
        body: JSON.stringify({ diasValidez: 7 }),
      });
      setInviteToken(res.token);
      if (res.expiraEn) {
        setInviteExpira(
          new Date(res.expiraEn).toLocaleDateString('es-CO', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }),
        );
      }
      const fullUrl = `${window.location.origin}/censo/invitacion/${res.token}`;
      QRCode.toDataURL(fullUrl, { width: 320 })
        .then(setQrUrl)
        .catch(console.error);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al generar invitación');
    } finally {
      setGenerandoInvite(false);
    }
  };

  const toggleTagInmueble = async (u: CensoUnidad, tag: string) => {
    const tagsActuales = u.tags || [];
    const nuevo = tagsActuales.includes(tag)
      ? tagsActuales.filter((t) => t !== tag)
      : [...tagsActuales, tag];
    try {
      await apiFetch(`/censo/${u._id}/tags`, {
        method: 'PATCH',
        body: JSON.stringify({ tags: nuevo }),
      });
      await cargarDatos();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al actualizar tag');
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
        if (filtroEstado === 'actualizaciones' && u.estado !== 'pendiente_actualizacion') {
          return false;
        }
        if (filtroEstado === 'aprobados' && u.estado !== 'aprobado') {
          return false;
        }
      }

      // 1. Filtro Demografía
      if (filtroDemografia === 'menores') {
        const tieneMenores = u.personas?.some((p) => calcularEdad(p.fechaNacimiento) < 18);
        if (!tieneMenores) return false;
      } else if (filtroDemografia === 'mayores') {
        const tieneMayores = u.personas?.some((p) => calcularEdad(p.fechaNacimiento) >= 60);
        if (!tieneMayores) return false;
      } else if (filtroDemografia === 'discapacidad') {
        const tieneDiscapacidad = u.personas?.some((p) => p.discapacidad);
        if (!tieneDiscapacidad) return false;
      } else if (filtroDemografia === 'condicion_especial') {
        const tieneEspecial = u.personas?.some((p) => Boolean(p.condicionEspecial));
        if (!tieneEspecial) return false;
      }

      // 2. Filtro Tipo de Residente
      if (filtroTipoResidente !== 'todos') {
        const tieneTipo = u.personas?.some((p) => p.condicion === filtroTipoResidente);
        if (!tieneTipo) return false;
      }

      // 3. Filtro Mascotas
      if (filtroMascotas === 'con_mascotas') {
        if (!u.mascotas || u.mascotas.length === 0) return false;
      } else if (filtroMascotas === 'manejo_especial') {
        const tieneEspecial = u.mascotas?.some((m) => m.esManejoEspecial || m.esPeligroso);
        if (!tieneEspecial) return false;
      } else if (filtroMascotas === 'sin_mascotas') {
        if (u.mascotas && u.mascotas.length > 0) return false;
      }

      // 4. Filtro Tags
      if (filtroTag !== 'todos') {
        const tags = (u.tags || []).map((t) => t.toLowerCase());
        if (filtroTag === 'moroso') {
          if (!tags.includes('moroso') && !tags.includes('mora')) return false;
        } else if (filtroTag === 'al_dia') {
          if (!tags.includes('al_dia') && !tags.includes('al dia')) return false;
        } else if (filtroTag === 'otros') {
          if (tags.length === 0 || tags.includes('moroso') || tags.includes('al_dia')) return false;
        }
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
    filtroDemografia,
    filtroTipoResidente,
    filtroMascotas,
    filtroTag,
    ordenInmuebles,
  ]);

  // Paginación y conteo de filtros para Inmuebles
  const unidadesPaginadas = useMemo(() => {
    const start = (pageInmuebles - 1) * itemsPerPageInmuebles;
    return unidadesFiltradas.slice(start, start + itemsPerPageInmuebles);
  }, [unidadesFiltradas, pageInmuebles, itemsPerPageInmuebles]);

  const totalFiltrosInmueblesActivos = useMemo(() => {
    return [
      filtroTorreInmuebles !== 'todos',
      filtroOcupacionInmuebles !== 'todos',
      filtroDemografia !== 'todos',
      filtroTipoResidente !== 'todos',
      filtroMascotas !== 'todos',
      filtroTag !== 'todos',
      filtroEstado !== 'todos',
    ].filter(Boolean).length;
  }, [
    filtroTorreInmuebles,
    filtroOcupacionInmuebles,
    filtroDemografia,
    filtroTipoResidente,
    filtroMascotas,
    filtroTag,
    filtroEstado,
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

  // Paginación y conteo de filtros para Residentes
  const residentesPaginados = useMemo(() => {
    const start = (pageResidentes - 1) * itemsPerPageResidentes;
    return residentesFiltrados.slice(start, start + itemsPerPageResidentes);
  }, [residentesFiltrados, pageResidentes, itemsPerPageResidentes]);

  const totalFiltrosResidentesActivos = useMemo(() => {
    return [
      filtroTorreResidentes !== 'todos',
      filtroCondicionResidente !== 'todos',
      filtroGrupoEtarioResidente !== 'todos',
      filtroContactoPrincipal !== 'todos',
    ].filter(Boolean).length;
  }, [
    filtroTorreResidentes,
    filtroCondicionResidente,
    filtroGrupoEtarioResidente,
    filtroContactoPrincipal,
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

  // Paginación Parqueaderos
  const parqueaderosPaginados = useMemo(() => {
    const start = (pageParq - 1) * itemsPerPageParq;
    return parqueaderosFiltrados.slice(start, start + itemsPerPageParq);
  }, [parqueaderosFiltrados, pageParq, itemsPerPageParq]);

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

  // Paginación Bodegas
  const bodegasPaginadas = useMemo(() => {
    const start = (pageBodegas - 1) * itemsPerPageBodegas;
    return bodegasFiltradas.slice(start, start + itemsPerPageBodegas);
  }, [bodegasFiltradas, pageBodegas, itemsPerPageBodegas]);

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
            href="/dashboard/censo/habitantes/nuevo"
            className="btn btn-sm btn-primary col-span-2 lg:col-span-1 w-full lg:w-auto gap-1.5 px-3 text-xs sm:text-sm font-medium justify-center"
          >
            <span className="icon-[tabler--user-plus] text-base shrink-0" aria-hidden="true" />
            <span>Nuevo Habitante</span>
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

          {/* Barra de Búsqueda y Filtros Inmuebles Compartida (Fila única + Drawer + Toggle Vista) */}
          <BarraBusquedaFiltros
            busqueda={search}
            onBusquedaChange={(val) => {
              setSearch(val);
              setPageInmuebles(1);
            }}
            placeholderBusqueda="Buscar por placa vehicular, apartamento, torre, nombre o teléfono..."
            orden={ordenInmuebles}
            onOrdenChange={(val) => {
              setOrdenInmuebles(val);
              setPageInmuebles(1);
            }}
            opcionesOrden={[
              { valor: 'identificador_asc', etiqueta: 'Orden: Apto (Ascendente)' },
              { valor: 'identificador_desc', etiqueta: 'Orden: Apto (Descendente)' },
              { valor: 'torre_asc', etiqueta: 'Orden: Por Torre' },
              { valor: 'piso_asc', etiqueta: 'Orden: Piso (Menor a Mayor)' },
              { valor: 'piso_desc', etiqueta: 'Orden: Piso (Mayor a Menor)' },
              { valor: 'personas_desc', etiqueta: 'Orden: Más Residentes' },
              { valor: 'mascotas_desc', etiqueta: 'Orden: Más Mascotas' },
              { valor: 'vehiculos_desc', etiqueta: 'Orden: Más Vehículos' },
            ]}
            labelOrden="Criterio de ordenamiento de unidades"
            vista={vistaInmuebles}
            onVistaChange={(v) => {
              setVistaInmuebles(v);
              if (typeof window !== 'undefined') {
                localStorage.setItem('vista_censo_inmuebles', v);
              }
            }}
            drawerFiltrosAbierto={drawerFiltrosInmuebles}
            onToggleDrawerFiltros={() => setDrawerFiltrosInmuebles((prev) => !prev)}
            filtrosActivosCount={totalFiltrosInmueblesActivos}
            tituloFiltros="Filtros de unidades"
            onLimpiarFiltros={() => {
              setFiltroTorreInmuebles('todos');
              setFiltroOcupacionInmuebles('todos');
              setFiltroDemografia('todos');
              setFiltroTipoResidente('todos');
              setFiltroMascotas('todos');
              setFiltroTag('todos');
              setFiltroEstado('todos');
              setPageInmuebles(1);
            }}
          >
            {torresDisponibles.length > 0 && (
              <div>
                <label className="text-3xs uppercase font-bold text-base-content/50 block mb-1">
                  Torre
                </label>
                <select
                  value={filtroTorreInmuebles}
                  onChange={(e) => {
                    setFiltroTorreInmuebles(e.target.value);
                    setPageInmuebles(1);
                  }}
                  className="select select-sm text-xs w-full"
                >
                  <option value="todos">Todas las torres</option>
                  {torresDisponibles.map((t) => (
                    <option key={t} value={t}>Torre {t}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="text-3xs uppercase font-bold text-base-content/50 block mb-1">
                Ocupación
              </label>
              <select
                value={filtroOcupacionInmuebles}
                onChange={(e) => {
                  setFiltroOcupacionInmuebles(e.target.value);
                  setPageInmuebles(1);
                }}
                className="select select-sm text-xs w-full"
              >
                <option value="todos">Todas</option>
                <option value="habitada">Habitada</option>
                <option value="desocupada">Desocupada</option>
              </select>
            </div>

            <div>
              <label className="text-3xs uppercase font-bold text-base-content/50 block mb-1">
                Demografía
              </label>
              <select
                value={filtroDemografia}
                onChange={(e) => {
                  setFiltroDemografia(e.target.value);
                  setPageInmuebles(1);
                }}
                className="select select-sm text-xs w-full"
              >
                <option value="todos">Todas las edades</option>
                <option value="menores">🧒 Menores (&lt;18)</option>
                <option value="mayores">🧓 Adultos Mayores (60+)</option>
                <option value="discapacidad">♿ Con Discapacidad</option>
                <option value="condicion_especial">🧠 Condición Especial</option>
              </select>
            </div>

            <div>
              <label className="text-3xs uppercase font-bold text-base-content/50 block mb-1">
                Tipo Residente
              </label>
              <select
                value={filtroTipoResidente}
                onChange={(e) => {
                  setFiltroTipoResidente(e.target.value);
                  setPageInmuebles(1);
                }}
                className="select select-sm text-xs w-full"
              >
                <option value="todos">Todos los tipos</option>
                <option value="propietario">Propietarios</option>
                <option value="arrendatario">Arrendatarios</option>
                <option value="habitante">Habitantes / Convivientes</option>
                <option value="visitante">Visitantes Frecuentes</option>
              </select>
            </div>

            <div>
              <label className="text-3xs uppercase font-bold text-base-content/50 block mb-1">
                Mascotas
              </label>
              <select
                value={filtroMascotas}
                onChange={(e) => {
                  setFiltroMascotas(e.target.value);
                  setPageInmuebles(1);
                }}
                className="select select-sm text-xs w-full"
              >
                <option value="todos">Todas</option>
                <option value="con_mascotas">🐾 Con Mascotas</option>
                <option value="manejo_especial">⚠️ Manejo Especial / Agresivos</option>
                <option value="sin_mascotas">Sin Mascotas</option>
              </select>
            </div>

            <div>
              <label className="text-3xs uppercase font-bold text-base-content/50 block mb-1">
                Tags / Estado Pago
              </label>
              <select
                value={filtroTag}
                onChange={(e) => {
                  setFiltroTag(e.target.value);
                  setPageInmuebles(1);
                }}
                className="select select-sm text-xs w-full"
              >
                <option value="todos">Todos los tags</option>
                <option value="moroso">🚨 Morosos</option>
                <option value="al_dia">✅ Al Día</option>
                <option value="otros">Otros Tags</option>
              </select>
            </div>

            <div>
              <label className="text-3xs uppercase font-bold text-base-content/50 block mb-1">
                Validación Admin
              </label>
              <select
                value={filtroEstado}
                onChange={(e) => {
                  setFiltroEstado(e.target.value);
                  setPageInmuebles(1);
                }}
                className="select select-sm text-xs w-full"
              >
                <option value="todos">Todos los estados</option>
                <option value="aprobados">Solo Aprobados</option>
                <option value="pendientes">Pendientes Validación</option>
                <option value="actualizaciones">Con Actualizaciones</option>
              </select>
            </div>
          </BarraBusquedaFiltros>

          {/* Tabla de Unidades Inmuebles */}
          <div className="card bg-base-100 shadow-sm border border-base-200 overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-base-content/50">Cargando censo...</div>
            ) : unidadesFiltradas.length === 0 ? (
              <div className="p-10 text-center space-y-3">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-base-200 text-base-content/50">
                  <span className="icon-[tabler--building-community] text-2xl" />
                </div>
                <h4 className="font-semibold text-base text-base-content">
                  No se encontraron unidades residenciales
                </h4>
                <p className="text-xs text-base-content/60 max-w-md mx-auto">
                  {unidades.length === 0
                    ? 'Aún no hay unidades registradas en la copropiedad. Puedes importar la información masiva desde un archivo Excel o invitar a los residentes.'
                    : 'No hay unidades que coincidan con los filtros seleccionados. Prueba limpiando los filtros o realiza una carga de datos.'}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  <button
                    onClick={() => setExcelModalOpen(true)}
                    className="btn btn-primary btn-sm gap-2"
                  >
                    <span className="icon-[tabler--file-spreadsheet] text-base" />
                    Carga Masiva con Excel
                  </button>
                  <button
                    onClick={() => {
                      generarInvitacionSegura();
                      setQrModalOpen(true);
                    }}
                    className="btn btn-outline btn-sm gap-2"
                  >
                    <span className="icon-[tabler--qrcode] text-base" />
                    Generar Invitación
                  </button>
                  {(filtroDemografia !== 'todos' || filtroTipoResidente !== 'todos' || filtroMascotas !== 'todos' || filtroTag !== 'todos' || filtroEstado !== 'todos' || search) && (
                    <button
                      onClick={() => {
                        setSearch('');
                        setFiltroTorreInmuebles('todos');
                        setFiltroOcupacionInmuebles('todos');
                        setFiltroDemografia('todos');
                        setFiltroTipoResidente('todos');
                        setFiltroMascotas('todos');
                        setFiltroTag('todos');
                        setFiltroEstado('todos');
                      }}
                      className="btn btn-outline btn-sm"
                    >
                      Limpiar Filtros
                    </button>
                  )}
                </div>
              </div>
            ) : vistaInmuebles === 'tabla' ? (
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
                    {unidadesPaginadas.map((u) => {
                      const numMenores = u.personas?.filter((p) => calcularEdad(p.fechaNacimiento) < 18).length || 0;
                      const numMayores = u.personas?.filter((p) => calcularEdad(p.fechaNacimiento) >= 60).length || 0;
                      const tieneDiscapacidad = u.personas?.some((p) => p.discapacidad);
                      const tieneEspecial = u.personas?.some((p) => p.condicionEspecial);
                      const tieneCedula = u.personas?.some((p) => p.adjuntoCedulaUrl);
                      const tieneVacunas = u.mascotas?.some((m) => m.adjuntoCarnetVacunacionUrl);
                      const tienePoliza = u.mascotas?.some((m) => m.adjuntoPolizaUrl);
                      const tieneTarjetaVehiculo = u.vehiculos?.some((v) => v.adjuntoTarjetaPropiedadUrl);
                      const esMoroso = (u.tags || []).some((t) => t.toUpperCase() === 'MOROSO');

                      return (
                        <tr key={u._id} className={u.estado !== 'aprobado' ? 'bg-warning/5' : ''}>
                          {/* Identificador y Características */}
                          <td>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-base-content">{u.identificador}</span>
                              {esMoroso && (
                                <span className="badge badge-xs badge-error font-bold text-3xs">
                                  🚨 MOROSO
                                </span>
                              )}
                              {u.tags && u.tags.filter((t) => t.toUpperCase() !== 'MOROSO').map((t, idx) => (
                                <span key={idx} className="badge badge-xs badge-soft badge-primary text-3xs">
                                  {t}
                                </span>
                              ))}
                            </div>
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
                              {u.adjuntoCertificadoLibertadUrl && (
                                <span className="badge badge-2xs badge-soft badge-secondary" title="Certificado de libertad adjunto">
                                  📜 Cert. Libertad
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
                              {tieneDiscapacidad && (
                                <span className="badge badge-xs badge-soft badge-error" title="Residente con discapacidad">
                                  ♿ Discapacidad
                                </span>
                              )}
                              {tieneEspecial && (
                                <span className="badge badge-xs badge-soft badge-warning" title="Residente con condición especial / salud mental">
                                  🧠 Cond. Especial
                                </span>
                              )}
                              {tieneCedula && (
                                <span className="badge badge-xs badge-soft badge-primary" title="Cédula adjunta">
                                  🪪 Cédula
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
                                {(u.mascotas.some((m) => m.esPeligroso || m.esManejoEspecial)) && (
                                  <div className="text-2xs text-error font-semibold flex items-center gap-0.5">
                                    <span className="icon-[tabler--alert-triangle]" />
                                    Manejo especial
                                  </div>
                                )}
                                <div className="flex flex-wrap gap-1">
                                  {tieneVacunas && (
                                    <span className="badge badge-2xs badge-soft badge-success" title="Carnet de vacunación adjunto">
                                      💉 Vacunas
                                    </span>
                                  )}
                                  {tienePoliza && (
                                    <span className="badge badge-2xs badge-soft badge-primary" title="Póliza de responsabilidad adjunta">
                                      🛡️ Póliza
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-base-content/40">-</span>
                            )}
                          </td>

                          {/* Vehículos */}
                          <td>
                            {u.vehiculos && u.vehiculos.length > 0 ? (
                              <div className="space-y-1">
                                <div className="flex flex-wrap gap-1">
                                  {u.vehiculos.map((v, i) => (
                                    <span key={i} className="badge badge-xs badge-soft badge-primary font-mono">
                                      {v.placa}
                                    </span>
                                  ))}
                                </div>
                                {tieneTarjetaVehiculo && (
                                  <span className="badge badge-2xs badge-soft badge-info" title="Tarjeta de propiedad adjunta">
                                    🚗 T. Propiedad
                                  </span>
                                )}
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
                            <BotoneraAccionesTabla
                              verUrl={`/dashboard/censo/${u._id}`}
                              tituloVer="Ver ficha completa"
                              editarUrl={`/dashboard/censo/${u._id}/edit`}
                              tituloEditar="Editar unidad"
                              onEliminar={() => eliminarUnidad(u._id, u.identificador)}
                              deshabilitarEliminar={procesandoId === u._id}
                              onAprobar={u.estado !== 'aprobado' ? () => aprobarUnidad(u._id) : undefined}
                              deshabilitarAprobar={procesandoId === u._id}
                              tituloAprobar="Aprobar censo"
                              onRechazar={u.estado !== 'aprobado' ? () => rechazarUnidad(u._id) : undefined}
                              deshabilitarRechazar={procesandoId === u._id}
                              tituloRechazar="Rechazar censo"
                            >
                              <button
                                type="button"
                                onClick={() => toggleTagInmueble(u, 'MOROSO')}
                                className={`inline-flex items-center justify-center w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-lg border text-sm transition-all ${
                                  esMoroso
                                    ? 'bg-error text-error-content border-error font-bold'
                                    : 'bg-base-200 text-base-content/70 border-base-300 hover:text-error hover:border-error/40'
                                }`}
                                title={esMoroso ? 'Quitar tag Moroso' : 'Marcar como Moroso'}
                                aria-label={esMoroso ? 'Quitar tag Moroso' : 'Marcar como Moroso'}
                              >
                                <span className="icon-[tabler--tag] text-base" />
                              </button>
                            </BotoneraAccionesTabla>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Vista en Tarjetas / Cuadrícula */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                {unidadesPaginadas.map((u) => {
                  const numMenores = u.personas?.filter((p) => calcularEdad(p.fechaNacimiento) < 18).length || 0;
                  const numMayores = u.personas?.filter((p) => calcularEdad(p.fechaNacimiento) >= 60).length || 0;
                  const esMoroso = (u.tags || []).some((t) => t.toUpperCase() === 'MOROSO');

                  return (
                    <div
                      key={u._id}
                      className={`card bg-base-100 shadow-sm border ${
                        u.estado !== 'aprobado' ? 'border-warning/60 bg-warning/5' : 'border-base-200'
                      } p-4 flex flex-col justify-between gap-3`}
                    >
                      <div>
                        {/* Cabecera de la tarjeta */}
                        <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-base-200">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-base text-base-content">{u.identificador}</h3>
                              {esMoroso && (
                                <span className="badge badge-xs badge-error font-bold text-3xs">
                                  🚨 MOROSO
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 text-2xs text-base-content/70 mt-0.5">
                              {u.torre && <span>Torre {u.torre}</span>}
                              {u.piso !== undefined && <span>• Piso {u.piso}</span>}
                              {u.cuartos && <span>• {u.cuartos} hab.</span>}
                              {u.metrosCuadrados && <span>• {u.metrosCuadrados} m²</span>}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span
                              className={`badge badge-xs font-semibold ${
                                u.estado === 'aprobado'
                                  ? 'badge-success'
                                  : u.estado === 'pendiente'
                                    ? 'badge-warning'
                                    : u.estado === 'rechazado'
                                      ? 'badge-error'
                                      : 'badge-info'
                              }`}
                            >
                              {u.estado}
                            </span>
                            <span
                              className={`badge badge-2xs ${
                                u.tipoOcupacion === 'habitada' ? 'badge-soft badge-success' : 'badge-soft badge-ghost'
                              }`}
                            >
                              {u.tipoOcupacion}
                            </span>
                          </div>
                        </div>

                        {/* Detalles de la unidad */}
                        <div className="mt-2.5 space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-base-content/60 flex items-center gap-1">
                              <span className="icon-[tabler--users] text-primary text-sm" />
                              Residentes:
                            </span>
                            <span className="font-semibold text-base-content">
                              {u.personas?.length || 0} personas
                              {numMenores > 0 && ` (${numMenores} menor${numMenores > 1 ? 'es' : ''})`}
                              {numMayores > 0 && ` (${numMayores} ad. mayor${numMayores > 1 ? 'es' : ''})`}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-base-content/60 flex items-center gap-1">
                              <span className="icon-[tabler--paw] text-secondary text-sm" />
                              Mascotas:
                            </span>
                            <span className="font-medium text-base-content">
                              {u.mascotas && u.mascotas.length > 0 ? (
                                <span className="badge badge-xs badge-soft badge-secondary">
                                  {u.mascotas.length} mascota{u.mascotas.length > 1 ? 's' : ''}
                                </span>
                              ) : (
                                <span className="text-base-content/40">Sin mascotas</span>
                              )}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-base-content/60 flex items-center gap-1">
                              <span className="icon-[tabler--car] text-info text-sm" />
                              Vehículos:
                            </span>
                            <span className="font-medium text-base-content">
                              {u.vehiculos && u.vehiculos.length > 0 ? (
                                <div className="flex flex-wrap gap-1 justify-end">
                                  {u.vehiculos.map((v, i) => (
                                    <span key={i} className="badge badge-2xs badge-soft badge-primary font-mono">
                                      {v.placa}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-base-content/40">Sin vehículos</span>
                              )}
                            </span>
                          </div>

                          {(u.parqueaderosAsignados?.length || u.bodegasAsignadas?.length) ? (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {u.parqueaderosAsignados?.map((p) => (
                                <span key={p.numero} className="badge badge-2xs badge-soft badge-primary font-mono">
                                  🚗 Parq {p.numero}
                                </span>
                              ))}
                              {u.bodegasAsignadas?.map((b) => (
                                <span key={b.numero} className="badge badge-2xs badge-soft badge-info font-mono">
                                  📦 Bodega {b.numero}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>

                      {/* Footer Acciones */}
                      <div className="pt-2.5 border-t border-base-200">
                        <BotoneraAccionesTabla
                          verUrl={`/dashboard/censo/${u._id}`}
                          tituloVer="Ver ficha completa"
                          editarUrl={`/dashboard/censo/${u._id}/edit`}
                          tituloEditar="Editar unidad"
                          onEliminar={() => eliminarUnidad(u._id, u.identificador)}
                          deshabilitarEliminar={procesandoId === u._id}
                          onAprobar={u.estado !== 'aprobado' ? () => aprobarUnidad(u._id) : undefined}
                          deshabilitarAprobar={procesandoId === u._id}
                          tituloAprobar="Aprobar censo"
                          onRechazar={u.estado !== 'aprobado' ? () => rechazarUnidad(u._id) : undefined}
                          deshabilitarRechazar={procesandoId === u._id}
                          tituloRechazar="Rechazar censo"
                        >
                          <button
                            type="button"
                            onClick={() => toggleTagInmueble(u, 'MOROSO')}
                            className={`inline-flex items-center justify-center w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-lg border text-sm transition-all ${
                              esMoroso
                                ? 'bg-error text-error-content border-error font-bold'
                                : 'bg-base-200 text-base-content/70 border-base-300 hover:text-error hover:border-error/40'
                            }`}
                            title={esMoroso ? 'Quitar tag Moroso' : 'Marcar como Moroso'}
                            aria-label={esMoroso ? 'Quitar tag Moroso' : 'Marcar como Moroso'}
                          >
                            <span className="icon-[tabler--tag] text-base" />
                          </button>
                        </BotoneraAccionesTabla>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {!loading && unidadesFiltradas.length > 0 && (
              <Paginacion
                currentPage={pageInmuebles}
                totalItems={unidadesFiltradas.length}
                itemsPerPage={itemsPerPageInmuebles}
                onPageChange={setPageInmuebles}
                onItemsPerPageChange={setItemsPerPageInmuebles}
              />
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

          {/* Filtros Residentes (Fila única + Drawer) */}
          <div className="card bg-base-100 shadow-sm border border-base-200 p-3 sm:p-4 space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              {/* 1. Input de Búsqueda */}
              <div className="relative flex-1">
                <span className="icon-[tabler--search] absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50 text-base" />
                <input
                  type="text"
                  value={searchResidente}
                  onChange={(e) => {
                    setSearchResidente(e.target.value);
                    setPageResidentes(1);
                  }}
                  placeholder="Buscar por nombre, teléfono, correo, documento o apartamento..."
                  className="input input-sm w-full pl-9 text-xs"
                />
              </div>

              {/* 2. Select Desplegable de Orden */}
              <div className="flex items-center gap-2 shrink-0">
                <select
                  value={ordenResidentes}
                  onChange={(e) => {
                    setOrdenResidentes(e.target.value);
                    setPageResidentes(1);
                  }}
                  className="select select-sm text-xs font-medium"
                  aria-label="Criterio de orden de residentes"
                >
                  <option value="nombre_asc">Orden: Nombre (A - Z)</option>
                  <option value="nombre_desc">Orden: Nombre (Z - A)</option>
                  <option value="unidad_asc">Orden: Por Apto / Torre</option>
                  <option value="edad_asc">Orden: Menor a Mayor Edad</option>
                  <option value="edad_desc">Orden: Mayor a Menor Edad</option>
                  <option value="condicion_asc">Orden: Por Condición</option>
                </select>

                {/* 3. Botón de Filtros con Desplegable Drawer */}
                <button
                  type="button"
                  onClick={() => setDrawerFiltrosResidentes((prev) => !prev)}
                  className={`btn btn-sm gap-1.5 font-medium transition-colors ${
                    drawerFiltrosResidentes || totalFiltrosResidentesActivos > 0
                      ? 'btn-primary'
                      : 'btn-outline'
                  }`}
                  aria-expanded={drawerFiltrosResidentes}
                >
                  <span className="icon-[tabler--adjustments-horizontal] text-base" aria-hidden="true" />
                  <span>Filtros</span>
                  {totalFiltrosResidentesActivos > 0 && (
                    <span className="badge badge-xs badge-warning font-bold px-1.5 py-0.5">
                      {totalFiltrosResidentesActivos}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Panel Desplegable (Drawer) de Filtros Residentes */}
            {drawerFiltrosResidentes && (
              <div className="pt-3 border-t border-base-200/80 animate-in fade-in slide-in-from-top-2 duration-150 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-base-content/70 flex items-center gap-1.5">
                    <span className="icon-[tabler--filter] text-primary" />
                    Filtros de residentes
                  </span>
                  <div className="flex items-center gap-2">
                    {totalFiltrosResidentesActivos > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setFiltroTorreResidentes('todos');
                          setFiltroCondicionResidente('todos');
                          setFiltroGrupoEtarioResidente('todos');
                          setFiltroContactoPrincipal('todos');
                          setPageResidentes(1);
                        }}
                        className="text-xs text-error hover:underline font-medium"
                      >
                        Limpiar filtros ({totalFiltrosResidentesActivos})
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setDrawerFiltrosResidentes(false)}
                      className="btn btn-ghost btn-xs btn-circle text-base-content/60"
                      aria-label="Cerrar filtros de residentes"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {torresDisponibles.length > 0 && (
                    <div>
                      <label className="text-3xs uppercase font-bold text-base-content/50 block mb-1">
                        Torre
                      </label>
                      <select
                        value={filtroTorreResidentes}
                        onChange={(e) => {
                          setFiltroTorreResidentes(e.target.value);
                          setPageResidentes(1);
                        }}
                        className="select select-sm text-xs w-full"
                      >
                        <option value="todos">Todas las torres</option>
                        {torresDisponibles.map((t) => (
                          <option key={t} value={t}>Torre {t}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="text-3xs uppercase font-bold text-base-content/50 block mb-1">
                      Condición
                    </label>
                    <select
                      value={filtroCondicionResidente}
                      onChange={(e) => {
                        setFiltroCondicionResidente(e.target.value);
                        setPageResidentes(1);
                      }}
                      className="select select-sm text-xs w-full"
                    >
                      <option value="todos">Todos</option>
                      <option value="propietario">Propietario</option>
                      <option value="arrendatario">Arrendatario</option>
                      <option value="conviviente">Conviviente / Familiar</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-3xs uppercase font-bold text-base-content/50 block mb-1">
                      Grupo Etario
                    </label>
                    <select
                      value={filtroGrupoEtarioResidente}
                      onChange={(e) => {
                        setFiltroGrupoEtarioResidente(e.target.value);
                        setPageResidentes(1);
                      }}
                      className="select select-sm text-xs w-full"
                    >
                      <option value="todos">Todos</option>
                      <option value="menor">🧒 Menores (&lt;18)</option>
                      <option value="adulto">🧑 Adultos (18-59)</option>
                      <option value="adulto_mayor">🧓 Adultos Mayores (60+)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-3xs uppercase font-bold text-base-content/50 block mb-1">
                      Contacto Principal
                    </label>
                    <select
                      value={filtroContactoPrincipal}
                      onChange={(e) => {
                        setFiltroContactoPrincipal(e.target.value);
                        setPageResidentes(1);
                      }}
                      className="select select-sm text-xs w-full"
                    >
                      <option value="todos">Todos</option>
                      <option value="solo_principales">★ Solo Principal</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
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
                    {residentesPaginados.map((r, idx) => (
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
                          <BotoneraAccionesTabla
                            verUrl={`/dashboard/censo/${r.unidadId}`}
                            tituloVer="Ver ficha de la vivienda"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {residentesFiltrados.length > 0 && (
              <Paginacion
                currentPage={pageResidentes}
                totalItems={residentesFiltrados.length}
                itemsPerPage={itemsPerPageResidentes}
                onPageChange={setPageResidentes}
                onItemsPerPageChange={setItemsPerPageResidentes}
              />
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
                    {parqueaderosPaginados.map((p) => {
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
                              <BotoneraAccionesTabla
                                verUrl={`/dashboard/censo/${u._id}`}
                                tituloVer={`Ver ficha de la vivienda (${u.identificador})`}
                              />
                            ) : (
                              <span className="text-xs text-base-content/40 italic">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {parqueaderosFiltrados.length > 0 && (
              <Paginacion
                currentPage={pageParq}
                totalItems={parqueaderosFiltrados.length}
                itemsPerPage={itemsPerPageParq}
                onPageChange={setPageParq}
                onItemsPerPageChange={setItemsPerPageParq}
              />
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
                    {bodegasPaginadas.map((b) => {
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
                              <BotoneraAccionesTabla
                                verUrl={`/dashboard/censo/${u._id}`}
                                tituloVer={`Ver ficha de la vivienda (${u.identificador})`}
                              />
                            ) : (
                              <span className="text-xs text-base-content/40 italic">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {bodegasFiltradas.length > 0 && (
              <Paginacion
                currentPage={pageBodegas}
                totalItems={bodegasFiltradas.length}
                itemsPerPage={itemsPerPageBodegas}
                onPageChange={setPageBodegas}
                onItemsPerPageChange={setItemsPerPageBodegas}
              />
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
                Invitación Censo Residentes
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
              Comparte el enlace o código QR para que los residentes registren su censo y adjunten sus documentos de forma segura.
            </p>

            {/* Generador de Invitación con Caducidad */}
            <div className="bg-base-200/50 p-3 rounded-lg border border-base-200 text-left space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-base-content flex items-center gap-1.5">
                  <span className="icon-[tabler--shield-lock] text-primary" />
                  Enlace Seguro (7 días)
                </span>
                <button
                  type="button"
                  onClick={generarInvitacionSegura}
                  disabled={generandoInvite}
                  className="btn btn-2xs btn-primary gap-1"
                >
                  <span className="icon-[tabler--refresh] text-xs" />
                  {generandoInvite ? 'Generando...' : inviteToken ? 'Regenerar' : 'Crear Enlace'}
                </button>
              </div>

              {inviteToken ? (
                <div className="space-y-1">
                  <div className="text-2xs text-success font-medium flex items-center gap-1">
                    <span className="icon-[tabler--clock-check]" />
                    Token activo • Expira el {inviteExpira}
                  </div>
                  <div className="text-3xs text-base-content/60 font-mono truncate bg-base-100 p-1.5 rounded border border-base-200">
                    {typeof window !== 'undefined' ? `${window.location.origin}/censo/invitacion/${inviteToken}` : ''}
                  </div>
                </div>
              ) : (
                <p className="text-3xs text-base-content/60">
                  Genera un enlace protegido con token único y vencimiento en 7 días para enviar por WhatsApp o correo.
                </p>
              )}
            </div>

            {qrUrl && (
              <div className="p-3 bg-white rounded-lg border border-base-200 inline-block mx-auto shadow-xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrUrl} alt="QR Censo" className="w-44 h-44 sm:w-52 sm:h-52 mx-auto" />
              </div>
            )}

            <div className="space-y-2">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  `Estimado residente, le compartimos el formulario oficial de censo de ${edificio?.nombre || 'la copropiedad'}. Por favor complete su información y adjunte los documentos en el siguiente enlace seguro: ${
                    inviteToken && typeof window !== 'undefined'
                      ? `${window.location.origin}/censo/invitacion/${inviteToken}`
                      : publicCensusUrl
                  }`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-sm btn-success text-white w-full gap-2"
              >
                <span className="icon-[tabler--brand-whatsapp] text-base" />
                Compartir por WhatsApp
              </a>

              <button
                onClick={copiarLink}
                className="btn btn-sm btn-outline btn-primary w-full gap-2"
              >
                <span className={`icon-[tabler--${copied ? 'check' : 'copy'}] text-base`} />
                {copied ? '¡Enlace copiado!' : 'Copiar Enlace'}
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
