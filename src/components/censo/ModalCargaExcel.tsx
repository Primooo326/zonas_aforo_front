'use client';

import { useState, useRef } from 'react';
import {
  descargarPlantillaExcel,
  parsearExcelCenso,
  ParsedCensoExcel,
} from '@/lib/censo-excel';
import { apiFetch } from '@/lib/api';

interface ModalCargaExcelProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  edificioNombre?: string;
}

export default function ModalCargaExcel({
  isOpen,
  onClose,
  onSuccess,
  edificioNombre = 'Edificio',
}: ModalCargaExcelProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedCensoExcel | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resultado, setResultado] = useState<{
    inmueblesCreados: number;
    inmueblesActualizados: number;
    parqueaderosProcesados: number;
    bodegasProcesadas: number;
  } | null>(null);
  const [errorGlobal, setErrorGlobal] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

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
    setResultado(null);
    setErrorGlobal('');
    setParsing(true);
    try {
      const res = await parsearExcelCenso(f);
      setParsedData(res);
    } catch (err: unknown) {
      console.error(err);
      setErrorGlobal('No se pudo leer el archivo Excel. Verifica que sea un formato válido (.xlsx).');
      setParsedData(null);
    } finally {
      setParsing(false);
    }
  };

  const handleImportar = async () => {
    if (!parsedData || parsedData.inmuebles.length === 0) return;
    setSubmitting(true);
    setErrorGlobal('');
    try {
      const res = await apiFetch('/censo/importar-masivo', {
        method: 'POST',
        body: JSON.stringify({
          inmuebles: parsedData.inmuebles,
          parqueaderos: parsedData.parqueaderos,
          bodegas: parsedData.bodegas,
        }),
      });

      setResultado({
        inmueblesCreados: res.inmueblesCreados ?? 0,
        inmueblesActualizados: res.inmueblesActualizados ?? 0,
        parqueaderosProcesados: res.parqueaderosProcesados ?? 0,
        bodegasProcesadas: res.bodegasProcesadas ?? 0,
      });

      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al procesar la importación masiva';
      setErrorGlobal(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const reiniciar = () => {
    setFile(null);
    setParsedData(null);
    setResultado(null);
    setErrorGlobal('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="card bg-base-100 rounded-box shadow-xl border border-base-200 max-w-2xl w-full p-4 sm:p-6 space-y-4 sm:space-y-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Modal */}
        <div className="flex items-center justify-between border-b pb-3 border-base-content/10">
          <div className="flex items-center gap-2">
            <span className="icon-[tabler--file-spreadsheet] text-success text-2xl shrink-0" aria-hidden="true" />
            <h2 className="text-base sm:text-lg font-bold text-base-content leading-tight">
              Carga Masiva de Inmuebles, Parqueaderos y Bodegas
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-circle btn-sm btn-ghost shrink-0"
            aria-label="Cerrar modal"
          >
            ✕
          </button>
        </div>

        {resultado ? (
          /* Pantalla de Éxito */
          <div className="text-center py-6 space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success">
              <span className="icon-[tabler--circle-check] text-4xl" />
            </div>
            <h3 className="text-xl font-bold text-base-content">
              ¡Carga Masiva Exitosa!
            </h3>
            <p className="text-sm text-base-content/70 max-w-md mx-auto">
              La base de datos del conjunto ha sido actualizada correctamente sin alterar los residentes previamente censados.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center pt-2">
              <div className="p-3 rounded-lg bg-base-200/50 border border-base-200">
                <div className="text-2xl font-bold text-primary">{resultado.inmueblesCreados}</div>
                <div className="text-2xs text-base-content/70">Nuevos Inmuebles</div>
              </div>
              <div className="p-3 rounded-lg bg-base-200/50 border border-base-200">
                <div className="text-2xl font-bold text-secondary">{resultado.inmueblesActualizados}</div>
                <div className="text-2xs text-base-content/70">Actualizados</div>
              </div>
              <div className="p-3 rounded-lg bg-base-200/50 border border-base-200">
                <div className="text-2xl font-bold text-success">{resultado.parqueaderosProcesados}</div>
                <div className="text-2xs text-base-content/70">Parqueaderos</div>
              </div>
              <div className="p-3 rounded-lg bg-base-200/50 border border-base-200">
                <div className="text-2xl font-bold text-info">{resultado.bodegasProcesadas}</div>
                <div className="text-2xs text-base-content/70">Bodegas</div>
              </div>
            </div>

            <div className="pt-4 flex justify-center gap-3">
              <button
                type="button"
                onClick={reiniciar}
                className="btn btn-sm btn-outline"
              >
                Cargar otro archivo
              </button>
              <button
                type="button"
                onClick={onClose}
                className="btn btn-sm btn-primary"
              >
                Aceptar y Finalizar
              </button>
            </div>
          </div>
        ) : (
          /* Formulario de Carga y Descarga */
          <div className="space-y-5">
            {/* Paso 1: Descargar plantilla */}
            <div className="p-4 rounded-xl bg-base-200/40 border border-base-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="space-y-0.5">
                <div className="text-sm font-semibold text-base-content flex items-center gap-1.5">
                  <span className="icon-[tabler--template] text-primary" />
                  1. Descargar Plantilla Oficial Excel
                </div>
                <p className="text-xs text-base-content/70">
                  Archivo .xlsx con 3 hojas preformateadas (Inmuebles, Parqueaderos y Bodegas) y ejemplos.
                </p>
              </div>
              <button
                type="button"
                onClick={() => descargarPlantillaExcel(edificioNombre)}
                className="btn btn-sm btn-outline btn-primary gap-1.5 w-full sm:w-auto shrink-0 justify-center"
              >
                <span className="icon-[tabler--download] text-base" />
                <span>Descargar Plantilla (.xlsx)</span>
              </button>
            </div>

            {/* Paso 2: Zona Drag and Drop */}
            <div className="space-y-2">
              <div className="text-sm font-semibold text-base-content flex items-center gap-1.5">
                <span className="icon-[tabler--upload] text-primary" />
                2. Subir Archivo Diligenciado
              </div>

              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                  file
                    ? 'border-primary/50 bg-primary/5'
                    : 'border-base-content/20 hover:border-primary/50 hover:bg-base-200/30'
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
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-base-content">{file.name}</p>
                    <p className="text-xs text-base-content/60">
                      {(file.size / 1024).toFixed(1)} KB — Clic para cambiar de archivo
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-base-content">
                      Arrastra y suelta tu archivo Excel aquí, o{' '}
                      <span className="text-primary underline">haz clic para examinar</span>
                    </p>
                    <p className="text-2xs text-base-content/60">
                      Formatos compatibles: .xlsx o .xls
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Estado de Lectura */}
            {parsing && (
              <div className="flex items-center justify-center gap-2 py-4 text-sm text-base-content/70">
                <span className="loading loading-spinner loading-sm" />
                <span>Analizando hojas y validando datos...</span>
              </div>
            )}

            {/* Errores Globales */}
            {errorGlobal && (
              <div className="alert alert-error text-xs flex items-center gap-2">
                <span className="icon-[tabler--alert-circle] text-base shrink-0" />
                <span>{errorGlobal}</span>
              </div>
            )}

            {/* Previsualización de Datos */}
            {parsedData && !parsing && (
              <div className="space-y-4">
                {/* Errores de validación */}
                {parsedData.errores.length > 0 && (
                  <div className="alert alert-error text-xs space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <span className="icon-[tabler--alert-triangle] text-sm" />
                      Se encontraron errores en el archivo:
                    </div>
                    <ul className="list-disc list-inside space-y-0.5">
                      {parsedData.errores.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Advertencias */}
                {parsedData.advertencias.length > 0 && (
                  <div className="alert alert-warning text-xs space-y-1 max-h-32 overflow-y-auto">
                    <div className="font-bold flex items-center gap-1.5">
                      <span className="icon-[tabler--info-circle] text-sm" />
                      Advertencias ({parsedData.advertencias.length}):
                    </div>
                    <ul className="list-disc list-inside space-y-0.5 text-2xs">
                      {parsedData.advertencias.slice(0, 5).map((adv, i) => (
                        <li key={i}>{adv}</li>
                      ))}
                      {parsedData.advertencias.length > 5 && (
                        <li>...y {parsedData.advertencias.length - 5} advertencias más.</li>
                      )}
                    </ul>
                  </div>
                )}

                {/* Resumen de Registros Encontrados */}
                {parsedData.inmuebles.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-base-content/80">
                      Resumen del Inventario a Procesar:
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-3 rounded-lg bg-base-200/50 border border-base-200">
                        <div className="text-lg font-bold text-primary">
                          {parsedData.estadisticas.totalInmuebles}
                        </div>
                        <div className="text-2xs text-base-content/70">Inmuebles</div>
                      </div>
                      <div className="p-3 rounded-lg bg-base-200/50 border border-base-200">
                        <div className="text-lg font-bold text-success">
                          {parsedData.estadisticas.totalParqueaderos}
                        </div>
                        <div className="text-2xs text-base-content/70">
                          Parqueaderos ({parsedData.estadisticas.parqueaderosVisitantes} vis.)
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-base-200/50 border border-base-200">
                        <div className="text-lg font-bold text-info">
                          {parsedData.estadisticas.totalBodegas}
                        </div>
                        <div className="text-2xs text-base-content/70">Bodegas</div>
                      </div>
                    </div>

                    <p className="text-2xs text-base-content/60 italic">
                      * Si algún inmueble ya existe en el sistema, sus características físicas se actualizarán sin alterar los residentes censados.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Botones de Acción */}
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 border-t pt-3 border-base-content/10">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-sm btn-ghost w-full sm:w-auto justify-center"
                disabled={submitting}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleImportar}
                disabled={
                  !parsedData ||
                  parsedData.inmuebles.length === 0 ||
                  parsedData.errores.length > 0 ||
                  submitting
                }
                className="btn btn-sm btn-primary gap-1.5 w-full sm:w-auto justify-center"
              >
                {submitting && <span className="loading loading-spinner loading-xs" />}
                <span className="icon-[tabler--database-import] text-base" />
                <span>Confirmar e Importar</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
