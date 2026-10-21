'use client';

import { useState, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  descargarPlantillaExcel,
  descargarPlantillaCompletaExcel,
  analizarLibroExcel,
  parsearExcelCenso,
  sugerirMapeoColumnas,
  transformarHojaExcel,
  normalizarTorre,
  LibroExcelAnalizado,
  CampoCensoDestino,
  FilaSanitizadaPreview,
  ParsedCensoExcel,
} from '@/lib/censo-excel';
import { apiFetch } from '@/lib/api';

interface ModalCargaExcelProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  edificioNombre?: string;
}

type PasoWizard = 1 | 2 | 3 | 4;

const DESTINOS_OPCIONES: { valor: CampoCensoDestino; etiqueta: string; descripcion: string }[] = [
  { valor: 'numeroApto', etiqueta: 'Número de Apto / Casa (Obligatorio)', descripcion: 'Identificador del inmueble' },
  { valor: 'torre', etiqueta: 'Torre / Bloque', descripcion: 'Torre o manzana' },
  { valor: 'coeficiente', etiqueta: 'Coeficiente de Copropiedad', descripcion: 'Porcentaje o alícuota' },
  { valor: 'nombrePropietario', etiqueta: 'Nombre del Propietario', descripcion: 'Titular del inmueble' },
  { valor: 'residentes', etiqueta: 'Residentes / Convivientes', descripcion: 'Habitantes de la unidad' },
  { valor: 'documento', etiqueta: 'Documento / Cédula', descripcion: 'Documento de identidad' },
  { valor: 'edad', etiqueta: 'Edad (Años)', descripcion: 'Edad del residente' },
  { valor: 'fechaNacimiento', etiqueta: 'Fecha de Nacimiento', descripcion: 'Fecha de nacimiento' },
  { valor: 'email', etiqueta: 'Correo Electrónico', descripcion: 'Emails de contacto' },
  { valor: 'telefono', etiqueta: 'Teléfono / Celular', descripcion: 'Teléfonos de contacto' },
  { valor: 'parqueadero', etiqueta: 'Parqueadero Asignado', descripcion: 'Número de parqueadero' },
  { valor: 'placaVehiculo', etiqueta: 'Placa / Vehículo', descripcion: 'Placa del vehículo' },
  { valor: 'mascota', etiqueta: 'Mascota(s)', descripcion: 'Nombre de mascota' },
  { valor: 'tipoOcupacion', etiqueta: 'Estado de Ocupación', descripcion: 'Habitada o desocupada' },
  { valor: 'metrosCuadrados', etiqueta: 'Área (m²)', descripcion: 'Área privada' },
  { valor: 'cuartos', etiqueta: 'Habitaciones', descripcion: 'Número de cuartos' },
  { valor: 'banos', etiqueta: 'Baños', descripcion: 'Número de baños' },
  { valor: 'ignorar', etiqueta: '— Ignorar esta columna —', descripcion: 'Omitir' },
];

export default function ModalCargaExcel({
  isOpen,
  onClose,
  onSuccess,
  edificioNombre = 'Edificio',
}: ModalCargaExcelProps) {
  const [paso, setPaso] = useState<PasoWizard>(1);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorGlobal, setErrorGlobal] = useState('');

  // Paso 1: Libro analizado y hoja seleccionada
  const [libro, setLibro] = useState<LibroExcelAnalizado | null>(null);
  const [multiSheetData, setMultiSheetData] = useState<ParsedCensoExcel | null>(null);
  const [hojaSeleccionada, setHojaSeleccionada] = useState<string>('');
  const [rawRows, setRawRows] = useState<Record<string, unknown>[]>([]);

  // Paso 2: Mapeo de Columnas
  const [columnasHoja, setColumnasHoja] = useState<string[]>([]);
  const [mapeo, setMapeo] = useState<Record<string, CampoCensoDestino>>({});

  // Paso 3: Previsualización reactiva
  const [filasPreview, setFilasPreview] = useState<FilaSanitizadaPreview[]>([]);
  const [advertenciasSanitizacion, setAdvertenciasSanitizacion] = useState<string[]>([]);
  const [parsedDataFinal, setParsedDataFinal] = useState<ParsedCensoExcel | null>(null);
  const [filtroBusqueda, setFiltroBusqueda] = useState('');

  // Paso 4: Resultado final
  const [submitting, setSubmitting] = useState(false);
  const [resultado, setResultado] = useState<{
    inmueblesCreados: number;
    inmueblesActualizados: number;
    parqueaderosProcesados: number;
    bodegasProcesadas: number;
    residentesProcesados?: number;
    vehiculosProcesados?: number;
    mascotasProcesadas?: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const reiniciarTodo = () => {
    setPaso(1);
    setFile(null);
    setLibro(null);
    setMultiSheetData(null);
    setHojaSeleccionada('');
    setRawRows([]);
    setColumnasHoja([]);
    setMapeo({});
    setFilasPreview([]);
    setAdvertenciasSanitizacion([]);
    setParsedDataFinal(null);
    setResultado(null);
    setErrorGlobal('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCerrar = () => {
    reiniciarTodo();
    onClose();
  };

  // -------------------------------------------------------------------------
  // MANEJADORES DE ARCHIVO Y CARGA
  // -------------------------------------------------------------------------

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    await procesarArchivo(selected);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (!dropped) return;
    await procesarArchivo(dropped);
  };

  const procesarArchivo = async (f: File) => {
    setFile(f);
    setErrorGlobal('');
    setLoading(true);

    try {
      const [libroAnalizado, parsedMulti] = await Promise.all([
        analizarLibroExcel(f),
        parsearExcelCenso(f).catch(() => null),
      ]);
      setLibro(libroAnalizado);
      setMultiSheetData(parsedMulti);

      const hojaInicial = libroAnalizado.hojaRecomendada || libroAnalizado.hojas[0]?.nombre || '';
      setHojaSeleccionada(hojaInicial);

      // Cargar datos de la hoja inicial
      await cargarDatosHoja(f, hojaInicial);
    } catch (err) {
      console.error(err);
      setErrorGlobal('No se pudo leer el archivo Excel. Verifica que sea un archivo válido (.xlsx o .xls).');
    } finally {
      setLoading(false);
    }
  };

  const cargarDatosHoja = async (archivo: File, nombreHoja: string) => {
    const buffer = await archivo.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array' });
    const ws = wb.Sheets[nombreHoja];
    if (!ws) return;

    const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
    const cols = rows.length > 0 ? Object.keys(rows[0]) : [];

    setRawRows(rows);
    setColumnasHoja(cols);

    // Generar sugerencia automática de mapeo
    const mapeoSugerido = sugerirMapeoColumnas(cols);
    setMapeo(mapeoSugerido);
  };

  const cambiarHojaSeleccionada = async (nombreHoja: string) => {
    setHojaSeleccionada(nombreHoja);
    if (file) {
      await cargarDatosHoja(file, nombreHoja);
    }
  };

  // -------------------------------------------------------------------------
  // NAVEGACIÓN DEL WIZARD
  // -------------------------------------------------------------------------

  const avanzarAPaso2 = () => {
    if (!hojaSeleccionada || rawRows.length === 0) {
      setErrorGlobal('Selecciona una hoja que contenga registros.');
      return;
    }
    setErrorGlobal('');
    setPaso(2);
  };

  const avanzarAPaso3 = () => {
    // Validar que al menos se haya mapeado el número de apto
    const hasNumeroApto = Object.values(mapeo).includes('numeroApto');
    if (!hasNumeroApto) {
      setErrorGlobal('Debes asociar al menos una columna con "Número de Inmueble / Apartamento".');
      return;
    }

    setErrorGlobal('');
    // Ejecutar pipeline de sanitización heurística y desdoblamiento
    const transformacion = transformarHojaExcel(rawRows, mapeo);

    // Si el libro es plantilla multi-hoja y contiene hojas adicionales (Residentes, Parqueaderos, Bodegas, Mascotas, Vehiculos),
    // enriquecer la vista previa y el payload final con dichos datos.
    const extraResidentes = multiSheetData?.residentes ?? [];
    const extraParqueaderos = multiSheetData?.parqueaderos ?? [];
    const extraBodegas = multiSheetData?.bodegas ?? [];
    const extraMascotas = multiSheetData?.mascotas ?? [];
    const extraVehiculos = multiSheetData?.vehiculos ?? [];

    // Consolidar parqueaderos de hoja principal y hojas complementarias
    const parqMap = new Map<string, (typeof transformacion.parsedData.parqueaderos)[number]>();
    transformacion.parsedData.parqueaderos.forEach((p) => {
      const k = `${normalizarTorre(p.torreAsignada).toLowerCase()}__${p.numeroParqueadero.trim().toUpperCase()}`;
      parqMap.set(k, p);
    });
    extraParqueaderos.forEach((p) => {
      const k = `${normalizarTorre(p.torreAsignada).toLowerCase()}__${p.numeroParqueadero.trim().toUpperCase()}`;
      if (!parqMap.has(k)) {
        parqMap.set(k, p);
      } else {
        const exist = parqMap.get(k)!;
        if (!exist.aptoAsignado && p.aptoAsignado) exist.aptoAsignado = p.aptoAsignado;
        if (!exist.torreAsignada && p.torreAsignada) exist.torreAsignada = p.torreAsignada;
      }
    });
    const parqueaderosCombinados = Array.from(parqMap.values());

    // Consolidar vehículos
    const vehMap = new Map<string, (typeof extraVehiculos)[number]>();
    transformacion.parsedData.vehiculos.forEach((v) => {
      const k = `${normalizarTorre(v.torre).toLowerCase()}_${(v.apto || '').trim().toLowerCase()}_${(v.placa || '').toUpperCase()}`;
      vehMap.set(k, v);
    });
    extraVehiculos.forEach((v) => {
      const k = `${normalizarTorre(v.torre).toLowerCase()}_${(v.apto || '').trim().toLowerCase()}_${(v.placa || '').toUpperCase()}`;
      if (!vehMap.has(k)) {
        vehMap.set(k, v);
      }
    });
    const vehiculosCombinados = Array.from(vehMap.values());

    // Consolidar mascotas
    const masMap = new Map<string, (typeof extraMascotas)[number]>();
    transformacion.parsedData.mascotas.forEach((m) => {
      const k = `${normalizarTorre(m.torre).toLowerCase()}_${(m.apto || '').trim().toLowerCase()}_${m.nombre.trim().toLowerCase()}`;
      masMap.set(k, m);
    });
    extraMascotas.forEach((m) => {
      const k = `${normalizarTorre(m.torre).toLowerCase()}_${(m.apto || '').trim().toLowerCase()}_${m.nombre.trim().toLowerCase()}`;
      if (!masMap.has(k)) {
        masMap.set(k, m);
      }
    });
    const mascotasCombinadas = Array.from(masMap.values());

    const filasEnriquecidas = transformacion.filasPreview.map((fila) => {
      const claveUnidad = `${normalizarTorre(fila.torre).toLowerCase()}_${fila.numeroApto.trim().toLowerCase()}`;
      const idLegible = fila.torre ? `${normalizarTorre(fila.torre)} - Apto ${fila.numeroApto.trim()}`.toLowerCase() : `apto ${fila.numeroApto.trim()}`.toLowerCase();

      // Parqueaderos asignados a esta unidad
      const parqsSet = new Set<string>(fila.parqueaderos || []);
      parqueaderosCombinados.forEach((p) => {
        const pKey = `${normalizarTorre(p.torreAsignada).toLowerCase()}_${(p.aptoAsignado || '').trim().toLowerCase()}`;
        if (pKey === claveUnidad) {
          parqsSet.add(p.numeroParqueadero);
        }
      });
      const parqsFinales = Array.from(parqsSet);

      // Vehículos asignados a esta unidad
      const vehsDeUnidad = vehiculosCombinados.filter((v) => {
        const vKey = `${normalizarTorre(v.torre).toLowerCase()}_${(v.apto || '').trim().toLowerCase()}`;
        const vId = (v.identificador || '').trim().toLowerCase();
        return vKey === claveUnidad || (vId && vId === idLegible);
      });
      const vehsResumen = vehsDeUnidad.map((v) => (v.placa ? `${v.placa} (${v.tipo})` : v.tipo));

      // Mascotas asignadas a esta unidad
      const mascDeUnidad = mascotasCombinadas.filter((m) => {
        const mKey = `${normalizarTorre(m.torre).toLowerCase()}_${(m.apto || '').trim().toLowerCase()}`;
        const mId = (m.identificador || '').trim().toLowerCase();
        return mKey === claveUnidad || (mId && mId === idLegible);
      });
      const mascResumen = mascDeUnidad.map((m) => `${m.nombre} (${m.tipo})`);

      const residentesDeHoja = extraResidentes.filter((r) => {
        const rKey = `${normalizarTorre(r.torre).toLowerCase()}_${(r.apto || '').trim().toLowerCase()}`;
        const rId = (r.identificador || '').trim().toLowerCase();
        return rKey === claveUnidad || (rId && rId === idLegible);
      });

      const personasCombinadas = [...fila.personas];
      const emailsSet = new Set(fila.emailsExtraidos);
      const telsSet = new Set(fila.telefonosExtraidos);

      residentesDeHoja.forEach((r) => {
        const condNorm: 'propietario' | 'arrendatario' | 'conviviente' = r.condicion?.toLowerCase().includes('prop')
          ? 'propietario'
          : r.condicion?.toLowerCase().includes('arrend')
            ? 'arrendatario'
            : 'conviviente';
        const yaExiste = personasCombinadas.some(
          (p) => p.nombreCompleto.trim().toLowerCase() === r.nombreCompleto.trim().toLowerCase(),
        );
        if (!yaExiste) {
          personasCombinadas.push({
            nombreCompleto: r.nombreCompleto,
            condicion: condNorm,
            esContactoPrincipal: Boolean(r.esContactoPrincipal),
            documento: r.documento,
            fechaNacimiento: r.fechaNacimiento,
            email: r.email,
            telefono: r.telefono,
          });
        }
        if (r.email) emailsSet.add(r.email);
        if (r.telefono) telsSet.add(r.telefono);
      });

      const emailsFinales = Array.from(emailsSet);
      const telsFinales = Array.from(telsSet);

      // Reclasificar menores de 18 años a convivientes y garantizar un contacto principal adulto
      personasCombinadas.forEach((p) => {
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
        }
      });

      let tieneAdultoPrincipal = false;
      personasCombinadas.forEach((p) => {
        let esMenor = false;
        if (p.fechaNacimiento) {
          const nac = new Date(p.fechaNacimiento);
          if (!isNaN(nac.getTime()) && new Date().getFullYear() - nac.getFullYear() < 18) {
            esMenor = true;
          }
        }
        if (!esMenor && p.esContactoPrincipal) {
          if (!tieneAdultoPrincipal) tieneAdultoPrincipal = true;
          else p.esContactoPrincipal = false;
        }
      });

      if (!tieneAdultoPrincipal && personasCombinadas.length > 0) {
        const primerAdulto = personasCombinadas.find((p) => {
          if (!p.fechaNacimiento) return true;
          const nac = new Date(p.fechaNacimiento);
          return isNaN(nac.getTime()) || new Date().getFullYear() - nac.getFullYear() >= 18;
        });
        if (primerAdulto) {
          primerAdulto.esContactoPrincipal = true;
        } else {
          personasCombinadas[0].esContactoPrincipal = true;
        }
      }

      return {
        ...fila,
        personas: personasCombinadas,
        emailsExtraidos: emailsFinales,
        telefonosExtraidos: telsFinales,
        parqueaderos: parqsFinales,
        vehiculosCount: vehsDeUnidad.length,
        mascotasCount: mascDeUnidad.length,
        vehiculosResumen: vehsResumen,
        mascotasResumen: mascResumen,
        estadoValidacion: fila.numeroApto ? ('valido' as const) : fila.estadoValidacion,
        mensajeValidacion: fila.numeroApto ? '' : fila.mensajeValidacion,
      };
    });

    const residentesCombinados = filasEnriquecidas.flatMap((f) =>
      f.personas.map((p) => ({
        torre: f.torre,
        apto: f.numeroApto,
        nombreCompleto: p.nombreCompleto,
        documento: p.documento,
        condicion: p.condicion,
        esContactoPrincipal: p.esContactoPrincipal,
        fechaNacimiento: p.fechaNacimiento,
        telefono: p.telefono,
        email: p.email,
      })),
    );

    const parsedEnriquecido: ParsedCensoExcel = {
      ...transformacion.parsedData,
      parqueaderos: parqueaderosCombinados,
      bodegas: extraBodegas,
      residentes: residentesCombinados,
      mascotas: mascotasCombinadas,
      vehiculos: vehiculosCombinados,
      estadisticas: {
        ...transformacion.parsedData.estadisticas,
        totalParqueaderos: parqueaderosCombinados.length,
        parqueaderosPrivados: parqueaderosCombinados.filter((p) => !p.esVisitante).length,
        parqueaderosVisitantes: parqueaderosCombinados.filter((p) => p.esVisitante).length,
        totalBodegas: extraBodegas.length,
        totalResidentes: residentesCombinados.length,
        totalMascotas: mascotasCombinadas.length,
        totalVehiculos: vehiculosCombinados.length,
      },
    };

    setFilasPreview(filasEnriquecidas);
    const advertenciasReales = [...transformacion.advertencias, ...(multiSheetData?.advertencias ?? [])].filter(
      (adv) => !adv.toLowerCase().includes('consolidado de copropiedad') && !adv.toLowerCase().includes('procesado:'),
    );
    setAdvertenciasSanitizacion(advertenciasReales);
    setParsedDataFinal(parsedEnriquecido);
    setPaso(3);
  };

  // Actualizar mapeo manual de una columna
  const actualizarMapeoColumna = (colName: string, destino: CampoCensoDestino) => {
    setMapeo((prev) => ({
      ...prev,
      [colName]: destino,
    }));
  };

  // Edición rápida en celda en la vista previa
  const actualizarFilaPreview = (filaId: string, campo: 'numeroApto' | 'torre' | 'coeficiente' | 'tipoOcupacion', valor: unknown) => {
    setFilasPreview((prev) =>
      prev.map((f) => {
        if (f.id !== filaId) return f;
        const actualizada = { ...f, [campo]: valor };
        // Recalcular estado de validación
        if (!actualizada.numeroApto) {
          actualizada.estadoValidacion = 'error';
          actualizada.mensajeValidacion = 'Falta número de apartamento';
        } else {
          actualizada.estadoValidacion = 'valido';
          actualizada.mensajeValidacion = '';
        }
        return actualizada;
      }),
    );
  };

  const alternarContactoPrincipal = (filaId: string, nombrePersona: string) => {
    setFilasPreview((prev) =>
      prev.map((f) => {
        if (f.id !== filaId) return f;
        const personasActualizadas = f.personas.map((p) => ({
          ...p,
          esContactoPrincipal: p.nombreCompleto === nombrePersona,
        }));
        return { ...f, personas: personasActualizadas };
      }),
    );
  };

  // Confirmar e importar definitivo a la base de datos
  const handleImportarDefinitivo = async () => {
    if (!parsedDataFinal || filasPreview.length === 0) return;
    setSubmitting(true);
    setErrorGlobal('');

    try {
      // Mapa de atributos físicos adicionales provenientes de la hoja o plantilla oficial
      const fisicosMap = new Map<string, (typeof parsedDataFinal.inmuebles)[number]>();
      for (const inm of [...(multiSheetData?.inmuebles ?? []), ...parsedDataFinal.inmuebles]) {
        const k = `${normalizarTorre(inm.torre).toLowerCase()}_${inm.numeroApto.trim().toLowerCase()}`;
        fisicosMap.set(k, { ...fisicosMap.get(k), ...inm });
      }

      // Re-sincronizar los inmuebles y residentes con las posibles ediciones manuales en el grid
      const inmueblesActualizados = filasPreview
        .filter((f) => Boolean(f.numeroApto))
        .map((f) => {
          const k = `${normalizarTorre(f.torre).toLowerCase()}_${f.numeroApto.trim().toLowerCase()}`;
          const base = fisicosMap.get(k);
          return {
            ...base,
            numeroApto: f.numeroApto,
            torre: f.torre,
            coeficiente: f.coeficiente,
            tipoOcupacion: f.tipoOcupacion,
          };
        });

      const residentesActualizados = filasPreview
        .filter((f) => Boolean(f.numeroApto))
        .flatMap((f) =>
          f.personas.map((p) => {
            let esMenor = false;
            if (p.fechaNacimiento) {
              const nac = new Date(p.fechaNacimiento);
              if (!isNaN(nac.getTime()) && new Date().getFullYear() - nac.getFullYear() < 18) {
                esMenor = true;
              }
            }
            return {
              torre: f.torre,
              apto: f.numeroApto,
              nombreCompleto: p.nombreCompleto,
              ...(p.documento ? { documento: p.documento } : {}),
              condicion: esMenor ? ('conviviente' as const) : p.condicion,
              esContactoPrincipal: esMenor ? false : p.esContactoPrincipal,
              ...(p.fechaNacimiento ? { fechaNacimiento: p.fechaNacimiento } : {}),
              telefono: p.telefono,
              email: p.email,
            };
          }),
        );

      const vehiculosSaneados = (parsedDataFinal.vehiculos ?? [])
        .filter((v) => Boolean(v.apto && (v.placa || v.tipo || v.marca || v.color)))
        .map((v) => {
          let rawPlaca = String(v.placa || '').trim().toUpperCase().replace(/[\s\-]/g, '');
          if (!rawPlaca && v.color && /^[A-Z]{3}\-?[0-9]{2}[0-9A-Z]?$/i.test(String(v.color).trim())) {
            rawPlaca = String(v.color).trim().toUpperCase().replace(/[\s\-]/g, '');
          } else if (!rawPlaca && v.marca && /^[A-Z]{3}\-?[0-9]{2}[0-9A-Z]?$/i.test(String(v.marca).trim())) {
            rawPlaca = String(v.marca).trim().toUpperCase().replace(/[\s\-]/g, '');
          }
          const tipoNorm = v.tipo === 'moto' ? 'moto' : v.tipo === 'bicicleta' ? 'bicicleta' : 'carro';
          let placaFinal = rawPlaca;
          if (placaFinal.length >= 3 && placaFinal.length <= 10) {
            // Válida
          } else if (placaFinal.length > 10) {
            placaFinal = placaFinal.slice(0, 10);
          } else if (tipoNorm === 'bicicleta') {
            placaFinal = 'BIC-SN';
          } else if (tipoNorm === 'moto') {
            placaFinal = `MOT-SN-${v.apto}`.slice(0, 10);
          } else {
            placaFinal = `VEH-SN-${v.apto}`.slice(0, 10);
          }
          return {
            ...v,
            tipo: tipoNorm,
            placa: placaFinal,
          };
        });

      const res = await apiFetch('/censo/importar-masivo', {
        method: 'POST',
        body: JSON.stringify({
          inmuebles: inmueblesActualizados,
          parqueaderos: parsedDataFinal.parqueaderos ?? [],
          bodegas: parsedDataFinal.bodegas ?? [],
          residentes: residentesActualizados,
          mascotas: parsedDataFinal.mascotas ?? [],
          vehiculos: vehiculosSaneados,
        }),
      });

      setResultado({
        inmueblesCreados: res.inmueblesCreados ?? 0,
        inmueblesActualizados: res.inmueblesActualizados ?? 0,
        parqueaderosProcesados: res.parqueaderosProcesados ?? (parsedDataFinal.parqueaderos?.length ?? 0),
        bodegasProcesadas: res.bodegasProcesadas ?? (parsedDataFinal.bodegas?.length ?? 0),
        residentesProcesados: res.residentesProcesados ?? residentesActualizados.length,
        vehiculosProcesados: res.vehiculosProcesados ?? (parsedDataFinal.vehiculos?.length ?? 0),
        mascotasProcesadas: res.mascotasProcesadas ?? (parsedDataFinal.mascotas?.length ?? 0),
      });

      setPaso(4);
      onSuccess();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al procesar la importación masiva';
      setErrorGlobal(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Filtrar filas de vista previa según búsqueda
  const filasFiltradas = useMemo(() => {
    if (!filtroBusqueda.trim()) return filasPreview;
    const term = filtroBusqueda.toLowerCase();
    return filasPreview.filter(
      (f) =>
        f.numeroApto.toLowerCase().includes(term) ||
        (f.torre && f.torre.toLowerCase().includes(term)) ||
        f.personas.some((p) => p.nombreCompleto.toLowerCase().includes(term) || (p.email && p.email.toLowerCase().includes(term))),
    );
  }, [filasPreview, filtroBusqueda]);

  const totalResidentesEnPreview = useMemo(() => {
    return filasPreview.reduce((acc, f) => acc + f.personas.length, 0);
  }, [filasPreview]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={handleCerrar}
    >
      <div
        className={`card bg-base-100 rounded-box shadow-2xl border border-base-200 w-full transition-all duration-300 max-h-[92vh] flex flex-col ${
          paso === 2 || paso === 3 ? 'max-w-5xl' : 'max-w-2xl'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Modal */}
        <div className="px-5 py-3.5 border-b border-base-200 shrink-0 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="icon-[tabler--file-spreadsheet] text-success text-xl shrink-0" />
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-base-content leading-tight">
                Importar Censo
              </h2>
              <p className="text-2xs text-base-content/60 truncate">
                {edificioNombre}
              </p>
            </div>
          </div>

          {/* Stepper Minimalista */}
          {paso < 4 && (
            <div className="flex items-center gap-1.5 text-xs text-base-content/60">
              <span className={`px-2 py-0.5 rounded text-2xs font-medium transition-colors ${paso === 1 ? 'bg-primary/10 text-primary font-semibold' : ''}`}>1. Archivo</span>
              <span className="text-base-content/20">/</span>
              <span className={`px-2 py-0.5 rounded text-2xs font-medium transition-colors ${paso === 2 ? 'bg-primary/10 text-primary font-semibold' : ''}`}>2. Columnas</span>
              <span className="text-base-content/20">/</span>
              <span className={`px-2 py-0.5 rounded text-2xs font-medium transition-colors ${paso === 3 ? 'bg-primary/10 text-primary font-semibold' : ''}`}>3. Revisión</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleCerrar}
            className="btn btn-circle btn-xs btn-ghost shrink-0"
            aria-label="Cerrar modal"
          >
            ✕
          </button>
        </div>

        {/* Contenido Principal con Scroll */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 flex-1">
          {errorGlobal && (
            <div className="alert alert-error text-xs flex items-center justify-between gap-2 py-2">
              <div className="flex items-center gap-2">
                <span className="icon-[tabler--alert-circle] text-base shrink-0" />
                <span>{errorGlobal}</span>
              </div>
              <button type="button" onClick={() => setErrorGlobal('')} className="btn btn-ghost btn-2xs">✕</button>
            </div>
          )}

          {/* =========================================================================
              PASO 1: CARGA DE ARCHIVO Y SELECCIÓN DE HOJA
              ========================================================================= */}
          {paso === 1 && (
            <div className="space-y-3.5">
              {/* Zona de Carga Drag & Drop */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  file ? 'border-primary/50 bg-primary/5' : 'border-base-content/20 hover:border-primary/40 hover:bg-base-200/20'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <span className="icon-[tabler--cloud-upload] text-3xl text-primary mx-auto mb-2 block" />

                {file ? (
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-base-content">{file.name}</p>
                    <p className="text-2xs text-base-content/60">
                      {(file.size / 1024).toFixed(1)} KB — Clic para cambiar de archivo
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-base-content">
                      Selecciona o arrastra el archivo Excel (.xlsx, .xls)
                    </p>
                    <p className="text-2xs text-base-content/50">
                      Compatible con plantillas oficiales y consolidados con pestañas de vehículos y mascotas
                    </p>
                  </div>
                )}
              </div>

              {/* Plantillas de Referencia en una sola línea sutil */}
              <div className="flex items-center justify-between text-2xs text-base-content/60 px-1">
                <span>¿No tienes un archivo estructurado?</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => descargarPlantillaExcel(edificioNombre)}
                    className="text-primary hover:underline font-medium"
                  >
                    Plantilla Básica
                  </button>
                  <span>·</span>
                  <button
                    type="button"
                    onClick={() => descargarPlantillaCompletaExcel(edificioNombre)}
                    className="text-primary hover:underline font-medium"
                  >
                    Plantilla Completa
                  </button>
                </div>
              </div>

              {loading && (
                <div className="flex items-center justify-center gap-2 py-4 text-xs text-base-content/70">
                  <span className="loading loading-spinner loading-sm" />
                  <span>Analizando hojas del archivo...</span>
                </div>
              )}

              {/* Selector de Hojas Detectadas */}
              {libro && !loading && (
                <div className="space-y-2 pt-1">
                  <div className="text-xs font-semibold text-base-content">
                    Pestaña de apartamentos:
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {libro.hojas.map((h) => {
                      const isSelected = hojaSeleccionada === h.nombre;
                      return (
                        <div
                          key={h.nombre}
                          onClick={() => cambiarHojaSeleccionada(h.nombre)}
                          className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                            isSelected
                              ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                              : 'border-base-200 bg-base-200/20 hover:border-base-content/20'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-xs font-medium text-base-content truncate flex items-center gap-1.5">
                              <span className="icon-[tabler--table] text-sm text-primary shrink-0" />
                              {h.nombre}
                            </div>
                            <div className="text-2xs text-base-content/50 shrink-0">
                              {h.totalFilas} filas
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =========================================================================
              PASO 2: MAPEO INTELIGENTE DE COLUMNAS
              ========================================================================= */}
          {paso === 2 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b pb-2 border-base-content/10">
                <div>
                  <h3 className="text-sm font-semibold text-base-content">
                    Columnas de &quot;{hojaSeleccionada}&quot;
                  </h3>
                  {multiSheetData && (multiSheetData.vehiculos.length > 0 || multiSheetData.mascotas.length > 0 || multiSheetData.residentes.length > 0) && (
                    <p className="text-2xs text-base-content/60 pt-0.5">
                      Vinculados automáticamente:{' '}
                      {[
                        multiSheetData.vehiculos.length > 0 && `${multiSheetData.vehiculos.length} vehículos`,
                        multiSheetData.mascotas.length > 0 && `${multiSheetData.mascotas.length} mascotas`,
                        multiSheetData.residentes.length > 0 && `${multiSheetData.residentes.length} personas adicionales`,
                      ].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setMapeo(sugerirMapeoColumnas(columnasHoja))}
                  className="btn btn-ghost btn-xs gap-1 text-primary"
                >
                  <span className="icon-[tabler--refresh] text-xs" />
                  Auto-detectar
                </button>
              </div>

              <div className="space-y-1.5 max-h-[52vh] overflow-y-auto pr-1">
                {columnasHoja
                  .filter((col) => col.trim() && !col.startsWith('__EMPTY'))
                  .map((colName) => {
                    const destinoActual = mapeo[colName] || 'ignorar';
                    const ejemplos = rawRows
                      .map((r) => String(r[colName] || '').trim())
                      .filter((val) => val.length > 0)
                      .slice(0, 2)
                      .join(' · ');

                    const isMapped = destinoActual !== 'ignorar';

                    return (
                      <div
                        key={colName}
                        className={`px-3 py-2 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-colors ${
                          isMapped ? 'border-primary/20 bg-primary/5' : 'border-base-200 bg-base-200/20'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-semibold text-base-content">{colName}</span>
                          {ejemplos && (
                            <p className="text-2xs text-base-content/50 truncate pt-0.5">
                              {ejemplos}
                            </p>
                          )}
                        </div>

                        <div className="sm:w-64 shrink-0">
                          <select
                            value={destinoActual}
                            onChange={(e) => actualizarMapeoColumna(colName, e.target.value as CampoCensoDestino)}
                            className="select select-xs select-bordered w-full text-xs font-medium"
                          >
                            {DESTINOS_OPCIONES.map((op) => (
                              <option key={op.valor} value={op.valor}>
                                {op.etiqueta}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* =========================================================================
              PASO 3: GRID INTERACTIVO DE PREVISUALIZACIÓN Y SANITIZACIÓN
              ========================================================================= */}
          {paso === 3 && (
            <div className="space-y-3">
              {/* Barra de Resumen Compacta */}
              <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 rounded-lg bg-base-200/50 border border-base-200 text-xs">
                <div className="flex flex-wrap items-center gap-3 text-base-content/80 font-medium">
                  <span><strong className="text-base-content font-bold">{filasPreview.length}</strong> inmuebles</span>
                  <span className="text-base-content/20">•</span>
                  <span><strong className="text-base-content font-bold">{totalResidentesEnPreview}</strong> personas</span>
                  <span className="text-base-content/20">•</span>
                  <span><strong className="text-base-content font-bold">{parsedDataFinal?.parqueaderos?.length ?? 0}</strong> parqueaderos</span>
                  <span className="text-base-content/20">•</span>
                  <span><strong className="text-base-content font-bold">{parsedDataFinal?.vehiculos?.length ?? 0}</strong> vehículos</span>
                  <span className="text-base-content/20">•</span>
                  <span><strong className="text-base-content font-bold">{parsedDataFinal?.mascotas?.length ?? 0}</strong> mascotas</span>
                </div>
                <div className="text-2xs text-base-content/60">
                  {filasPreview.filter((f) => f.tipoOcupacion === 'habitada').length} habitadas · {filasPreview.filter((f) => f.tipoOcupacion === 'desocupada').length} desocupadas
                </div>
              </div>

              {/* Advertencias Heurísticas */}
              {advertenciasSanitizacion.length > 0 && (
                <div className="alert alert-warning text-xs py-2 px-3 flex items-start gap-2">
                  <span className="icon-[tabler--info-circle] text-base shrink-0 mt-0.5" />
                  <div className="space-y-0.5 text-2xs flex-1">
                    {advertenciasSanitizacion.slice(0, 2).map((adv, idx) => (
                      <div key={idx}>{adv}</div>
                    ))}
                  </div>
                </div>
              )}

              {/* Barra de Filtro de Búsqueda */}
              <div className="flex items-center justify-between gap-2">
                <div className="relative flex-1 max-w-xs">
                  <input
                    type="text"
                    value={filtroBusqueda}
                    onChange={(e) => setFiltroBusqueda(e.target.value)}
                    placeholder="Buscar por apto, nombre o correo..."
                    className="input input-xs input-bordered w-full text-xs pl-7"
                  />
                  <span className="icon-[tabler--search] absolute left-2 top-2 text-base-content/40 text-xs" />
                </div>
                <span className="text-2xs text-base-content/60">
                  Mostrando {filasFiltradas.length} de {filasPreview.length} registros
                </span>
              </div>

              {/* Tabla Editable */}
              <div className="border border-base-200 rounded-xl overflow-x-auto max-h-[48vh]">
                <table className="table table-xs table-pin-rows">
                  <thead>
                    <tr className="bg-base-200/60 text-xs">
                      <th>Estado</th>
                      <th>Apto</th>
                      <th>Torre</th>
                      <th>Coef.</th>
                      <th>Ocupación</th>
                      <th>Residentes</th>
                      <th>Contacto</th>
                      <th>Dotación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filasFiltradas.map((fila) => (
                      <tr key={fila.id} className="hover:bg-base-200/30">
                        {/* Estado */}
                        <td>
                          {fila.estadoValidacion === 'valido' && (
                            <span className="badge badge-success badge-xs text-3xs font-semibold">
                              ✓ Válido
                            </span>
                          )}
                          {fila.estadoValidacion === 'advertencia' && (
                            <span className="badge badge-warning badge-xs text-3xs font-semibold" title={fila.mensajeValidacion}>
                              ⚠ Alerta
                            </span>
                          )}
                          {fila.estadoValidacion === 'error' && (
                            <span className="badge badge-error badge-xs text-3xs font-semibold" title={fila.mensajeValidacion}>
                              ✕ Error
                            </span>
                          )}
                        </td>

                        {/* Número Apto (Editable) */}
                        <td className="w-20">
                          <input
                            type="text"
                            value={fila.numeroApto}
                            onChange={(e) => actualizarFilaPreview(fila.id, 'numeroApto', e.target.value)}
                            className="input input-2xs input-bordered w-16 font-bold"
                          />
                        </td>

                        {/* Torre (Editable) */}
                        <td className="w-20">
                          <input
                            type="text"
                            value={fila.torre || ''}
                            onChange={(e) => actualizarFilaPreview(fila.id, 'torre', e.target.value)}
                            placeholder="Torre"
                            className="input input-2xs input-bordered w-16 text-xs"
                          />
                        </td>

                        {/* Coeficiente (Editable) */}
                        <td className="w-20">
                          <input
                            type="number"
                            step="0.0001"
                            value={fila.coeficiente !== undefined ? fila.coeficiente : ''}
                            onChange={(e) => actualizarFilaPreview(fila.id, 'coeficiente', parseFloat(e.target.value) || 0)}
                            placeholder="0.0000"
                            className="input input-2xs input-bordered w-16 text-xs"
                          />
                        </td>

                        {/* Ocupación */}
                        <td className="w-24">
                          <select
                            value={fila.tipoOcupacion}
                            onChange={(e) => actualizarFilaPreview(fila.id, 'tipoOcupacion', e.target.value)}
                            className="select select-2xs select-bordered w-22 text-2xs"
                          >
                            <option value="habitada">Habitada</option>
                            <option value="desocupada">Desocupada</option>
                          </select>
                        </td>

                        {/* Personas Desdobladas */}
                        <td className="max-w-xs">
                          {fila.personas.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {fila.personas.map((p, idx) => {
                                let esMenor = false;
                                if (p.fechaNacimiento) {
                                  const nac = new Date(p.fechaNacimiento);
                                  if (!isNaN(nac.getTime()) && new Date().getFullYear() - nac.getFullYear() < 18) {
                                    esMenor = true;
                                  }
                                }
                                const badgeClass = p.esContactoPrincipal
                                  ? 'badge badge-xs badge-soft badge-primary font-medium'
                                  : p.condicion === 'propietario'
                                    ? 'badge badge-xs badge-soft badge-success'
                                    : p.condicion === 'arrendatario'
                                      ? 'badge badge-xs badge-soft badge-info'
                                      : 'badge badge-xs badge-soft text-base-content/80';
                                return (
                                  <span
                                    key={idx}
                                    className={`${badgeClass} text-3xs`}
                                    title={`${p.nombreCompleto} (${p.condicion}${esMenor ? ' · menor' : ''}${p.esContactoPrincipal ? ' · contacto principal' : ''})`}
                                  >
                                    {p.nombreCompleto}
                                    {esMenor ? ' (menor)' : ''}
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-2xs text-base-content/40 italic">
                              {fila.tipoOcupacion === 'desocupada' ? 'Desocupada' : 'Sin residentes'}
                            </span>
                          )}
                        </td>

                        {/* Contacto Limpio */}
                        <td className="text-2xs max-w-xs truncate">
                          {fila.emailsExtraidos.length > 0 && (
                            <div className="text-primary truncate">{fila.emailsExtraidos.join(', ')}</div>
                          )}
                          {fila.telefonosExtraidos.length > 0 && (
                            <div className="text-base-content/60 truncate">{fila.telefonosExtraidos.join(' · ')}</div>
                          )}
                        </td>

                        {/* Dotación: Parqueadero, Vehículos y Mascotas */}
                        <td className="text-2xs max-w-xs">
                          <div className="flex flex-wrap items-center gap-1">
                            {fila.parqueaderos && fila.parqueaderos.length > 0 ? (
                              <span className="badge badge-success badge-outline badge-xs text-3xs font-semibold gap-0.5">
                                🚗 PQ: {fila.parqueaderos.join(', ')}
                              </span>
                            ) : null}
                            {Boolean(fila.vehiculosCount && fila.vehiculosCount > 0) && (
                              <span
                                className="badge badge-info badge-outline badge-xs text-3xs font-semibold gap-0.5 cursor-help"
                                title={fila.vehiculosResumen?.join(' · ')}
                              >
                                🚘 {fila.vehiculosCount} veh
                              </span>
                            )}
                            {Boolean(fila.mascotasCount && fila.mascotasCount > 0) && (
                              <span
                                className="badge badge-secondary badge-outline badge-xs text-3xs font-semibold gap-0.5 cursor-help"
                                title={fila.mascotasResumen?.join(' · ')}
                              >
                                🐾 {fila.mascotasCount} masc
                              </span>
                            )}
                            {(!fila.parqueaderos || fila.parqueaderos.length === 0) &&
                              (!fila.vehiculosCount || fila.vehiculosCount === 0) &&
                              (!fila.mascotasCount || fila.mascotasCount === 0) && (
                                <span className="text-base-content/40 text-3xs italic">—</span>
                              )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =========================================================================
              PASO 4: PANTALLA DE ÉXITO FINAL
              ========================================================================= */}
          {paso === 4 && resultado && (
            <div className="text-center py-8 space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success">
                <span className="icon-[tabler--circle-check] text-3xl" />
              </div>
              <h3 className="text-lg font-bold text-base-content">
                Censo Importado con Éxito
              </h3>
              <p className="text-xs text-base-content/70 max-w-sm mx-auto">
                La información del censo y las dotaciones asociadas se registraron correctamente.
              </p>

              <div className="p-3 rounded-xl bg-base-200/50 border border-base-200 max-w-md mx-auto text-xs flex flex-wrap items-center justify-center gap-3 font-medium text-base-content/80">
                <span><strong>{resultado.inmueblesCreados + resultado.inmueblesActualizados}</strong> inmuebles</span>
                <span>•</span>
                <span><strong>{resultado.residentesProcesados}</strong> personas</span>
                <span>•</span>
                <span><strong>{resultado.parqueaderosProcesados}</strong> parqueaderos</span>
                {Boolean(resultado.vehiculosProcesados && resultado.vehiculosProcesados > 0) && (
                  <>
                    <span>•</span>
                    <span><strong>{resultado.vehiculosProcesados}</strong> vehículos</span>
                  </>
                )}
                {Boolean(resultado.mascotasProcesadas && resultado.mascotasProcesadas > 0) && (
                  <>
                    <span>•</span>
                    <span><strong>{resultado.mascotasProcesadas}</strong> mascotas</span>
                  </>
                )}
              </div>

              <div className="pt-2 flex justify-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPaso(1);
                    setFile(null);
                    setLibro(null);
                    setResultado(null);
                  }}
                  className="btn btn-xs btn-outline"
                >
                  Cargar otro archivo
                </button>
                <button type="button" onClick={handleCerrar} className="btn btn-xs btn-primary">
                  Aceptar y Finalizar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Pie de Acciones / Navegación */}
        {paso < 4 && (
          <div className="px-5 py-3 border-t border-base-200 flex items-center justify-between gap-2 shrink-0 bg-base-100">
            {paso === 1 && (
              <>
                <button type="button" onClick={handleCerrar} className="btn btn-xs btn-ghost">
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={!file || !hojaSeleccionada || loading}
                  onClick={avanzarAPaso2}
                  className="btn btn-xs btn-primary gap-1"
                >
                  <span>Continuar</span>
                  <span className="icon-[tabler--chevron-right] text-xs" />
                </button>
              </>
            )}

            {paso === 2 && (
              <>
                <button
                  type="button"
                  onClick={() => setPaso(1)}
                  className="btn btn-xs btn-outline gap-1"
                >
                  <span className="icon-[tabler--chevron-left] text-xs" />
                  <span>Atrás</span>
                </button>
                <button
                  type="button"
                  onClick={avanzarAPaso3}
                  className="btn btn-xs btn-primary gap-1"
                >
                  <span>Continuar</span>
                  <span className="icon-[tabler--chevron-right] text-xs" />
                </button>
              </>
            )}

            {paso === 3 && (
              <>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setPaso(2)}
                  className="btn btn-xs btn-outline gap-1"
                >
                  <span className="icon-[tabler--chevron-left] text-xs" />
                  <span>Ajustar Mapeo</span>
                </button>
                <button
                  type="button"
                  disabled={submitting || filasPreview.length === 0}
                  onClick={handleImportarDefinitivo}
                  className="btn btn-xs btn-primary gap-1.5"
                >
                  {submitting && <span className="loading loading-spinner loading-xs" />}
                  <span className="icon-[tabler--database-import] text-xs" />
                  <span>
                    Importar Censo ({filasPreview.length} unidades)
                  </span>
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
