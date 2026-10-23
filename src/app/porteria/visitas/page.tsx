'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { usePorteria } from '@/contexts/PorteriaContext';
import { porteriaApiFetch } from '@/lib/api';
import SelectorUnidadPorteria, { UnidadSeleccionada } from '@/components/porteria/SelectorUnidadPorteria';

export default function VisitasPorteriaPage() {
  const searchParams = useSearchParams();
  const { vigilanteActivo } = usePorteria();

  const [tab, setTab] = useState<'activas' | 'programadas' | 'ingreso' | 'historial'>('activas');
  const [activas, setActivas] = useState<any[]>([]);
  const [programadas, setProgramadas] = useState<any[]>([]);
  const [filtroProgramadas, setFiltroProgramadas] = useState('');
  const [procesandoIngresoId, setProcesandoIngresoId] = useState<string | null>(null);
  const [historial, setHistorial] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);

  // Formulario
  const [unidadSeleccionada, setUnidadSeleccionada] = useState<UnidadSeleccionada | null>(null);
  const [torre, setTorre] = useState(searchParams.get('torre') || '');
  const [apartamento, setApartamento] = useState(searchParams.get('apto') || '');
  const [residenteAQuienVisita, setResidenteAQuienVisita] = useState('');
  const [nombreVisitante, setNombreVisitante] = useState('');
  const [documentoVisitante, setDocumentoVisitante] = useState('');
  const [placaVehiculo, setPlacaVehiculo] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cargarVisitas = async () => {
    setCargando(true);
    try {
      const [act, hist, prog] = await Promise.all([
        porteriaApiFetch('/porteria/visitas/activas'),
        porteriaApiFetch('/porteria/visitas/historial'),
        porteriaApiFetch('/porteria/visitas/programadas'),
      ]);
      setActivas(act || []);
      setHistorial(hist || []);
      setProgramadas(prog || []);
    } catch (err) {
      console.error('Error cargando visitas:', err);
    } finally {
      setCargando(false);
    }
  };

  const handleRegistrarIngresoProgramado = async (pase: any) => {
    if (!vigilanteActivo) {
      alert('Por favor selecciona el vigilante de turno en el encabezado antes de registrar un ingreso.');
      return;
    }
    setProcesandoIngresoId(pase._id);
    try {
      await porteriaApiFetch(`/porteria/visitas/programadas/${pase._id}/ingreso`, {
        method: 'POST',
        body: JSON.stringify({
          vigilanteId: vigilanteActivo._id,
          vigilanteNombre: vigilanteActivo.nombreCompleto,
        }),
      });
      await cargarVisitas();
      setTab('activas');
    } catch (err: any) {
      alert(err.message || 'Error registrando ingreso de visita programada');
    } finally {
      setProcesandoIngresoId(null);
    }
  };

  useEffect(() => {
    cargarVisitas();
  }, []);

  const handleUnidadChange = (u: UnidadSeleccionada | null) => {
    setUnidadSeleccionada(u);
    if (u) {
      setTorre(u.torre || '');
      setApartamento(u.numeroApto || '');
      // Si la unidad tiene residentes y no se ha escrito a quién visita, no forzamos pero dejamos los chips
    } else {
      setTorre('');
      setApartamento('');
      setResidenteAQuienVisita('');
    }
  };

  const handleRegistrarIngreso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!torre.trim() || !apartamento.trim() || !nombreVisitante.trim()) {
      alert('Por favor ingresa Torre, Apartamento y Nombre del Visitante');
      return;
    }

    const vigilanteNombre = vigilanteActivo?.nombreCompleto || 'Vigilante de Turno';
    const vigilanteId = vigilanteActivo?._id;

    setGuardando(true);
    try {
      await porteriaApiFetch('/porteria/visitas/ingreso', {
        method: 'POST',
        body: JSON.stringify({
          torre: torre.trim(),
          apartamento: apartamento.trim(),
          nombreVisitante: nombreVisitante.trim(),
          residenteAQuienVisita: residenteAQuienVisita.trim() || undefined,
          documentoVisitante: documentoVisitante.trim() || undefined,
          placaVehiculo: placaVehiculo.trim() || undefined,
          empresa: empresa.trim() || undefined,
          observaciones: observaciones.trim() || undefined,
          vigilanteIngresoId: vigilanteId,
          vigilanteIngresoNombre: vigilanteNombre,
        }),
      });

      setTorre('');
      setApartamento('');
      setUnidadSeleccionada(null);
      setResidenteAQuienVisita('');
      setNombreVisitante('');
      setDocumentoVisitante('');
      setPlacaVehiculo('');
      setEmpresa('');
      setObservaciones('');
      setTab('activas');
      await cargarVisitas();
    } catch (err: any) {
      alert(err.message || 'Error registrando ingreso de visita');
    } finally {
      setGuardando(false);
    }
  };

  const handleRegistrarSalida = async (visitaId: string) => {
    const vigilanteNombre = vigilanteActivo?.nombreCompleto || 'Vigilante de Turno';
    const vigilanteId = vigilanteActivo?._id;

    try {
      await porteriaApiFetch(`/porteria/visitas/${visitaId}/salida`, {
        method: 'PATCH',
        body: JSON.stringify({
          vigilanteSalidaId: vigilanteId,
          vigilanteSalidaNombre: vigilanteNombre,
        }),
      });
      await cargarVisitas();
    } catch (err: any) {
      alert(err.message || 'Error registrando salida');
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado Conciso y Selector de Vistas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b arch-border">
        <div className="flex items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-black text-base-content flex items-center gap-2">
            <span className="icon-[tabler--users] text-primary text-2xl" aria-hidden="true"></span>
            Control de Visitas
          </h1>
          <span className="badge badge-sm badge-info font-mono font-bold">
            {activas.length} adentro
          </span>
        </div>

        <div className="flex items-center gap-1 bg-base-200 p-1 rounded-md border arch-border self-start sm:self-auto">
          <button
            onClick={() => setTab('activas')}
            className={`btn btn-xs font-bold transition-colors ${
              tab === 'activas'
                ? 'btn-primary shadow-xs'
                : 'btn-ghost text-base-content/70 hover:text-base-content'
            }`}
          >
            Adentro ({activas.length})
          </button>
          <button
            onClick={() => setTab('programadas')}
            className={`btn btn-xs font-bold transition-colors flex items-center gap-1.5 ${
              tab === 'programadas'
                ? 'btn-primary shadow-xs'
                : 'btn-ghost text-base-content/70 hover:text-base-content'
            }`}
          >
            <span>Esperadas</span>
            <span className={`badge badge-3xs font-mono font-bold ${
              tab === 'programadas' ? 'bg-primary-content text-primary' : 'badge-warning'
            }`}>
              {programadas.length}
            </span>
          </button>
          <button
            onClick={() => setTab('ingreso')}
            className={`btn btn-xs font-bold transition-colors ${
              tab === 'ingreso'
                ? 'btn-primary shadow-xs'
                : 'btn-ghost text-base-content/70 hover:text-base-content'
            }`}
          >
            + Ingreso
          </button>
          <button
            onClick={() => setTab('historial')}
            className={`btn btn-xs font-bold transition-colors ${
              tab === 'historial'
                ? 'btn-primary shadow-xs'
                : 'btn-ghost text-base-content/70 hover:text-base-content'
            }`}
          >
            Historial
          </button>
        </div>
      </div>

      {/* Pestaña: Registrar Ingreso */}
      {tab === 'ingreso' && (
        <div className="arch-panel max-w-2xl mx-auto p-5 sm:p-7 shadow-xs">
          <h2 className="text-base font-bold text-base-content mb-4 flex items-center gap-2 pb-3 border-b arch-border">
            <span className="icon-[tabler--user-plus] text-primary text-xl" aria-hidden="true"></span>
            Registrar Ingreso de Visitante o Vehículo
          </h2>

          <form onSubmit={handleRegistrarIngreso} className="space-y-4">
            {/* Selector Predictivo de Inmueble con Citofonía y Residentes */}
            <SelectorUnidadPorteria
              onSelect={handleUnidadChange}
              unidadActual={torre || apartamento ? { torre, apartamento } : null}
              label="Inmueble de Destino (Torre / Apartamento)"
              required={true}
            />

            {/* Residente a quien visita */}
            <div>
              <label className="block text-2xs font-bold text-base-content/70 uppercase tracking-wider mb-1.5">
                Residente a quien visita (Anfitrión)
              </label>

              {/* Chips rápidos de residentes censados */}
              {unidadSeleccionada && unidadSeleccionada.residentes.length > 0 && (
                <div className="space-y-1 mb-2">
                  <span className="text-3xs text-base-content/60 block font-medium">
                    Residentes censados en esta unidad (clic para seleccionar):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {unidadSeleccionada.residentes.map((r, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setResidenteAQuienVisita(r.nombreCompleto)}
                        className={`btn btn-xs rounded-md font-semibold transition-colors ${
                          residenteAQuienVisita === r.nombreCompleto
                            ? 'btn-primary shadow-xs'
                            : 'btn-outline arch-border text-base-content/75 hover:bg-base-200'
                        }`}
                      >
                        {r.nombreCompleto} {r.condicion ? `(${r.condicion})` : ''}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <input
                type="text"
                value={residenteAQuienVisita}
                onChange={(e) => setResidenteAQuienVisita(e.target.value)}
                placeholder="Nombre del residente o anfitrión que autoriza..."
                className="input input-bordered arch-border bg-base-100 text-base-content w-full rounded-md px-3.5 py-2.5 text-sm focus:border-primary font-medium"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-2xs font-bold text-base-content/70 uppercase tracking-wider mb-1">
                  Nombre Completo del Visitante *
                </label>
                <input
                  type="text"
                  value={nombreVisitante}
                  onChange={(e) => setNombreVisitante(e.target.value)}
                  placeholder="ej: Alejandro Morales"
                  className="input input-bordered arch-border bg-base-100 text-base-content w-full rounded-md px-3.5 py-2.5 text-sm focus:border-primary font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-2xs font-bold text-base-content/70 uppercase tracking-wider mb-1">
                  Cédula / Documento (Opcional)
                </label>
                <input
                  type="text"
                  value={documentoVisitante}
                  onChange={(e) => setDocumentoVisitante(e.target.value)}
                  placeholder="ej: 10203040"
                  className="input input-bordered arch-border bg-base-100 text-base-content w-full rounded-md px-3.5 py-2.5 text-sm focus:border-primary font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-2xs font-bold text-base-content/70 uppercase tracking-wider mb-1">
                  Placa Vehículo (Si aplica)
                </label>
                <input
                  type="text"
                  value={placaVehiculo}
                  onChange={(e) => setPlacaVehiculo(e.target.value)}
                  placeholder="ej: XYZ123"
                  className="input input-bordered arch-border bg-base-100 text-base-content w-full rounded-md px-3.5 py-2.5 text-sm focus:border-primary font-mono uppercase font-bold"
                />
              </div>

              <div>
                <label className="block text-2xs font-bold text-base-content/70 uppercase tracking-wider mb-1">
                  Empresa / Domicilio (Si aplica)
                </label>
                <input
                  type="text"
                  value={empresa}
                  onChange={(e) => setEmpresa(e.target.value)}
                  placeholder="ej: Rappi, Claro, Particular"
                  className="input input-bordered arch-border bg-base-100 text-base-content w-full rounded-md px-3.5 py-2.5 text-sm focus:border-primary font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-2xs font-bold text-base-content/70 uppercase tracking-wider mb-1">
                Observaciones
              </label>
              <input
                type="text"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="ej: Ingresa con herramientas, visita técnica autorizada"
                className="input input-bordered arch-border bg-base-100 text-base-content w-full rounded-md px-3.5 py-2.5 text-sm focus:border-primary font-medium"
              />
            </div>

            <button
              type="submit"
              disabled={guardando}
              className="btn btn-primary w-full gap-2 font-bold text-sm shadow-xs mt-3 cursor-pointer"
            >
              {guardando ? 'Registrando ingreso...' : 'Confirmar Ingreso de Visitante'}
            </button>
          </form>
        </div>
      )}

      {/* Pestaña: Visitas Activas Adentro */}
      {tab === 'activas' && (
        <div className="space-y-4">
          {cargando ? (
            <div className="text-center py-10 text-base-content/50 text-sm">
              <span className="loading loading-spinner loading-md text-primary mb-2"></span>
              <p>Consultando visitas adentro...</p>
            </div>
          ) : activas.length === 0 ? (
            <div className="arch-panel p-8 text-center shadow-xs">
              <span className="icon-[tabler--user-check] text-3xl text-base-content/30 mb-2 block mx-auto" aria-hidden="true"></span>
              <p className="text-sm font-semibold text-base-content">
                No hay visitas activas registradas dentro del conjunto
              </p>
              <button
                onClick={() => setTab('ingreso')}
                className="btn btn-xs btn-primary font-bold mt-3 shadow-xs"
              >
                + Registrar Ingreso
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {activas.map((v) => (
                <div
                  key={v._id}
                  className="arch-panel p-3 flex flex-col justify-between hover:border-primary/40 transition-colors shadow-xs"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="px-2 py-0.5 rounded bg-base-200 text-base-content font-mono font-bold text-xs border arch-border">
                        {v.torre ? `Torre ${v.torre} - ` : ''}Apto {v.apartamento}
                      </span>
                      <span className="badge badge-3xs badge-info font-bold animate-pulse">
                        Adentro
                      </span>
                    </div>

                    <h3 className="font-bold text-sm text-base-content leading-snug">{v.nombreVisitante}</h3>

                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-3xs">
                      {v.residenteAQuienVisita && (
                        <span className="badge badge-xs badge-ghost font-medium">
                          👤 {v.residenteAQuienVisita}
                        </span>
                      )}
                      {v.placaVehiculo && (
                        <span className="badge badge-xs bg-primary/10 text-primary border-primary/20 font-mono font-bold">
                          🚗 {v.placaVehiculo}
                        </span>
                      )}
                      {v.empresa && (
                        <span className="badge badge-xs badge-ghost">
                          🏢 {v.empresa}
                        </span>
                      )}
                    </div>

                    <div className="text-3xs text-base-content/50 pt-2 mt-2 border-t arch-border flex items-center justify-between font-mono">
                      <span>
                        {new Date(v.fechaIngreso).toLocaleTimeString('es-CO', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true,
                        })}
                      </span>
                      <span>{v.vigilanteIngresoNombre}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRegistrarSalida(v._id)}
                    className="btn btn-xs btn-outline arch-border hover:btn-error w-full mt-2.5 gap-1 font-bold text-2xs cursor-pointer shadow-xs"
                  >
                    <span className="icon-[tabler--door-exit] text-xs" aria-hidden="true"></span>
                    Registrar Salida
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pestaña: Visitas Programadas (Pre-registros QR) */}
      {tab === 'programadas' && (
        <div className="space-y-4">
          {/* Barra de Filtro Rápido */}
          <div className="arch-panel p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="relative flex-1">
              <span className="icon-[tabler--search] absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40 text-sm"></span>
              <input
                type="text"
                value={filtroProgramadas}
                onChange={(e) => setFiltroProgramadas(e.target.value)}
                placeholder="Buscar por visitante, torre, apto o código (ej: PAS-7K)..."
                className="input input-sm input-bordered arch-border bg-base-100 text-base-content w-full pl-9 text-xs focus:border-primary font-medium"
              />
            </div>
            <div className="text-2xs text-base-content/60 font-semibold self-end sm:self-auto">
              Total programadas: <strong className="text-base-content">{programadas.length}</strong>
            </div>
          </div>

          {cargando ? (
            <div className="p-8 text-center arch-panel">
              <span className="loading loading-spinner text-primary"></span>
            </div>
          ) : programadas.length === 0 ? (
            <div className="arch-panel p-8 text-center shadow-xs">
              <span className="icon-[tabler--calendar-user] text-3xl text-base-content/30 mb-2 block mx-auto" aria-hidden="true"></span>
              <p className="text-sm font-semibold text-base-content">
                No hay visitas programadas pendientes para hoy
              </p>
              <p className="text-xs text-base-content/60 mt-1 max-w-md mx-auto">
                Los residentes pueden autorizar visitantes con pase QR o enlace temporal desde su portal. Aparecerán aquí automáticamente para acceso con 1 solo clic.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {programadas
                .filter((p) => {
                  if (!filtroProgramadas.trim()) return true;
                  const term = filtroProgramadas.toLowerCase();
                  return (
                    p.nombreVisitante?.toLowerCase().includes(term) ||
                    p.apartamento?.toLowerCase().includes(term) ||
                    p.torre?.toLowerCase().includes(term) ||
                    p.residenteNombre?.toLowerCase().includes(term) ||
                    p.codigoAcceso?.toLowerCase().includes(term) ||
                    p.placaVehiculo?.toLowerCase().includes(term)
                  );
                })
                .map((p) => (
                  <div
                    key={p._id}
                    className="arch-panel p-3 flex flex-col justify-between hover:border-primary/50 transition-colors shadow-xs border-l-4 border-l-primary"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span className="px-2 py-0.5 rounded bg-base-200 text-base-content font-mono font-bold text-xs border arch-border">
                          {p.torre ? `Torre ${p.torre} - ` : ''}Apto {p.apartamento}
                        </span>
                        <span className="font-mono text-2xs font-extrabold text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
                          {p.codigoAcceso}
                        </span>
                      </div>

                      <h3 className="font-bold text-sm text-base-content leading-snug">{p.nombreVisitante}</h3>

                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-3xs">
                        <span className="badge badge-xs badge-ghost font-medium">
                          👤 {p.residenteNombre}
                        </span>
                        <span className="badge badge-xs badge-ghost capitalize">
                          🎟️ {p.motivo}
                        </span>
                        {p.placaVehiculo && (
                          <span className="badge badge-xs bg-primary/10 text-primary border-primary/20 font-mono font-bold">
                            🚗 {p.placaVehiculo}
                          </span>
                        )}
                      </div>

                      {p.observaciones && (
                        <p className="text-3xs italic text-base-content/65 mt-1.5 truncate border-t arch-border pt-1">
                          &ldquo;{p.observaciones}&rdquo;
                        </p>
                      )}
                    </div>

                    <div className="mt-2.5 pt-2 border-t arch-border">
                      <button
                        onClick={() => handleRegistrarIngresoProgramado(p)}
                        disabled={procesandoIngresoId === p._id}
                        className="btn btn-xs btn-primary w-full gap-1 font-bold text-2xs cursor-pointer shadow-xs"
                      >
                        {procesandoIngresoId === p._id ? (
                          <>
                            <span className="loading loading-spinner loading-xs"></span>
                            Ingresando...
                          </>
                        ) : (
                          <>
                            <span className="icon-[tabler--login] text-xs" aria-hidden="true"></span>
                            Dar Paso Inmediato
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Pestaña: Historial */}
      {tab === 'historial' && (
        <div className="arch-panel overflow-hidden shadow-xs">
          <div className="p-4 border-b arch-border">
            <h3 className="text-sm font-bold text-base-content flex items-center gap-2">
              <span className="icon-[tabler--history] text-primary" aria-hidden="true"></span>
              Historial de Visitas y Salidas
            </h3>
          </div>
          {historial.length === 0 ? (
            <p className="text-center py-8 text-xs text-base-content/50">
              No hay historial de visitas registradas aún.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-xs w-full text-base-content">
                <thead>
                  <tr className="border-b arch-border text-base-content/60 text-2xs uppercase tracking-wider bg-base-200/50">
                    <th>Destino</th>
                    <th>Visitante</th>
                    <th>Visita a</th>
                    <th>Placa</th>
                    <th>Ingreso</th>
                    <th>Salida</th>
                    <th>Guardia Salida</th>
                  </tr>
                </thead>
                <tbody>
                  {historial.map((h) => (
                    <tr key={h._id} className="border-b arch-border hover:bg-base-200/40">
                      <td className="font-bold font-mono text-base-content">
                        {h.torre ? `T${h.torre} - ` : ''}{h.apartamento}
                      </td>
                      <td className="font-medium text-base-content/90">{h.nombreVisitante}</td>
                      <td className="text-2xs text-base-content/80 font-medium">
                        {h.residenteAQuienVisita || '-'}
                      </td>
                      <td className="font-mono text-primary font-bold">{h.placaVehiculo || '-'}</td>
                      <td className="text-2xs text-base-content/60 tabular-nums font-mono">
                        {new Date(h.fechaIngreso).toLocaleTimeString('es-CO', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="text-2xs text-success font-semibold tabular-nums font-mono">
                        {h.fechaSalida
                          ? new Date(h.fechaSalida).toLocaleTimeString('es-CO', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '-'}
                      </td>
                      <td className="text-2xs text-base-content/60">{h.vigilanteSalidaNombre || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
