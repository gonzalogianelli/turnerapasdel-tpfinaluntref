import { useState } from 'react';
import { api, queryString } from '../api/client.js';
import { PRIMARY_COURT_NAMES } from '../api/catalogs.js';
import { useToast } from '../context/ToastContext.jsx';
import { useResource } from '../hooks/useResource.js';
import { errorMessage } from '../utils/errors.js';
import { CheckboxField, InputField, SubmitError } from '../components/Fields.jsx';
import { Alert, Badge, Card, ConfirmDialog, EmptyState, LoadingState, Modal, PageHeader, TableShell } from '../components/Ui.jsx';
import { Icon } from '../components/Icon.jsx';

const emptyForm = { nombre: '', bloqueada: false };

export function CourtsPage() {
  const toast = useToast();
  const [filters, setFilters] = useState({ nombre: '', bloqueada: '', page: 1, limit: 10 });
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const { data, loading, error, reload } = useResource(
    () => api.get(`/api/canchas${queryString(filters)}`),
    [filters.nombre, filters.bloqueada, filters.page, filters.limit],
  );

  const canchas = data?.data || [];
  const meta = data?.meta || { page: 1, limit: 10, total: 0 };

  const primary = PRIMARY_COURT_NAMES.map((name) =>
    canchas.find((cancha) => cancha.nombre?.toLowerCase() === name.toLowerCase()),
  );

  const openCreate = (name = '') => {
    setForm({ nombre: name, bloqueada: false });
    setFormError('');
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (cancha) => {
    setForm({ nombre: cancha.nombre, bloqueada: cancha.bloqueada });
    setFormError('');
    setEditing(cancha);
    setModalOpen(true);
  };

  const updateFilter = (event) => {
    setFilters((current) => ({ ...current, [event.target.name]: event.target.value, page: 1 }));
  };

  const save = async (event) => {
    event.preventDefault();
    if (!form.nombre.trim()) {
      setFormError('El nombre de la cancha es obligatorio.');
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      const payload = { nombre: form.nombre.trim(), bloqueada: form.bloqueada };
      if (editing) {
        await api.patch(`/api/canchas/${editing.id}`, payload);
        toast.success('Cancha actualizada.');
      } else {
        await api.post('/api/canchas', payload);
        toast.success('Cancha creada.');
      }
      setModalOpen(false);
      await reload();
    } catch (submitError) {
      setFormError(errorMessage(submitError, 'No se pudo guardar la cancha.'));
    } finally {
      setSaving(false);
    }
  };

  const toggleBlock = async (cancha) => {
    try {
      await api.patch(`/api/canchas/${cancha.id}`, { bloqueada: !cancha.bloqueada });
      toast.success(cancha.bloqueada ? 'Cancha desbloqueada.' : 'Cancha bloqueada.');
      await reload();
    } catch (toggleError) {
      toast.error(errorMessage(toggleError, 'No se pudo cambiar el estado.'));
    }
  };

  const confirmDelete = async () => {
    setSaving(true);
    try {
      await api.delete(`/api/canchas/${deleting.id}`);
      toast.success('Cancha dada de baja.');
      setDeleting(null);
      await reload();
    } catch (deleteError) {
      toast.error(errorMessage(deleteError, 'No se pudo dar de baja la cancha.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Gestión"
        title="Canchas"
        description="Alta, edición y bloqueo de las canchas del complejo. El diseño destaca las dos principales."
        actions={
          <button type="button" className="button" onClick={() => openCreate()}>
            <Icon name="plus" size={16} /> Nueva cancha
          </button>
        }
      />

      <div className="court-grid">
        {PRIMARY_COURT_NAMES.map((name, index) => {
          const cancha = primary[index];
          if (!cancha) {
            return (
              <div key={name} className="court-card court-card--empty">
                <div className="court-card__head">
                  <div>
                    <div className="court-card__name">{name}</div>
                    <div className="court-card__meta">Pendiente de alta</div>
                  </div>
                </div>
                <div className="court-card__slots">
                  <button type="button" className="button button--outline button--sm" onClick={() => openCreate(name)}>
                    Crear {name}
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div key={cancha.id} className={`court-card ${cancha.bloqueada ? 'court-card--blocked' : ''}`}>
              <div className="court-card__head">
                <div>
                  <div className="court-card__name">{cancha.nombre}</div>
                  <div className="court-card__meta">ID #{cancha.id}</div>
                </div>
                <Badge tone={cancha.bloqueada ? 'danger' : 'success'}>
                  {cancha.bloqueada ? 'Bloqueada' : 'Operativa'}
                </Badge>
              </div>
              <div className="row" style={{ marginTop: 14 }}>
                <button type="button" className="button button--outline button--sm" onClick={() => openEdit(cancha)}>
                  Editar
                </button>
                <button type="button" className="button button--ghost button--sm" onClick={() => toggleBlock(cancha)}>
                  {cancha.bloqueada ? 'Desbloquear' : 'Bloquear'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 28 }}>
        <Card title="Todas las canchas" subtitle="Incluye canchas bloqueadas y adicionales.">
          <div className="filter-bar" style={{ marginBottom: 16 }}>
            <InputField label="Buscar por nombre" name="nombre" placeholder="Cancha 1" value={filters.nombre} onChange={updateFilter} />
            <InputField
              label="Estado"
              name="bloqueada"
              as="select"
              options={[
                { value: '', label: 'Todas' },
                { value: 'false', label: 'Activas' },
                { value: 'true', label: 'Bloqueadas' },
              ]}
              value={filters.bloqueada}
              onChange={updateFilter}
            />
            <button type="button" className="button button--outline" onClick={reload}>
              <Icon name="refresh" size={16} /> Actualizar
            </button>
          </div>

          {loading ? (
            <LoadingState />
          ) : error ? (
            <Alert variant="error" title="No se pudo cargar">{error}</Alert>
          ) : canchas.length === 0 ? (
            <EmptyState title="No hay canchas" description="Creá la primera cancha para poder cargar turnos." icon="court" />
          ) : (
            <>
              <TableShell>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Nombre</th>
                      <th>Estado</th>
                      <th>Alta</th>
                      <th aria-label="Acciones" />
                    </tr>
                  </thead>
                  <tbody>
                    {canchas.map((cancha) => (
                      <tr key={cancha.id}>
                        <td>#{cancha.id}</td>
                        <td className="text-strong">{cancha.nombre}</td>
                        <td>
                          <Badge tone={cancha.bloqueada ? 'danger' : 'success'}>
                            {cancha.bloqueada ? 'Bloqueada' : 'Activa'}
                          </Badge>
                        </td>
                        <td className="text-small text-muted">{new Date(cancha.createdAt).toLocaleDateString('es-AR')}</td>
                        <td>
                          <div className="data-table__actions">
                            <button type="button" className="button button--outline button--sm" onClick={() => openEdit(cancha)}>Editar</button>
                            <button type="button" className="button button--ghost button--sm" onClick={() => toggleBlock(cancha)}>
                              {cancha.bloqueada ? 'Activar' : 'Bloquear'}
                            </button>
                            <button type="button" className="button button--danger-outline button--sm" onClick={() => setDeleting(cancha)}>Baja</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableShell>

              <div className="row row--between" style={{ marginTop: 14 }}>
                <span className="text-small text-muted">Página {meta.page} · {meta.total} canchas</span>
                <div className="row">
                  <button type="button" className="button button--outline button--sm" disabled={meta.page <= 1} onClick={() => setFilters((current) => ({ ...current, page: current.page - 1 }))}>Anterior</button>
                  <button type="button" className="button button--outline button--sm" disabled={meta.page * meta.limit >= meta.total} onClick={() => setFilters((current) => ({ ...current, page: current.page + 1 }))}>Siguiente</button>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Editar ${editing.nombre}` : 'Nueva cancha'}
        subtitle="Las canchas bloqueadas no aceptan turnos nuevos."
      >
        <form className="stack" onSubmit={save} noValidate>
          <SubmitError error={formError} title="Revisá el formulario" />
          <InputField label="Nombre" name="nombre" placeholder="Cancha 1" value={form.nombre} onChange={(event) => setForm((current) => ({ ...current, nombre: event.target.value }))} required />
          <CheckboxField
            label="Cancha bloqueada"
            description="Úsalo para mantenimiento, clima o uso interno."
            checked={form.bloqueada}
            onChange={(event) => setForm((current) => ({ ...current, bloqueada: event.target.checked }))}
          />
          <div className="form-actions">
            <button type="button" className="button button--outline" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button type="submit" className="button" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Dar de baja cancha"
        message={`¿Confirmás la baja lógica de ${deleting?.nombre || ''}? No se permitirá si tiene turnos activos.`}
        confirmLabel="Dar de baja"
        loading={saving}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}
