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

export interface ParsedCensoExcel {
  inmuebles: ImportarInmuebleItem[];
  parqueaderos: ImportarParqueaderoItem[];
  bodegas: ImportarBodegaItem[];
  estadisticas: {
    totalInmuebles: number;
    totalParqueaderos: number;
    parqueaderosPrivados: number;
    parqueaderosVisitantes: number;
    totalBodegas: number;
  };
  errores: string[];
  advertencias: string[];
}

function parseBoolean(val: unknown): boolean {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val === 1;
  if (typeof val === 'string') {
    const s = val.trim().toLowerCase();
    return s === 'si' || s === 'sí' || s === 'true' || s === 'yes' || s === '1' || s === 's';
  }
  return false;
}

function parseNumber(val: unknown): number | undefined {
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

export function descargarPlantillaExcel(nombreEdificio: string = 'Edificio') {
  const wb = XLSX.utils.book_new();

  // 1. Hoja Inmuebles
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
    { wch: 14 }, // Torre
    { wch: 14 }, // Apto_Casa
    { wch: 8 },  // Piso
    { wch: 10 }, // Cuartos
    { wch: 8 },  // Banos
    { wch: 14 }, // Tiene_Balcon
    { wch: 18 }, // Metros_Cuadrados
    { wch: 14 }, // Tiene_Patio
    { wch: 14 }, // Coeficiente
    { wch: 16 }, // Tipo_Ocupacion
  ];
  XLSX.utils.book_append_sheet(wb, wsInmuebles, 'Inmuebles');

  // 2. Hoja Parqueaderos (Opcional)
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
  wsParqueaderos['!cols'] = [
    { wch: 20 }, // Numero_Parqueadero
    { wch: 16 }, // Torre_Asignada
    { wch: 16 }, // Apto_Asignado
    { wch: 14 }, // Es_Visitante
    { wch: 12 }, // Tipo
    { wch: 14 }, // Es_Cubierto
  ];
  XLSX.utils.book_append_sheet(wb, wsParqueaderos, 'Parqueaderos');

  // 3. Hoja Bodegas (Opcional)
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
  wsBodegas['!cols'] = [
    { wch: 18 }, // Numero_Bodega
    { wch: 16 }, // Torre_Asignada
    { wch: 16 }, // Apto_Asignado
    { wch: 16 }, // Ubicacion
    { wch: 18 }, // Metros_Cuadrados
  ];
  XLSX.utils.book_append_sheet(wb, wsBodegas, 'Bodegas');

  const safeNombre = nombreEdificio.replace(/[^a-zA-Z0-9_\-]/g, '_');
  XLSX.writeFile(wb, `Plantilla_Censo_${safeNombre}.xlsx`);
}

export async function parsearExcelCenso(file: File): Promise<ParsedCensoExcel> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });

  const errores: string[] = [];
  const advertencias: string[] = [];

  // Buscar hoja de inmuebles
  const sheetNames = wb.SheetNames;
  const nombreHojaInmuebles = sheetNames.find(
    (name) => name.trim().toLowerCase() === 'inmuebles' || name.trim().toLowerCase() === 'unidades',
  );

  if (!nombreHojaInmuebles) {
    errores.push('El archivo no contiene la hoja obligatoria "Inmuebles". Asegúrate de usar la plantilla oficial.');
    return {
      inmuebles: [],
      parqueaderos: [],
      bodegas: [],
      estadisticas: {
        totalInmuebles: 0,
        totalParqueaderos: 0,
        parqueaderosPrivados: 0,
        parqueaderosVisitantes: 0,
        totalBodegas: 0,
      },
      errores,
      advertencias,
    };
  }

  // Parsear Inmuebles
  const wsInmuebles = wb.Sheets[nombreHojaInmuebles];
  const rawInmuebles: Record<string, unknown>[] = XLSX.utils.sheet_to_json(wsInmuebles, { defval: '' });

  const inmuebles: ImportarInmuebleItem[] = [];

  rawInmuebles.forEach((row, idx) => {
    const filaNum = idx + 2; // +2 por encabezado y 1-based

    // Resolver claves flexibles (insensible a mayúsculas/minúsculas)
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
      const esCubierto = getVal(['Es_Cubierto', 'Cubierto']) !== undefined
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
    (name) => name.trim().toLowerCase() === 'bodegas' || name.trim().toLowerCase() === 'bodega' || name.trim().toLowerCase() === 'depositos',
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

  const parqueaderosVisitantes = parqueaderos.filter((p) => p.esVisitante).length;
  const parqueaderosPrivados = parqueaderos.length - parqueaderosVisitantes;

  return {
    inmuebles,
    parqueaderos,
    bodegas,
    estadisticas: {
      totalInmuebles: inmuebles.length,
      totalParqueaderos: parqueaderos.length,
      parqueaderosPrivados,
      parqueaderosVisitantes,
      totalBodegas: bodegas.length,
    },
    errores,
    advertencias,
  };
}
