'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { usePorteria } from '@/contexts/PorteriaContext';
import { porteriaApiFetch } from '@/lib/api';
import SelectorUnidadPorteria, { UnidadSeleccionada } from '@/components/porteria/SelectorUnidadPorteria';

const TRANSPORTADORAS = [
  'Servientrega',
  'Coordinadora',
  'Envía',
  'InterRapidísimo',
  'Amazon',
  'Mercado Libre',
  'FedEx / DHL',
  'Domicilio / Rappi',
  'Otro',
];

export default function CasilleroPorteriaPage() {
  const searchParams = useSearchParams();
  const { vigilanteActivo, vigilantes } = usePorteria();

  const [tab, setTab] = useState<'pendientes' | 'registrar' | 'historial'>('pendientes');
  const [paquetes, setPaquetes] = useState<any[]>([]);
  const [historial, setHistorial] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);

  // Formulario de Registro
  const [unidadSeleccionada, setUnidadSeleccionada] = useState<UnidadSeleccionada | null>(null);
  const [torre, setTorre] = useState(searchParams.get('torre') || '');
  const [apartamento, setApartamento] = useState(searchParams.get('apto') || '');
  const [destinatario, setDestinatario] = useState('');
  const [transportadora, setTransportadora] = useState('Servientrega');
  const [tipo, setTipo] = useState('paquete');
  const [observaciones, setObservaciones] = useState('');
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  // Modal de Entrega
  const [paqueteAEntregar, setPaqueteAEntregar] = useState<any | null>(null);
  const [residentesUnidad, setResidentesUnidad] = useState<any[]>([]);
  const [nombreReceptor, setNombreReceptor] = useState('');
  const [cargandoResidentes, setCargandoResidentes] = useState(false);
  const [entregando, setEntregando] = useState(false);

  const cargarPendientes = async () => {
    setCargando(true);
    try {
      const data = await porteriaApiFetch('/porteria/paquetes/pendientes');
      setPaquetes(data || []);
    } catch (err) {
      console.error('Error cargando paquetes pendientes:', err);
    } finally {
      setCargando(false);
    }
  };

  const cargarHistorial = async () => {
    try {
      const data = await porteriaApiFetch('/porteria/paquetes/historial');
      setHistorial(data || []);
    } catch (err) {
      console.error('Error cargando historial de paquetes:', err);
    }
  };

  useEffect(() => {
    cargarPendientes();
    cargarHistorial();
  }, []);

  const handleUnidadChange = (u: UnidadSeleccionada | null) => {
    setUnidadSeleccionada(u);
    if (u) {
      setTorre(u.torre || '');
      setApartamento(u.numeroApto || '');
    } else {
      setTorre('');
      setApartamento('');
      setDestinatario('');
    }
  };

  const handleRegistrar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!torre.trim() || !apartamento.trim()) {
      alert('Por favor selecciona o ingresa Torre y Apartamento');
      return;
    }

    const vigilanteNombre = vigilanteActivo?.nombreCompleto || 'Vigilante de Turno';
    const vigilanteId = vigilanteActivo?._id;

    setGuardando(true);
    try {
      const formData = new FormData();
      formData.append('torre', torre.trim());
      formData.append('apartamento', apartamento.trim());
      if (destinatario.trim()) formData.append('destinatario', destinatario.trim());
      formData.append('transportadora', transportadora);
      formData.append('tipo', tipo);
      if (observaciones.trim()) formData.append('observaciones', observaciones.trim());
      if (vigilanteId) formData.append('vigilanteRecibioId', vigilanteId);
      formData.append('vigilanteRecibioNombre', vigilanteNombre);
      if (fotoFile) formData.append('fotoGuia', fotoFile);

      await porteriaApiFetch('/porteria/paquetes', {
        method: 'POST',
        body: formData,
      });

      setMensajeExito(`¡Paquete para Torre ${torre} - ${apartamento} registrado exitosamente!`);
      setTorre('');
      setApartamento('');
      setUnidadSeleccionada(null);
      setDestinatario('');
      setObservaciones('');
      setFotoFile(null);
      await cargarPendientes();
      setTimeout(() => {
        setMensajeExito(null);
        setTab('pendientes');
      }, 1500);
    } catch (err: any) {
      alert(err.message || 'Error registrando paquete');
    } finally {
      setGuardando(false);
    }
  };

  const abrirModalEntrega = async (p: any) => {
    setPaqueteAEntregar(p);
    setNombreReceptor(p.destinatario || '');
    setCargandoResidentes(true);
    try {
      const res = await porteriaApiFetch(
        `/porteria/consultas/directorio?q=${encodeURIComponent(p.apartamento)}`,
      );
      const match = (res || []).find(
        (u: any) =>
          u.numeroApto?.toUpperCase() === p.apartamento?.toUpperCase() &&
          (!p.torre || u.torre?.toUpperCase() === p.torre?.toUpperCase()),
      );
      if (match && match.residentes) {
        setResidentesUnidad(match.residentes);
      } else {
        setResidentesUnidad([]);
      }
    } catch (err) {
      console.error('Error buscando residentes:', err);
    } finally {
      setCargandoResidentes(false);
    }
  };

  const confirmarEntrega = async () => {
    if (!paqueteAEntregar) return;
    if (!nombreReceptor.trim()) {
      alert('Por favor selecciona o escribe el nombre de la persona que retira el paquete');
      return;
    }

    const vigilanteNombre = vigilanteActivo?.nombreCompleto || 'Vigilante de Turno';
    const vigilanteId = vigilanteActivo?._id;

    setEntregando(true);
    try {
      await porteriaApiFetch(`/porteria/paquetes/${paqueteAEntregar._id}/entregar`, {
        method: 'PATCH',
        body: JSON.stringify({
          entregadoA: nombreReceptor.trim(),
          vigilanteEntregoId: vigilanteId,
          vigilanteEntregoNombre: vigilanteNombre,
        }),
      });

      setPaqueteAEntregar(null);
      await cargarPendientes();
      await cargarHistorial();
    } catch (err: any) {
      alert(err.message || 'Error confirmando entrega');
    } finally {
      setEntregando(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado Arquitectónico y Selector de Vistas */}
      <div className="arch-panel p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-base-content flex items-center gap-2">
            <span className="icon-[tabler--package] text-primary text-2xl" aria-hidden="true"></span>
            Casillero Digital &bull; Paquetería
          </h1>
          <p className="text-xs text-base-content/65 mt-0.5">
            Recepción, custodia y entrega registrada de correspondencia física y encomiendas.
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-base-200 p-1 rounded-md border arch-border self-start sm:self-auto">
          <button
            onClick={() => setTab('pendientes')}
            className={`btn btn-xs font-bold transition-colors ${
              tab === 'pendientes'
                ? 'btn-primary shadow-xs'
                : 'btn-ghost text-base-content/70 hover:text-base-content'
            }`}
          >
            Pendientes ({paquetes.length})
          </button>
          <button
            onClick={() => setTab('registrar')}
            className={`btn btn-xs font-bold transition-colors ${
              tab === 'registrar'
                ? 'btn-primary shadow-xs'
                : 'btn-ghost text-base-content/70 hover:text-base-content'
            }`}
          >
            + Recibir Paquete
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

      {mensajeExito && (
        <div className="bg-success/10 border border-success/30 text-success p-3.5 rounded-md text-xs font-semibold flex items-center gap-2">
          <span className="icon-[tabler--check] text-lg" aria-hidden="true"></span>
          {mensajeExito}
        </div>
      )}

      {/* Pestaña: Registrar Paquete */}
      {tab === 'registrar' && (
        <div className="arch-panel max-w-2xl mx-auto p-5 sm:p-7 shadow-xs">
          <h2 className="text-base font-bold text-base-content mb-4 flex items-center gap-2 pb-3 border-b arch-border">
            <span className="icon-[tabler--package-import] text-primary text-xl" aria-hidden="true"></span>
            Registrar Ingreso de Paquete / Encomienda
          </h2>

          <form onSubmit={handleRegistrar} className="space-y-4">
            {/* Selector Predictivo de Inmueble */}
            <SelectorUnidadPorteria
              onSelect={handleUnidadChange}
              unidadActual={torre || apartamento ? { torre, apartamento } : null}
              label="Inmueble de Destino (Torre / Apartamento)"
              required={true}
            />

            {/* Destinatario Opcional */}
            <div>
              <label className="block text-2xs font-bold text-base-content/70 uppercase tracking-wider mb-1.5">
                Destinatario en la Guía (Opcional)
              </label>

              {/* Chips rápidos de residentes censados */}
              {unidadSeleccionada && unidadSeleccionada.residentes.length > 0 && (
                <div className="space-y-1 mb-2">
                  <span className="text-3xs text-base-content/60 block font-medium">
                    Residentes censados (haz clic si la encomienda viene a su nombre):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {unidadSeleccionada.residentes.map((r, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setDestinatario(r.nombreCompleto)}
                        className={`btn btn-xs rounded-md font-semibold transition-colors ${
                          destinatario === r.nombreCompleto
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
                value={destinatario}
                onChange={(e) => setDestinatario(e.target.value)}
                placeholder="Nombre del residente según la guía (o dejar vacío para la unidad)..."
                className="input input-bordered arch-border bg-base-100 text-base-content w-full rounded-md px-3.5 py-2 text-sm focus:border-primary font-medium"
              />
            </div>

            <div>
              <label className="block text-2xs font-bold text-base-content/70 uppercase tracking-wider mb-1.5">
                Empresa Transportadora
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {TRANSPORTADORAS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTransportadora(t)}
                    className={`btn btn-xs rounded-md font-semibold transition-colors ${
                      transportadora === t
                        ? 'btn-primary shadow-xs'
                        : 'btn-outline arch-border text-base-content/75 hover:bg-base-200'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={transportadora}
                onChange={(e) => setTransportadora(e.target.value)}
                placeholder="Nombre de la transportadora o mensajero"
                className="input input-bordered arch-border bg-base-100 text-base-content w-full rounded-md px-3.5 py-2 text-sm focus:border-primary font-medium"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-2xs font-bold text-base-content/70 uppercase tracking-wider mb-1">
                  Tipo de Encomienda
                </label>
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                  className="select select-bordered arch-border bg-base-100 text-base-content w-full rounded-md text-sm font-medium focus:border-primary"
                >
                  <option value="paquete">📦 Paquete / Caja mediana</option>
                  <option value="sobre">✉️ Sobre / Carta</option>
                  <option value="caja_grande">📦 Caja Grande / Voluminoso</option>
                  <option value="domicilio">🍔 Domicilio / Comida</option>
                </select>
              </div>

              <div>
                <label className="block text-2xs font-bold text-base-content/70 uppercase tracking-wider mb-1">
                  Foto de la Guía (Opcional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => setFotoFile(e.target.files?.[0] || null)}
                  className="file-input file-input-bordered arch-border bg-base-100 text-xs w-full text-base-content/70 rounded-md file:bg-base-200 file:border-0 file:text-xs file:font-bold file:text-base-content"
                />
              </div>
            </div>

            <div>
              <label className="block text-2xs font-bold text-base-content/70 uppercase tracking-wider mb-1">
                Observaciones / Ubicación en casillero
              </label>
              <input
                type="text"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="ej: Casillero 14, paquete frágil"
                className="input input-bordered arch-border bg-base-100 text-base-content w-full rounded-md px-3.5 py-2.5 text-sm focus:border-primary font-medium"
              />
            </div>

            <button
              type="submit"
              disabled={guardando}
              className="btn btn-primary w-full gap-2 font-bold text-sm shadow-xs mt-3 cursor-pointer"
            >
              {guardando ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  <span>Guardando paquete...</span>
                </>
              ) : (
                <>
                  <span className="icon-[tabler--check] text-lg" aria-hidden="true"></span>
                  <span>Confirmar Recepción de Paquete</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Pestaña: Paquetes Pendientes por Entregar */}
      {tab === 'pendientes' && (
        <div className="space-y-4">
          {cargando ? (
            <div className="text-center py-12 text-base-content/50 text-sm">
              <span className="loading loading-spinner loading-md text-primary mb-2"></span>
              <p>Cargando paquetes en casillero...</p>
            </div>
          ) : paquetes.length === 0 ? (
            <div className="arch-panel p-10 text-center shadow-xs">
              <span className="icon-[tabler--package-off] text-4xl text-base-content/30 mb-3 block mx-auto" aria-hidden="true"></span>
              <h3 className="text-base font-bold text-base-content">
                No hay paquetes pendientes en casillero
              </h3>
              <p className="text-xs text-base-content/60 mt-1 mb-4">
                Todos los paquetes recibidos han sido entregados a los residentes.
              </p>
              <button
                onClick={() => setTab('registrar')}
                className="btn btn-sm btn-primary font-bold shadow-xs"
              >
                + Recibir Nuevo Paquete
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {paquetes.map((p) => (
                <div
                  key={p._id}
                  className="arch-panel p-4 flex flex-col justify-between hover:border-primary/40 transition-colors shadow-xs"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2.5 py-1 rounded-md bg-base-200 text-base-content font-mono font-bold text-sm border arch-border">
                        {p.torre ? `Torre ${p.torre} - ` : ''}Apto {p.apartamento}
                      </span>
                      <span className="badge badge-xs badge-warning font-bold">
                        Por retirar
                      </span>
                    </div>

                    <div className="space-y-1 mb-2">
                      <p className="text-xs text-base-content/85 font-semibold flex items-center gap-1.5">
                        <span className="icon-[tabler--truck-delivery] text-primary" aria-hidden="true"></span>
                        {p.transportadora} &bull; <span className="capitalize">{p.tipo}</span>
                      </p>
                      
                      {p.destinatario && (
                        <p className="text-2xs text-base-content/80 font-medium flex items-center gap-1">
                          <span className="icon-[tabler--user] text-primary" aria-hidden="true"></span>
                          Para: <strong className="text-base-content">{p.destinatario}</strong>
                        </p>
                      )}

                      {p.observaciones && (
                        <p className="text-2xs text-base-content/60 italic">
                          &ldquo;{p.observaciones}&rdquo;
                        </p>
                      )}
                    </div>

                    {p.fotoGuiaUrl && (
                      <div className="mt-2 mb-2">
                        <a
                          href={p.fotoGuiaUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-2xs text-primary hover:underline flex items-center gap-1 font-semibold"
                        >
                          <span className="icon-[tabler--photo] text-sm" aria-hidden="true"></span>
                          Ver foto de guía
                        </a>
                      </div>
                    )}

                    <div className="text-3xs text-base-content/50 pt-2 border-t arch-border flex items-center justify-between">
                      <span>Recibió: {p.vigilanteRecibioNombre}</span>
                      <span className="tabular-nums font-mono">
                        {new Date(p.fechaRecepcion).toLocaleTimeString('es-CO', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true,
                        })}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => abrirModalEntrega(p)}
                    className="mt-4 btn btn-sm btn-primary w-full gap-1.5 font-bold text-xs shadow-xs"
                  >
                    <span className="icon-[tabler--check] text-sm" aria-hidden="true"></span>
                    Entregar a Residente
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pestaña: Historial de Entregas */}
      {tab === 'historial' && (
        <div className="arch-panel overflow-hidden shadow-xs">
          <div className="p-4 border-b arch-border">
            <h3 className="text-sm font-bold text-base-content flex items-center gap-2">
              <span className="icon-[tabler--history] text-primary" aria-hidden="true"></span>
              Historial de Paquetes Entregados Recientemente
            </h3>
          </div>
          {historial.length === 0 ? (
            <p className="text-center py-8 text-xs text-base-content/50">
              No hay historial de entregas registradas aún.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-xs w-full text-base-content">
                <thead>
                  <tr className="border-b arch-border text-base-content/60 text-2xs uppercase tracking-wider bg-base-200/50">
                    <th>Unidad</th>
                    <th>Destinatario</th>
                    <th>Transportadora</th>
                    <th>Entregado a</th>
                    <th>Fecha / Hora Entrega</th>
                    <th>Guardia que entregó</th>
                  </tr>
                </thead>
                <tbody>
                  {historial.map((h) => (
                    <tr key={h._id} className="border-b arch-border hover:bg-base-200/40">
                      <td className="font-bold font-mono text-base-content">
                        {h.torre ? `T${h.torre} - ` : ''}{h.apartamento}
                      </td>
                      <td className="text-2xs text-base-content/75 font-medium">
                        {h.destinatario || '-'}
                      </td>
                      <td className="font-medium text-base-content/85">{h.transportadora}</td>
                      <td className="font-semibold text-primary">{h.entregadoA || 'Residente'}</td>
                      <td className="text-2xs text-base-content/60 tabular-nums font-mono">
                        {h.fechaEntrega
                          ? new Date(h.fechaEntrega).toLocaleString('es-CO', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })
                          : '-'}
                      </td>
                      <td className="text-2xs text-base-content/60">
                        {h.vigilanteEntregoNombre || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal de Entrega Directa */}
      {paqueteAEntregar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral/60 backdrop-blur-xs">
          <div className="arch-panel bg-base-100 max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b arch-border">
              <div>
                <h3 className="text-base font-bold text-base-content flex items-center gap-2">
                  <span className="icon-[tabler--hand-finger] text-primary" aria-hidden="true"></span>
                  Entregar Encomienda
                </h3>
                <p className="text-xs text-base-content/65 mt-0.5">
                  {paqueteAEntregar.torre ? `Torre ${paqueteAEntregar.torre} - ` : ''}
                  Apartamento {paqueteAEntregar.apartamento} &bull; {paqueteAEntregar.transportadora}
                </p>
              </div>
              <button
                onClick={() => setPaqueteAEntregar(null)}
                className="btn btn-ghost btn-circle btn-xs text-base-content/60 hover:text-base-content"
              >
                <span className="icon-[tabler--x] text-base" aria-hidden="true"></span>
              </button>
            </div>

            <div>
              <label className="block text-2xs font-bold text-base-content/70 uppercase tracking-wider mb-2">
                ¿Quién retira el paquete?
              </label>

              {cargandoResidentes ? (
                <div className="text-xs text-base-content/60 py-3 flex items-center gap-2">
                  <span className="loading loading-spinner loading-xs text-primary"></span>
                  Consultando residentes censados de la unidad...
                </div>
              ) : residentesUnidad.length > 0 ? (
                <div className="space-y-1.5 mb-3">
                  <span className="text-2xs text-base-content/60 block font-medium">
                    Residentes censados (haz clic para seleccionar):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {residentesUnidad.map((r: any, idx: number) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setNombreReceptor(r.nombreCompleto)}
                        className={`btn btn-xs rounded-md font-semibold transition-colors ${
                          nombreReceptor === r.nombreCompleto
                            ? 'btn-primary shadow-xs'
                            : 'btn-outline arch-border text-base-content/75 hover:bg-base-200'
                        }`}
                      >
                        {r.nombreCompleto} ({r.condicion || 'Residente'})
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <input
                type="text"
                value={nombreReceptor}
                onChange={(e) => setNombreReceptor(e.target.value)}
                placeholder="Nombre de la persona que retira..."
                className="input input-bordered arch-border bg-base-100 text-base-content w-full rounded-md px-3.5 py-2.5 text-sm focus:border-primary font-medium"
                autoFocus
              />
              <p className="text-2xs text-base-content/50 mt-1">
                Vigilante que entrega:{' '}
                <strong className="text-base-content">
                  {vigilanteActivo?.nombreCompleto || 'Vigilante de Turno'}
                </strong>
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t arch-border">
              <button
                type="button"
                onClick={() => setPaqueteAEntregar(null)}
                className="btn btn-sm btn-ghost arch-border text-base-content/70 hover:text-base-content"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={entregando || !nombreReceptor.trim()}
                onClick={confirmarEntrega}
                className="btn btn-sm btn-primary font-bold shadow-xs"
              >
                {entregando ? 'Confirmando...' : 'Confirmar Entrega'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
