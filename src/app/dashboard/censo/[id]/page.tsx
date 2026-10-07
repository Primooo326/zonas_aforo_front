'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import {
  CensoUnidad,
  calcularEdad,
  categorizarEdad,
} from '@/lib/censo-helpers';

export default function CensoDetallePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [unidad, setUnidad] = useState<CensoUnidad | null>(null);
  const [original, setOriginal] = useState<CensoUnidad | null>(null);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    if (!id) return;
    const cargar = async () => {
      try {
        setLoading(true);
        const data = await apiFetch(`/censo/${id}`);
        setUnidad(data);

        // Si es pendiente_actualizacion, cargar la unidad original para comparar
        if (data.estado === 'pendiente_actualizacion' && data.unidadOriginalId) {
          try {
            const originalData = await apiFetch(`/censo/${data.unidadOriginalId}`);
            setOriginal(originalData);
          } catch {
            // Ignorar si no se encuentra la original
          }
        }
      } catch (e) {
        console.error('Error al cargar detalle de unidad:', e);
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, [id]);

  const aprobar = async () => {
    if (!confirm('¿Deseas aprobar este registro de censo?')) return;
    try {
      setProcesando(true);
      await apiFetch(`/censo/${id}/aprobar`, { method: 'PATCH' });
      router.push('/dashboard/censo');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al aprobar');
    } finally {
      setProcesando(false);
    }
  };

  const rechazar = async () => {
    if (!confirm('¿Deseas rechazar este registro?')) return;
    try {
      setProcesando(true);
      await apiFetch(`/censo/${id}/rechazar`, { method: 'PATCH' });
      router.push('/dashboard/censo');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al rechazar');
    } finally {
      setProcesando(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-base-content/60">Cargando ficha de unidad...</div>;
  }

  if (!unidad) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold">Unidad no encontrada</h2>
        <Link href="/dashboard/censo" className="btn btn-primary btn-sm mt-4">
          Volver al censo
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Barra superior con navegación */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <Link href="/dashboard/censo" className="btn btn-ghost btn-circle btn-sm shrink-0">
            <span className="icon-[tabler--arrow-left] text-lg sm:text-xl" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-base-content flex items-center gap-2 truncate">
              <span className="icon-[tabler--home] text-primary shrink-0" />
              <span className="truncate">{unidad.identificador}</span>
            </h1>
            <p className="text-2xs sm:text-xs text-base-content/60 truncate">
              {unidad.torre ? `Torre / Bloque: ${unidad.torre}` : 'Unidad Habitacional'} • {unidad.tipoOcupacion}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
          {unidad.estado !== 'aprobado' && (
            <>
              <button
                onClick={aprobar}
                disabled={procesando}
                className="btn btn-success btn-sm w-full sm:w-auto justify-center"
              >
                <span className="icon-[tabler--check] text-base sm:text-lg" />
                <span>Aprobar</span>
              </button>
              <button
                onClick={rechazar}
                disabled={procesando}
                className="btn btn-error btn-sm btn-outline w-full sm:w-auto justify-center"
              >
                <span className="icon-[tabler--x] text-base sm:text-lg" />
                <span>Rechazar</span>
              </button>
            </>
          )}
          <Link
            href={`/dashboard/censo/${unidad._id}/edit`}
            className={`btn btn-primary btn-sm btn-outline w-full sm:w-auto justify-center ${unidad.estado !== 'aprobado' ? 'col-span-2 sm:col-span-1' : ''}`}
          >
            <span className="icon-[tabler--edit] text-base sm:text-lg" />
            <span>Editar</span>
          </Link>
        </div>
      </div>

      {/* Alerta si es actualización pendiente */}
      {unidad.estado === 'pendiente_actualizacion' && original && (
        <div className="alert alert-info shadow-xs">
          <span className="icon-[tabler--info-circle] text-2xl" />
          <div>
            <span className="font-semibold">Solicitud de Actualización de Datos</span>
            <p className="text-xs">
              Un residente ha enviado datos actualizados para esta unidad. Compara la información antes de aprobar el reemplazo.
            </p>
          </div>
        </div>
      )}

      {/* Grid de Secciones */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Residentes (2 columnas) */}
        <div className="md:col-span-2 space-y-6">
          <div className="card bg-base-100 shadow-sm border border-base-200 p-5">
            <h2 className="text-lg font-bold flex items-center justify-between border-b pb-3 border-base-content/10">
              <span className="flex items-center gap-2">
                <span className="icon-[tabler--users] text-primary text-xl" />
                Personas que Habitan ({unidad.personas?.length || 0})
              </span>
            </h2>

            <div className="divide-y divide-base-content/10 mt-3">
              {unidad.personas && unidad.personas.length > 0 ? (
                unidad.personas.map((p, idx) => {
                  const edad = calcularEdad(p.fechaNacimiento);
                  const cat = categorizarEdad(edad);

                  return (
                    <div key={idx} className="py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-base-content">{p.nombreCompleto}</span>
                          {p.esContactoPrincipal && (
                            <span className="badge badge-xs badge-soft badge-primary">Principal</span>
                          )}
                          <span className={`badge badge-xs ${cat.badgeClass}`}>
                            <span className={`${cat.icon} mr-1`} />
                            {edad} años ({cat.label})
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-base-content/60 mt-1">
                          {p.telefono && <span>📞 {p.telefono}</span>}
                          {p.email && <span>✉️ {p.email}</span>}
                          {p.documento && <span>🆔 {p.documento}</span>}
                        </div>
                      </div>

                      <div>
                        <span className="badge badge-sm badge-soft badge-ghost uppercase font-semibold text-2xs">
                          {p.condicion}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-base-content/50 py-4">No hay personas registradas en esta unidad.</p>
              )}
            </div>
          </div>

          {/* Mascotas */}
          <div className="card bg-base-100 shadow-sm border border-base-200 p-5">
            <h2 className="text-lg font-bold flex items-center gap-2 border-b pb-3 border-base-content/10">
              <span className="icon-[tabler--paw] text-secondary text-xl" />
              Mascotas ({unidad.mascotas?.length || 0})
            </h2>

            <div className="divide-y divide-base-content/10 mt-3">
              {unidad.mascotas && unidad.mascotas.length > 0 ? (
                unidad.mascotas.map((m, idx) => (
                  <div key={idx} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-base-content flex items-center gap-2">
                        {m.nombre}
                        <span className="badge badge-xs badge-soft badge-secondary capitalize">
                          {m.tipo} - {m.raza}
                        </span>
                        {m.esPeligroso && (
                          <span className="badge badge-xs badge-soft badge-error">
                            ⚠️ Manejo especial
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-base-content/60 mt-1 flex gap-3">
                        <span>Vacunas al día: {m.vacunasAlDia ? '✅ Sí' : '❌ No'}</span>
                        {m.observaciones && <span>Nota: {m.observaciones}</span>}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-base-content/50 py-4">Sin mascotas registradas.</p>
              )}
            </div>
          </div>
        </div>

        {/* Columna Derecha: Vehículos y Resumen */}
        <div className="space-y-6">
          {/* Vehículos */}
          <div className="card bg-base-100 shadow-sm border border-base-200 p-5">
            <h2 className="text-lg font-bold flex items-center gap-2 border-b pb-3 border-base-content/10">
              <span className="icon-[tabler--car] text-success text-xl" />
              Vehículos ({unidad.vehiculos?.length || 0})
            </h2>

            <div className="divide-y divide-base-content/10 mt-3">
              {unidad.vehiculos && unidad.vehiculos.length > 0 ? (
                unidad.vehiculos.map((v, idx) => (
                  <div key={idx} className="py-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-sm bg-base-200 px-2 py-0.5 rounded text-base-content">
                        {v.placa}
                      </span>
                      <span className="badge badge-xs badge-soft badge-ghost capitalize">
                        {v.tipo}
                      </span>
                    </div>
                    <div className="text-xs text-base-content/70">
                      {[v.marca, v.modelo, v.color].filter(Boolean).join(' • ') || 'Sin especificaciones'}
                    </div>
                    <div className="text-2xs text-base-content/50">
                      {v.parqueaEnEdificio
                        ? `Parquea en edificio (P. ${v.numeroParqueadero || 'Comunal'})`
                        : 'No parquea en el conjunto'}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-base-content/50 py-4">Sin vehículos registrados.</p>
              )}
            </div>
          </div>

          {/* Notas de Administración */}
          <div className="card bg-base-100 shadow-sm border border-base-200 p-5">
            <h3 className="text-sm font-bold text-base-content/80 flex items-center gap-1.5 mb-2">
              <span className="icon-[tabler--notes] text-base" />
              Notas Internas de Administración
            </h3>
            <p className="text-xs text-base-content/60 italic bg-base-200/50 p-3 rounded-lg">
              {unidad.notasAdministracion || 'Sin notas registradas para esta unidad.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
