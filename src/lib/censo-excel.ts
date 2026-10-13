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
  fechaNacimiento: string;
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
  | 'email'
  | 'telefono'
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
}

export interface PersonaPreviewItem {
  nombreCompleto: string;
  condicion: 'propietario' | 'arrendatario' | 'conviviente';
  esContactoPrincipal: boolean;
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
  const esPlantillaOficial = hojas.some(
    (h) => h.nombre.trim().toLowerCase() === 'inmuebles' || h.nombre.trim().toLowerCase() === 'unidades',
  );

  // Determinar la hoja recomendada
  let hojaRecomendada = '';
  if (esPlantillaOficial) {
    const official = hojas.find(
      (h) => h.nombre.trim().toLowerCase() === 'inmuebles' || h.nombre.trim().toLowerCase() === 'unidades',
    );
    hojaRecomendada = official?.nombre || wb.SheetNames[0];
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

    // 4. Correo
    if (!assignedTargets.has('email') && matches(colTrimmed, ['correo', 'correos', 'email', 'mail'])) {
      mapeo[colTrimmed] = 'email';
      assignedTargets.add('email');
      return;
    }

    // 5. Teléfono
    if (!assignedTargets.has('telefono') && matches(colTrimmed, ['telefono', 'telefonos', 'celular', 'cel', 'movil', 'tel'])) {
      mapeo[colTrimmed] = 'telefono';
      assignedTargets.add('telefono');
      return;
    }

    // 6. Residentes
    if (!assignedTargets.has('residentes') && matches(colTrimmed, ['residentes', 'residente', 'habitantes', 'inquilinos', 'arrendatarios'])) {
      mapeo[colTrimmed] = 'residentes';
      assignedTargets.add('residentes');
      return;
    }

    // 7. Nombre / Propietario
    if (!assignedTargets.has('nombrePropietario') && matches(colTrimmed, ['propietario', 'propietarios', 'dueno', 'titular', 'nombre', 'nombrecompleto'])) {
      mapeo[colTrimmed] = 'nombrePropietario';
      assignedTargets.add('nombrePropietario');
      return;
    }

    // 8. Ocupación
    if (!assignedTargets.has('tipoOcupacion') && matches(colTrimmed, ['ocupacion', 'estadoocupacion', 'tipoocupacion'])) {
      mapeo[colTrimmed] = 'tipoOcupacion';
      assignedTargets.add('tipoOcupacion');
      return;
    }

    // 9. Cuartos
    if (!assignedTargets.has('cuartos') && matches(colTrimmed, ['cuartos', 'habitaciones', 'alcobas', 'hab'])) {
      mapeo[colTrimmed] = 'cuartos';
      assignedTargets.add('cuartos');
      return;
    }

    // 10. Baños
    if (!assignedTargets.has('banos') && matches(colTrimmed, ['banos', 'bano'])) {
      mapeo[colTrimmed] = 'banos';
      assignedTargets.add('banos');
      return;
    }

    // 11. Metros
    if (!assignedTargets.has('metrosCuadrados') && matches(colTrimmed, ['metros', 'm2', 'area', 'superficie'])) {
      mapeo[colTrimmed] = 'metrosCuadrados';
      assignedTargets.add('metrosCuadrados');
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
  const inmuebles: ImportarInmuebleItem[] = [];
  const residentes: ImportarResidenteItem[] = [];
  const filasPreview: FilaSanitizadaPreview[] = [];
  const advertencias: string[] = [];
  const errores: string[] = [];

  rawRows.forEach((row, idx) => {
    const filaNum = idx + 2;

    // Obtener valor según el campo mapeado
    const getMappedVal = (target: CampoCensoDestino): unknown => {
      for (const [colName, mappedTarget] of Object.entries(mapeo)) {
        if (mappedTarget === target) {
          return row[colName];
        }
      }
      return undefined;
    };

    const rawApto = String(getMappedVal('numeroApto') || '').trim();

    // 1. Omitir filas vacías o filas de sumatoria total (ej. Apto vacío o que contenga "Total")
    if (!rawApto) {
      const rowText = Object.values(row).join(' ').toLowerCase();
      if (rowText.includes('total') || rowText.includes('100') || rowText.includes('suma')) {
        advertencias.push(`Fila ${filaNum}: Omitida automáticamente por identificarse como fila de sumatoria/total.`);
      }
      return;
    }

    // 2. Extraer y normalizar Torre
    let torre = String(getMappedVal('torre') || '').trim();
    if (!torre) {
      // Inferencia inteligente de torre por primer dígito si apto tiene 4 cifras (ej. 1101 -> Torre 1, 2101 -> Torre 2)
      if (/^[1-9]\d{3}$/.test(rawApto)) {
        torre = `Torre ${rawApto[0]}`;
      }
    } else {
      torre = normalizarTorre(torre);
    }

    // 3. Extraer y normalizar Coeficiente
    const rawCoef = parseNumber(getMappedVal('coeficiente'));
    let coeficiente: number | undefined = undefined;
    if (rawCoef !== undefined) {
      // Si viene en escala porcentual > 1 (ej. 2.73), convertir a escala decimal (0.0273)
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

    // 5. Extracción de Correos y Teléfonos
    const emailsExtraidos = cleanEmails(getMappedVal('email'));
    const telefonosExtraidos = cleanPhones(getMappedVal('telefono'));

    // 6. Desdoblamiento de Personas (Propietarios + Residentes)
    const rawPropietarioText = String(getMappedVal('nombrePropietario') || '');
    const ownerNames = splitNamesCompound(rawPropietarioText);
    const residentNames = isDesocupado ? [] : splitNamesCompound(rawResidentesText);

    const personas: PersonaPreviewItem[] = [];
    const addedNames = new Set<string>();

    let emailIdx = 0;
    let telIdx = 0;

    // Agregar propietarios
    ownerNames.forEach((n, i) => {
      const key = n.toLowerCase();
      if (!addedNames.has(key)) {
        addedNames.add(key);
        personas.push({
          nombreCompleto: n,
          condicion: 'propietario',
          esContactoPrincipal: i === 0,
          email: emailsExtraidos[emailIdx++] || undefined,
          telefono: telefonosExtraidos[telIdx++] || undefined,
        });
      }
    });

    // Agregar residentes
    residentNames.forEach((n) => {
      const key = n.toLowerCase();
      if (!addedNames.has(key)) {
        addedNames.add(key);
        personas.push({
          nombreCompleto: n,
          condicion: 'conviviente',
          esContactoPrincipal: personas.length === 0,
          email: emailsExtraidos[emailIdx++] || undefined,
          telefono: telefonosExtraidos[telIdx++] || undefined,
        });
      }
    });

    // Si no hubo nombres pero hay emails o teléfonos, registrar titular por defecto
    if (personas.length === 0 && !isDesocupado && (emailsExtraidos.length > 0 || telefonosExtraidos.length > 0)) {
      personas.push({
        nombreCompleto: `Residente Apto ${rawApto}`,
        condicion: 'conviviente',
        esContactoPrincipal: true,
        email: emailsExtraidos[0],
        telefono: telefonosExtraidos[0],
      });
    }

    // 7. Generar registros para ImportarResidenteItem
    personas.forEach((p) => {
      residentes.push({
        torre: torre || undefined,
        apto: rawApto,
        nombreCompleto: p.nombreCompleto,
        condicion: p.condicion,
        esContactoPrincipal: p.esContactoPrincipal,
        fechaNacimiento: '1990-01-01',
        email: p.email,
        telefono: p.telefono,
      });
    });

    // 8. Atributos físicos opcionales
    const cuartos = parseNumber(getMappedVal('cuartos'));
    const banos = parseNumber(getMappedVal('banos'));
    const metrosCuadrados = parseNumber(getMappedVal('metrosCuadrados'));

    inmuebles.push({
      torre: torre || undefined,
      numeroApto: rawApto,
      coeficiente,
      tipoOcupacion,
      cuartos,
      banos,
      metrosCuadrados,
    });

    // 9. Estado de validación para la vista previa
    let estadoValidacion: 'valido' | 'advertencia' | 'error' = 'valido';
    let mensajeValidacion = '';

    if (!rawApto) {
      estadoValidacion = 'error';
      mensajeValidacion = 'Falta número de apartamento';
    } else if (personas.length === 0 && !isDesocupado) {
      estadoValidacion = 'advertencia';
      mensajeValidacion = 'Sin residentes identificados';
    } else if (emailsExtraidos.length === 0 && telefonosExtraidos.length === 0) {
      estadoValidacion = 'advertencia';
      mensajeValidacion = 'Sin datos de contacto';
    }

    filasPreview.push({
      id: `preview-${idx}-${rawApto}`,
      filaOriginalNum: filaNum,
      numeroApto: rawApto,
      torre: torre || undefined,
      coeficiente,
      tipoOcupacion,
      personas,
      emailsExtraidos,
      telefonosExtraidos,
      estadoValidacion,
      mensajeValidacion,
    });
  });

  if (inmuebles.length === 0) {
    errores.push('No se pudieron extraer unidades residenciales válidas de la hoja seleccionada.');
  }

  const parsedData: ParsedCensoExcel = {
    inmuebles,
    parqueaderos: [],
    bodegas: [],
    residentes,
    mascotas: [],
    vehiculos: [],
    estadisticas: {
      totalInmuebles: inmuebles.length,
      totalParqueaderos: 0,
      parqueaderosPrivados: 0,
      parqueaderosVisitantes: 0,
      totalBodegas: 0,
      totalResidentes: residentes.length,
      totalMascotas: 0,
      totalVehiculos: 0,
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

  // Si NO contiene la hoja oficial, recurrir al procesador inteligente heurístico automático
  if (!nombreHojaInmuebles) {
    const libroAnalizado = await analizarLibroExcel(file);
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
        fechaNacimiento: fechaNacimiento || '1990-01-01',
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
