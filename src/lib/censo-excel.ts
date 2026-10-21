import * as XLSX from 'xlsx';

export interface ImportarInmuebleItem {
  torre?: string;
  numeroApto: string;
  piso?: number;
  cuartos?: number;
  banos?: number;
  tieneBalcon?: boolean;
  metrosCuadrados?: number;
  tienePatio?: boolean;
  coeficiente?: number;
  tipoOcupacion?: 'habitada' | 'desocupada';
}

export interface ImportarParqueaderoItem {
  numeroParqueadero: string;
  torreAsignada?: string;
  aptoAsignado?: string;
  esVisitante?: boolean;
  tipo?: string;
  esCubierto?: boolean;
}

export interface ImportarBodegaItem {
  numeroBodega: string;
  torreAsignada?: string;
  aptoAsignado?: string;
  ubicacion?: string;
  metrosCuadrados?: number;
}

export interface ImportarResidenteItem {
  torre?: string;
  apto?: string;
  identificador?: string;
  nombreCompleto: string;
  documento?: string;
  condicion: string;
  esContactoPrincipal?: boolean;
  fechaNacimiento?: string;
  telefono?: string;
  email?: string;
}

export interface ImportarMascotaItem {
  torre?: string;
  apto?: string;
  identificador?: string;
  tipo: string;
  nombre: string;
  raza?: string;
  esPeligroso?: boolean;
  vacunasAlDia?: boolean;
  observaciones?: string;
}

export interface ImportarVehiculoItem {
  torre?: string;
  apto?: string;
  identificador?: string;
  tipo: string;
  placa?: string;
  marca?: string;
  modelo?: string;
  color?: string;
  parqueaEnEdificio?: boolean;
  numeroParqueadero?: string;
}

export interface ParsedCensoExcel {
  inmuebles: ImportarInmuebleItem[];
  parqueaderos: ImportarParqueaderoItem[];
  bodegas: ImportarBodegaItem[];
  residentes: ImportarResidenteItem[];
  mascotas: ImportarMascotaItem[];
  vehiculos: ImportarVehiculoItem[];
  estadisticas: {
    totalInmuebles: number;
    totalParqueaderos: number;
    parqueaderosPrivados: number;
    parqueaderosVisitantes: number;
    totalBodegas: number;
    totalResidentes: number;
    totalMascotas: number;
    totalVehiculos: number;
  };
  errores: string[];
  advertencias: string[];
}

export type CampoCensoDestino =
  | 'numeroApto'
  | 'torre'
  | 'coeficiente'
  | 'nombrePropietario'
  | 'residentes'
  | 'documento'
  | 'edad'
  | 'fechaNacimiento'
  | 'email'
  | 'telefono'
  | 'parqueadero'
  | 'placaVehiculo'
  | 'mascota'
  | 'tipoOcupacion'
  | 'cuartos'
  | 'banos'
  | 'metrosCuadrados'
  | 'ignorar';

export interface HojaDetalleAnalizada {
  nombre: string;
  totalFilas: number;
  columnas: string[];
  filasMuestra: Record<string, unknown>[];
  esHojaOperativa: boolean;
}

export interface LibroExcelAnalizado {
  nombreArchivo: string;
  tamanoKb: number;
  hojas: HojaDetalleAnalizada[];
  hojaRecomendada: string;
  hojasOperativasDetectadas: string[];
  esPlantillaOficial: boolean;
  esConsolidadoCopropiedad?: boolean;
  hojasConsolidadoDetectadas?: {
    propietarios?: string;
    autorizados?: string;
    vehiculos?: string;
    mascotas?: string;
    arrendatarios?: string;
  };
}

export interface PersonaPreviewItem {
  nombreCompleto: string;
  condicion: 'propietario' | 'arrendatario' | 'conviviente';
  esContactoPrincipal: boolean;
  documento?: string;
  fechaNacimiento?: string;
  email?: string;
  telefono?: string;
}

export interface FilaSanitizadaPreview {
  id: string;
  filaOriginalNum: number;
  numeroApto: string;
  torre?: string;
  coeficiente?: number;
  tipoOcupacion: 'habitada' | 'desocupada';
  personas: PersonaPreviewItem[];
  emailsExtraidos: string[];
  telefonosExtraidos: string[];
  parqueaderos?: string[];
  vehiculosCount?: number;
  mascotasCount?: number;
  vehiculosResumen?: string[];
  mascotasResumen?: string[];
  estadoValidacion: 'valido' | 'advertencia' | 'error';
  mensajeValidacion?: string;
}

export interface ResultadoTransformacionHoja {
  parsedData: ParsedCensoExcel;
  filasPreview: FilaSanitizadaPreview[];
  advertencias: string[];
  errores: string[];
}

export function parseBoolean(val: unknown): boolean {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val === 1;
  if (typeof val === 'string') {
    const s = val.trim().toLowerCase();
    return s === 'si' || s === 'sí' || s === 'true' || s === 'yes' || s === '1' || s === 's';
  }
  return false;
}

export function parseNumber(val: unknown): number | undefined {
  if (typeof val === 'number') return isNaN(val) ? undefined : val;
  if (typeof val === 'string') {
    const cleaned = val.replace(',', '.').trim();
    if (!cleaned) return undefined;
    const num = parseFloat(cleaned);
    return isNaN(num) ? undefined : num;
  }
  return undefined;
}

export function normalizarTorre(raw?: string): string {
  if (!raw) return '';
  const s = String(raw).trim();
  if (!s) return '';
  if (/^\d+$/.test(s)) return `Torre ${s}`;
  if (s.length === 1 && /^[a-zA-Z]$/.test(s)) return `Torre ${s.toUpperCase()}`;
  return s;
}

export function cleanEmails(text: unknown): string[] {
  if (!text) return [];
  const s = String(text).replace(/\u00a0/g, ' ');
  const matches = s.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
  if (!matches) return [];
  return Array.from(new Set(matches.map((m) => m.trim().toLowerCase())));
}

export function cleanPhones(text: unknown): string[] {
  if (!text) return [];
  const s = String(text).replace(/\u00a0/g, ' ').trim();
  const segments = s.split(/[\/,;\n\r|]|\s+[-–—]\s+|\s+(?:y|e|and|o)\s+/i);
  const result: string[] = [];
  const push = (d: string) => {
    if (d.length >= 7 && d.length <= 15 && !result.includes(d)) result.push(d);
  };
  for (const seg of segments) {
    const trimmed = seg.trim();
    if (!trimmed) continue;
    const digits = trimmed.replace(/\D/g, '');
    if (digits.length >= 7 && digits.length <= 15) {
      const sub = trimmed.split(/[-–—]/);
      if (sub.length === 2 && sub.every((x) => x.replace(/\D/g, '').length >= 7)) {
        sub.forEach((x) => push(x.replace(/\D/g, '')));
      } else {
        push(digits);
      }
    } else if (digits.length > 15) {
      const parts = trimmed.split(/[-–—\s]+/).map((x) => x.replace(/\D/g, ''));
      const valid = parts.filter((d) => d.length >= 7 && d.length <= 15);
      if (valid.length) valid.forEach(push);
      else (trimmed.match(/3\d{9}/g) || []).forEach(push);
    }
  }
  return result;
}

export function splitNamesCompound(text: unknown): string[] {
  if (!text) return [];
  const s = String(text).trim();
  if (s.toLowerCase().includes('desocupado') || s.toLowerCase().includes('vacio') || s.toLowerCase().includes('vacío')) {
    return [];
  }
  return s
    .split(/\s+(?:y|e|&|\/)\s+|,\s*/i)
    .map((n) => n.trim())
    .filter((n) => n.length >= 2);
}

// ---------------------------------------------------------------------------
// 1. ANALIZADOR DE LIBRO EXCEL (MULTI-HOJA)
// ---------------------------------------------------------------------------

export async function analizarLibroExcel(file: File): Promise<LibroExcelAnalizado> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });

  const hojas: HojaDetalleAnalizada[] = [];
  const hojasOperativasDetectadas: string[] = [];

  const operationalKeywords = ['proveedor', 'vigilanc', 'aseo', 'mantenimiento', 'porteria', 'seguridad', 'personal'];
  const residentialKeywords = ['apartamento', 'apto', 'inmueble', 'unidad', 'directorio', 'censo', 'residente'];

  wb.SheetNames.forEach((sheetName) => {
    const ws = wb.Sheets[sheetName];
    const rawData: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
    const cols = rawData.length > 0 ? Object.keys(rawData[0]) : [];
    const esOp = operationalKeywords.some((k) => sheetName.toLowerCase().includes(k));

    if (esOp) {
      hojasOperativasDetectadas.push(sheetName);
    }

    hojas.push({
      nombre: sheetName,
      totalFilas: rawData.length,
      columnas: cols,
      filasMuestra: rawData.slice(0, 3),
      esHojaOperativa: esOp,
    });
  });

  // Identificar si contiene la plantilla oficial ("Inmuebles" o "Unidades")
  const normSheet = (n: string) => n.trim().toLowerCase();
  const esPlantillaOficial = hojas.some(
    (h) => normSheet(h.nombre) === 'inmuebles' || normSheet(h.nombre) === 'unidades',
  );

  // Identificar si es un libro consolidado de copropiedad multi-hoja
  // (combina hojas temáticas: Propietarios, Autorizados, Mascotas, Vehículos, Arrendatarios)
  const hojaProp = hojas.find((h) => /^propietari|^titular|^apartamento|^unidad/i.test(normSheet(h.nombre)));
  const hojaAut = hojas.find((h) => /^autoriz|^residente|^habitante|^conviviente/i.test(normSheet(h.nombre)));
  const hojaVeh = hojas.find((h) => (/vehic|carro|moto/i.test(normSheet(h.nombre)) || /\bauto\b|\bautomov/i.test(normSheet(h.nombre))) && !normSheet(h.nombre).includes('autoriz'));
  const hojaMas = hojas.find((h) => /^mascot|^animal/i.test(normSheet(h.nombre)));
  const hojaArr = hojas.find((h) => /^arrend|^inquilin/i.test(normSheet(h.nombre)));

  const entidadesCopropiedadCount = [hojaProp, hojaAut, hojaVeh, hojaMas, hojaArr].filter(Boolean).length;
  const esConsolidadoCopropiedad = entidadesCopropiedadCount >= 2;

  const hojasConsolidadoDetectadas = esConsolidadoCopropiedad
    ? {
        propietarios: hojaProp?.nombre,
        autorizados: hojaAut?.nombre,
        vehiculos: hojaVeh?.nombre,
        mascotas: hojaMas?.nombre,
        arrendatarios: hojaArr?.nombre,
      }
    : undefined;

  // Determinar la hoja recomendada
  let hojaRecomendada = '';
  if (esPlantillaOficial) {
    const official = hojas.find(
      (h) => normSheet(h.nombre) === 'inmuebles' || normSheet(h.nombre) === 'unidades',
    );
    hojaRecomendada = official?.nombre || wb.SheetNames[0];
  } else if (esConsolidadoCopropiedad && hojaProp) {
    hojaRecomendada = hojaProp.nombre;
  } else {
    // Buscar hoja que contenga palabras clave residenciales y no sea operativa
    const candidata = hojas.find(
      (h) => !h.esHojaOperativa && residentialKeywords.some((k) => h.nombre.toLowerCase().includes(k)),
    );
    if (candidata) {
      hojaRecomendada = candidata.nombre;
    } else {
      // Tomar la primera hoja no operativa que tenga filas
      const noOp = hojas.find((h) => !h.esHojaOperativa && h.totalFilas > 0);
      hojaRecomendada = noOp ? noOp.nombre : wb.SheetNames[0] || '';
    }
  }

  return {
    nombreArchivo: file.name,
    tamanoKb: Math.round((file.size / 1024) * 10) / 10,
    hojas,
    hojaRecomendada,
    hojasOperativasDetectadas,
    esPlantillaOficial,
    esConsolidadoCopropiedad,
    hojasConsolidadoDetectadas,
  };
}

// ---------------------------------------------------------------------------
// 2. SUGERENCIA HEURÍSTICA DE MAPEO DE COLUMNAS
// ---------------------------------------------------------------------------

export function sugerirMapeoColumnas(columnas: string[]): Record<string, CampoCensoDestino> {
  const mapeo: Record<string, CampoCensoDestino> = {};

  const clean = (col: string) =>
    col
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');

  const matches = (c: string, targets: string[]) => {
    const cl = clean(c);
    return targets.some((t) => cl === clean(t) || cl.startsWith(clean(t)) || cl.includes(clean(t)));
  };

  const assignedTargets = new Set<CampoCensoDestino>();

  columnas.forEach((col) => {
    const colTrimmed = col.trim();
    if (!colTrimmed) return;

    // 1. Número de Apto / Casa
    if (!assignedTargets.has('numeroApto') && matches(colTrimmed, ['apto', 'apartamento', 'aptocasa', 'casa', 'inmueble', 'numero', 'unidad', 'nro'])) {
      mapeo[colTrimmed] = 'numeroApto';
      assignedTargets.add('numeroApto');
      return;
    }

    // 2. Coeficiente
    if (!assignedTargets.has('coeficiente') && matches(colTrimmed, ['coef', 'coeficiente', 'participacion', 'alicuota'])) {
      mapeo[colTrimmed] = 'coeficiente';
      assignedTargets.add('coeficiente');
      return;
    }

    // 3. Torre
    if (!assignedTargets.has('torre') && matches(colTrimmed, ['torre', 'bloque', 'manzana', 'edificio'])) {
      mapeo[colTrimmed] = 'torre';
      assignedTargets.add('torre');
      return;
    }

    // 4. Parqueadero Asignado
    if (!assignedTargets.has('parqueadero') && matches(colTrimmed, ['parqueadero', 'garaje', 'estacionamiento', 'numparqueadero', 'pq'])) {
      mapeo[colTrimmed] = 'parqueadero';
      assignedTargets.add('parqueadero');
      return;
    }

    // 5. Correo
    if (!assignedTargets.has('email') && matches(colTrimmed, ['correo', 'correos', 'email', 'mail'])) {
      mapeo[colTrimmed] = 'email';
      assignedTargets.add('email');
      return;
    }

    // 6. Teléfono
    if (!assignedTargets.has('telefono') && matches(colTrimmed, ['telefono', 'telefonos', 'celular', 'cel', 'movil', 'tel'])) {
      mapeo[colTrimmed] = 'telefono';
      assignedTargets.add('telefono');
      return;
    }

    // 7. Nombre / Propietario
    if (!assignedTargets.has('nombrePropietario') && matches(colTrimmed, ['propietario', 'propietarios', 'dueno', 'titular', 'nombre', 'nombrecompleto'])) {
      mapeo[colTrimmed] = 'nombrePropietario';
      assignedTargets.add('nombrePropietario');
      return;
    }

    // 8. Residentes
    if (!assignedTargets.has('residentes') && matches(colTrimmed, ['residentes', 'residente', 'autorizados', 'habitantes', 'inquilinos', 'arrendatarios'])) {
      mapeo[colTrimmed] = 'residentes';
      assignedTargets.add('residentes');
      return;
    }

    // 9. Documento / Cédula / Identificación
    if (!assignedTargets.has('documento') && matches(colTrimmed, ['documento', 'cedula', 'identificacion', 'cc', 'nit', 'doc', 'id'])) {
      mapeo[colTrimmed] = 'documento';
      assignedTargets.add('documento');
      return;
    }

    // 10. Edad
    if (!assignedTargets.has('edad') && matches(colTrimmed, ['edad', 'age', 'anios', 'anos'])) {
      mapeo[colTrimmed] = 'edad';
      assignedTargets.add('edad');
      return;
    }

    // 11. Fecha de Nacimiento
    if (!assignedTargets.has('fechaNacimiento') && matches(colTrimmed, ['fechanacimiento', 'nacimiento', 'fechanac', 'cumpleanos'])) {
      mapeo[colTrimmed] = 'fechaNacimiento';
      assignedTargets.add('fechaNacimiento');
      return;
    }

    // 12. Ocupación
    if (!assignedTargets.has('tipoOcupacion') && matches(colTrimmed, ['ocupacion', 'estadoocupacion', 'tipoocupacion'])) {
      mapeo[colTrimmed] = 'tipoOcupacion';
      assignedTargets.add('tipoOcupacion');
      return;
    }

    // 13. Cuartos
    if (!assignedTargets.has('cuartos') && matches(colTrimmed, ['cuartos', 'habitaciones', 'alcobas', 'hab'])) {
      mapeo[colTrimmed] = 'cuartos';
      assignedTargets.add('cuartos');
      return;
    }

    // 14. Baños
    if (!assignedTargets.has('banos') && matches(colTrimmed, ['banos', 'bano'])) {
      mapeo[colTrimmed] = 'banos';
      assignedTargets.add('banos');
      return;
    }

    // 15. Metros
    if (!assignedTargets.has('metrosCuadrados') && matches(colTrimmed, ['metros', 'm2', 'area', 'superficie'])) {
      mapeo[colTrimmed] = 'metrosCuadrados';
      assignedTargets.add('metrosCuadrados');
      return;
    }

    // 16. Placa / Vehículo
    if (!assignedTargets.has('placaVehiculo') && matches(colTrimmed, ['placa', 'placas', 'vehiculo', 'vehiculos', 'carro', 'moto'])) {
      mapeo[colTrimmed] = 'placaVehiculo';
      assignedTargets.add('placaVehiculo');
      return;
    }

    // 17. Mascota
    if (!assignedTargets.has('mascota') && matches(colTrimmed, ['mascota', 'mascotas', 'perro', 'gato', 'animal'])) {
      mapeo[colTrimmed] = 'mascota';
      assignedTargets.add('mascota');
      return;
    }

    mapeo[colTrimmed] = 'ignorar';
  });

  return mapeo;
}

// ---------------------------------------------------------------------------
// 3. PIPELINE DE TRANSFORMACIÓN, DESDOBLAMIENTO Y SANITIZACIÓN EN MEMORIA
// ---------------------------------------------------------------------------

export function transformarHojaExcel(
  rawRows: Record<string, unknown>[],
  mapeo: Record<string, CampoCensoDestino>,
): ResultadoTransformacionHoja {
  const advertencias: string[] = [];
  const errores: string[] = [];
  const parqueaderosExtraidos: ImportarParqueaderoItem[] = [];
  const vehiculosExtraidos: ImportarVehiculoItem[] = [];
  const mascotasExtraidas: ImportarMascotaItem[] = [];

  // Mapa de unidades consolidadas por clave única (torre + apto)
  const unidadesMap = new Map<
    string,
    {
      filaOriginalNum: number;
      rawApto: string;
      torre?: string;
      coeficiente?: number;
      tipoOcupacion: 'habitada' | 'desocupada';
      cuartos?: number;
      banos?: number;
      metrosCuadrados?: number;
      personas: PersonaPreviewItem[];
      emailsExtraidos: string[];
      telefonosExtraidos: string[];
      parqueaderos: string[];
      vehiculos: string[];
      mascotas: string[];
    }
  >();

  rawRows.forEach((row, idx) => {
    const filaNum = idx + 2;

    // Obtener valor según el campo mapeado (búsqueda insensible a espacios en cabeceras)
    const getMappedVal = (target: CampoCensoDestino): unknown => {
      for (const [colName, mappedTarget] of Object.entries(mapeo)) {
        if (mappedTarget === target) {
          if (row[colName] !== undefined && row[colName] !== '') return row[colName];
          const trimmedKey = Object.keys(row).find((k) => k.trim().toLowerCase() === colName.trim().toLowerCase());
          if (trimmedKey && row[trimmedKey] !== undefined && row[trimmedKey] !== '') return row[trimmedKey];
        }
      }
      return undefined;
    };

    const rawApto = String(getMappedVal('numeroApto') || '').trim();

    // 1. Omitir filas vacías o de sumatoria total
    if (!rawApto) {
      const rowText = Object.values(row).join(' ').toLowerCase();
      if (rowText.includes('total') || rowText.includes('suma')) {
        advertencias.push(`Fila ${filaNum}: Omitida automáticamente por identificarse como fila de sumatoria/total.`);
      }
      return;
    }

    // 2. Extraer y normalizar Torre
    let torre = String(getMappedVal('torre') || '').trim();
    if (!torre) {
      if (/^[1-9]\d{3}$/.test(rawApto)) {
        torre = `Torre ${rawApto[0]}`;
      }
    } else {
      torre = normalizarTorre(torre);
    }

    const unitKey = `${normalizarTorre(torre).toLowerCase()}___${rawApto.toLowerCase()}`;

    // 3. Extraer y normalizar Coeficiente
    const rawCoef = parseNumber(getMappedVal('coeficiente'));
    let coeficiente: number | undefined = undefined;
    if (rawCoef !== undefined) {
      coeficiente = rawCoef > 1 ? Math.round((rawCoef / 100) * 100000) / 100000 : rawCoef;
    }

    // 4. Estado de Ocupación
    const rawOcupacion = String(getMappedVal('tipoOcupacion') || '').toLowerCase();
    const rawResidentesText = String(getMappedVal('residentes') || '');
    const isDesocupado =
      rawOcupacion.includes('desoc') ||
      rawResidentesText.toLowerCase().includes('desocupado') ||
      rawResidentesText.toLowerCase().includes('vacio') ||
      rawResidentesText.toLowerCase().includes('vacío');
    const tipoOcupacion: 'habitada' | 'desocupada' = isDesocupado ? 'desocupada' : 'habitada';

    // 5. Extracción de Correos, Teléfonos y Documento
    const emailsFila = cleanEmails(getMappedVal('email'));
    const telefonosFila = cleanPhones(getMappedVal('telefono'));
    const rawDocumento = String(getMappedVal('documento') || '').trim() || undefined;

    // Fecha de Nacimiento o Edad
    const rawFechaNacVal = getMappedVal('fechaNacimiento');
    let fechaNacExtraida: string | undefined = undefined;
    if (rawFechaNacVal instanceof Date) {
      fechaNacExtraida = rawFechaNacVal.toISOString().split('T')[0];
    } else if (typeof rawFechaNacVal === 'number') {
      const parsedDate = XLSX.SSF.parse_date_code(rawFechaNacVal);
      if (parsedDate) {
        fechaNacExtraida = `${parsedDate.y}-${String(parsedDate.m).padStart(2, '0')}-${String(parsedDate.d).padStart(2, '0')}`;
      }
    } else if (typeof rawFechaNacVal === 'string' && rawFechaNacVal.trim()) {
      const trimmed = rawFechaNacVal.trim();
      const matchDMY = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
      if (matchDMY) {
        const [, d, mStr, y] = matchDMY;
        fechaNacExtraida = `${y}-${mStr.padStart(2, '0')}-${d.padStart(2, '0')}`;
      } else {
        fechaNacExtraida = trimmed;
      }
    }

    const rawEdad = parseNumber(getMappedVal('edad'));
    if (!fechaNacExtraida && rawEdad !== undefined && rawEdad >= 0 && rawEdad <= 120) {
      const currentYear = new Date().getFullYear();
      const birthYear = currentYear - Math.floor(rawEdad);
      fechaNacExtraida = `${birthYear}-01-01`;
    }

    // Parqueadero asignado en la fila
    const rawParq = String(getMappedVal('parqueadero') || '').trim();

    // Desdoblamiento de Personas
    const rawPropietarioText = String(getMappedVal('nombrePropietario') || '');
    const ownerNames = splitNamesCompound(rawPropietarioText);
    const residentNames = isDesocupado ? [] : splitNamesCompound(rawResidentesText);

    // Si la unidad no existía aún en el mapa, inicializarla
    if (!unidadesMap.has(unitKey)) {
      unidadesMap.set(unitKey, {
        filaOriginalNum: filaNum,
        rawApto,
        torre: torre || undefined,
        coeficiente,
        tipoOcupacion,
        cuartos: parseNumber(getMappedVal('cuartos')),
        banos: parseNumber(getMappedVal('banos')),
        metrosCuadrados: parseNumber(getMappedVal('metrosCuadrados')),
        personas: [],
        emailsExtraidos: [],
        telefonosExtraidos: [],
        parqueaderos: [],
        vehiculos: [],
        mascotas: [],
      });
    }

    const unidad = unidadesMap.get(unitKey)!;

    // Completar datos físicos si la primera fila no los tenía
    if (coeficiente !== undefined && unidad.coeficiente === undefined) unidad.coeficiente = coeficiente;
    if (rawParq && !unidad.parqueaderos.includes(rawParq)) {
      unidad.parqueaderos.push(rawParq);
      parqueaderosExtraidos.push({
        numeroParqueadero: rawParq,
        torreAsignada: torre || undefined,
        aptoAsignado: rawApto,
        tipo: 'carro',
        esCubierto: true,
      });
    }

    // Placa / Vehículo mapeado en la fila
    const rawPlaca = String(getMappedVal('placaVehiculo') || '').trim();
    if (rawPlaca && !['no', 'ninguno', 'ninguna', '0', 'sn', 's/n', 'n/a', '-'].includes(rawPlaca.toLowerCase())) {
      const placaLimpia = rawPlaca.toUpperCase().replace(/[\s\-]/g, '');
      const tipoVeh = rawPlaca.toLowerCase().includes('moto') ? 'moto' : 'carro';
      if (!unidad.vehiculos.includes(placaLimpia)) {
        unidad.vehiculos.push(placaLimpia);
        vehiculosExtraidos.push({
          torre: torre || undefined,
          apto: rawApto,
          tipo: tipoVeh,
          placa: placaLimpia,
          parqueaEnEdificio: true,
        });
      }
    }

    // Mascota mapeada en la fila
    const rawMasc = String(getMappedVal('mascota') || '').trim();
    if (rawMasc && !['no', 'ninguno', 'ninguna', '0', 'sin mascota', 'n/a', '-'].includes(rawMasc.toLowerCase())) {
      const tipoMasc = rawMasc.toLowerCase().includes('gato') || rawMasc.toLowerCase().includes('felin') ? 'gato' : 'perro';
      if (!unidad.mascotas.includes(rawMasc)) {
        unidad.mascotas.push(rawMasc);
        mascotasExtraidas.push({
          torre: torre || undefined,
          apto: rawApto,
          tipo: tipoMasc,
          nombre: rawMasc,
          raza: 'No especificada',
        });
      }
    }

    // Acumular correos y teléfonos
    emailsFila.forEach((em) => {
      if (!unidad.emailsExtraidos.includes(em)) unidad.emailsExtraidos.push(em);
    });
    telefonosFila.forEach((tel) => {
      if (!unidad.telefonosExtraidos.includes(tel)) unidad.telefonosExtraidos.push(tel);
    });

    let emailIdx = 0;
    let telIdx = 0;

    // Agregar propietarios
    ownerNames.forEach((n) => {
      const yaExiste = unidad.personas.some((p) => p.nombreCompleto.toLowerCase() === n.toLowerCase());
      if (!yaExiste) {
        let esMenor = false;
        if (fechaNacExtraida) {
          const nac = new Date(fechaNacExtraida);
          if (!isNaN(nac.getTime()) && new Date().getFullYear() - nac.getFullYear() < 18) {
            esMenor = true;
          }
        }
        const condicion = esMenor ? 'conviviente' : 'propietario';
        const esPrimerContacto = !esMenor && unidad.personas.length === 0;
        unidad.personas.push({
          nombreCompleto: n,
          condicion,
          esContactoPrincipal: esPrimerContacto,
          documento: rawDocumento,
          fechaNacimiento: fechaNacExtraida,
          email: emailsFila[emailIdx++] || undefined,
          telefono: telefonosFila[telIdx++] || undefined,
        });
      }
    });

    // Agregar residentes
    residentNames.forEach((n) => {
      const yaExiste = unidad.personas.some((p) => p.nombreCompleto.toLowerCase() === n.toLowerCase());
      if (!yaExiste) {
        const esPrimerContacto = unidad.personas.length === 0;
        unidad.personas.push({
          nombreCompleto: n,
          condicion: 'conviviente',
          esContactoPrincipal: esPrimerContacto,
          documento: rawDocumento,
          fechaNacimiento: fechaNacExtraida,
          email: emailsFila[emailIdx++] || undefined,
          telefono: telefonosFila[telIdx++] || undefined,
        });
      }
    });

    // Si no hubo nombres pero hay emails o teléfonos, y la unidad aún no tiene personas
    if (unidad.personas.length === 0 && !isDesocupado && (emailsFila.length > 0 || telefonosFila.length > 0)) {
      unidad.personas.push({
        nombreCompleto: `Residente Apto ${rawApto}`,
        condicion: 'conviviente',
        esContactoPrincipal: true,
        documento: rawDocumento,
        fechaNacimiento: fechaNacExtraida,
        email: emailsFila[0],
        telefono: telefonosFila[0],
      });
    }
  });

  // Construir inmuebles, residentes y filasPreview finales a partir del mapa consolidado
  const inmuebles: ImportarInmuebleItem[] = [];
  const residentes: ImportarResidenteItem[] = [];
  const filasPreview: FilaSanitizadaPreview[] = [];

  for (const [key, unidad] of unidadesMap.entries()) {
    // Garantizar que EXACTAMENTE un adulto sea contacto principal y ningún menor quede como propietario
    let tienePrincipal = false;
    unidad.personas.forEach((p) => {
      let esMenor = false;
      if (p.fechaNacimiento) {
        const nac = new Date(p.fechaNacimiento);
        if (!isNaN(nac.getTime()) && new Date().getFullYear() - nac.getFullYear() < 18) {
          esMenor = true;
        }
      }
      if (esMenor) {
        p.condicion = 'conviviente';
        p.esContactoPrincipal = false;
      } else if (p.esContactoPrincipal) {
        if (!tienePrincipal) tienePrincipal = true;
        else p.esContactoPrincipal = false;
      }
    });
    if (!tienePrincipal && unidad.personas.length > 0) {
      const primerAdulto = unidad.personas.find((p) => {
        if (!p.fechaNacimiento) return true;
        const nac = new Date(p.fechaNacimiento);
        return isNaN(nac.getTime()) || new Date().getFullYear() - nac.getFullYear() >= 18;
      });
      if (primerAdulto) {
        primerAdulto.esContactoPrincipal = true;
      } else {
        unidad.personas[0].esContactoPrincipal = true;
      }
    }

    inmuebles.push({
      torre: unidad.torre,
      numeroApto: unidad.rawApto,
      coeficiente: unidad.coeficiente,
      tipoOcupacion: unidad.tipoOcupacion,
      cuartos: unidad.cuartos,
      banos: unidad.banos,
      metrosCuadrados: unidad.metrosCuadrados,
    });

    unidad.personas.forEach((p) => {
      residentes.push({
        torre: unidad.torre,
        apto: unidad.rawApto,
        nombreCompleto: p.nombreCompleto,
        documento: p.documento,
        condicion: p.condicion,
        esContactoPrincipal: p.esContactoPrincipal,
        fechaNacimiento: p.fechaNacimiento,
        email: p.email,
        telefono: p.telefono,
      });
    });

    let estadoValidacion: 'valido' | 'advertencia' | 'error' = 'valido';
    let mensajeValidacion = '';

    if (!unidad.rawApto) {
      estadoValidacion = 'error';
      mensajeValidacion = 'Falta número de apartamento';
    } else if (unidad.personas.length === 0 && unidad.tipoOcupacion !== 'desocupada') {
      estadoValidacion = 'advertencia';
      mensajeValidacion = 'Sin residentes identificados';
    } else if (unidad.emailsExtraidos.length === 0 && unidad.telefonosExtraidos.length === 0) {
      estadoValidacion = 'advertencia';
      mensajeValidacion = 'Sin datos de contacto';
    }

    filasPreview.push({
      id: `preview-${key}`,
      filaOriginalNum: unidad.filaOriginalNum,
      numeroApto: unidad.rawApto,
      torre: unidad.torre,
      coeficiente: unidad.coeficiente,
      tipoOcupacion: unidad.tipoOcupacion,
      personas: unidad.personas,
      emailsExtraidos: unidad.emailsExtraidos,
      telefonosExtraidos: unidad.telefonosExtraidos,
      parqueaderos: unidad.parqueaderos,
      vehiculosCount: unidad.vehiculos.length,
      mascotasCount: unidad.mascotas.length,
      vehiculosResumen: unidad.vehiculos,
      mascotasResumen: unidad.mascotas,
      estadoValidacion,
      mensajeValidacion,
    });
  }

  if (inmuebles.length === 0) {
    errores.push('No se pudieron extraer unidades residenciales válidas de la hoja seleccionada.');
  }

  const parsedData: ParsedCensoExcel = {
    inmuebles,
    parqueaderos: parqueaderosExtraidos,
    bodegas: [],
    residentes,
    mascotas: mascotasExtraidas,
    vehiculos: vehiculosExtraidos,
    estadisticas: {
      totalInmuebles: inmuebles.length,
      totalParqueaderos: parqueaderosExtraidos.length,
      parqueaderosPrivados: parqueaderosExtraidos.length,
      parqueaderosVisitantes: 0,
      totalBodegas: 0,
      totalResidentes: residentes.length,
      totalMascotas: mascotasExtraidas.length,
      totalVehiculos: vehiculosExtraidos.length,
    },
    errores,
    advertencias,
  };

  return {
    parsedData,
    filasPreview,
    advertencias,
    errores,
  };
}

// ---------------------------------------------------------------------------
// 4. PARSER UNIVERSAL (COMPATIBLE CON PLANTILLAS OFICIALES Y ARCHIVOS LIBRES)
// ---------------------------------------------------------------------------

export async function parsearExcelCenso(file: File): Promise<ParsedCensoExcel> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });

  const errores: string[] = [];
  const advertencias: string[] = [];
  const sheetNames = wb.SheetNames;

  // Buscar hoja oficial de inmuebles
  const nombreHojaInmuebles = sheetNames.find(
    (name) => name.trim().toLowerCase() === 'inmuebles' || name.trim().toLowerCase() === 'unidades',
  );

  // Si NO contiene la hoja oficial, evaluar si es libro consolidado de copropiedad o directorio libre
  if (!nombreHojaInmuebles) {
    const libroAnalizado = await analizarLibroExcel(file);

    // Caso 1: Consolidado de Copropiedad Multi-hoja (ej: TEKA con PROPIETARIOS, AUTORIZADOS, MASCOTAS, VEHICULOS, ARRENDATARIOS)
    if (libroAnalizado.esConsolidadoCopropiedad && libroAnalizado.hojasConsolidadoDetectadas) {
      const { propietarios, autorizados, vehiculos: vehSheetName, mascotas: masSheetName, arrendatarios: arrSheetName } =
        libroAnalizado.hojasConsolidadoDetectadas;

      const baseHoja = propietarios || libroAnalizado.hojaRecomendada;
      const wsBase = wb.Sheets[baseHoja];
      const rawBase: Record<string, unknown>[] = XLSX.utils.sheet_to_json(wsBase, { defval: '' });
      const colsBase = rawBase.length > 0 ? Object.keys(rawBase[0]) : [];
      const mapeoBase = sugerirMapeoColumnas(colsBase);
      const resBase = transformarHojaExcel(rawBase, mapeoBase);

      const inmuebles = [...resBase.parsedData.inmuebles];
      const residentes = [...resBase.parsedData.residentes];
      const parqueaderos = [...resBase.parsedData.parqueaderos];
      const vehiculos: ImportarVehiculoItem[] = [];
      const mascotas: ImportarMascotaItem[] = [];
      const bodegas: ImportarBodegaItem[] = [];

      const getColVal = (row: Record<string, unknown>, patterns: string[]): unknown => {
        for (const p of patterns) {
          const foundKey = Object.keys(row).find(
            (k) => k.trim().toLowerCase() === p.toLowerCase() || k.trim().toLowerCase().includes(p.toLowerCase()),
          );
          if (foundKey && row[foundKey] !== undefined && row[foundKey] !== '') {
            return row[foundKey];
          }
        }
        return undefined;
      };

      // Ingerir Autorizados / Residentes Adicionales
      if (autorizados && wb.Sheets[autorizados]) {
        const rawAut: Record<string, unknown>[] = XLSX.utils.sheet_to_json(wb.Sheets[autorizados], { defval: '' });
        rawAut.forEach((r) => {
          const nom = String(getColVal(r, ['AUTORIZADOS', 'AUTORIZADO', 'RESIDENTE', 'NOMBRE']) || '').trim();
          const rawApto = String(getColVal(r, ['APTO', 'APARTAMENTO', 'NUMERO']) || '').trim();
          const rawTorre = normalizarTorre(String(getColVal(r, ['TORRE']) || ''));
          if (!nom || !rawApto) return;

          const doc = String(getColVal(r, ['IDENTIFICACION', 'CEDULA', 'DOCUMENTO']) || '').trim() || undefined;
          const tels = cleanPhones(getColVal(r, ['TELEFONO', 'CELULAR']));
          const edad = parseNumber(getColVal(r, ['EDAD']));
          let fechaNac: string | undefined = undefined;
          if (edad !== undefined && edad >= 0 && edad <= 120) {
            fechaNac = `${new Date().getFullYear() - Math.floor(edad)}-01-01`;
          }

          const yaExiste = residentes.some(
            (res) =>
              (res.apto || '').toLowerCase() === rawApto.toLowerCase() &&
              normalizarTorre(res.torre).toLowerCase() === rawTorre.toLowerCase() &&
              res.nombreCompleto.toLowerCase() === nom.toLowerCase(),
          );

          if (!yaExiste) {
            residentes.push({
              torre: rawTorre || undefined,
              apto: rawApto,
              nombreCompleto: nom,
              documento: doc,
              condicion: 'conviviente',
              esContactoPrincipal: false,
              fechaNacimiento: fechaNac,
              telefono: tels[0] || undefined,
            });
          }
        });
      }

      // Ingerir Vehículos
      if (vehSheetName && wb.Sheets[vehSheetName]) {
        const rawVeh: Record<string, unknown>[] = XLSX.utils.sheet_to_json(wb.Sheets[vehSheetName], { defval: '' });
        rawVeh.forEach((r) => {
          const rawApto = String(getColVal(r, ['APTO', 'APARTAMENTO']) || '').trim();
          const rawTorre = normalizarTorre(String(getColVal(r, ['TORRE']) || ''));
          const rawTipo = String(getColVal(r, ['VEHICULO', 'TIPO']) || '').trim().toLowerCase();
          let rawPlaca = String(getColVal(r, ['PLACAS', 'PLACA']) || '').trim().toUpperCase().replace(/[\s\-]/g, '');
          const marca = String(getColVal(r, ['MARCA']) || '').trim() || undefined;
          const color = String(getColVal(r, ['COLOR']) || '').trim() || undefined;

          if (!rawApto) return;
          // Si no tiene placa ni tipo ni marca ni color (fila vacía o sólo número de apto)
          if (!rawPlaca && !rawTipo && !marca && !color) return;

          // Detección inteligente si la placa quedó en columna color o marca
          if (!rawPlaca && color && /^[A-Z]{3}\-?[0-9]{2}[0-9A-Z]?$/i.test(color.trim())) {
            rawPlaca = color.trim().toUpperCase().replace(/[\s\-]/g, '');
          } else if (!rawPlaca && marca && /^[A-Z]{3}\-?[0-9]{2}[0-9A-Z]?$/i.test(marca.trim())) {
            rawPlaca = marca.trim().toUpperCase().replace(/[\s\-]/g, '');
          }

          const tipoNorm = rawTipo.includes('moto') ? 'moto' : rawTipo.includes('bici') ? 'bicicleta' : 'carro';
          let placaFinal = rawPlaca;
          if (placaFinal.length >= 3 && placaFinal.length <= 10) {
            // Placa directa válida
          } else if (placaFinal.length > 10) {
            placaFinal = placaFinal.slice(0, 10);
          } else if (tipoNorm === 'bicicleta') {
            placaFinal = 'BIC-SN';
          } else if (tipoNorm === 'moto') {
            placaFinal = `MOT-SN-${rawApto}`.slice(0, 10);
          } else if (marca || color) {
            placaFinal = `VEH-SN-${rawApto}`.slice(0, 10);
          } else {
            return;
          }

          vehiculos.push({
            torre: rawTorre || undefined,
            apto: rawApto,
            tipo: tipoNorm,
            placa: placaFinal,
            marca,
            color,
            parqueaEnEdificio: true,
          });
        });
      }

      // Ingerir Mascotas
      if (masSheetName && wb.Sheets[masSheetName]) {
        const rawMas: Record<string, unknown>[] = XLSX.utils.sheet_to_json(wb.Sheets[masSheetName], { defval: '' });
        rawMas.forEach((r) => {
          const rawApto = String(getColVal(r, ['APTO', 'APARTAMENTO']) || '').trim();
          const rawTorre = normalizarTorre(String(getColVal(r, ['TORRE']) || ''));
          const rawTipo = String(getColVal(r, ['MASCOTAS', 'MASCOTA', 'TIPO']) || '').trim().toLowerCase();
          const nombre = String(getColVal(r, ['NOMBRE']) || '').trim();
          const raza = String(getColVal(r, ['RAZA']) || '').trim() || undefined;
          const carnet = String(getColVal(r, ['CARNET DE VACUNAS', 'VACUNAS']) || '').toLowerCase();

          if (!rawApto || (!nombre && !rawTipo)) return;

          const tipoNorm = rawTipo.includes('gato') || rawTipo.includes('felin')
            ? 'gato'
            : rawTipo.includes('perr') || rawTipo.includes('can')
              ? 'perro'
              : 'perro';

          mascotas.push({
            torre: rawTorre || undefined,
            apto: rawApto,
            tipo: tipoNorm,
            nombre: nombre || `Mascota ${tipoNorm}`,
            raza: raza || 'No especificada',
            vacunasAlDia: carnet.includes('al dia') || carnet.includes('si') || carnet.includes('al día'),
          });
        });
      }

      // Ingerir Arrendatarios
      if (arrSheetName && wb.Sheets[arrSheetName]) {
        const rawArr: Record<string, unknown>[] = XLSX.utils.sheet_to_json(wb.Sheets[arrSheetName], { defval: '' });
        rawArr.forEach((r) => {
          const rawApto = String(getColVal(r, ['APTO', 'APARTAMENTO']) || '').trim();
          const rawTorre = normalizarTorre(String(getColVal(r, ['TORRE']) || ''));
          const nombreRes = String(getColVal(r, ['RESIDENTE', 'NOMBRE']) || '').trim();
          const numPq = String(getColVal(r, ['# PQ', 'PQ', 'PARQUEADERO']) || '').trim();
          const rawPlaca = String(getColVal(r, ['PLACAS', 'PLACA']) || '').trim().toUpperCase().replace(/[\s\-]/g, '');

          if (!rawApto) return;

          if (numPq && !parqueaderos.some((p) => p.numeroParqueadero === numPq)) {
            parqueaderos.push({
              numeroParqueadero: numPq,
              torreAsignada: rawTorre || undefined,
              aptoAsignado: rawApto,
              tipo: 'carro',
              esCubierto: true,
            });
          }

          if (rawPlaca && rawPlaca.length >= 5 && rawPlaca.length <= 8) {
            const yaVeh = vehiculos.some((v) => v.placa === rawPlaca);
            if (!yaVeh) {
              vehiculos.push({
                torre: rawTorre || undefined,
                apto: rawApto,
                tipo: 'carro',
                placa: rawPlaca,
                marca: String(getColVal(r, ['MARCA']) || '').trim() || undefined,
                color: String(getColVal(r, ['COLOR']) || '').trim() || undefined,
                parqueaEnEdificio: true,
              });
            }
          }

          if (nombreRes) {
            const doc = String(getColVal(r, ['IDENTIFICACION', 'CEDULA']) || '').trim() || undefined;
            const tels = cleanPhones(getColVal(r, ['TELEFONO', 'CELULAR']));
            const emails = cleanEmails(getColVal(r, ['EMAIL', 'CORREO']));

            const yaExiste = residentes.some(
              (res) =>
                (res.apto || '').toLowerCase() === rawApto.toLowerCase() &&
                normalizarTorre(res.torre).toLowerCase() === rawTorre.toLowerCase() &&
                res.nombreCompleto.toLowerCase() === nombreRes.toLowerCase(),
            );

            if (!yaExiste) {
              residentes.push({
                torre: rawTorre || undefined,
                apto: rawApto,
                nombreCompleto: nombreRes,
                documento: doc,
                condicion: 'arrendatario',
                esContactoPrincipal: false,
                telefono: tels[0] || undefined,
                email: emails[0] || undefined,
              });
            }

            const inm = inmuebles.find(
              (i) => (i.numeroApto || '').toLowerCase() === rawApto.toLowerCase() && normalizarTorre(i.torre).toLowerCase() === rawTorre.toLowerCase(),
            );
            if (inm) inm.tipoOcupacion = 'habitada';
          }
        });
      }

      advertencias.push(
        `Consolidado de copropiedad multi-hoja procesado: ${inmuebles.length} inmuebles únicos, ${residentes.length} personas, ${parqueaderos.length} parqueaderos, ${vehiculos.length} vehículos y ${mascotas.length} mascotas.`,
      );

      return {
        inmuebles,
        parqueaderos,
        bodegas,
        residentes,
        mascotas,
        vehiculos,
        estadisticas: {
          totalInmuebles: inmuebles.length,
          totalParqueaderos: parqueaderos.length,
          parqueaderosPrivados: parqueaderos.length,
          parqueaderosVisitantes: 0,
          totalBodegas: 0,
          totalResidentes: residentes.length,
          totalMascotas: mascotas.length,
          totalVehiculos: vehiculos.length,
        },
        errores: [],
        advertencias,
      };
    }

    // Caso 2: Directorio Libre u Hoja Única
    const hojaObjetivo = libroAnalizado.hojaRecomendada;
    if (!hojaObjetivo) {
      errores.push('El archivo no contiene hojas con información residencial válida.');
      return {
        inmuebles: [],
        parqueaderos: [],
        bodegas: [],
        residentes: [],
        mascotas: [],
        vehiculos: [],
        estadisticas: {
          totalInmuebles: 0,
          totalParqueaderos: 0,
          parqueaderosPrivados: 0,
          parqueaderosVisitantes: 0,
          totalBodegas: 0,
          totalResidentes: 0,
          totalMascotas: 0,
          totalVehiculos: 0,
        },
        errores,
        advertencias,
      };
    }

    const ws = wb.Sheets[hojaObjetivo];
    const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
    const cols = rawRows.length > 0 ? Object.keys(rawRows[0]) : [];
    const mapeo = sugerirMapeoColumnas(cols);

    const resultado = transformarHojaExcel(rawRows, mapeo);
    advertencias.push(
      `Se procesó automáticamente la hoja "${hojaObjetivo}" mediante detección heurística inteligente.`,
    );
    return resultado.parsedData;
  }

  // --- Parsear Plantilla Oficial Tradicional ---
  const wsInmuebles = wb.Sheets[nombreHojaInmuebles];
  const rawInmuebles: Record<string, unknown>[] = XLSX.utils.sheet_to_json(wsInmuebles, { defval: '' });

  const inmuebles: ImportarInmuebleItem[] = [];

  rawInmuebles.forEach((row, idx) => {
    const filaNum = idx + 2;

    const getVal = (claves: string[]): unknown => {
      for (const k of claves) {
        for (const rowKey of Object.keys(row)) {
          if (rowKey.trim().toLowerCase() === k.toLowerCase()) {
            return row[rowKey];
          }
        }
      }
      return undefined;
    };

    const rawTorre = String(getVal(['Torre', 'Bloque', 'Manzana']) || '').trim();
    const torre = normalizarTorre(rawTorre);
    const aptoCasa = String(getVal(['Apto_Casa', 'Apartamento', 'Apto', 'Casa', 'Inmueble', 'Numero']) || '').trim();

    if (!aptoCasa) {
      advertencias.push(`Fila ${filaNum} de Inmuebles: se omitió porque no tiene número de apartamento/casa.`);
      return;
    }

    const piso = parseNumber(getVal(['Piso']));
    const cuartos = parseNumber(getVal(['Cuartos', 'Habitaciones', 'Alcobas']));
    const banos = parseNumber(getVal(['Banos', 'Baños']));
    const tieneBalcon = parseBoolean(getVal(['Tiene_Balcon', 'Balcon', 'Balcón']));
    const metrosCuadrados = parseNumber(getVal(['Metros_Cuadrados', 'MetrosCuadrados', 'Metros', 'M2', 'Area']));
    const tienePatio = parseBoolean(getVal(['Tiene_Patio', 'Patio']));
    const coeficiente = parseNumber(getVal(['Coeficiente']));
    const tipoOcupacionRaw = String(getVal(['Tipo_Ocupacion', 'Ocupacion', 'Estado']) || '').trim().toLowerCase();
    const tipoOcupacion: 'habitada' | 'desocupada' = tipoOcupacionRaw.includes('desoc') ? 'desocupada' : 'habitada';

    inmuebles.push({
      torre: torre || undefined,
      numeroApto: aptoCasa,
      piso,
      cuartos,
      banos,
      tieneBalcon,
      metrosCuadrados,
      tienePatio,
      coeficiente,
      tipoOcupacion,
    });
  });

  if (inmuebles.length === 0) {
    errores.push('La hoja "Inmuebles" no contiene registros válidos para importar.');
  }

  // Parsear Parqueaderos (Opcional)
  const parqueaderos: ImportarParqueaderoItem[] = [];
  const nombreHojaParqueaderos = sheetNames.find(
    (name) => name.trim().toLowerCase() === 'parqueaderos' || name.trim().toLowerCase() === 'parqueadero',
  );

  if (nombreHojaParqueaderos) {
    const wsParq = wb.Sheets[nombreHojaParqueaderos];
    const rawParq: Record<string, unknown>[] = XLSX.utils.sheet_to_json(wsParq, { defval: '' });

    rawParq.forEach((row, idx) => {
      const filaNum = idx + 2;
      const getVal = (claves: string[]): unknown => {
        for (const k of claves) {
          for (const rowKey of Object.keys(row)) {
            if (rowKey.trim().toLowerCase() === k.toLowerCase()) {
              return row[rowKey];
            }
          }
        }
        return undefined;
      };

      const numParq = String(getVal(['Numero_Parqueadero', 'Numero', 'Parqueadero', 'Id']) || '').trim();
      if (!numParq) {
        advertencias.push(`Fila ${filaNum} de Parqueaderos: omitida por no tener número de parqueadero.`);
        return;
      }

      const rawTorreAsignada = String(getVal(['Torre_Asignada', 'Torre']) || '').trim();
      const torreAsignada = normalizarTorre(rawTorreAsignada);
      const aptoAsignado = String(getVal(['Apto_Asignado', 'Apto', 'Apartamento']) || '').trim();
      const esVisitante = parseBoolean(getVal(['Es_Visitante', 'Visitante']));
      const tipoRaw = String(getVal(['Tipo', 'Vehiculo']) || '').trim().toLowerCase();
      const tipo = tipoRaw.includes('moto') ? 'moto' : tipoRaw.includes('bici') ? 'bicicleta' : 'carro';
      const esCubierto =
        getVal(['Es_Cubierto', 'Cubierto']) !== undefined
          ? parseBoolean(getVal(['Es_Cubierto', 'Cubierto']))
          : true;

      parqueaderos.push({
        numeroParqueadero: numParq,
        torreAsignada: torreAsignada || undefined,
        aptoAsignado: aptoAsignado || undefined,
        esVisitante,
        tipo,
        esCubierto,
      });
    });
  }

  // Parsear Bodegas (Opcional)
  const bodegas: ImportarBodegaItem[] = [];
  const nombreHojaBodegas = sheetNames.find(
    (name) =>
      name.trim().toLowerCase() === 'bodegas' ||
      name.trim().toLowerCase() === 'bodega' ||
      name.trim().toLowerCase() === 'depositos',
  );

  if (nombreHojaBodegas) {
    const wsBodegas = wb.Sheets[nombreHojaBodegas];
    const rawBodegas: Record<string, unknown>[] = XLSX.utils.sheet_to_json(wsBodegas, { defval: '' });

    rawBodegas.forEach((row, idx) => {
      const filaNum = idx + 2;
      const getVal = (claves: string[]): unknown => {
        for (const k of claves) {
          for (const rowKey of Object.keys(row)) {
            if (rowKey.trim().toLowerCase() === k.toLowerCase()) {
              return row[rowKey];
            }
          }
        }
        return undefined;
      };

      const numBodega = String(getVal(['Numero_Bodega', 'Numero', 'Bodega', 'Deposito', 'Id']) || '').trim();
      if (!numBodega) {
        advertencias.push(`Fila ${filaNum} de Bodegas: omitida por no tener número de bodega.`);
        return;
      }

      const rawTorreAsignada = String(getVal(['Torre_Asignada', 'Torre']) || '').trim();
      const torreAsignada = normalizarTorre(rawTorreAsignada);
      const aptoAsignado = String(getVal(['Apto_Asignado', 'Apto', 'Apartamento']) || '').trim();
      const ubicacion = String(getVal(['Ubicacion', 'Ubicación', 'Sector', 'Piso']) || '').trim();
      const metrosCuadrados = parseNumber(getVal(['Metros_Cuadrados', 'MetrosCuadrados', 'Metros', 'M2', 'Area']));

      bodegas.push({
        numeroBodega: numBodega,
        torreAsignada: torreAsignada || undefined,
        aptoAsignado: aptoAsignado || undefined,
        ubicacion: ubicacion || undefined,
        metrosCuadrados,
      });
    });
  }

  // Parsear Residentes (Opcional)
  const residentes: ImportarResidenteItem[] = [];
  const nombreHojaResidentes = sheetNames.find(
    (name) =>
      name.trim().toLowerCase() === 'residentes' ||
      name.trim().toLowerCase() === 'personas' ||
      name.trim().toLowerCase() === 'habitantes',
  );

  if (nombreHojaResidentes) {
    const wsRes = wb.Sheets[nombreHojaResidentes];
    const rawRes: Record<string, unknown>[] = XLSX.utils.sheet_to_json(wsRes, { defval: '' });

    rawRes.forEach((row, idx) => {
      const filaNum = idx + 2;
      const getVal = (claves: string[]): unknown => {
        for (const k of claves) {
          for (const rowKey of Object.keys(row)) {
            if (rowKey.trim().toLowerCase() === k.toLowerCase()) {
              return row[rowKey];
            }
          }
        }
        return undefined;
      };

      const nombre = String(getVal(['Nombre Completo', 'Nombre_Completo', 'Nombre', 'Residente']) || '').trim();
      if (!nombre) {
        advertencias.push(`Fila ${filaNum} de Residentes: omitida por no tener nombre.`);
        return;
      }

      const rawTorre = String(getVal(['Torre']) || '').trim();
      const torre = normalizarTorre(rawTorre);
      const apto = String(getVal(['Apto', 'Apto_Casa', 'Apartamento', 'Numero_Apto']) || '').trim();
      const identificador = String(getVal(['Unidad / Apto', 'Unidad_Apto', 'Identificador', 'Unidad']) || '').trim();
      const documento = String(getVal(['Documento', 'Cédula', 'Cedula', 'Doc']) || '').trim();
      const condicionRaw = String(getVal(['Condición', 'Condicion', 'Tipo']) || '').trim().toLowerCase();
      const condicion = condicionRaw.includes('prop')
        ? 'propietario'
        : condicionRaw.includes('arrend')
          ? 'arrendatario'
          : 'conviviente';
      const esContactoPrincipal = parseBoolean(getVal(['Contacto Principal', 'Es_Contacto_Principal', 'Principal']));
      const fechaNacRaw = getVal(['Fecha Nacimiento', 'Fecha_Nacimiento', 'Nacimiento']);
      let fechaNacimiento = '';
      if (fechaNacRaw instanceof Date) {
        fechaNacimiento = fechaNacRaw.toISOString().split('T')[0];
      } else if (typeof fechaNacRaw === 'number') {
        const parsedDate = XLSX.SSF.parse_date_code(fechaNacRaw);
        if (parsedDate) {
          fechaNacimiento = `${parsedDate.y}-${String(parsedDate.m).padStart(2, '0')}-${String(parsedDate.d).padStart(2, '0')}`;
        }
      } else if (typeof fechaNacRaw === 'string') {
        const trimmed = fechaNacRaw.trim();
        const matchDMY = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
        if (matchDMY) {
          const [, d, mStr, y] = matchDMY;
          fechaNacimiento = `${y}-${mStr.padStart(2, '0')}-${d.padStart(2, '0')}`;
        } else {
          fechaNacimiento = trimmed;
        }
      }

      const telefono = String(getVal(['Teléfono', 'Telefono', 'Celular']) || '').trim();
      const email = String(getVal(['Correo Electrónico', 'Correo_Electronico', 'Correo', 'Email']) || '').trim();

      residentes.push({
        torre: torre || undefined,
        apto: apto || undefined,
        identificador: identificador || undefined,
        nombreCompleto: nombre,
        documento: documento || undefined,
        condicion,
        esContactoPrincipal,
        fechaNacimiento: fechaNacimiento || undefined,
        telefono: telefono || undefined,
        email: email || undefined,
      });
    });
  }

  // Parsear Mascotas (Opcional)
  const mascotas: ImportarMascotaItem[] = [];
  const nombreHojaMascotas = sheetNames.find(
    (name) => name.trim().toLowerCase() === 'mascotas' || name.trim().toLowerCase() === 'animales',
  );

  if (nombreHojaMascotas) {
    const wsMas = wb.Sheets[nombreHojaMascotas];
    const rawMas: Record<string, unknown>[] = XLSX.utils.sheet_to_json(wsMas, { defval: '' });

    rawMas.forEach((row, idx) => {
      const filaNum = idx + 2;
      const getVal = (claves: string[]): unknown => {
        for (const k of claves) {
          for (const rowKey of Object.keys(row)) {
            if (rowKey.trim().toLowerCase() === k.toLowerCase()) {
              return row[rowKey];
            }
          }
        }
        return undefined;
      };

      const nombre = String(getVal(['Nombre', 'Nombre_Mascota']) || '').trim();
      if (!nombre) {
        advertencias.push(`Fila ${filaNum} de Mascotas: omitida por no tener nombre.`);
        return;
      }

      const rawTorre = String(getVal(['Torre']) || '').trim();
      const torre = normalizarTorre(rawTorre);
      const apto = String(getVal(['Apto', 'Apto_Casa', 'Apartamento']) || '').trim();
      const identificador = String(getVal(['Unidad / Apto', 'Unidad_Apto', 'Identificador', 'Unidad']) || '').trim();
      const tipoRaw = String(getVal(['Tipo', 'Especie']) || 'Perro').trim().toLowerCase();
      const tipo = tipoRaw.includes('gato') || tipoRaw.includes('felin')
        ? 'gato'
        : tipoRaw.includes('perr') || tipoRaw.includes('can')
          ? 'perro'
          : (['perro', 'gato', 'otro'].includes(tipoRaw) ? tipoRaw : 'otro');
      const raza = String(getVal(['Raza']) || '').trim();
      const esPeligroso = parseBoolean(getVal(['Manejo Especial (Peligrosa)', 'Manejo Especial', 'Es_Peligroso', 'Peligrosa', 'Peligroso']));
      const vacunasAlDia =
        getVal(['Vacunas al Día', 'Vacunas_Al_Dia', 'Vacunas']) !== undefined
          ? parseBoolean(getVal(['Vacunas al Día', 'Vacunas_Al_Dia', 'Vacunas']))
          : true;
      const observaciones = String(getVal(['Observaciones', 'Notas']) || '').trim();

      mascotas.push({
        torre: torre || undefined,
        apto: apto || undefined,
        identificador: identificador || undefined,
        tipo,
        nombre,
        raza: raza || undefined,
        esPeligroso,
        vacunasAlDia,
        observaciones: observaciones || undefined,
      });
    });
  }

  // Parsear Vehículos (Opcional)
  const vehiculos: ImportarVehiculoItem[] = [];
  const nombreHojaVehiculos = sheetNames.find(
    (name) => name.trim().toLowerCase() === 'vehículos' || name.trim().toLowerCase() === 'vehiculos',
  );

  if (nombreHojaVehiculos) {
    const wsVeh = wb.Sheets[nombreHojaVehiculos];
    const rawVeh: Record<string, unknown>[] = XLSX.utils.sheet_to_json(wsVeh, { defval: '' });

    rawVeh.forEach((row) => {
      const getVal = (claves: string[]): unknown => {
        for (const k of claves) {
          for (const rowKey of Object.keys(row)) {
            if (rowKey.trim().toLowerCase() === k.toLowerCase()) {
              return row[rowKey];
            }
          }
        }
        return undefined;
      };

      const tipoRaw = String(getVal(['Tipo', 'Tipo_Vehiculo']) || 'Carro').trim().toLowerCase();
      const tipo = tipoRaw.includes('moto')
        ? 'moto'
        : tipoRaw.includes('bici')
          ? 'bicicleta'
          : (tipoRaw.includes('carr') || tipoRaw.includes('auto'))
            ? 'carro'
            : (['carro', 'moto', 'bicicleta', 'otro'].includes(tipoRaw) ? tipoRaw : 'otro');
      let placa = String(getVal(['Placa']) || '').trim().toUpperCase().replace(/[\s\-]/g, '');
      if (!placa && tipo === 'bicicleta') {
        placa = 'BIC-SN';
      }
      const rawTorre = String(getVal(['Torre']) || '').trim();
      const torre = normalizarTorre(rawTorre);
      const apto = String(getVal(['Apto', 'Apto_Casa', 'Apartamento']) || '').trim();
      const identificador = String(getVal(['Unidad / Apto', 'Unidad_Apto', 'Identificador', 'Unidad']) || '').trim();
      const marca = String(getVal(['Marca']) || '').trim();
      const modelo = String(getVal(['Modelo']) || '').trim();
      const color = String(getVal(['Color']) || '').trim();
      const parqueaEnEdificio = parseBoolean(getVal(['Parquea en Edificio', 'Parquea_En_Edificio', 'Parquea_Adentro', 'Adentro']));
      const numeroParqueadero = String(getVal(['N° Parqueadero', 'Numero_Parqueadero', 'Parqueadero']) || '').trim();

      vehiculos.push({
        torre: torre || undefined,
        apto: apto || undefined,
        identificador: identificador || undefined,
        tipo,
        placa: placa || undefined,
        marca: marca || undefined,
        modelo: modelo || undefined,
        color: color || undefined,
        parqueaEnEdificio,
        numeroParqueadero: numeroParqueadero || undefined,
      });
    });
  }

  const parqueaderosVisitantes = parqueaderos.filter((p) => p.esVisitante).length;
  const parqueaderosPrivados = parqueaderos.length - parqueaderosVisitantes;

  return {
    inmuebles,
    parqueaderos,
    bodegas,
    residentes,
    mascotas,
    vehiculos,
    estadisticas: {
      totalInmuebles: inmuebles.length,
      totalParqueaderos: parqueaderos.length,
      parqueaderosPrivados,
      parqueaderosVisitantes,
      totalBodegas: bodegas.length,
      totalResidentes: residentes.length,
      totalMascotas: mascotas.length,
      totalVehiculos: vehiculos.length,
    },
    errores,
    advertencias,
  };
}

export function descargarPlantillaExcel(nombreEdificio: string = 'Edificio') {
  const wb = XLSX.utils.book_new();

  const inmueblesData = [
    [
      'Torre',
      'Apto_Casa',
      'Piso',
      'Cuartos',
      'Banos',
      'Tiene_Balcon',
      'Metros_Cuadrados',
      'Tiene_Patio',
      'Coeficiente',
      'Tipo_Ocupacion',
    ],
    ['Torre 1', '101', 1, 3, 2, 'SI', 72.5, 'NO', 0.0125, 'Habitada'],
    ['Torre 1', '102', 1, 2, 1, 'NO', 54.0, 'NO', 0.0095, 'Habitada'],
    ['Torre 2', '201', 2, 3, 2, 'SI', 78.0, 'SI', 0.0135, 'Desocupada'],
    ['Torre 2', '202', 2, 3, 2, 'SI', 75.0, 'NO', 0.013, 'Habitada'],
  ];
  const wsInmuebles = XLSX.utils.aoa_to_sheet(inmueblesData);
  wsInmuebles['!cols'] = [
    { wch: 14 },
    { wch: 14 },
    { wch: 8 },
    { wch: 10 },
    { wch: 8 },
    { wch: 14 },
    { wch: 18 },
    { wch: 14 },
    { wch: 14 },
    { wch: 16 },
  ];
  XLSX.utils.book_append_sheet(wb, wsInmuebles, 'Inmuebles');

  const parqueaderosData = [
    [
      'Numero_Parqueadero',
      'Torre_Asignada',
      'Apto_Asignado',
      'Es_Visitante',
      'Tipo',
      'Es_Cubierto',
    ],
    ['P-101', 'Torre 1', '101', 'NO', 'Carro', 'SI'],
    ['P-102', 'Torre 1', '102', 'NO', 'Moto', 'SI'],
    ['P-201', 'Torre 2', '201', 'NO', 'Carro', 'SI'],
    ['V-01', '', '', 'SI', 'Carro', 'NO'],
    ['V-02', '', '', 'SI', 'Carro', 'NO'],
  ];
  const wsParqueaderos = XLSX.utils.aoa_to_sheet(parqueaderosData);
  XLSX.utils.book_append_sheet(wb, wsParqueaderos, 'Parqueaderos');

  const bodegasData = [
    [
      'Numero_Bodega',
      'Torre_Asignada',
      'Apto_Asignado',
      'Ubicacion',
      'Metros_Cuadrados',
    ],
    ['B-01', 'Torre 1', '101', 'Sótano 1', 4.5],
    ['B-02', 'Torre 1', '102', 'Sótano 1', 3.8],
    ['B-03', 'Torre 2', '201', 'Sótano 2', 5.0],
  ];
  const wsBodegas = XLSX.utils.aoa_to_sheet(bodegasData);
  XLSX.utils.book_append_sheet(wb, wsBodegas, 'Bodegas');

  const safeNombre = nombreEdificio.replace(/[^a-zA-Z0-9_\-]/g, '_');
  XLSX.writeFile(wb, `Plantilla_Censo_Basica_${safeNombre}.xlsx`);
}

export function descargarPlantillaCompletaExcel(nombreEdificio: string = 'Edificio') {
  const wb = XLSX.utils.book_new();

  const inmueblesData = [
    [
      'Torre',
      'Apto_Casa',
      'Piso',
      'Cuartos',
      'Banos',
      'Tiene_Balcon',
      'Metros_Cuadrados',
      'Tiene_Patio',
      'Coeficiente',
      'Tipo_Ocupacion',
    ],
    ['Torre 1', '101', 1, 3, 2, 'NO', 72.5, 'SI', 0.0125, 'Habitada'],
    ['Torre 1', '102', 1, 2, 1, 'NO', 54.0, 'NO', 0.0095, 'Habitada'],
    ['Torre 2', '201', 2, 3, 2, 'SI', 78.0, 'NO', 0.0135, 'Habitada'],
    ['Torre 2', '202', 2, 3, 2, 'SI', 75.0, 'NO', 0.013, 'Desocupada'],
  ];
  const wsInmuebles = XLSX.utils.aoa_to_sheet(inmueblesData);
  XLSX.utils.book_append_sheet(wb, wsInmuebles, 'Inmuebles');

  const residentesData = [
    [
      'Torre',
      'Apto',
      'Nombre_Completo',
      'Documento',
      'Condicion',
      'Es_Contacto_Principal',
      'Fecha_Nacimiento',
      'Telefono',
      'Email',
    ],
    ['Torre 1', '101', 'Carlos Hall', '12345678', 'Propietario', 'SI', '1985-05-15', '3153266949', 'carlos@example.com'],
    ['Torre 1', '101', 'Alexandra Hall', '87654321', 'Conviviente', 'NO', '1988-10-20', '3125647386', 'alex@example.com'],
    ['Torre 1', '102', 'Juan Pérez', '98765432', 'Arrendatario', 'SI', '1992-02-10', '3101234567', 'juan@example.com'],
  ];
  const wsResidentes = XLSX.utils.aoa_to_sheet(residentesData);
  XLSX.utils.book_append_sheet(wb, wsResidentes, 'Residentes');

  const mascotasData = [
    [
      'Torre',
      'Apto',
      'Tipo',
      'Nombre',
      'Raza',
      'Es_Peligroso',
      'Vacunas_Al_Dia',
      'Observaciones',
    ],
    ['Torre 1', '101', 'Perro', 'Firulais', 'Golden Retriever', 'NO', 'SI', 'Sociable'],
    ['Torre 2', '201', 'Gato', 'Michi', 'Siamés', 'NO', 'SI', 'Tranquilo'],
  ];
  const wsMascotas = XLSX.utils.aoa_to_sheet(mascotasData);
  XLSX.utils.book_append_sheet(wb, wsMascotas, 'Mascotas');

  const vehiculosData = [
    [
      'Torre',
      'Apto',
      'Tipo',
      'Placa',
      'Marca',
      'Modelo',
      'Color',
      'Parquea_En_Edificio',
      'Numero_Parqueadero',
    ],
    ['Torre 1', '101', 'Carro', 'ABC123', 'Mazda', '2021', 'Rojo', 'SI', 'P-101'],
    ['Torre 1', '102', 'Moto', 'XYZ45F', 'Yamaha', '2023', 'Negro', 'SI', 'M-102'],
  ];
  const wsVehiculos = XLSX.utils.aoa_to_sheet(vehiculosData);
  XLSX.utils.book_append_sheet(wb, wsVehiculos, 'Vehículos');

  const parqueaderosData = [
    [
      'Numero_Parqueadero',
      'Torre_Asignada',
      'Apto_Asignado',
      'Es_Visitante',
      'Tipo',
      'Es_Cubierto',
    ],
    ['P-101', 'Torre 1', '101', 'NO', 'Carro', 'SI'],
    ['M-102', 'Torre 1', '102', 'NO', 'Moto', 'SI'],
  ];
  const wsParqueaderos = XLSX.utils.aoa_to_sheet(parqueaderosData);
  XLSX.utils.book_append_sheet(wb, wsParqueaderos, 'Parqueaderos');

  const bodegasData = [
    [
      'Numero_Bodega',
      'Torre_Asignada',
      'Apto_Asignado',
      'Ubicacion',
      'Metros_Cuadrados',
    ],
    ['B-01', 'Torre 1', '101', 'Sótano 1', 4.5],
  ];
  const wsBodegas = XLSX.utils.aoa_to_sheet(bodegasData);
  XLSX.utils.book_append_sheet(wb, wsBodegas, 'Bodegas');

  const safeNombre = nombreEdificio.replace(/[^a-zA-Z0-9_\-]/g, '_');
  XLSX.writeFile(wb, `Plantilla_Censo_Completo_${safeNombre}.xlsx`);
}
