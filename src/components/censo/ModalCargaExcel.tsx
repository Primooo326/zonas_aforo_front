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
  { valor: 'numeroApto', etiqueta: '🏢 Número de Inmueble / Apartamento (Obligatorio)', descripcion: 'Identificador del apto o casa' },
  { valor: 'torre', etiqueta: '🏙️ Torre / Bloque / Manzana', descripcion: 'Torre del edificio' },
  { valor: 'coeficiente', etiqueta: '📊 Coeficiente de Copropiedad', descripcion: 'Porcentaje o alícuota de copropiedad' },
  { valor: 'nombrePropietario', etiqueta: '👤 Nombre del Propietario', descripcion: 'Titular o propietario del inmueble' },
  { valor: 'residentes', etiqueta: '👥 Residentes / Convivientes', descripcion: 'Nombres de las personas que habitan la unidad' },
  { valor: 'documento', etiqueta: '🪪 Documento / Cédula', descripcion: 'Documento de identidad del titular' },
  { valor: 'fechaNacimiento', etiqueta: '🎂 Fecha de Nacimiento', descripcion: 'Fecha de nacimiento del residente' },
  { valor: 'email', etiqueta: '✉️ Correo(s) Electrónico(s)', descripcion: 'Emails de contacto' },
  { valor: 'telefono', etiqueta: '📞 Teléfono(s) / Celular(es)', descripcion: 'Teléfonos de contacto' },
  { valor: 'tipoOcupacion', etiqueta: '🚪 Estado de Ocupación', descripcion: 'Habitada o desocupada' },
  { valor: 'metrosCuadrados', etiqueta: '📐 Metros Cuadrados (Área)', descripcion: 'Área privada' },
  { valor: 'cuartos', etiqueta: '🛏️ Habitaciones / Cuartos', descripcion: 'Número de alcobas' },
  { valor: 'banos', etiqueta: '🚿 Baños', descripcion: 'Número de baños' },
  { valor: 'ignorar', etiqueta: '❌ Ignorar esta columna', descripcion: 'No importar estos datos' },
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

    const filasEnriquecidas = transformacion.filasPreview.map((fila) => {
      const claveUnidad = `${normalizarTorre(fila.torre).toLowerCase()}_${fila.numeroApto.trim().toLowerCase()}`;
      const idLegible = fila.torre ? `${normalizarTorre(fila.torre)} - Apto ${fila.numeroApto.trim()}`.toLowerCase() : `apto ${fila.numeroApto.trim()}`.toLowerCase();

      const residentesDeHoja = extraResidentes.filter((r) => {
        const rKey = `${normalizarTorre(r.torre).toLowerCase()}_${(r.apto || '').trim().toLowerCase()}`;
        const rId = (r.identificador || '').trim().toLowerCase();
        return rKey === claveUnidad || (rId && rId === idLegible);
      });

      if (residentesDeHoja.length === 0) return fila;

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

      return {
        ...fila,
        personas: personasCombinadas,
        emailsExtraidos: emailsFinales,
        telefonosExtraidos: telsFinales,
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
      parqueaderos: extraParqueaderos,
      bodegas: extraBodegas,
      residentes: residentesCombinados,
      mascotas: extraMascotas,
      vehiculos: extraVehiculos,
      estadisticas: {
        ...transformacion.parsedData.estadisticas,
        totalParqueaderos: extraParqueaderos.length,
        parqueaderosPrivados: extraParqueaderos.filter((p) => !p.esVisitante).length,
        parqueaderosVisitantes: extraParqueaderos.filter((p) => p.esVisitante).length,
        totalBodegas: extraBodegas.length,
        totalResidentes: residentesCombinados.length,
        totalMascotas: extraMascotas.length,
        totalVehiculos: extraVehiculos.length,
      },
    };

    setFilasPreview(filasEnriquecidas);
    setAdvertenciasSanitizacion([...transformacion.advertencias, ...(multiSheetData?.advertencias ?? [])]);
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
          f.personas.map((p) => ({
            torre: f.torre,
            apto: f.numeroApto,
            nombreCompleto: p.nombreCompleto,
            ...(p.documento ? { documento: p.documento } : {}),
            condicion: p.condicion,
            esContactoPrincipal: p.esContactoPrincipal,
            ...(p.fechaNacimiento ? { fechaNacimiento: p.fechaNacimiento } : {}),
            telefono: p.telefono,
            email: p.email,
          })),
        );

      const res = await apiFetch('/censo/importar-masivo', {
        method: 'POST',
        body: JSON.stringify({
          inmuebles: inmueblesActualizados,
          parqueaderos: parsedDataFinal.parqueaderos ?? [],
          bodegas: parsedDataFinal.bodegas ?? [],
          residentes: residentesActualizados,
          mascotas: parsedDataFinal.mascotas ?? [],
          vehiculos: parsedDataFinal.vehiculos ?? [],
        }),
      });

      setResultado({
        inmueblesCreados: res.inmueblesCreados ?? 0,
        inmueblesActualizados: res.inmueblesActualizados ?? 0,
        parqueaderosProcesados: res.parqueaderosProcesados ?? 0,
        bodegasProcesadas: res.bodegasProcesadas ?? 0,
        residentesProcesados: res.residentesProcesados ?? residentesActualizados.length,
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
        {/* Cabecera del Modal con Stepper */}
        <div className="p-4 sm:p-5 border-b border-base-content/10 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="icon-[tabler--file-spreadsheet] text-success text-2xl shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-bold text-base-content truncate">
                  Importador Universal de Censo e Inmuebles
                </h2>
                <p className="text-2xs text-base-content/60 truncate">
                  Carga archivos de cualquier formato con auto-detección y sanitización
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCerrar}
              className="btn btn-circle btn-sm btn-ghost shrink-0"
              aria-label="Cerrar modal"
            >
              ✕
            </button>
          </div>

          {/* Stepper Visual */}
          {paso < 4 && (
            <div className="grid grid-cols-3 gap-2 pt-4">
              <div
                className={`flex items-center gap-2 text-xs font-semibold pb-1.5 border-b-2 transition-colors ${
                  paso === 1 ? 'border-primary text-primary' : 'border-base-200 text-base-content/60'
                }`}
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-2xs">1</span>
                <span className="truncate">Archivo y Hoja</span>
              </div>
              <div
                className={`flex items-center gap-2 text-xs font-semibold pb-1.5 border-b-2 transition-colors ${
                  paso === 2 ? 'border-primary text-primary' : 'border-base-200 text-base-content/60'
                }`}
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-2xs">2</span>
                <span className="truncate">Mapeo de Columnas</span>
              </div>
              <div
                className={`flex items-center gap-2 text-xs font-semibold pb-1.5 border-b-2 transition-colors ${
                  paso === 3 ? 'border-primary text-primary' : 'border-base-200 text-base-content/60'
                }`}
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-2xs">3</span>
                <span className="truncate">Vista Previa & Limpieza</span>
              </div>
            </div>
          )}
        </div>

        {/* Contenido Principal con Scroll */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {errorGlobal && (
            <div className="alert alert-error text-xs flex items-center gap-2">
              <span className="icon-[tabler--alert-circle] text-base shrink-0" />
              <span>{errorGlobal}</span>
            </div>
          )}

          {/* =========================================================================
              PASO 1: CARGA DE ARCHIVO Y SELECCIÓN DE HOJA
              ========================================================================= */}
          {paso === 1 && (
            <div className="space-y-5">
              {/* Plantillas Oficiales */}
              <div className="p-3.5 rounded-xl bg-base-200/40 border border-base-200 space-y-2.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="text-xs font-semibold text-base-content flex items-center gap-1.5">
                    <span className="icon-[tabler--template] text-primary" />
                    ¿Aún no tienes un archivo estructurado? Descarga una plantilla oficial:
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={() => descargarPlantillaExcel(edificioNombre)}
                    className="btn btn-xs btn-outline gap-1.5 flex-1"
                  >
                    <span className="icon-[tabler--file-spreadsheet]" />
                    Plantilla Básica (Inmuebles)
                  </button>
                  <button
                    type="button"
                    onClick={() => descargarPlantillaCompletaExcel(edificioNombre)}
                    className="btn btn-xs btn-outline btn-primary gap-1.5 flex-1"
                  >
                    <span className="icon-[tabler--sparkles]" />
                    Plantilla Completa (Residentes y Vehículos)
                  </button>
                </div>
              </div>

              {/* Zona de Carga Drag & Drop */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                  file ? 'border-primary/50 bg-primary/5' : 'border-base-content/20 hover:border-primary/50 hover:bg-base-200/30'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <span className="icon-[tabler--cloud-upload] text-4xl text-primary mx-auto mb-2 block" />

                {file ? (
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-base-content">{file.name}</p>
                    <p className="text-xs text-base-content/60">
                      {(file.size / 1024).toFixed(1)} KB — Clic para cambiar de archivo
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-base-content">
                      Arrastra y suelta aquí cualquier archivo Excel, o{' '}
                      <span className="text-primary underline">haz clic para examinar</span>
                    </p>
                    <p className="text-2xs text-base-content/60">
                      Acepta cualquier orden de columnas, directorios mixtos o formatos (.xlsx, .xls)
                    </p>
                  </div>
                )}
              </div>

              {loading && (
                <div className="flex items-center justify-center gap-2 py-4 text-xs text-base-content/70">
                  <span className="loading loading-spinner loading-sm" />
                  <span>Analizando hojas y detectando columnas...</span>
                </div>
              )}

              {/* Selector de Hojas Detectadas */}
              {libro && !loading && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-base-content">
                      Pestañas encontradas en el libro ({libro.hojas.length}):
                    </span>
                    <span className="text-2xs text-base-content/60">Selecciona la hoja de apartamentos</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {libro.hojas.map((h) => {
                      const isSelected = hojaSeleccionada === h.nombre;
                      return (
                        <div
                          key={h.nombre}
                          onClick={() => cambiarHojaSeleccionada(h.nombre)}
                          className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                            isSelected
                              ? 'border-primary bg-primary/10 ring-2 ring-primary/20 shadow-xs'
                              : 'border-base-200 bg-base-200/30 hover:border-base-content/20'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-base-content truncate flex items-center gap-1.5">
                                <span className="icon-[tabler--table] text-sm text-primary shrink-0" />
                                {h.nombre}
                              </div>
                              <div className="text-2xs text-base-content/60 pt-0.5">
                                {h.totalFilas} filas • {h.columnas.length} columnas
                              </div>
                            </div>
                            {h.nombre === libro.hojaRecomendada && (
                              <span className="badge badge-success badge-xs shrink-0 text-3xs font-semibold">
                                Sugerida
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Alerta de Hojas Operativas */}
                  {libro.hojasOperativasDetectadas.length > 0 && (
                    <div className="alert alert-info text-xs flex items-start gap-2 bg-info/10 border-info/20">
                      <span className="icon-[tabler--info-circle] text-base shrink-0 mt-0.5 text-info" />
                      <div className="space-y-0.5">
                        <div className="font-semibold text-base-content">Pestañas operativas detectadas:</div>
                        <div className="text-2xs text-base-content/70">
                          Identificamos hojas como{' '}
                          <span className="font-semibold">{libro.hojasOperativasDetectadas.join(', ')}</span>. Estas corresponden
                          a directorios de proveedores y personal operativo, y quedan reservadas para los módulos
                          administrativos correspondientes.
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* =========================================================================
              PASO 2: MAPEO INTELIGENTE DE COLUMNAS
              ========================================================================= */}
          {paso === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2.5 border-base-content/10">
                <div>
                  <h3 className="text-sm font-bold text-base-content">
                    Asocia las columnas de la hoja &quot;{hojaSeleccionada}&quot;
                  </h3>
                  <p className="text-2xs text-base-content/60">
                    El sistema pre-mapeó las columnas por heurística. Ajusta cualquier campo si es necesario.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setMapeo(sugerirMapeoColumnas(columnasHoja))}
                  className="btn btn-ghost btn-xs gap-1 text-primary"
                  title="Reiniciar coincidencia automática"
                >
                  <span className="icon-[tabler--refresh] text-xs" />
                  Auto-detectar
                </button>
              </div>

              <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
                {columnasHoja
                  .filter((col) => col.trim() && !col.startsWith('__EMPTY'))
                  .map((colName) => {
                    const destinoActual = mapeo[colName] || 'ignorar';
                    // Extraer primeros 2 ejemplos de valores de esa columna
                    const ejemplos = rawRows
                      .map((r) => String(r[colName] || '').trim())
                      .filter((val) => val.length > 0)
                      .slice(0, 2)
                      .join(' • ');

                    const isMapped = destinoActual !== 'ignorar';

                    return (
                      <div
                        key={colName}
                        className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                          isMapped ? 'border-primary/30 bg-primary/5' : 'border-base-200 bg-base-200/20'
                        }`}
                      >
                        {/* Columna en Excel */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-base-content">{colName}</span>
                            {isMapped && (
                              <span className="badge badge-primary badge-xs text-3xs font-semibold">Mapeado</span>
                            )}
                          </div>
                          {ejemplos && (
                            <p className="text-2xs text-base-content/50 truncate pt-0.5">
                              Ejemplos: {ejemplos}
                            </p>
                          )}
                        </div>

                        {/* Flecha indicadora */}
                        <span className="icon-[tabler--chevron-right] text-base-content/30 hidden sm:block shrink-0" />

                        {/* Dropdown de Destino */}
                        <div className="sm:w-72 shrink-0">
                          <select
                            value={destinoActual}
                            onChange={(e) => actualizarMapeoColumna(colName, e.target.value as CampoCensoDestino)}
                            className="select select-sm select-bordered w-full text-xs font-medium"
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
            <div className="space-y-4">
              {/* Tarjetas de Resumen */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
                  <div className="text-xl font-bold text-primary">{filasPreview.length}</div>
                  <div className="text-2xs text-base-content/70">Unidades a Importar</div>
                </div>
                <div className="p-2.5 rounded-xl bg-accent/10 border border-accent/20">
                  <div className="text-xl font-bold text-accent">{totalResidentesEnPreview}</div>
                  <div className="text-2xs text-base-content/70">Residentes Detectados</div>
                </div>
                <div className="p-2.5 rounded-xl bg-success/10 border border-success/20">
                  <div className="text-xl font-bold text-success">
                    {filasPreview.filter((f) => f.tipoOcupacion === 'habitada').length}
                  </div>
                  <div className="text-2xs text-base-content/70">Habitadas</div>
                </div>
                <div className="p-2.5 rounded-xl bg-warning/10 border border-warning/20">
                  <div className="text-xl font-bold text-warning">
                    {filasPreview.filter((f) => f.tipoOcupacion === 'desocupada').length}
                  </div>
                  <div className="text-2xs text-base-content/70">Desocupadas</div>
                </div>
              </div>

              {/* Advertencias Heurísticas */}
              {advertenciasSanitizacion.length > 0 && (
                <div className="alert alert-warning text-xs space-y-0.5 py-2">
                  <div className="font-semibold flex items-center gap-1.5">
                    <span className="icon-[tabler--info-circle]" />
                    Normalizaciones automáticas aplicadas:
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-2xs">
                    {advertenciasSanitizacion.slice(0, 3).map((adv, idx) => (
                      <li key={idx}>{adv}</li>
                    ))}
                  </ul>
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
                    className="input input-sm input-bordered w-full text-xs pl-8"
                  />
                  <span className="icon-[tabler--search] absolute left-2.5 top-2.5 text-base-content/40 text-xs" />
                </div>
                <span className="text-2xs text-base-content/60">
                  Mostrando {filasFiltradas.length} de {filasPreview.length} registros
                </span>
              </div>

              {/* Tabla Editable */}
              <div className="border border-base-200 rounded-xl overflow-x-auto max-h-[45vh]">
                <table className="table table-xs table-pin-rows">
                  <thead>
                    <tr className="bg-base-200/60 text-xs">
                      <th>Estado</th>
                      <th>Apto / Casa</th>
                      <th>Torre</th>
                      <th>Coeficiente</th>
                      <th>Ocupación</th>
                      <th>Residentes y Propietarios Desdoblados</th>
                      <th>Contacto Limpio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filasFiltradas.map((fila) => (
                      <tr key={fila.id} className="hover:bg-base-200/30">
                        {/* Estado */}
                        <td>
                          {fila.estadoValidacion === 'valido' && (
                            <span className="badge badge-success badge-xs text-3xs gap-1 font-semibold">
                              ✓ Válido
                            </span>
                          )}
                          {fila.estadoValidacion === 'advertencia' && (
                            <span className="badge badge-warning badge-xs text-3xs gap-1 font-semibold" title={fila.mensajeValidacion}>
                              ⚠ Alerta
                            </span>
                          )}
                          {fila.estadoValidacion === 'error' && (
                            <span className="badge badge-error badge-xs text-3xs gap-1 font-semibold" title={fila.mensajeValidacion}>
                              ✕ Error
                            </span>
                          )}
                        </td>

                        {/* Número Apto (Editable) */}
                        <td className="w-24">
                          <input
                            type="text"
                            value={fila.numeroApto}
                            onChange={(e) => actualizarFilaPreview(fila.id, 'numeroApto', e.target.value)}
                            className="input input-2xs input-bordered w-20 font-bold"
                          />
                        </td>

                        {/* Torre (Editable) */}
                        <td className="w-24">
                          <input
                            type="text"
                            value={fila.torre || ''}
                            onChange={(e) => actualizarFilaPreview(fila.id, 'torre', e.target.value)}
                            placeholder="Torre"
                            className="input input-2xs input-bordered w-20 text-xs"
                          />
                        </td>

                        {/* Coeficiente (Editable) */}
                        <td className="w-24">
                          <input
                            type="number"
                            step="0.0001"
                            value={fila.coeficiente !== undefined ? fila.coeficiente : ''}
                            onChange={(e) => actualizarFilaPreview(fila.id, 'coeficiente', parseFloat(e.target.value) || 0)}
                            placeholder="0.0000"
                            className="input input-2xs input-bordered w-20 text-xs"
                          />
                        </td>

                        {/* Ocupación */}
                        <td className="w-28">
                          <select
                            value={fila.tipoOcupacion}
                            onChange={(e) => actualizarFilaPreview(fila.id, 'tipoOcupacion', e.target.value)}
                            className="select select-2xs select-bordered w-24 text-2xs"
                          >
                            <option value="habitada">Habitada</option>
                            <option value="desocupada">Desocupada</option>
                          </select>
                        </td>

                        {/* Personas Desdobladas */}
                        <td className="max-w-xs">
                          {fila.personas.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {fila.personas.map((p, idx) => (
                                <span
                                  key={idx}
                                  className={`badge badge-xs text-3xs ${
                                    p.condicion === 'propietario'
                                      ? 'badge-primary'
                                      : 'badge-outline badge-secondary'
                                  }`}
                                  title={`${p.nombreCompleto} (${p.condicion})`}
                                >
                                  {p.nombreCompleto}
                                </span>
                              ))}
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
                            <div className="text-base-content/60 truncate">{fila.telefonosExtraidos.join(' • ')}</div>
                          )}
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
            <div className="text-center py-6 space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success">
                <span className="icon-[tabler--circle-check] text-4xl" />
              </div>
              <h3 className="text-xl font-bold text-base-content">
                ¡Carga Masiva Exitosa con Normalización!
              </h3>
              <p className="text-sm text-base-content/70 max-w-md mx-auto">
                La base de datos del conjunto ha sido actualizada correctamente. Todos los datos compuestos fueron
                sanitizados y guardados limpiamente.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-center pt-2 max-w-md mx-auto">
                <div className="p-3 rounded-lg bg-base-200/50 border border-base-200">
                  <div className="text-2xl font-bold text-primary">{resultado.inmueblesCreados}</div>
                  <div className="text-2xs text-base-content/70">Nuevos Inmuebles</div>
                </div>
                <div className="p-3 rounded-lg bg-base-200/50 border border-base-200">
                  <div className="text-2xl font-bold text-secondary">{resultado.inmueblesActualizados}</div>
                  <div className="text-2xs text-base-content/70">Actualizados</div>
                </div>
                <div className="p-3 rounded-lg bg-base-200/50 border border-base-200">
                  <div className="text-2xl font-bold text-accent">{resultado.residentesProcesados}</div>
                  <div className="text-2xs text-base-content/70">Residentes Censados</div>
                </div>
              </div>

              <div className="pt-4 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setPaso(1);
                    setFile(null);
                    setLibro(null);
                    setResultado(null);
                  }}
                  className="btn btn-sm btn-outline"
                >
                  Cargar otro archivo
                </button>
                <button type="button" onClick={handleCerrar} className="btn btn-sm btn-primary">
                  Aceptar y Finalizar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Pie de Acciones / Navegación */}
        {paso < 4 && (
          <div className="p-4 border-t border-base-content/10 flex items-center justify-between gap-2 shrink-0 bg-base-100">
            {paso === 1 && (
              <>
                <button type="button" onClick={handleCerrar} className="btn btn-sm btn-ghost">
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={!file || !hojaSeleccionada || loading}
                  onClick={avanzarAPaso2}
                  className="btn btn-sm btn-primary gap-1.5"
                >
                  <span>Continuar al Mapeo de Columnas</span>
                  <span className="icon-[tabler--chevron-right] text-sm" />
                </button>
              </>
            )}

            {paso === 2 && (
              <>
                <button
                  type="button"
                  onClick={() => setPaso(1)}
                  className="btn btn-sm btn-outline gap-1"
                >
                  <span className="icon-[tabler--chevron-left] text-sm" />
                  <span>Atrás</span>
                </button>
                <button
                  type="button"
                  onClick={avanzarAPaso3}
                  className="btn btn-sm btn-primary gap-1.5"
                >
                  <span>Continuar a Vista Previa</span>
                  <span className="icon-[tabler--chevron-right] text-sm" />
                </button>
              </>
            )}

            {paso === 3 && (
              <>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setPaso(2)}
                  className="btn btn-sm btn-outline gap-1"
                >
                  <span className="icon-[tabler--chevron-left] text-sm" />
                  <span>Ajustar Mapeo</span>
                </button>
                <button
                  type="button"
                  disabled={submitting || filasPreview.length === 0}
                  onClick={handleImportarDefinitivo}
                  className="btn btn-sm btn-primary gap-1.5"
                >
                  {submitting && <span className="loading loading-spinner loading-xs" />}
                  <span className="icon-[tabler--database-import] text-base" />
                  <span>
                    Confirmar e Importar {filasPreview.length} Unidades ({totalResidentesEnPreview} Residentes)
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
