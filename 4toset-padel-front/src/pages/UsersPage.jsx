import { useState } from 'react';
import { api, queryString } from '../api/client.js';
import { CATEGORIES, HANDS, POSITIONS, ROLES, SEXES, labelFor } from '../api/catalogs.js';
import { useToast } from '../context/ToastContext.jsx';
import { useResource } from '../hooks/useResource.js';
import { formatDate } from '../utils/format.js';
import { errorMessage } from '../utils/errors.js';
import { InputField, SubmitError } from '../components/Fields.jsx';
import { Alert, Avatar, Badge, Card, ConfirmDialog, EmptyState, LoadingState, Modal, PageHeader, TableShell } from '../components/Ui.jsx';
import { Icon } from '../components/Icon.jsx';

const emptyForm = {
  nombre: '',
  email: '',
  password: '',
  telefono: '',
  categoria: '',
  posicionHabitual: '',
  manoDominante: '',
  sexo: '',
  rol: 'jugador',
};

const toForm = (user) => ({
  nombre: user?.nombre || '',
  email: user?.email || '',
  password: '',
  telefono: user?.telefono || '',
  categoria: user?.categoria || '',
  posicionHabitual: user?.posicionHabitual || '',
  manoDominante: user?.manoDominante || '',
  sexo: user?.sexo || '',
  rol: user?.rol || 'jugador',
});

const validate = (form, requirePassword) => {
  const fields = ['nombre', 'email', 'telefono', 'categoria', 'posicionHabitual', 'manoDominante', 'sexo'];
  if (requirePassword) fields.push('password');
  if (fields.some((field) => !String(form[field] || '').trim())) return 'Completá todos los campos obligatorios.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Ingresá un correo electrónico válido.';
  if (form.password && form.password.length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
  return '';
};

export function UsersPage() {
  const toast = useToast();
  const [filters, setFilters] = useState({ rol: '', categoria: '', search: '', page: 1, limit: 10 });
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [deleteUser, setDeleteUser] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [pendingRoleChange, setPendingRoleChange] = useState(null);

  const { data, loading, error, reload } = useResource(
    () => api.get(`/api/users${queryString(filters)}`),
    [filters.rol, filters.categoria, filters.search, filters.page, filters.limit],
  );

  const users = data?.data || [];
  const meta = data?.meta || { page: 1, limit: 10, total: 0 };

  const updateFilter = (event) => {
    setFilters((current) => ({ ...current, [event.target.name]: event.target.value, page: 1 }));
  };

  const openCreate = () => {
    setForm(emptyForm);
    setFormError('');
    setCreateOpen(true);
  };

  const openEdit = (user) => {
    setForm(toForm(user));
    setFormError('');
    setEditUser(user);
  };

  const updateForm = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const buildPayload = (includePassword) => {
    const payload = {
      nombre: form.nombre.trim(),
      email: form.email.trim().toLowerCase(),
      telefono: form.telefono.trim(),
      categoria: form.categoria,
      posicionHabitual: form.posicionHabitual,
      manoDominante: form.manoDominante,
      sexo: form.sexo,
      rol: form.rol,
    };
    if (includePassword && form.password) payload.password = form.password;
    return payload;
  };

  const submitCreate = async (event) => {
    event.preventDefault();
    const validationError = validate(form, true);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      await api.post('/api/users', buildPayload(true));
      toast.success('Usuario creado correctamente.');
      setCreateOpen(false);
      await reload();
    } catch (submitError) {
      setFormError(errorMessage(submitError, 'No se pudo crear el usuario.'));
    } finally {
      setSaving(false);
    }
  };

  const submitEdit = (event) => {
    event.preventDefault();
    const validationError = validate(form, false);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    if (form.rol !== editUser.rol) {
      setPendingRoleChange({ user: editUser, payload: buildPayload(false) });
      return;
    }

    saveEdit(buildPayload(false));
  };

  const saveEdit = async (payload) => {
    setSaving(true);
    setFormError('');
    try {
      await api.patch(`/api/users/${pendingRoleChange?.user?.id || editUser.id}`, payload);
      toast.success('Usuario actualizado correctamente.');
      setEditUser(null);
      setPendingRoleChange(null);
      await reload();
    } catch (submitError) {
      setFormError(errorMessage(submitError, 'No se pudo actualizar el usuario.'));
      setPendingRoleChange(null);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    setSaving(true);
    try {
      await api.delete(`/api/users/${deleteUser.id}`);
      toast.success('Usuario dado de baja.');
      setDeleteUser(null);
      await reload();
    } catch (deleteError) {
      toast.error(errorMessage(deleteError, 'No se pudo dar de baja el usuario.'));
    } finally {
      setSaving(false);
    }
  };

  const userForm = (
    <form className="stack" onSubmit={createOpen ? submitCreate : submitEdit} noValidate>
      <SubmitError error={formError} title="Revisá el formulario" />

      <div className="form-grid">
        <InputField label="Nombre completo" name="nombre" value={form.nombre} onChange={updateForm} required />
        <InputField label="Correo electrónico" name="email" type="email" value={form.email} onChange={updateForm} required />
        <InputField label="Teléfono" name="telefono" value={form.telefono} onChange={updateForm} required />
        <InputField
          label={createOpen ? 'Contraseña' : 'Nueva contraseña'}
          name="password"
          type="password"
          placeholder={createOpen ? 'Mínimo 8 caracteres' : 'Dejar vacío para mantenerla'}
          value={form.password}
          onChange={updateForm}
          required={createOpen}
        />
        <InputField label="Rol" name="rol" as="select" options={ROLES} value={form.rol} onChange={updateForm} required />
        <InputField label="Categoría" name="categoria" as="select" placeholder="Seleccionar" options={CATEGORIES} value={form.categoria} onChange={updateForm} required />
        <InputField label="Posición habitual" name="posicionHabitual" as="select" placeholder="Seleccionar" options={POSITIONS} value={form.posicionHabitual} onChange={updateForm} required />
        <InputField label="Mano dominante" name="manoDominante" as="select" placeholder="Seleccionar" options={HANDS} value={form.manoDominante} onChange={updateForm} required />
        <InputField label="Sexo" name="sexo" as="select" placeholder="Seleccionar" options={SEXES} value={form.sexo} onChange={updateForm} required className="form-grid__full" />
      </div>

      <Alert variant="warning">
        No se puede degradar ni dar de baja al último administrador. Primero creá otro administrador.
      </Alert>

      <div className="form-actions">
        <button type="button" className="button button--outline" onClick={() => { setCreateOpen(false); setEditUser(null); }}>
          Cancelar
        </button>
        <button type="submit" className="button" disabled={saving}>
          {saving ? 'Guardando…' : createOpen ? 'Crear usuario' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  );

  return (
    <>
      <PageHeader
        eyebrow="Gestión"
        title="Usuarios"
        description="Altas del complejo, cambio de roles y bajas lógicas. El registro público nunca crea administradores."
        actions={
          <button type="button" className="button" onClick={openCreate}>
            <Icon name="plus" size={16} /> Nuevo usuario
          </button>
        }
      />

      <Card>
        <div className="filter-bar" style={{ marginBottom: 16 }}>
          <InputField
            label="Buscar"
            name="search"
            placeholder="Nombre o correo"
            value={filters.search}
            onChange={updateFilter}
          />
          <InputField
            label="Rol"
            name="rol"
            as="select"
            placeholder="Todos"
            options={ROLES}
            value={filters.rol}
            onChange={updateFilter}
          />
          <InputField
            label="Categoría"
            name="categoria"
            as="select"
            placeholder="Todas"
            options={CATEGORIES}
            value={filters.categoria}
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
        ) : users.length === 0 ? (
          <EmptyState
            title="No hay usuarios para mostrar"
            description="Probá con otros filtros o creá el primer usuario del complejo."
            icon="users"
            action={<button type="button" className="button button--sm" onClick={openCreate}>Crear usuario</button>}
          />
        ) : (
          <>
            <TableShell>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Contacto</th>
                    <th>Rol</th>
                    <th>Categoría</th>
                    <th>Alta</th>
                    <th aria-label="Acciones" />
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div className="row">
                          <Avatar name={user.nombre} />
                          <div>
                            <strong className="text-strong">{user.nombre}</strong>
                            <div className="text-small text-muted">#{user.id}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div>{user.email}</div>
                        <div className="text-small text-muted">{user.telefono}</div>
                      </td>
                      <td>
                        <Badge tone={user.rol === 'administrador' ? 'success' : 'info'}>
                          {labelFor(ROLES, user.rol)}
                        </Badge>
                      </td>
                      <td>{labelFor(CATEGORIES, user.categoria)}</td>
                      <td className="text-small text-muted">{formatDate(user.createdAt)}</td>
                      <td>
                        <div className="data-table__actions">
                          <button type="button" className="button button--outline button--sm" onClick={() => openEdit(user)}>
                            Editar
                          </button>
                          <button type="button" className="button button--danger-outline button--sm" onClick={() => setDeleteUser(user)}>
                            Baja
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableShell>

            <div className="row row--between" style={{ marginTop: 14 }}>
              <span className="text-small text-muted">
                Página {meta.page} · {meta.total} usuarios
              </span>
              <div className="row">
                <button
                  type="button"
                  className="button button--outline button--sm"
                  disabled={meta.page <= 1}
                  onClick={() => setFilters((current) => ({ ...current, page: current.page - 1 }))}
                >
                  Anterior
                </button>
                <button
                  type="button"
                  className="button button--outline button--sm"
                  disabled={meta.page * meta.limit >= meta.total}
                  onClick={() => setFilters((current) => ({ ...current, page: current.page + 1 }))}
                >
                  Siguiente
                </button>
              </div>
            </div>
          </>
        )}
      </Card>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Nuevo usuario" subtitle="Puede ser jugador o administrador.">
        {userForm}
      </Modal>

      <Modal open={Boolean(editUser)} onClose={() => setEditUser(null)} title={`Editar a ${editUser?.nombre || ''}`} subtitle="El cambio de rol requiere confirmación.">
        {userForm}
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingRoleChange)}
        title="Confirmar cambio de rol"
        message={`¿Querés cambiar el rol de ${pendingRoleChange?.user?.nombre || ''} a ${labelFor(ROLES, pendingRoleChange?.payload?.rol)}? Si es el último administrador, la API rechazará la operación.`}
        confirmLabel="Confirmar cambio"
        tone="info"
        loading={saving}
        onConfirm={() => saveEdit(pendingRoleChange.payload)}
        onCancel={() => setPendingRoleChange(null)}
      />

      <ConfirmDialog
        open={Boolean(deleteUser)}
        title="Dar de baja usuario"
        message={`¿Confirmás la baja lógica de ${deleteUser?.nombre || ''}? El registro se conservará, pero no podrá iniciar sesión.`}
        confirmLabel="Dar de baja"
        loading={saving}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteUser(null)}
      />
    </>
  );
}
