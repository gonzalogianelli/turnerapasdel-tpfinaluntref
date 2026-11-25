import { useState } from 'react';
import { api, queryString } from '../api/client.js';
import { CATEGORIES, PARTIDO_STATES, labelFor } from '../api/catalogs.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useResource } from '../hooks/useResource.js';
import { formatDateTime } from '../utils/format.js';
import { errorMessage } from '../utils/errors.js';
import { InputField, SubmitError } from '../components/Fields.jsx';
import { Alert, Avatar, Badge, Card, ConfirmDialog, EmptyState, LoadingState, Modal, PageHeader, QuotaMeter, StatusBadge, StatusTimeline, TableShell } from '../components/Ui.jsx';
import { Icon } from '../components/Icon.jsx';

const TIMELINE_STEPS = [
  { value: 'incompleto', short: 'Armando' },
  { value: 'completo', short: 'Completo' },
  { value: 'jugado', short: 'Jugado' },
];

const categoryIndex = (value) => CATEGORIES.findIndex((item) => item.value === value);
const isCompatible = (playerCategory, matchCategory) => {
  const a = categoryIndex(playerCategory);
  const b = categoryIndex(matchCategory);
  return a >= 0 && b >= 0 && Math.abs(a - b) <= 1;
};
const matchLabel = (partido) => {
  const turno = partido.turno;
  if (!turno) return `Partido #${partido.id}`;
  return `${formatDateTime(turno.fechaHoraInicio)} · ${partido.categoria}`;
};

export function MatchesPage() {
  const { user, isAdmin, isPlayer } = useAuth();
  const toast = useToast();
  const [filters, setFilters] = useState({ categoria: '', estado: '', fecha: '', page: 1, limit: 10 });
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ reservaId: '', categoria: '' });
  const [selected, setSelected] = useState(null);
  const [categoryForm, setCategoryForm] = useState('');
  const [pendingAction, setPendingAction] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const { data, loading, error, reload } = useResource(
    async () => {
      const requests = [api.get(`/api/partidos${queryString(filters)}`)];
      if (isAdmin) requests.push(api.get(`/api/reservas${queryString({ estado: 'confirmada', limit: 100 })}`));
      const [partidosPayload, reservasPayload] = await Promise.all(requests);
      return {
        partidos: partidosPayload.data || [],
        reservas: reservasPayload?.data || [],
        meta: partidosPayload.meta,
      };
    },
    [filters.categoria, filters.estado, filters.fecha, filters.page, filters.limit, isAdmin],
  );

  const partidos = data?.partidos || [];
  const reservasConfirmadas = data?.reservas || [];
  const meta = data?.meta || { page: 1, limit: 10, total: 0 };

  const updateFilter = (event) => {
    setFilters((current) => ({ ...current, [event.target.name]: event.target.value, page: 1 }));
  };

  const openCreate = () => {
    setCreateForm({ reservaId: reservasConfirmadas[0] ? String(reservasConfirmadas[0].id) : '', categoria: user?.categoria || '' });
    setFormError('');
    setCreateOpen(true);
  };

  const createMatch = async (event) => {
    event.preventDefault();
    if (!createForm.reservaId || !createForm.categoria) {
      setFormError('Elegí una reserva confirmada y una categoría.');
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      await api.post('/api/partidos', {
        reservaId: Number(createForm.reservaId),
        categoria: createForm.categoria,
      });
      toast.success('Partido abierto. Ya podés inscribir jugadores.');
      setCreateOpen(false);
      await reload();
    } catch (submitError) {
      setFormError(errorMessage(submitError, 'No se pudo crear el partido.'));
    } finally {
      setSaving(false);
    }
  };

  const openDetail = (partido) => {
    setSelected(partido);
    setCategoryForm(partido.categoria);
    setFormError('');
  };

  const joinMatch = async (partido) => {
    setSaving(true);
    try {
      await api.post(`/api/partidos/${partido.id}/inscripciones`);
      toast.success('Te inscribiste al partido.');
      await reload();
    } catch (joinError) {
      toast.error(errorMessage(joinError, 'No se pudo completar la inscripción.'));
    } finally {
      setSaving(false);
    }
  };

  const leaveMatch = async (partido, usuarioId = user?.id) => {
    setSaving(true);
    try {
      await api.delete(`/api/partidos/${partido.id}/inscripciones/${usuarioId}`);
      toast.success('Inscripción eliminada.');
      setSelected(null);
      setPendingAction(null);
      await reload();
    } catch (leaveError) {
      toast.error(errorMessage(leaveError, 'No se pudo quitar la inscripción.'));
    } finally {
      setSaving(false);
    }
  };

  const closeMatch = async (partido) => {
    setSaving(true);
    try {
      await api.patch(`/api/partidos/${partido.id}`, { estado: 'jugado' });
      toast.success('Partido cerrado como jugado.');
      setPendingAction(null);
      await reload();
    } catch (closeError) {
      toast.error(errorMessage(closeError, 'No se pudo cerrar el partido.'));
      setPendingAction(null);
    } finally {
      setSaving(false);
    }
  };

  const cancelForQuorum = async (partido) => {
    setSaving(true);
    try {
      await api.patch(`/api/partidos/${partido.id}/cancelar`);
      toast.success('Partido cancelado por quorum. El turno tampoco se republicó.');
      setPendingAction(null);
      await reload();
    } catch (cancelError) {
      toast.error(errorMessage(cancelError, 'No se pudo cancelar el partido.'));
      setPendingAction(null);
    } finally {
      setSaving(false);
    }
  };

  const changeCategory = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      await api.patch(`/api/partidos/${selected.id}`, { categoria: categoryForm });
      toast.success('Categoría del partido actualizada.');
      setSelected(null);
      await reload();
    } catch (categoryError) {
      setFormError(errorMessage(categoryError, 'No se pudo cambiar la categoría.'));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    setSaving(true);
    try {
      await api.delete(`/api/partidos/${deleting.id}`);
      toast.success('Partido dado de baja.');
      setDeleting(null);
      await reload();
    } catch (deleteError) {
      toast.error(errorMessage(deleteError, 'No se pudo dar de baja el partido.'));
    } finally {
      setSaving(false);
    }
  };

  const ownInscription = (partido) =>
    partido.inscriptos?.some((inscripto) => inscripto.id === user?.id);

  return (
    <>
      <PageHeader
        eyebrow={isAdmin ? 'Gestión' : 'Partidos'}
        title="Partidos incompletos"
        description={isAdmin
          ? 'Abrí partidos sobre reservas confirmadas, gestioná inscripciones y cancelá por quorum.'
          : 'Buscá partidos con lugares libres y anotate según tu categoría.'}
        actions={isAdmin ? (
          <button type="button" className="button" onClick={openCreate}>
            <Icon name="plus" size={16} /> Abrir partido
          </button>
        ) : undefined}
      />

      {isPlayer && (
        <Alert variant="info" title="Compatibilidad por categoría">
          Podés inscribirte en partidos de tu categoría o con hasta una categoría de diferencia ({user?.categoria ? labelFor(CATEGORIES, user.categoria) : 'sin categoría cargada'}).
        </Alert>
      )}

      <div style={{ marginTop: 18 }}>
        <Card>
          <div className="filter-bar" style={{ marginBottom: 16 }}>
            <InputField label="Categoría" name="categoria" as="select" placeholder="Todas" options={CATEGORIES} value={filters.categoria} onChange={updateFilter} />
            <InputField label="Estado" name="estado" as="select" placeholder="Todos" options={PARTIDO_STATES} value={filters.estado} onChange={updateFilter} />
            <InputField label="Fecha" name="fecha" type="date" value={filters.fecha} onChange={updateFilter} />
            <button type="button" className="button button--outline" onClick={reload}>
              <Icon name="refresh" size={16} /> Actualizar
            </button>
          </div>

          {loading ? (
            <LoadingState />
          ) : error ? (
            <Alert variant="error" title="No se pudo cargar">{error}</Alert>
          ) : partidos.length === 0 ? (
            <EmptyState
              title="No hay partidos para mostrar"
              description={isAdmin ? 'Creá un partido desde una reserva confirmada.' : 'Probá con otro filtro o volvé más tarde.'}
              icon="match"
            />
          ) : (
            <>
              <TableShell>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Turno y categoría</th>
                      <th>Cupos</th>
                      <th>Estado</th>
                      <th aria-label="Acciones" />
                    </tr>
                  </thead>
                  <tbody>
                    {partidos.map((partido) => {
                      const compatible = isCompatible(user?.categoria, partido.categoria);
                      const alreadyIn = ownInscription(partido);
                      return (
                        <tr key={partido.id}>
                          <td>#{partido.id}</td>
                          <td>
                            <div className="text-strong">{matchLabel(partido)}</div>
                            <div className="text-small text-muted">{partido.inscriptos?.length || 0} inscriptos</div>
                          </td>
                          <td>
                            <strong>{partido.lugaresOcupados ?? 0}</strong>/{partido.cupoMaximo || 4}
                            <div className="text-small text-muted">faltan {partido.lugaresFaltantes ?? 0}</div>
                          </td>
                          <td><StatusBadge value={partido.estado} catalog={PARTIDO_STATES} /></td>
                          <td>
                            <div className="data-table__actions">
                              <button type="button" className="button button--outline button--sm" onClick={() => openDetail(partido)}>Ver</button>
                              {isPlayer && partido.estado === 'incompleto' && !alreadyIn && compatible && (
                                <button type="button" className="button button--accent button--sm" disabled={saving} onClick={() => joinMatch(partido)}>Inscribirme</button>
                              )}
                              {isPlayer && partido.estado === 'incompleto' && !alreadyIn && !compatible && (
                                <span className="text-small text-muted">Categoría no compatible</span>
                              )}
                              {isPlayer && alreadyIn && partido.estado === 'incompleto' && (
                                <button type="button" className="button button--danger-outline button--sm" disabled={saving} onClick={() => leaveMatch(partido)}>Darme de baja</button>
                              )}
                              {isAdmin && partido.estado === 'completo' && (
                                <button type="button" className="button button--accent button--sm" onClick={() => setPendingAction({ type: 'close', partido })}>Cerrar</button>
                              )}
                              {isAdmin && partido.estado === 'incompleto' && (
                                <button type="button" className="button button--danger-outline button--sm" onClick={() => setPendingAction({ type: 'quorum', partido })}>Cancelar</button>
                              )}
                              {isAdmin && ['jugado', 'cancelado'].includes(partido.estado) && (
                                <button type="button" className="button button--ghost button--sm" onClick={() => setDeleting(partido)}>Baja</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </TableShell>

              <div className="row row--between" style={{ marginTop: 14 }}>
                <span className="text-small text-muted">Página {meta.page} · {meta.total} partidos</span>
                <div className="row">
                  <button type="button" className="button button--outline button--sm" disabled={meta.page <= 1} onClick={() => setFilters((current) => ({ ...current, page: current.page - 1 }))}>Anterior</button>
                  <button type="button" className="button button--outline button--sm" disabled={meta.page * meta.limit >= meta.total} onClick={() => setFilters((current) => ({ ...current, page: current.page + 1 }))}>Siguiente</button>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Abrir partido" subtitle="Solo sobre reservas confirmadas con turno reservado.">
        <form className="stack" onSubmit={createMatch} noValidate>
          <SubmitError error={formError} title="No se pudo abrir el partido" />
          {reservasConfirmadas.length === 0 ? (
            <Alert variant="info">No hay reservas confirmadas disponibles.</Alert>
          ) : (
            <>
              <InputField
                label="Reserva confirmada"
                name="reservaId"
                as="select"
                options={reservasConfirmadas.map((reserva) => ({
                  value: reserva.id,
                  label: `#${reserva.id} · ${reserva.Usuario?.nombre || reserva.usuario?.nombre || `Usuario #${reserva.usuarioId}`}`,
                }))}
                value={createForm.reservaId}
                onChange={(event) => setCreateForm((current) => ({ ...current, reservaId: event.target.value }))}
                required
              />
              <InputField
                label="Categoría del partido"
                name="categoria"
                as="select"
                placeholder="Seleccionar"
                options={CATEGORIES}
                value={createForm.categoria}
                onChange={(event) => setCreateForm((current) => ({ ...current, categoria: event.target.value }))}
                required
              />
            </>
          )}
          <div className="form-actions">
            <button type="button" className="button button--outline" onClick={() => setCreateOpen(false)}>Cancelar</button>
            <button type="submit" className="button" disabled={saving || !reservasConfirmadas.length}>{saving ? 'Creando…' : 'Abrir partido'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={Boolean(selected)} onClose={() => setSelected(null)} title={`Partido #${selected?.id}`} subtitle={selected ? matchLabel(selected) : ''} wide>
        <div className="stack">
          <StatusTimeline steps={TIMELINE_STEPS} current={selected?.estado} />
          <div className="grid grid--2">
            <Card title="Datos del partido" padded={false}>
              <dl className="detail-list">
                <div className="detail-list__row">
                  <dt>Estado</dt>
                  <dd><StatusBadge value={selected?.estado} catalog={PARTIDO_STATES} /></dd>
                </div>
                <div className="detail-list__row">
                  <dt>Categoría</dt>
                  <dd>{labelFor(CATEGORIES, selected?.categoria)}</dd>
                </div>
                <div className="detail-list__row">
                  <dt>Cancha</dt>
                  <dd>{selected?.turno?.canchaId ? `Cancha #${selected.turno.canchaId}` : '—'}</dd>
                </div>
                <div className="detail-list__row">
                  <dt>Inicio</dt>
                  <dd>{formatDateTime(selected?.turno?.fechaHoraInicio)}</dd>
                </div>
                <div className="detail-list__row">
                  <dt>Fin</dt>
                  <dd>{formatDateTime(selected?.turno?.fechaHoraFin)}</dd>
                </div>
              </dl>
              <QuotaMeter occupied={selected?.lugaresOcupados ?? 0} total={selected?.cupoMaximo || 4} label="Jugadores inscriptos" />
            </Card>

            <Card title="Inscriptos" padded={false}>
              {selected?.inscriptos?.length ? (
                <div className="players-list">
                  {selected.inscriptos.map((inscripto) => (
                    <div key={inscripto.id} className="player-row">
                      <Avatar name={inscripto.nombre} />
                      <span className="player-row__name">{inscripto.nombre}</span>
                      <span className="chip">{labelFor(CATEGORIES, inscripto.categoria)}</span>
                      {isAdmin && selected.estado !== 'jugado' && selected.estado !== 'cancelado' && (
                        <button type="button" className="button button--danger-outline button--sm" onClick={() => leaveMatch(selected, inscripto.id)}>
                          Quitar
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState title="Todavía no hay inscriptos" description="Cuando se sumen jugadores aparecerán acá." icon="users" />
              )}
            </Card>
          </div>

          {isPlayer && selected?.estado === 'incompleto' && (
            <div className="row">
              {!ownInscription(selected) && isCompatible(user?.categoria, selected.categoria) && (
                <button type="button" className="button button--accent" disabled={saving} onClick={() => joinMatch(selected)}>Inscribirme</button>
              )}
              {ownInscription(selected) && (
                <button type="button" className="button button--danger-outline" disabled={saving} onClick={() => leaveMatch(selected)}>Darme de baja</button>
              )}
            </div>
          )}

          {isAdmin && selected?.estado === 'incompleto' && (
            <form className="stack" onSubmit={changeCategory} noValidate>
              <SubmitError error={formError} title="No se pudo cambiar la categoría" />
              <InputField
                label="Cambiar categoría"
                name="categoriaPartido"
                as="select"
                options={CATEGORIES}
                value={categoryForm}
                onChange={(event) => setCategoryForm(event.target.value)}
                hint="Se rechazará si deja inscriptos incompatibles."
              />
              <div className="form-actions">
                <button type="submit" className="button button--sm" disabled={saving}>Guardar categoría</button>
              </div>
            </form>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={pendingAction?.type === 'close'}
        title="Cerrar partido"
        message="¿Marcás el partido como jugado? Solo se permite si ya está completo."
        confirmLabel="Marcar jugado"
        tone="info"
        loading={saving}
        onConfirm={() => closeMatch(pendingAction.partido)}
        onCancel={() => setPendingAction(null)}
      />

      <ConfirmDialog
        open={pendingAction?.type === 'quorum'}
        title="Cancelar por quorum"
        message="¿Cancelás el partido por falta de jugadores? También se cancelarán la reserva y el turno, se borrarán las inscripciones y el turno NO se republicará."
        confirmLabel="Cancelar partido"
        loading={saving}
        onConfirm={() => cancelForQuorum(pendingAction.partido)}
        onCancel={() => setPendingAction(null)}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Dar de baja partido"
        message={`¿Confirmás la baja lógica del partido #${deleting?.id}? Solo se permite si está jugado o cancelado y sin inscripciones vigentes.`}
        confirmLabel="Dar de baja"
        loading={saving}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}
