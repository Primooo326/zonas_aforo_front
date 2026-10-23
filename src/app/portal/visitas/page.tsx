'use client';

import React, { useState, useEffect, useCallback } from 'react';
import QRCode from 'qrcode';
import { residentApiFetch } from '@/lib/api';
import { useResidentAuth } from '@/contexts/ResidentAuthContext';

interface PaseAcceso {
  _id: string;
  codigoAcceso: string;
  nombreVisitante: string;
  documentoVisitante?: string;
  placaVehiculo?: string;
  motivo: string;
  modalidad: 'un_solo_uso' | 'temporal';
  fechaInicio: string;
  fechaFin?: string;
  observaciones?: string;
  estado: 'activo' | 'consumido' | 'cancelado' | 'expirado';
  createdAt: string;
}

interface VisitaHistorial {
  _id: string;
  nombreVisitante: string;
  documentoVisitante?: string;
  placaVehiculo?: string;
  empresa?: string;
  tipo: string;
  fechaIngreso: string;
  fechaSalida?: string;
  vigilanteIngresoNombre: string;
}

export default function ResidentVisitasPage() {
  const { resident } = useResidentAuth();

  const [pases, setPases] = useState<PaseAcceso[]>([]);
  const [visitas, setVisitas] = useState<VisitaHistorial[]>([]);
  const [cargando, setCargando] = useState(true);
  const [tab, setTab] = useState<'pases' | 'historial'>('pases');

  // Modal Crear Pase
  const [modalCrearAbierto, setModalCrearAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [nombreVisitante, setNombreVisitante] = useState('');
  const [documentoVisitante, setDocumentoVisitante] = useState('');
  const [placaVehiculo, setPlacaVehiculo] = useState('');
  const [motivo, setMotivo] = useState('social');
  const [modalidad, setModalidad] = useState<'un_solo_uso' | 'temporal'>('un_solo_uso');
  const [fechaInicio, setFechaInicio] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [fechaFin, setFechaFin] = useState('');
  const [observaciones, setObservaciones] = useState('');

  // Modal QR
  const [modalQrPase, setModalQrPase] = useState<PaseAcceso | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiado, setCopiado] = useState(false);

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    try {
      const [resPases, resVisitas] = await Promise.all([
        residentApiFetch('/portal/pases'),
        residentApiFetch('/portal/visitas'),
      ]);
      setPases(resPases || []);
      setVisitas(resVisitas || []);
    } catch (err) {
      console.error('Error cargando visitas y pases:', err);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const handleCrearPase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreVisitante.trim()) {
      alert('Por favor ingresa el nombre del visitante');
      return;
    }

    setGuardando(true);
    try {
      const payload: any = {
        nombreVisitante: nombreVisitante.trim(),
        motivo,
        modalidad,
        fechaInicio: new Date(fechaInicio).toISOString(),
      };
      if (documentoVisitante.trim()) payload.documentoVisitante = documentoVisitante.trim();
      if (placaVehiculo.trim()) payload.placaVehiculo = placaVehiculo.trim().toUpperCase();
      if (observaciones.trim()) payload.observaciones = observaciones.trim();
      if (modalidad === 'temporal' && fechaFin) {
        payload.fechaFin = new Date(fechaFin).toISOString();
      }

      const nuevoPase = await residentApiFetch('/portal/pases', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      // Limpiar formulario y cerrar
      setNombreVisitante('');
      setDocumentoVisitante('');
      setPlacaVehiculo('');
      setObservaciones('');
      setModalCrearAbierto(false);

      await cargarDatos();

      // Abrir directamente modal del QR recién creado para compartir
      abrirModalQr(nuevoPase);
    } catch (err: any) {
      alert(err.message || 'Error creando autorización de visita');
    } finally {
      setGuardando(false);
    }
  };

  const handleCancelarPase = async (id: string) => {
    if (!confirm('¿Seguro que deseas cancelar este pase de acceso? El visitante ya no podrá ingresar con él.')) {
      return;
    }
    try {
      await residentApiFetch(`/portal/pases/${id}`, {
        method: 'DELETE',
      });
      await cargarDatos();
    } catch (err: any) {
      alert(err.message || 'Error cancelando el pase');
    }
  };

  const abrirModalQr = async (pase: PaseAcceso) => {
    setModalQrPase(pase);
    setCopiado(false);
    const passUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/pase/${pase.codigoAcceso}`
      : `/pase/${pase.codigoAcceso}`;

    try {
      const url = await QRCode.toDataURL(passUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: '#1e293b',
          light: '#ffffff',
        },
      });
      setQrDataUrl(url);
    } catch (err) {
      console.error('Error generando QR:', err);
    }
  };

  const compartirPorWhatsApp = (pase: PaseAcceso) => {
    const passUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/pase/${pase.codigoAcceso}`
      : `/pase/${pase.codigoAcceso}`;

    const mensaje = `Hola ${pase.nombreVisitante}, tienes autorización de acceso a ${resident?.nombre ? `visitar a ${resident.nombre}` : 'nuestro conjunto'}.%0A%0A🔑 Código de Pase: *${pase.codigoAcceso}*%0A📅 Fecha: ${new Date(pase.fechaInicio).toLocaleDateString()}%0A%0APuedes ver tu pase digital y código QR aquí:%0A${passUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${mensaje}`, '_blank');
  };

  const copiarEnlace = (codigoAcceso: string) => {
    const passUrl = `${window.location.origin}/pase/${codigoAcceso}`;
    navigator.clipboard.writeText(passUrl);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  const pasesActivos = pases.filter((p) => p.estado === 'activo');
  const pasesPasados = pases.filter((p) => p.estado !== 'activo');

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Encabezado Conciso con Métricas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b arch-border">
        <div className="flex items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-black text-base-content flex items-center gap-2">
            <span className="icon-[tabler--id-badge-2] text-primary text-2xl sm:text-3xl" aria-hidden="true"></span>
            Visitas & Pases
          </h1>
          <span className="badge badge-sm badge-neutral font-mono font-bold">
            {pasesActivos.length} activos
          </span>
        </div>

        <button
          onClick={() => setModalCrearAbierto(true)}
          className="btn btn-sm btn-primary font-bold shadow-xs gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <span className="icon-[tabler--user-plus] text-base" aria-hidden="true"></span>
          + Autorizar Visitante
        </button>
      </div>

      {/* Pestañas de Vista */}
      <div className="flex items-center gap-2 border-b arch-border">
        <button
          onClick={() => setTab('pases')}
          className={`pb-3 px-2 font-bold text-sm transition-colors relative flex items-center gap-2 ${
            tab === 'pases'
              ? 'text-primary'
              : 'text-base-content/60 hover:text-base-content'
          }`}
        >
          <span>Pases Autorizados</span>
          <span className="badge badge-xs font-mono font-bold badge-neutral">
            {pasesActivos.length}
          </span>
          {tab === 'pases' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"></span>
          )}
        </button>

        <button
          onClick={() => setTab('historial')}
          className={`pb-3 px-2 font-bold text-sm transition-colors relative flex items-center gap-2 ${
            tab === 'historial'
              ? 'text-primary'
              : 'text-base-content/60 hover:text-base-content'
          }`}
        >
          <span>Historial de Visitas</span>
          <span className="badge badge-xs font-mono font-bold badge-neutral">
            {visitas.length}
          </span>
          {tab === 'historial' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"></span>
          )}
        </button>
      </div>

      {/* Contenido: Pases Autorizados */}
      {tab === 'pases' && (
        <div className="space-y-6">
          {cargando ? (
            <div className="arch-panel p-12 text-center">
              <span className="loading loading-spinner loading-md text-primary"></span>
              <p className="text-xs text-base-content/60 mt-2 font-medium">Cargando pases de acceso...</p>
            </div>
          ) : pasesActivos.length === 0 ? (
            <div className="arch-panel p-8 text-center shadow-xs">
              <span className="icon-[tabler--qrcode] text-3xl text-base-content/30 mb-2 block mx-auto" aria-hidden="true"></span>
              <h3 className="font-bold text-sm text-base-content">No tienes pases de acceso activos</h3>
              <p className="text-2xs text-base-content/60 mt-0.5 max-w-sm mx-auto">
                Crea una invitación con código QR para compartirla por WhatsApp y agilizar el ingreso en portería.
              </p>
              <button
                onClick={() => setModalCrearAbierto(true)}
                className="btn btn-primary btn-xs font-bold mt-3 shadow-xs"
              >
                + Generar Pase QR
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {pasesActivos.map((pase) => (
                <div
                  key={pase._id}
                  className="arch-panel p-3.5 flex flex-col justify-between hover:border-primary/50 transition-colors shadow-xs"
                >
                  <div>
                    {/* Header: Código + Estado */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-xs font-extrabold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                        {pase.codigoAcceso}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="badge badge-3xs badge-neutral font-mono uppercase font-bold">
                          {pase.modalidad === 'temporal' ? 'Temporal' : '1 uso'}
                        </span>
                        <span className="badge badge-3xs badge-success font-bold">
                          Activo
                        </span>
                      </div>
                    </div>

                    {/* Nombre Principal */}
                    <h3 className="font-bold text-sm text-base-content leading-snug">
                      {pase.nombreVisitante}
                    </h3>

                    {/* Chips de Datos Clave (Glanceable) */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span className="badge badge-xs badge-ghost font-medium">
                        🎟️ {pase.motivo.replace('_', ' ')}
                      </span>
                      <span className="badge badge-xs badge-ghost font-mono">
                        📅 {new Date(pase.fechaInicio).toLocaleDateString('es-CO', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                      {pase.placaVehiculo && (
                        <span className="badge badge-xs bg-primary/15 text-primary border-primary/20 font-mono font-bold">
                          🚗 {pase.placaVehiculo}
                        </span>
                      )}
                    </div>

                    {/* Detalles Secundarios (Progressive Disclosure sutil) */}
                    {(pase.documentoVisitante || pase.observaciones) && (
                      <div className="mt-2 text-3xs text-base-content/65 space-y-0.5 border-t arch-border pt-1.5">
                        {pase.documentoVisitante && (
                          <p><span className="text-base-content/50">Doc:</span> {pase.documentoVisitante}</p>
                        )}
                        {pase.observaciones && (
                          <p className="italic truncate">&ldquo;{pase.observaciones}&rdquo;</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Acciones directas */}
                  <div className="mt-3 pt-2.5 border-t arch-border flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => compartirPorWhatsApp(pase)}
                        className="btn btn-xs btn-outline hover:btn-success gap-1 font-bold text-2xs cursor-pointer"
                        title="Enviar por WhatsApp"
                      >
                        <span className="icon-[tabler--brand-whatsapp] text-sm text-success" aria-hidden="true"></span>
                        WhatsApp
                      </button>

                      <button
                        type="button"
                        onClick={() => abrirModalQr(pase)}
                        className="btn btn-xs btn-primary gap-1 font-bold text-2xs cursor-pointer shadow-xs"
                      >
                        <span className="icon-[tabler--qrcode] text-sm" aria-hidden="true"></span>
                        Ver QR
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCancelarPase(pase._id)}
                      className="btn btn-xs btn-ghost text-error/70 hover:text-error hover:bg-error/10 p-1"
                      title="Cancelar autorización"
                    >
                      <span className="icon-[tabler--trash] text-sm" aria-hidden="true"></span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Historial de Pases Anteriores */}
          {pasesPasados.length > 0 && (
            <div className="pt-6 border-t arch-border">
              <h3 className="text-xs font-bold text-base-content/70 uppercase tracking-wider mb-3">
                Pases Usados o Cancelados ({pasesPasados.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {pasesPasados.map((p) => (
                  <div key={p._id} className="arch-panel p-3 opacity-70 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold">{p.codigoAcceso}</span>
                      <span className={`badge badge-3xs font-bold ${
                        p.estado === 'consumido' ? 'badge-info' : 'badge-neutral'
                      }`}>
                        {p.estado}
                      </span>
                    </div>
                    <p className="font-semibold text-base-content mt-1">{p.nombreVisitante}</p>
                    <p className="text-3xs text-base-content/60">
                      {new Date(p.fechaInicio).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Contenido: Historial de Visitas que Ingresaron */}
      {tab === 'historial' && (
        <div className="arch-panel overflow-hidden shadow-xs">
          <div className="p-3.5 border-b arch-border flex items-center justify-between">
            <h3 className="font-bold text-xs sm:text-sm text-base-content flex items-center gap-2">
              <span className="icon-[tabler--history] text-primary" aria-hidden="true"></span>
              Historial de Ingresos Registrados
            </h3>
            <span className="badge badge-xs badge-neutral font-mono">{visitas.length} registros</span>
          </div>

          {cargando ? (
            <div className="p-8 text-center">
              <span className="loading loading-spinner text-primary"></span>
            </div>
          ) : visitas.length === 0 ? (
            <div className="p-8 text-center">
              <span className="icon-[tabler--users] text-3xl text-base-content/30 mb-2 block mx-auto"></span>
              <p className="text-xs text-base-content/60">Aún no hay visitas registradas para tu unidad.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-sm w-full text-xs">
                <thead>
                  <tr className="border-b arch-border text-2xs text-base-content/60 uppercase">
                    <th>Visitante</th>
                    <th>Tipo / Empresa</th>
                    <th>Placa</th>
                    <th>Fecha & Hora Ingreso</th>
                    <th>Salida</th>
                    <th>Guarda de Turno</th>
                  </tr>
                </thead>
                <tbody>
                  {visitas.map((v) => (
                    <tr key={v._id} className="border-b arch-border hover:bg-base-200/50">
                      <td className="font-bold text-base-content">
                        {v.nombreVisitante}
                        {v.documentoVisitante && (
                          <span className="block text-3xs font-normal text-base-content/60 font-mono">
                            CC: {v.documentoVisitante}
                          </span>
                        )}
                      </td>
                      <td>
                        <span className="badge badge-xs badge-neutral">
                          {v.empresa || v.tipo || 'Visita'}
                        </span>
                      </td>
                      <td className="font-mono font-bold text-primary">
                        {v.placaVehiculo || '—'}
                      </td>
                      <td className="tabular-nums font-mono">
                        {new Date(v.fechaIngreso).toLocaleString('es-CO', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true,
                        })}
                      </td>
                      <td className="tabular-nums font-mono">
                        {v.fechaSalida ? (
                          new Date(v.fechaSalida).toLocaleTimeString('es-CO', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true,
                          })
                        ) : (
                          <span className="badge badge-xs badge-info font-bold">Adentro</span>
                        )}
                      </td>
                      <td className="text-base-content/70">{v.vigilanteIngresoNombre}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL: Crear Autorización de Visita */}
      {modalCrearAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="arch-panel w-full max-w-lg p-5 sm:p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2.5 border-b arch-border mb-3.5">
              <h2 className="text-sm sm:text-base font-black text-base-content flex items-center gap-2">
                <span className="icon-[tabler--id-badge-2] text-primary text-lg" aria-hidden="true"></span>
                Autorizar Visitante
              </h2>
              <button
                type="button"
                onClick={() => setModalCrearAbierto(false)}
                className="btn btn-xs btn-ghost btn-circle"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCrearPase} className="space-y-3">
              {/* Modalidad en Segmented Toggle compacto */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-base-200/60 rounded-lg border arch-border">
                <button
                  type="button"
                  onClick={() => setModalidad('un_solo_uso')}
                  className={`py-1.5 px-3 rounded-md text-xs font-bold transition-all text-center cursor-pointer ${
                    modalidad === 'un_solo_uso'
                      ? 'bg-base-100 text-primary shadow-xs'
                      : 'text-base-content/60 hover:text-base-content'
                  }`}
                >
                  🎟️ Un Solo Uso
                </button>

                <button
                  type="button"
                  onClick={() => setModalidad('temporal')}
                  className={`py-1.5 px-3 rounded-md text-xs font-bold transition-all text-center cursor-pointer ${
                    modalidad === 'temporal'
                      ? 'bg-base-100 text-primary shadow-xs'
                      : 'text-base-content/60 hover:text-base-content'
                  }`}
                >
                  📅 Temporal
                </button>
              </div>

              {/* Nombre Visitante */}
              <div>
                <label className="block text-2xs font-semibold text-base-content/75 mb-1">
                  Nombre del Visitante *
                </label>
                <input
                  type="text"
                  value={nombreVisitante}
                  onChange={(e) => setNombreVisitante(e.target.value)}
                  placeholder="ej: Andrés Felipe Gómez"
                  className="input input-bordered arch-border bg-base-100 text-base-content w-full rounded-md px-3 py-2 text-xs focus:border-primary font-medium"
                  required
                />
              </div>

              {/* Motivo */}
              <div>
                <label className="block text-2xs font-semibold text-base-content/75 mb-1">
                  Motivo de Visita *
                </label>
                <select
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  className="select select-bordered arch-border bg-base-100 text-base-content w-full rounded-md px-3 py-2 text-xs focus:border-primary font-medium"
                >
                  <option value="social">Visita Social / Amigos</option>
                  <option value="familiar">Familiar</option>
                  <option value="contratista">Contratista / Obra</option>
                  <option value="servicio_tecnico">Servicio Técnico</option>
                  <option value="mudanza">Mudanza</option>
                  <option value="otro">Otro</option>
                </select>
              </div>

              {/* Fechas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-2xs font-semibold text-base-content/75 mb-1">
                    {modalidad === 'temporal' ? 'Fecha Inicio *' : 'Fecha Visita *'}
                  </label>
                  <input
                    type="date"
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    className="input input-bordered arch-border bg-base-100 text-base-content w-full rounded-md px-3 py-1.5 text-xs focus:border-primary font-mono font-medium"
                    required
                  />
                </div>

                {modalidad === 'temporal' && (
                  <div>
                    <label className="block text-2xs font-semibold text-base-content/75 mb-1">
                      Fecha Vencimiento *
                    </label>
                    <input
                      type="date"
                      value={fechaFin}
                      onChange={(e) => setFechaFin(e.target.value)}
                      className="input input-bordered arch-border bg-base-100 text-base-content w-full rounded-md px-3 py-1.5 text-xs focus:border-primary font-mono font-medium"
                    />
                  </div>
                )}
              </div>

              {/* Cédula y Placa */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-2xs font-semibold text-base-content/75 mb-1">
                    Cédula (Opcional)
                  </label>
                  <input
                    type="text"
                    value={documentoVisitante}
                    onChange={(e) => setDocumentoVisitante(e.target.value)}
                    placeholder="ej: 1018423987"
                    className="input input-bordered arch-border bg-base-100 text-base-content w-full rounded-md px-3 py-1.5 text-xs focus:border-primary font-mono"
                  />
                </div>

                <div>
                  <label className="block text-2xs font-semibold text-base-content/75 mb-1">
                    Placa (Opcional)
                  </label>
                  <input
                    type="text"
                    value={placaVehiculo}
                    onChange={(e) => setPlacaVehiculo(e.target.value)}
                    placeholder="ej: ABC123"
                    className="input input-bordered arch-border bg-base-100 text-base-content w-full rounded-md px-3 py-1.5 text-xs focus:border-primary font-mono uppercase"
                  />
                </div>
              </div>

              {/* Observaciones */}
              <div>
                <label className="block text-2xs font-semibold text-base-content/75 mb-1">
                  Notas para Portería (Opcional)
                </label>
                <textarea
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="ej: Autorizado para herramientas..."
                  rows={2}
                  className="textarea textarea-bordered arch-border bg-base-100 text-base-content w-full rounded-md px-3 py-1.5 text-xs focus:border-primary font-medium"
                ></textarea>
              </div>

              <div className="pt-2.5 border-t arch-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalCrearAbierto(false)}
                  className="btn btn-xs btn-ghost"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="btn btn-xs btn-primary font-bold shadow-xs gap-1.5"
                >
                  {guardando ? (
                    <>
                      <span className="loading loading-spinner loading-xs"></span>
                      Generando...
                    </>
                  ) : (
                    <>
                      <span className="icon-[tabler--qrcode] text-sm" aria-hidden="true"></span>
                      Generar Pase & QR
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Visualización de Pase QR y Compartir */}
      {modalQrPase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="arch-panel w-full max-w-sm p-6 text-center shadow-2xl relative">
            <button
              onClick={() => setModalQrPase(null)}
              className="btn btn-xs btn-ghost btn-circle absolute top-3 right-3"
            >
              ✕
            </button>

            <span className="badge badge-xs badge-success font-bold uppercase tracking-wider mb-2">
              Pase Autorizado
            </span>

            <h3 className="text-lg font-black text-base-content mb-0.5">
              {modalQrPase.nombreVisitante}
            </h3>
            <p className="text-xs text-base-content/65 mb-4 font-mono font-bold text-primary">
              Código: {modalQrPase.codigoAcceso}
            </p>

            {/* Código QR */}
            <div className="bg-white p-3 rounded-xl inline-block border-2 border-base-300 shadow-inner mb-4">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR Pase ${modalQrPase.codigoAcceso}`}
                  className="w-48 h-48 mx-auto"
                />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center">
                  <span className="loading loading-spinner text-primary"></span>
                </div>
              )}
            </div>

            {/* Botones de acción directos */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => compartirPorWhatsApp(modalQrPase)}
                className="btn btn-sm btn-outline hover:btn-success w-full gap-2 font-bold text-xs cursor-pointer"
              >
                <span className="icon-[tabler--brand-whatsapp] text-base text-success" aria-hidden="true"></span>
                Compartir por WhatsApp
              </button>

              <button
                type="button"
                onClick={() => copiarEnlace(modalQrPase.codigoAcceso)}
                className="btn btn-sm btn-ghost border arch-border w-full text-xs font-medium cursor-pointer"
              >
                {copiado ? '✅ ¡Enlace Copiado!' : 'Copiar enlace público del pase'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
