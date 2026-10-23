'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';

export default function VigilantesDashboardPage() {
  const [tab, setTab] = useState<'personal' | 'credenciales' | 'minuta'>('personal');

  // Personal de Vigilancia
  const [vigilantes, setVigilantes] = useState<any[]>([]);
  const [cargandoVigilantes, setCargandoVigilantes] = useState(false);
  const [mostrarModalNuevo, setMostrarModalNuevo] = useState(false);
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [cedula, setCedula] = useState('');
  const [telefono, setTelefono] = useState('');
  const [empresaSeguridad, setEmpresaSeguridad] = useState('');
  const [guardandoGuarda, setGuardandoGuarda] = useState(false);

  // Credenciales de Puesto
  const [infoPuesto, setInfoPuesto] = useState<any | null>(null);
  const [usuarioPuesto, setUsuarioPuesto] = useState('');
  const [passwordPuesto, setPasswordPuesto] = useState('');
  const [guardandoPuesto, setGuardandoPuesto] = useState(false);
  const [exitoPuesto, setExitoPuesto] = useState<string | null>(null);

  // Auditoría de Minuta
  const [minuta, setMinuta] = useState<any[]>([]);
  const [cargandoMinuta, setCargandoMinuta] = useState(false);
  const [filtroSeveridad, setFiltroSeveridad] = useState('todos');
  const [notasAdmin, setNotasAdmin] = useState<{ [id: string]: string }>({});
  const [revisandoId, setRevisandoId] = useState<string | null>(null);

  const cargarVigilantes = async () => {
    setCargandoVigilantes(true);
    try {
      const data = await apiFetch('/vigilantes');
      setVigilantes(data || []);
    } catch (err) {
      console.error('Error cargando vigilantes:', err);
    } finally {
      setCargandoVigilantes(false);
    }
  };

  const cargarInfoPuesto = async () => {
    try {
      const data = await apiFetch('/vigilantes/puesto-info');
      setInfoPuesto(data);
      if (data?.usuarioVigilancia) {
        setUsuarioPuesto(data.usuarioVigilancia);
      }
    } catch (err) {
      console.error('Error cargando info puesto:', err);
    }
  };

  const cargarMinuta = async () => {
    setCargandoMinuta(true);
    try {
      const url =
        filtroSeveridad === 'todos'
          ? '/porteria/minuta?limit=50'
          : `/porteria/minuta?severidad=${filtroSeveridad}&limit=50`;
      const data = await apiFetch(url);
      setMinuta(data || []);
    } catch (err) {
      console.error('Error cargando minuta:', err);
    } finally {
      setCargandoMinuta(false);
    }
  };

  useEffect(() => {
    cargarVigilantes();
    cargarInfoPuesto();
  }, []);

  useEffect(() => {
    if (tab === 'minuta') {
      cargarMinuta();
    }
  }, [tab, filtroSeveridad]);

  const handleCrearVigilante = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreCompleto.trim() || !cedula.trim()) {
      alert('Nombre completo y cédula son obligatorios');
      return;
    }

    setGuardandoGuarda(true);
    try {
      await apiFetch('/vigilantes', {
        method: 'POST',
        body: JSON.stringify({
          nombreCompleto: nombreCompleto.trim(),
          cedula: cedula.trim(),
          telefono: telefono.trim() || undefined,
          empresaSeguridad: empresaSeguridad.trim() || undefined,
        }),
      });

      setNombreCompleto('');
      setCedula('');
      setTelefono('');
      setEmpresaSeguridad('');
      setMostrarModalNuevo(false);
      await cargarVigilantes();
    } catch (err: any) {
      alert(err.message || 'Error registrando guarda de seguridad');
    } finally {
      setGuardandoGuarda(false);
    }
  };

  const handleToggleActivo = async (v: any) => {
    try {
      await apiFetch(`/vigilantes/${v._id}`, {
        method: 'PUT',
        body: JSON.stringify({ activo: !v.activo }),
      });
      await cargarVigilantes();
    } catch (err: any) {
      alert(err.message || 'Error actualizando estado del vigilante');
    }
  };

  const handleEliminarVigilante = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este vigilante de la copropiedad?')) return;
    try {
      await apiFetch(`/vigilantes/${id}`, { method: 'DELETE' });
      await cargarVigilantes();
    } catch (err: any) {
      alert(err.message || 'Error eliminando vigilante');
    }
  };

  const handleGuardarCredencialesPuesto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordPuesto || passwordPuesto.length < 4) {
      alert('La contraseña debe tener al menos 4 caracteres');
      return;
    }

    setGuardandoPuesto(true);
    try {
      await apiFetch('/vigilantes/puesto-credenciales', {
        method: 'POST',
        body: JSON.stringify({
          usuarioVigilancia: usuarioPuesto.trim(),
          password: passwordPuesto,
        }),
      });

      setExitoPuesto('¡Credenciales de la Consola de Portería guardadas con éxito!');
      setPasswordPuesto('');
      await cargarInfoPuesto();
      setTimeout(() => setExitoPuesto(null), 3500);
    } catch (err: any) {
      alert(err.message || 'Error actualizando credenciales');
    } finally {
      setGuardandoPuesto(false);
    }
  };

  const handleRevisarMinuta = async (minutaId: string) => {
    setRevisandoId(minutaId);
    try {
      await apiFetch(`/porteria/minuta/${minutaId}/revisar`, {
        method: 'PATCH',
        body: JSON.stringify({
          notasAdmin: notasAdmin[minutaId] || 'Revisado y enterado por Administración',
        }),
      });
      await cargarMinuta();
    } catch (err: any) {
      alert(err.message || 'Error marcando minuta como revisada');
    } finally {
      setRevisandoId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-base-100 p-6 rounded-2xl border border-base-300 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="icon-[tabler--shield-check] text-primary text-2xl"></span>
            <h1 className="text-xl font-black text-base-content tracking-tight">
              Gestión de Vigilancia & Portería
            </h1>
          </div>
          <p className="text-xs text-base-content/70 mt-1">
            Administra el personal de seguridad física, las credenciales del puesto operativo y audita la minuta digital.
          </p>
        </div>

        {/* Acceso Directo a Portería */}
        <a
          href="/porteria"
          target="_blank"
          rel="noreferrer"
          className="btn btn-sm btn-outline btn-primary gap-1.5 self-start sm:self-auto font-bold"
        >
          <span className="icon-[tabler--external-link] text-base"></span>
          Abrir Consola Portería
        </a>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-base-300 pb-2">
        <button
          onClick={() => setTab('personal')}
          className={`btn btn-sm font-bold ${
            tab === 'personal' ? 'btn-primary' : 'btn-ghost text-base-content/70'
          }`}
        >
          <span className="icon-[tabler--users] text-base"></span>
          Personal de Seguridad ({vigilantes.length})
        </button>
        <button
          onClick={() => setTab('credenciales')}
          className={`btn btn-sm font-bold ${
            tab === 'credenciales' ? 'btn-primary' : 'btn-ghost text-base-content/70'
          }`}
        >
          <span className="icon-[tabler--key] text-base"></span>
          Acceso a Portería
        </button>
        <button
          onClick={() => setTab('minuta')}
          className={`btn btn-sm font-bold ${
            tab === 'minuta' ? 'btn-primary' : 'btn-ghost text-base-content/70'
          }`}
        >
          <span className="icon-[tabler--notebook] text-base"></span>
          Auditoría de Minuta
        </button>
      </div>

      {/* Tab: Personal de Seguridad */}
      {tab === 'personal' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-base-content uppercase tracking-wider">
              Guardas de Seguridad Registrados
            </h2>
            <button
              onClick={() => setMostrarModalNuevo(true)}
              className="btn btn-sm btn-primary font-bold gap-1 cursor-pointer"
            >
              <span className="icon-[tabler--user-plus] text-base"></span>
              + Registrar Vigilante
            </button>
          </div>

          {cargandoVigilantes ? (
            <div className="text-center py-12 text-base-content/60 text-sm">
              <span className="loading loading-spinner loading-md text-primary mb-2"></span>
              <p>Cargando lista de vigilantes...</p>
            </div>
          ) : vigilantes.length === 0 ? (
            <div className="bg-base-100 border border-base-300 rounded-2xl p-10 text-center">
              <span className="icon-[tabler--user-shield] text-4xl text-base-content/30 mb-3 block mx-auto"></span>
              <h3 className="text-base font-bold text-base-content">
                No hay vigilantes registrados en la copropiedad
              </h3>
              <p className="text-xs text-base-content/60 mt-1 mb-4">
                Registra a los guardas de la empresa de vigilancia para que puedan firmar la minuta y la entrega de paquetes.
              </p>
              <button
                onClick={() => setMostrarModalNuevo(true)}
                className="btn btn-sm btn-primary font-bold"
              >
                + Registrar Primer Vigilante
              </button>
            </div>
          ) : (
            <div className="bg-base-100 border border-base-300 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="table w-full text-sm">
                  <thead>
                    <tr className="border-b border-base-300 bg-base-200/50 text-base-content/70 text-xs">
                      <th>Nombre Completo</th>
                      <th>Cédula</th>
                      <th>Teléfono</th>
                      <th>Empresa de Seguridad</th>
                      <th>Estado</th>
                      <th className="text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vigilantes.map((v) => (
                      <tr key={v._id} className="border-b border-base-300 hover:bg-base-200/30">
                        <td className="font-bold text-base-content">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                              {v.nombreCompleto.charAt(0)}
                            </span>
                            {v.nombreCompleto}
                          </div>
                        </td>
                        <td className="font-mono text-xs text-base-content/80">{v.cedula}</td>
                        <td className="text-xs text-base-content/70">{v.telefono || '-'}</td>
                        <td className="text-xs text-base-content/80 font-medium">
                          {v.empresaSeguridad || 'Particular / Directo'}
                        </td>
                        <td>
                          <button
                            onClick={() => handleToggleActivo(v)}
                            className={`badge badge-sm font-bold cursor-pointer transition-all ${
                              v.activo
                                ? 'badge-success badge-soft text-success'
                                : 'badge-error badge-soft text-error'
                            }`}
                          >
                            {v.activo ? 'Activo' : 'Inactivo'}
                          </button>
                        </td>
                        <td className="text-right">
                          <button
                            onClick={() => handleEliminarVigilante(v._id)}
                            className="btn btn-xs btn-ghost text-error hover:bg-error/10"
                            title="Eliminar registro"
                          >
                            <span className="icon-[tabler--trash] text-base"></span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Credenciales del Puesto de Portería */}
      {tab === 'credenciales' && (
        <div className="bg-base-100 border border-base-300 rounded-2xl p-6 shadow-sm max-w-xl mx-auto space-y-6">
          <div>
            <h2 className="text-base font-bold text-base-content flex items-center gap-2">
              <span className="icon-[tabler--key] text-primary text-xl"></span>
              Configurar Acceso para la Pantalla de Portería
            </h2>
            <p className="text-xs text-base-content/70 mt-1 leading-relaxed">
              La Consola de Portería opera bajo una cuenta de puesto para el computador o tablet de la portería.
              Configura aquí el usuario y la contraseña con la que ingresarán los guardas de turno.
            </p>
          </div>

          {exitoPuesto && (
            <div className="alert alert-success text-xs font-bold py-2.5 px-3 rounded-xl flex items-center gap-2">
              <span className="icon-[tabler--check] text-lg"></span>
              {exitoPuesto}
            </div>
          )}

          <form onSubmit={handleGuardarCredencialesPuesto} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-base-content uppercase tracking-wider mb-1">
                Usuario de Portería
              </label>
              <input
                type="text"
                value={usuarioPuesto}
                onChange={(e) => setUsuarioPuesto(e.target.value)}
                placeholder="ej: porteria_palma"
                className="input input-sm w-full bg-base-200 border-base-300 rounded-xl"
                required
              />
              <span className="text-[11px] text-base-content/60 mt-1 block">
                Los guardas pueden ingresar usando este usuario o el correo del edificio.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-base-content uppercase tracking-wider mb-1">
                Nueva Contraseña de Portería
              </label>
              <input
                type="password"
                value={passwordPuesto}
                onChange={(e) => setPasswordPuesto(e.target.value)}
                placeholder="Escribe la nueva contraseña para el puesto"
                className="input input-sm w-full bg-base-200 border-base-300 rounded-xl"
                required
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={guardandoPuesto}
                className="btn btn-sm btn-primary w-full font-bold"
              >
                {guardandoPuesto ? 'Actualizando credenciales...' : 'Guardar Credenciales de Portería'}
              </button>
            </div>
          </form>

          <div className="pt-4 border-t border-base-300 text-xs text-base-content/70 space-y-1.5">
            <p>
              <strong>URL de acceso para los guardas:</strong>{' '}
              <a
                href="/porteria/login"
                target="_blank"
                className="text-primary font-mono underline ml-1"
              >
                /porteria/login
              </a>
            </p>
            <p className="text-[11px] text-base-content/60">
              * La sesión del puesto está diseñada para permanecer abierta 30 días continuos sin desconectarse.
            </p>
          </div>
        </div>
      )}

      {/* Tab: Auditoría de Minuta */}
      {tab === 'minuta' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-base-content uppercase tracking-wider">
              Auditoría y Supervisión de Minuta Digital
            </h2>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-base-content/70 mr-1">Filtrar:</span>
              {['todos', 'rutinaria', 'mantenimiento', 'incidente_grave'].map((s) => (
                <button
                  key={s}
                  onClick={() => setFiltroSeveridad(s)}
                  className={`btn btn-xs capitalize ${
                    filtroSeveridad === s ? 'btn-primary' : 'btn-ghost'
                  }`}
                >
                  {s.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {cargandoMinuta ? (
            <div className="text-center py-12 text-base-content/60 text-sm">
              <span className="loading loading-spinner loading-md text-primary mb-2"></span>
              <p>Cargando registros de minuta...</p>
            </div>
          ) : minuta.length === 0 ? (
            <div className="bg-base-100 border border-base-300 rounded-2xl p-10 text-center">
              <span className="icon-[tabler--notebook] text-4xl text-base-content/30 mb-2 block mx-auto"></span>
              <p className="text-sm font-bold text-base-content">
                No hay novedades registradas en este filtro
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {minuta.map((m) => {
                const isIncidente = m.severidad === 'incidente_grave';
                const isMantenimiento = m.severidad === 'mantenimiento';

                return (
                  <div
                    key={m._id}
                    className={`bg-base-100 border rounded-2xl p-5 shadow-sm space-y-3 ${
                      isIncidente
                        ? 'border-error/40 bg-error/5'
                        : isMantenimiento
                        ? 'border-warning/40 bg-warning/5'
                        : 'border-base-300'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`badge badge-sm font-bold uppercase text-[10px] ${
                            isIncidente
                              ? 'badge-error'
                              : isMantenimiento
                              ? 'badge-warning'
                              : 'badge-success'
                          }`}
                        >
                          {m.severidad.replace('_', ' ')}
                        </span>
                        <h3 className="font-bold text-base text-base-content">{m.titulo}</h3>
                      </div>

                      <span className="text-xs text-base-content/60 font-mono">
                        {new Date(m.fechaHora).toLocaleString('es-CO', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </span>
                    </div>

                    <p className="text-xs text-base-content/80 whitespace-pre-wrap leading-relaxed">
                      {m.descripcion}
                    </p>

                    {/* Fotos */}
                    {m.fotos && m.fotos.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {m.fotos.map((url: string, idx: number) => (
                          <a
                            key={idx}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="block rounded-lg overflow-hidden border border-base-300 hover:border-primary transition-colors"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt="Evidencia" className="w-16 h-16 object-cover" />
                          </a>
                        ))}
                      </div>
                    )}

                    {/* Visto Bueno de Administración */}
                    <div className="pt-3 border-t border-base-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <span className="text-base-content/60">
                        Guardia responsable: <strong className="text-base-content">{m.vigilanteNombre}</strong>
                      </span>

                      {m.revisadoPorAdmin ? (
                        <div className="text-success font-semibold flex items-center gap-1.5">
                          <span className="icon-[tabler--circle-check] text-base"></span>
                          Revisado por Administración{' '}
                          {m.notasAdmin && <span className="text-base-content/70 italic">&ldquo;{m.notasAdmin}&rdquo;</span>}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Nota o visto bueno..."
                            value={notasAdmin[m._id] || ''}
                            onChange={(e) =>
                              setNotasAdmin({ ...notasAdmin, [m._id]: e.target.value })
                            }
                            className="input input-xs bg-base-200 border-base-300 rounded-lg max-w-[200px]"
                          />
                          <button
                            onClick={() => handleRevisarMinuta(m._id)}
                            disabled={revisandoId === m._id}
                            className="btn btn-xs btn-primary font-bold"
                          >
                            {revisandoId === m._id ? 'Guardando...' : 'Marcar Revisado'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal Registrar Vigilante */}
      {mostrarModalNuevo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-base-100 border border-base-300 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-base-300">
              <h3 className="text-base font-bold text-base-content flex items-center gap-2">
                <span className="icon-[tabler--user-plus] text-primary"></span>
                Registrar Guarda de Seguridad
              </h3>
              <button
                onClick={() => setMostrarModalNuevo(false)}
                className="text-base-content/50 hover:text-base-content"
              >
                <span className="icon-[tabler--x] text-lg"></span>
              </button>
            </div>

            <form onSubmit={handleCrearVigilante} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-base-content uppercase tracking-wider mb-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  value={nombreCompleto}
                  onChange={(e) => setNombreCompleto(e.target.value)}
                  placeholder="ej: Carlos Alberto Rodríguez"
                  className="input input-sm w-full bg-base-200 border-base-300 rounded-xl"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-base-content uppercase tracking-wider mb-1">
                  Cédula / Documento de Identidad
                </label>
                <input
                  type="text"
                  value={cedula}
                  onChange={(e) => setCedula(e.target.value)}
                  placeholder="ej: 10203040"
                  className="input input-sm w-full bg-base-200 border-base-300 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-base-content uppercase tracking-wider mb-1">
                  Teléfono / Celular (Opcional)
                </label>
                <input
                  type="text"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="ej: 3001234567"
                  className="input input-sm w-full bg-base-200 border-base-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-base-content uppercase tracking-wider mb-1">
                  Empresa de Vigilancia (Opcional)
                </label>
                <input
                  type="text"
                  value={empresaSeguridad}
                  onChange={(e) => setEmpresaSeguridad(e.target.value)}
                  placeholder="ej: Atlas Seguridad, Fortox, Sevicol"
                  className="input input-sm w-full bg-base-200 border-base-300 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-base-300">
                <button
                  type="button"
                  onClick={() => setMostrarModalNuevo(false)}
                  className="btn btn-sm btn-ghost"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoGuarda}
                  className="btn btn-sm btn-primary font-bold"
                >
                  {guardandoGuarda ? 'Guardando...' : 'Guardar Vigilante'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
