import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api, queryString } from '../api/client.js';
import { RESERVA_STATES, TURNO_STATES, labelFor } from '../api/catalogs.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useResource } from '../hooks/useResource.js';
import { formatDate, formatDateTime } from '../utils/format.js';
import { errorMessage } from '../utils/errors.js';
import { HORARIOS_TURNO, fechaLocalHoy, horaDelTurno, rangoEtiqueta } from '../utils/schedule.js';
import { guardarSeleccion, leerSeleccion } from '../utils/seleccion.js';
import { Alert, Card, EmptyState, LoadingState, Modal, PageHeader, StatusBadge } from '../components/Ui.jsx';
import { InputField, SubmitError } from '../components/Fields.jsx';
import { Icon } from '../components/Icon.jsx';

const turnoEn = (lista, canchaId, hora) =>
  lista.find((turno) => turno.canchaId === canchaId && horaDelTurno(turno.fechaHoraInicio) === hora);

export function ReservaPage() {
  const { status, user, isAdmin } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [fecha, setFecha] = useState(() => leerSeleccion()?.fecha || fechaLocalHoy());
  const [canchaId, setCanchaId] = useState('');
  const [seleccion, setSeleccion] = useState(() => leerSeleccion());
  const [cupos, setCupos] = useState(2);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [marcados, setMarcados] = useState([]);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const { data, loading, error, reload } = useResource(
    async () => {
      const params = { fecha, limit: 100, ...(canchaId ? { canchaId } : {}) };
      const [libresPayload, canchasPayload, turnosAdminPayload, reservasPayload, avisosPayload] = await Promise.all([
        api.get(`/api/turnos/disponibles${queryString(params)}`),
        status === 'authenticated'
          ? api.get('/api/canchas' + queryString({ limit: 100 }))
          : Promise.resolve(null),
        isAdmin ? api.get(`/api/turnos${queryString(params)}`) : Promise.resolve(null),
        status === 'authenticated' && !isAdmin
          ? api.get('/api/reservas' + queryString({ limit: 10 }))
          : Promise.resolve(null),
        isAdmin ? api.get('/api/notificaciones' + queryString({ limit: 8 })) : Promise.resolve(null),
      ]);

      const libres = libresPayload.data || [];
      const canchas = canchasPayload?.data
        || Object.values(
          libres.reduce((agrupado, turno) => {
            const cancha = turno.Cancha || { id: turno.canchaId, nombre: `Cancha #${turno.canchaId}` };
            agrupado[cancha.id] = cancha;
            return agrupado;
          }, {}),
        );

      return {
        libres,
        turnosAdmin: turnosAdminPayload?.data || [],
        canchas,
        reservas: reservasPayload?.data || [],
        avisos: avisosPayload?.data || [],
      };
    },
    [fecha, canchaId, isAdmin, status],
  );

  const libres = data?.libres || [];
  const turnosAdmin = data?.turnosAdmin || [];
  const canchas = (data?.canchas || []).filter((cancha) => !canchaId || cancha.id === Number(canchaId));
  const turnosVisibles = isAdmin ? turnosAdmin : libres;
  const reservas = data?.reservas || [];
  const avisos = data?.avisos || [];
  const esVisitante = status !== 'authenticated';

  const cambiarFecha = (valor) => {
    if (!valor) return;
    setFecha(valor);
    setSeleccion(null);
    setMarcados([]);
    guardarSeleccion(null);
  };

  const elegir = (turno, cancha) => {
    const nuevaSeleccion = {
      fecha,
      canchaId: cancha.id,
      canchaNombre: cancha.nombre,
      hora: horaDelTurno(turno.fechaHoraInicio),
      turnoId: turno.id,
    };
    setSeleccion(nuevaSeleccion);
    guardarSeleccion(nuevaSeleccion);
  };

  const irALogin = () => {
    guardarSeleccion(seleccion);
    navigate('/login', { state: { from: location.pathname || '/', seleccion } });
  };

  const confirmar = () => {
    if (!seleccion?.turnoId) {
      setFormError('Elegí un horario libre antes de continuar.');
      return;
    }
    if (esVisitante) {
      irALogin();
      return;
    }
    setFormError('');
    setConfirmOpen(true);
  };

  const enviarReserva = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      await api.post('/api/reservas', { turnoId: seleccion.turnoId, cuposOcupados: Number(cupos) });
      toast.success('Reserva registrada. El administrador ya recibió el aviso.');
      setConfirmOpen(false);
      setSeleccion(null);
      guardarSeleccion(null);
      await reload();
    } catch (submitError) {
      setFormError(errorMessage(submitError, 'No se pudo registrar la reserva.'));
    } finally {
      setSaving(false);
    }
  };

  const alternarMarcado = (id) => {
    setMarcados((actuales) => (actuales.includes(id) ? actuales.filter((valor) => valor !== id) : [...actuales, id]));
  };

  const cambiarBloqueo = async (estadoNuevo) => {
    const estadoActual = estadoNuevo === 'bloqueado' ? 'disponible' : 'bloqueado';
    const candidatos = turnosAdmin.filter((turno) => marcados.includes(turno.id) && turno.estado === estadoActual);
    if (!candidatos.length) {
      toast.info(`No hay turnos ${estadoActual === 'disponible' ? 'libres' : 'bloqueados'} seleccionados.`);
      return;
    }

    setSaving(true);
    try {
      for (const turno of candidatos) {
        await api.patch(`/api/turnos/${turno.id}`, { estado: estadoNuevo });
      }
      toast.success(
        estadoNuevo === 'bloqueado'
          ? `${candidatos.length} turno(s) bloqueado(s) para torneos o eventos.`
          : `${candidatos.length} turno(s) liberado(s).`,
      );
      setMarcados([]);
      await reload();
    } catch (bloqueoError) {
      toast.error(errorMessage(bloqueoError, 'No se pudo actualizar el bloqueo.'));
    } finally {
      setSaving(false);
    }
  };

  const cancelarReserva = async (reserva) => {
    setSaving(true);
    try {
      await api.patch(`/api/reservas/${reserva.id}/cancelar`);
      toast.success('Solicitud cancelada. El turno volvió a estar libre.');
      await reload();
    } catch (cancelError) {
      toast.error(errorMessage(cancelError, 'No se pudo cancelar la solicitud.'));
    } finally {
      setSaving(false);
    }
  };

  const hoy = fechaLocalHoy();

  return (
    <>
      <PageHeader
        eyebrow="Reserva"
        title="Reservá tu cancha"
        description="Elegí el día, un horario libre y la cancha. Los turnos duran 90 minutos y se muestran por cancha."
      />

      {esVisitante && (
        <Alert variant="info" title="Podés mirar la disponibilidad sin ingresar">
          Para confirmar la reserva necesitás iniciar sesión o crear una cuenta. Tu elección se conserva.
        </Alert>
      )}

      <Card className="reserva-filtros">
        <div className="filter-bar">
          <InputField label="Fecha" name="fecha" type="date" value={fecha} onChange={(event) => cambiarFecha(event.target.value)} />
          <InputField
            label="Cancha"
            name="canchaId"
            as="select"
            placeholder="Todas"
            options={canchas.map((cancha) => ({ value: cancha.id, label: cancha.nombre }))}
            value={canchaId}
            onChange={(event) => setCanchaId(event.target.value)}
          />
          <button type="button" className="button button--outline" onClick={reload}>
            <Icon name="refresh" size={16} /> Actualizar
          </button>
          {fecha !== hoy && (
            <button type="button" className="button button--ghost" onClick={() => cambiarFecha(hoy)}>Hoy</button>
          )}
        </div>
        <div className="reserva-dias">
          {Array.from({ length: 7 }, (_, indice) => {
            const dia = new Date();
            dia.setDate(dia.getDate() + indice);
            const valor = `${dia.getFullYear()}-${String(dia.getMonth() + 1).padStart(2, '0')}-${String(dia.getDate()).padStart(2, '0')}`;
            const etiqueta = new Intl.DateTimeFormat('es-AR', { weekday: 'short', day: 'numeric' }).format(dia);
            return (
              <button
                key={valor}
                type="button"
                className={`chip ${fecha === valor ? 'chip--active' : ''}`}
                onClick={() => cambiarFecha(valor)}
              >
                {indice === 0 ? 'Hoy' : etiqueta}
              </button>
            );
          })}
        </div>
      </Card>

      {loading ? (
        <LoadingState label="Cargando horarios libres…" />
      ) : error ? (
        <Alert variant="error" title="No se pudieron cargar los horarios">{error}</Alert>
      ) : (
        <>
          <div className="reserva-grilla">
            {canchas.length === 0 ? (
              <Card><EmptyState title="Sin canchas para esta fecha" description="Probá con otra fecha o cargá una cancha desde la administración." icon="court" /></Card>
            ) : (
              canchas.map((cancha) => (
                <Card key={cancha.id} className="court-schedule" title={cancha.nombre} subtitle="Turnos libres de 90 minutos">
                  <div className="slot-grid">
                    {HORARIOS_TURNO.map((hora) => {
                      const turno = turnoEn(turnosVisibles, cancha.id, hora);
                      const seleccionado = seleccion?.turnoId === turno?.id;
                      const bloqueable = isAdmin && turno && ['disponible', 'bloqueado'].includes(turno.estado);

                      if (!turno) {
                        return <div key={hora} className="slot-grid__cell slot-grid__cell--empty" aria-label="Sin turno">·</div>;
                      }

                      if (isAdmin) {
                        return (
                          <label
                            key={turno.id}
                            className={`slot-grid__cell slot-grid__cell--admin slot-grid__cell--${turno.estado}`}
                          >
                            {bloqueable && (
                              <input
                                type="checkbox"
                                checked={marcados.includes(turno.id)}
                                onChange={() => alternarMarcado(turno.id)}
                              />
                            )}
                            <span>{rangoEtiqueta(hora)}</span>
                            <small>{labelFor(TURNO_STATES, turno.estado)}</small>
                          </label>
                        );
                      }

                      return (
                        <button
                          key={turno.id}
                          type="button"
                          className={`slot-grid__cell slot-grid__cell--free ${seleccionado ? 'slot-grid__cell--selected' : ''}`}
                          onClick={() => elegir(turno, cancha)}
                          aria-pressed={seleccionado}
                        >
                          <span>{rangoEtiqueta(hora)}</span>
                          <small>{seleccionado ? 'Seleccionado' : 'Libre'}</small>
                        </button>
                      );
                    })}
                  </div>
                </Card>
              ))
            )}
          </div>

          {isAdmin && (
            <Card className="reserva-admin" title="Bloqueo de turnos" subtitle="Marcá uno o varios horarios por cancha (por ejemplo, torneos o eventos).">
              <div className="row">
                <span className="text-small text-muted">{marcados.length} seleccionado(s)</span>
                <button type="button" className="button button--danger-outline button--sm" disabled={saving} onClick={() => cambiarBloqueo('bloqueado')}>Bloquear seleccionados</button>
                <button type="button" className="button button--outline button--sm" disabled={saving} onClick={() => cambiarBloqueo('disponible')}>Liberar seleccionados</button>
              </div>
              <Alert variant="warning" title="Aviso para los jugadores">
                Los turnos bloqueados no aparecen como libres en la grilla de los jugadores.
              </Alert>
            </Card>
          )}

          {!isAdmin && (
            <Card className="reserva-seleccion" title="Tu selección">
              {seleccion ? (
                <div className="reserva-seleccion__detalle">
                  <div>
                    <strong>{seleccion.canchaNombre || `Cancha #${seleccion.canchaId}`}</strong>
                    <div className="text-small text-muted">
                      {formatDate(`${seleccion.fecha}T12:00:00`)} · {rangoEtiqueta(seleccion.hora)}
                    </div>
                  </div>
                  <button type="button" className="button button--accent" onClick={confirmar}>
                    {esVisitante ? 'Ingresar y confirmar' : 'Confirmar reserva'}
                  </button>
                </div>
              ) : (
                <EmptyState title="Elegí un horario libre" description="Tocá un bloque de la grilla para armar tu reserva." icon="calendar" />
              )}
            </Card>
          )}

          {isAdmin && (
            <Card title="Avisos de reservas" subtitle="Cada reserva informa cancha, fecha/horario y quién la realizó.">
              {avisos.length ? (
                <div className="stack stack--tight">
                  {avisos.map((aviso) => (
                    <div key={aviso.id} className="account-card">
                      <div className="account-card__meta">
                        <strong>{aviso.mensaje}</strong>
                        <span>
                          {formatDateTime(aviso.fechaHora)} · {aviso.solicitante?.email || 'sin email'}
                        </span>
                      </div>
                      <StatusBadge value={aviso.estado} catalog={RESERVA_STATES} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-small text-muted">Todavía no hay reservas registradas.</p>
              )}
            </Card>
          )}

          {status === 'authenticated' && !isAdmin && (
            <Card title="Mis reservas" subtitle="Seguimiento de tus solicitudes en un solo lugar.">
              {reservas.length ? (
                <div className="stack stack--tight">
                  {reservas.map((reserva) => (
                    <div key={reserva.id} className="account-card">
                      <div className="account-card__meta">
                        <strong>#{reserva.id} · {reserva.Turno?.Cancha?.nombre || `Cancha #${reserva.Turno?.canchaId}`}</strong>
                        <span>{formatDateTime(reserva.Turno?.fechaHoraInicio)} · {reserva.lugaresOcupados ?? reserva.cuposOcupados}/4 jugadores</span>
                      </div>
                      <StatusBadge value={reserva.estado} catalog={RESERVA_STATES} />
                      {reserva.estado === 'pendiente' && (
                        <button type="button" className="button button--danger-outline button--sm" disabled={saving} onClick={() => cancelarReserva(reserva)}>Cancelar</button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-small text-muted">
                  No tenés reservas todavía. {user?.nombre ? `Cuando elijas un horario, ${user.nombre.split(' ')[0]}, aparecerá acá.` : ''}
                </p>
              )}
            </Card>
          )}
        </>
      )}

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Confirmar reserva"
        subtitle={seleccion ? `${seleccion.canchaNombre} · ${rangoEtiqueta(seleccion.hora)}` : ''}
      >
        <form className="stack" onSubmit={enviarReserva} noValidate>
          <SubmitError error={formError} title="No se pudo confirmar" />
          <InputField
            label="Cupos que necesitás"
            name="cupos"
            as="select"
            options={[1, 2, 3, 4].map((valor) => ({ value: valor, label: `${valor} ${valor === 1 ? 'jugador' : 'jugadores'}` }))}
            value={cupos}
            onChange={(event) => setCupos(event.target.value)}
          />
          <div className="form-actions">
            <button type="button" className="button button--outline" onClick={() => setConfirmOpen(false)}>Volver</button>
            <button type="submit" className="button button--accent" disabled={saving}>{saving ? 'Confirmando…' : 'Confirmar reserva'}</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
