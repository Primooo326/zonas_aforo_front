import * as XLSX from 'xlsx';

export interface Persona {
  nombreCompleto: string;
  telefono?: string;
  email?: string;
  documento?: string;
  fechaNacimiento: string;
  condicion: 'propietario' | 'arrendatario' | 'conviviente';
  esContactoPrincipal?: boolean;
}

export interface Mascota {
  tipo: 'perro' | 'gato' | 'otro';
  nombre: string;
  raza: string;
  esPeligroso: boolean;
  vacunasAlDia: boolean;
  observaciones?: string;
}

export interface Vehiculo {
  tipo: 'carro' | 'moto' | 'bicicleta' | 'otro';
  placa: string;
  marca?: string;
  modelo?: string;
  color?: string;
  parqueaEnEdificio: boolean;
  numeroParqueadero?: string;
}

export interface ParqueaderoAsignado {
  numero: string;
  tipo: string;
  esCubierto: boolean;
}

export interface BodegaAsignada {
  numero: string;
  ubicacion?: string;
  metrosCuadrados?: number;
}

export interface CensoUnidad {
  _id: string;
  edificioId: string;
  identificador: string;
  torre?: string;
  numeroApto?: string;
  piso?: number;
  cuartos?: number;
  banos?: number;
  tieneBalcon?: boolean;
  metrosCuadrados?: number;
  tienePatio?: boolean;
  coeficiente?: number;
  parqueaderosAsignados?: ParqueaderoAsignado[];
  bodegasAsignadas?: BodegaAsignada[];
  tipoOcupacion: 'habitada' | 'desocupada';
  personas: Persona[];
  mascotas: Mascota[];
  vehiculos: Vehiculo[];
  estado: 'aprobado' | 'pendiente' | 'pendiente_actualizacion' | 'rechazado';
  unidadOriginalId?: string;
  notasAdministracion?: string;
  createdAt: string;
  updatedAt: string;
}

export function calcularEdad(fechaNacimiento: string | Date): number {
  if (!fechaNacimiento) return 0;
  const hoy = new Date();
  const nac = new Date(fechaNacimiento);
  if (isNaN(nac.getTime())) return 0;
  let edad = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) {
    edad--;
  }
  return Math.max(0, edad);
}

export function categorizarEdad(edad: number): {
  key: 'menor' | 'adulto' | 'adulto_mayor';
  label: string;
  badgeClass: string;
  icon: string;
} {
  if (edad < 18) {
    return {
      key: 'menor',
      label: 'Menor de edad',
      badgeClass: 'badge-soft badge-info',
      icon: 'icon-[tabler--mood-kid]',
    };
  }
  if (edad >= 60) {
    return {
      key: 'adulto_mayor',
      label: 'Adulto mayor',
      badgeClass: 'badge-soft badge-warning',
      icon: 'icon-[tabler--user-heart]',
    };
  }
  return {
    key: 'adulto',
    label: 'Adulto',
    badgeClass: 'badge-soft badge-primary',
    icon: 'icon-[tabler--user]',
  };
}

export const FECHA_MAX_NACIMIENTO = new Date().toISOString().split('T')[0];
export const FECHA_MIN_NACIMIENTO = (() => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 125);
  return d.toISOString().split('T')[0];
})();

export function validarFechaNacimiento(fechaStr: string): {
  valida: boolean;
  valido: boolean;
  error?: string;
  mensaje?: string;
  edad: number;
} {
  if (!fechaStr) {
    return { valida: false, valido: false, error: 'Fecha requerida', mensaje: 'Fecha requerida', edad: 0 };
  }
  const hoy = new Date();
  const nac = new Date(fechaStr);
  if (isNaN(nac.getTime())) {
    return { valida: false, valido: false, error: 'Fecha inválida', mensaje: 'Fecha inválida', edad: 0 };
  }
  if (nac > hoy) {
    return { valida: false, valido: false, error: 'La fecha no puede ser futura', mensaje: 'La fecha no puede ser futura', edad: 0 };
  }
  const edad = calcularEdad(nac);
  if (edad > 125) {
    return {
      valida: false,
      valido: false,
      error: 'Edad no puede superar 125 años',
      mensaje: 'Edad no puede superar 125 años',
      edad,
    };
  }
  return { valida: true, valido: true, edad };
}

export function validarTelefono(tel: string): {
  valido: boolean;
  valida: boolean;
  error?: string;
  mensaje?: string;
} {
  if (!tel || !tel.trim()) return { valido: true, valida: true };
  const limpio = tel.replace(/[\s\-\(\)\+]/g, '');
  if (!/^\d{7,15}$/.test(limpio)) {
    const msg = 'Debe contener entre 7 y 15 dígitos numéricos';
    return { valido: false, valida: false, error: msg, mensaje: msg };
  }
  return { valido: true, valida: true };
}

export function validarPlaca(placa: string): {
  valida: boolean;
  valido: boolean;
  error?: string;
  mensaje?: string;
} {
  if (!placa || !placa.trim()) {
    return { valida: false, valido: false, error: 'Placa requerida', mensaje: 'Placa requerida' };
  }
  const limpia = placa.trim().toUpperCase().replace(/[\s\-]/g, '');
  if (limpia.length < 5 || limpia.length > 8) {
    const msg = 'Debe tener entre 5 y 8 caracteres (ej. AAA123 o AAA12D)';
    return { valida: false, valido: false, error: msg, mensaje: msg };
  }
  return { valida: true, valido: true };
}

export function exportarCensoCSV(unidades: CensoUnidad[], nombreEdificio = 'Edificio') {
  const headers = [
    'Unidad/Apto',
    'Torre',
    'Estado',
    'Ocupación',
    'Residente - Nombre',
    'Condición',
    'Edad',
    'Grupo Etario',
    'Teléfono',
    'Email',
    'Contacto Principal',
    'Mascota - Tipo',
    'Mascota - Nombre',
    'Mascota - Raza',
    'Mascota - Peligrosa/Especial',
    'Mascota - Vacunas al día',
    'Vehículo - Tipo',
    'Vehículo - Placa',
    'Vehículo - Marca/Modelo',
    'Vehículo - Color',
    'Parquea en Edificio',
    'N° Parqueadero',
  ];

  const rows: string[][] = [];

  for (const u of unidades) {
    const maxItems = Math.max(
      u.personas?.length || 0,
      u.mascotas?.length || 0,
      u.vehiculos?.length || 0,
      1,
    );

    for (let i = 0; i < maxItems; i++) {
      const p = u.personas?.[i];
      const m = u.mascotas?.[i];
      const v = u.vehiculos?.[i];

      const edad = p ? calcularEdad(p.fechaNacimiento) : '';
      const cat = p ? categorizarEdad(Number(edad)).label : '';

      rows.push([
        u.identificador || '',
        u.torre || '',
        u.estado || '',
        u.tipoOcupacion || '',
        p?.nombreCompleto || '',
        p?.condicion || '',
        edad !== '' ? String(edad) : '',
        cat,
        p?.telefono || '',
        p?.email || '',
        p?.esContactoPrincipal ? 'Sí' : 'No',
        m?.tipo || '',
        m?.nombre || '',
        m?.raza || '',
        m ? (m.esPeligroso ? 'Sí' : 'No') : '',
        m ? (m.vacunasAlDia ? 'Sí' : 'No') : '',
        v?.tipo || '',
        v?.placa || '',
        v ? `${v.marca || ''} ${v.modelo || ''}`.trim() : '',
        v?.color || '',
        v ? (v.parqueaEnEdificio ? 'Sí' : 'No') : '',
        v?.numeroParqueadero || '',
      ]);
    }
  }

  // Generar con BOM UTF-8 para soporte de tildes en Excel
  const escapeCell = (c: string) => `"${(c || '').replace(/"/g, '""')}"`;
  const csvContent =
    '\uFEFF' +
    [headers.map(escapeCell).join(';')]
      .concat(rows.map((r) => r.map(escapeCell).join(';')))
      .join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `censo_${nombreEdificio.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportarCensoXLSX(
  unidades: CensoUnidad[],
  parqueaderos: any[] = [],
  bodegas: any[] = [],
  nombreEdificio = 'Edificio',
) {
  const wb = XLSX.utils.book_new();

  // 1. Hoja Inmuebles
  const headersInmuebles = [
    'Identificador',
    'Torre',
    'Apto/Casa',
    'Piso',
    'Área (m²)',
    'Cuartos',
    'Baños',
    'Balcón',
    'Patio',
    'Coeficiente',
    'Ocupación',
    'Estado Censo',
    'Cant. Residentes',
    'Cant. Mascotas',
    'Cant. Vehículos',
    'Parqueaderos Asignados',
    'Bodegas Asignadas',
    'Contacto Principal',
    'Teléfono Contacto',
  ];

  const rowsInmuebles = unidades.map((u) => {
    const principal = u.personas?.find((p) => p.esContactoPrincipal) || u.personas?.[0];
    const parqStr = (u.parqueaderosAsignados || []).map((p) => p.numero).join(', ');
    const bodStr = (u.bodegasAsignadas || []).map((b) => b.numero).join(', ');

    return [
      u.identificador || '',
      u.torre || '',
      u.numeroApto || '',
      u.piso !== undefined ? u.piso : '',
      u.metrosCuadrados !== undefined ? u.metrosCuadrados : '',
      u.cuartos !== undefined ? u.cuartos : '',
      u.banos !== undefined ? u.banos : '',
      u.tieneBalcon ? 'Sí' : 'No',
      u.tienePatio ? 'Sí' : 'No',
      u.coeficiente !== undefined ? u.coeficiente : '',
      u.tipoOcupacion || 'habitada',
      u.estado || 'aprobado',
      u.personas?.length || 0,
      u.mascotas?.length || 0,
      u.vehiculos?.length || 0,
      parqStr,
      bodStr,
      principal?.nombreCompleto || '',
      principal?.telefono || '',
    ];
  });

  const wsInmuebles = XLSX.utils.aoa_to_sheet([headersInmuebles, ...rowsInmuebles]);
  wsInmuebles['!cols'] = [
    { wch: 22 },
    { wch: 12 },
    { wch: 12 },
    { wch: 8 },
    { wch: 12 },
    { wch: 10 },
    { wch: 8 },
    { wch: 10 },
    { wch: 10 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 22 },
    { wch: 20 },
    { wch: 24 },
    { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(wb, wsInmuebles, 'Inmuebles');

  // 2. Hoja Residentes
  const headersResidentes = [
    'Unidad / Apto',
    'Torre',
    'Nombre Completo',
    'Documento',
    'Condición',
    'Contacto Principal',
    'Fecha Nacimiento',
    'Edad',
    'Grupo Etario',
    'Teléfono',
    'Correo Electrónico',
  ];

  const rowsResidentes: any[] = [];
  unidades.forEach((u) => {
    (u.personas || []).forEach((p) => {
      const edad = p.fechaNacimiento ? calcularEdad(p.fechaNacimiento) : '';
      const cat = edad !== '' ? categorizarEdad(Number(edad)).label : '';
      rowsResidentes.push([
        u.identificador || '',
        u.torre || '',
        p.nombreCompleto || '',
        p.documento || '',
        p.condicion === 'propietario' ? 'Propietario' : p.condicion === 'arrendatario' ? 'Arrendatario' : 'Conviviente / Familiar',
        p.esContactoPrincipal ? 'Sí' : 'No',
        p.fechaNacimiento ? p.fechaNacimiento.split('T')[0] : '',
        edad,
        cat,
        p.telefono || '',
        p.email || '',
      ]);
    });
  });

  const wsResidentes = XLSX.utils.aoa_to_sheet([headersResidentes, ...rowsResidentes]);
  wsResidentes['!cols'] = [
    { wch: 20 },
    { wch: 12 },
    { wch: 24 },
    { wch: 14 },
    { wch: 22 },
    { wch: 18 },
    { wch: 16 },
    { wch: 8 },
    { wch: 18 },
    { wch: 16 },
    { wch: 26 },
  ];
  XLSX.utils.book_append_sheet(wb, wsResidentes, 'Residentes');

  // 3. Hoja Mascotas
  const headersMascotas = [
    'Unidad / Apto',
    'Torre',
    'Tipo',
    'Nombre',
    'Raza',
    'Manejo Especial (Peligrosa)',
    'Vacunas al Día',
    'Observaciones',
  ];

  const rowsMascotas: any[] = [];
  unidades.forEach((u) => {
    (u.mascotas || []).forEach((m) => {
      rowsMascotas.push([
        u.identificador || '',
        u.torre || '',
        m.tipo ? m.tipo.charAt(0).toUpperCase() + m.tipo.slice(1) : '',
        m.nombre || '',
        m.raza || '',
        m.esPeligroso ? 'Sí' : 'No',
        m.vacunasAlDia ? 'Sí' : 'No',
        m.observaciones || '',
      ]);
    });
  });

  const wsMascotas = XLSX.utils.aoa_to_sheet([headersMascotas, ...rowsMascotas]);
  wsMascotas['!cols'] = [
    { wch: 20 },
    { wch: 12 },
    { wch: 12 },
    { wch: 18 },
    { wch: 20 },
    { wch: 24 },
    { wch: 16 },
    { wch: 26 },
  ];
  XLSX.utils.book_append_sheet(wb, wsMascotas, 'Mascotas');

  // 4. Hoja Vehículos
  const headersVehiculos = [
    'Unidad / Apto',
    'Torre',
    'Tipo',
    'Placa',
    'Marca',
    'Modelo',
    'Color',
    'Parquea en Edificio',
    'N° Parqueadero',
  ];

  const rowsVehiculos: any[] = [];
  unidades.forEach((u) => {
    (u.vehiculos || []).forEach((v) => {
      rowsVehiculos.push([
        u.identificador || '',
        u.torre || '',
        v.tipo ? v.tipo.charAt(0).toUpperCase() + v.tipo.slice(1) : '',
        v.placa || '',
        v.marca || '',
        v.modelo || '',
        v.color || '',
        v.parqueaEnEdificio ? 'Sí' : 'No',
        v.numeroParqueadero || '',
      ]);
    });
  });

  const wsVehiculos = XLSX.utils.aoa_to_sheet([headersVehiculos, ...rowsVehiculos]);
  wsVehiculos['!cols'] = [
    { wch: 20 },
    { wch: 12 },
    { wch: 14 },
    { wch: 12 },
    { wch: 16 },
    { wch: 16 },
    { wch: 12 },
    { wch: 20 },
    { wch: 16 },
  ];
  XLSX.utils.book_append_sheet(wb, wsVehiculos, 'Vehículos');

  // 5. Hoja Parqueaderos (Inventario general)
  if (parqueaderos && parqueaderos.length > 0) {
    const headersParq = [
      'Número Parqueadero',
      'Tipo',
      'Modalidad',
      'Cubierto',
      'Torre Asignada',
      'Apto Asignado',
    ];
    const rowsParq = parqueaderos.map((p) => [
      p.numero || '',
      p.tipo ? p.tipo.charAt(0).toUpperCase() + p.tipo.slice(1) : 'Carro',
      p.esVisitante ? 'Visitante' : 'Privado',
      p.esCubierto ? 'Sí' : 'No',
      p.torreAsignada || '',
      p.aptoAsignado || '',
    ]);
    const wsParq = XLSX.utils.aoa_to_sheet([headersParq, ...rowsParq]);
    wsParq['!cols'] = [
      { wch: 20 },
      { wch: 14 },
      { wch: 16 },
      { wch: 12 },
      { wch: 16 },
      { wch: 16 },
    ];
    XLSX.utils.book_append_sheet(wb, wsParq, 'Parqueaderos');
  }

  // 6. Hoja Bodegas (Inventario general)
  if (bodegas && bodegas.length > 0) {
    const headersBod = [
      'Número Bodega',
      'Ubicación',
      'Metros Cuadrados (m²)',
      'Torre Asignada',
      'Apto Asignado',
    ];
    const rowsBod = bodegas.map((b) => [
      b.numero || '',
      b.ubicacion || '',
      b.metrosCuadrados !== undefined ? b.metrosCuadrados : '',
      b.torreAsignada || '',
      b.aptoAsignado || '',
    ]);
    const wsBod = XLSX.utils.aoa_to_sheet([headersBod, ...rowsBod]);
    wsBod['!cols'] = [
      { wch: 18 },
      { wch: 18 },
      { wch: 22 },
      { wch: 16 },
      { wch: 16 },
    ];
    XLSX.utils.book_append_sheet(wb, wsBod, 'Bodegas');
  }

  const safeNombre = nombreEdificio.replace(/[^a-zA-Z0-9_\-]/g, '_');
  const fechaStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `Censo_${safeNombre}_${fechaStr}.xlsx`);
}
