import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, queryString } from '../api/client.js';
import { CATEGORIES, HANDS, POSITIONS, SEXES } from '../api/catalogs.js';
import { useResource } from '../hooks/useResource.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { formatDate, formatDateTime } from '../utils/format.js';
import { errorMessage } from '../utils/errors.js';
import { InputField, SubmitError } from '../components/Fields.jsx';
import { Alert, Avatar, Badge, Card, LoadingState, PageHeader } from '../components/Ui.jsx';

const emptyForm = {
  nombre: '',
  email: '',
  telefono: '',
  categoria: '',
  posicionHabitual: '',
  manoDominante: '',
  sexo: '',
  password: '',
};

export function ProfilePage() {
  const { user, isAdmin, updateMe } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const {
    data: avisosPartido,
    loading: cargandoAvisos,
    error: errorAvisos,
    reload: recargarAvisos,
  } = useResource(
    async () => {
      if (!user?.categoria) return [];
      const indice = CATEGORIES.findIndex((categoria) => categoria.value === user.categoria);
      const payload = await api.get('/api/partidos' + queryString({ estado: 'incompleto', limit: 100 }));
      return (payload.data || []).filter((partido) => {
        const otroIndice = CATEGORIES.findIndex((categoria) => categoria.value === partido.categoria);
        return otroIndice >= 0 && Math.abs(otroIndice - indice) <= 1;
      });
    },
    [user?.categoria],
  );

  useEffect(() => {
    if (!user) return;
    setForm({
      nombre: user.nombre || '',
      email: user.email || '',
      telefono: user.telefono || '',
      categoria: user.categoria || '',
      posicionHabitual: user.posicionHabitual || '',
      manoDominante: user.manoDominante || '',
      sexo: user.sexo || '',
      password: '',
    });
  }, [user]);

  const update = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!form.nombre.trim() || !form.email.trim() || !form.telefono.trim()) {
      setError('Nombre, correo y teléfono son obligatorios.');
      return;
    }

    const payload = {
      nombre: form.nombre.trim(),
      email: form.email.trim().toLowerCase(),
      telefono: form.telefono.trim(),
      categoria: form.categoria,
      posicionHabitual: form.posicionHabitual,
      manoDominante: form.manoDominante,
      sexo: form.sexo,
    };
    if (form.password) payload.password = form.password;

    setSubmitting(true);
    try {
      await updateMe(payload);
      setForm((current) => ({ ...current, password: '' }));
      toast.success('Tu perfil se actualizó correctamente.');
      await recargarAvisos();
    } catch (submitError) {
      setError(errorMessage(submitError, 'No se pudo actualizar el perfil.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Mi cuenta"
        title="Mi perfil"
        description="Actualizá tus datos de contacto y de juego. El rol no se puede modificar desde acá."
      />

      <div className="split-layout">
        <Card title="Datos personales" subtitle="Los cambios se guardan en tu cuenta.">
          <form className="stack" onSubmit={handleSubmit} noValidate>
            <SubmitError error={error} title="No se pudo guardar" />

            <div className="form-grid">
              <InputField
                label="Nombre completo"
                name="nombre"
                value={form.nombre}
                onChange={update}
                required
              />
              <InputField
                label="Correo electrónico"
                name="email"
                type="email"
                value={form.email}
                onChange={update}
                required
              />
              <InputField
                label="Teléfono"
                name="telefono"
                type="tel"
                value={form.telefono}
                onChange={update}
                required
              />
              <InputField
                label="Categoría"
                name="categoria"
                as="select"
                options={CATEGORIES}
                value={form.categoria}
                onChange={update}
              />
              <InputField
                label="Posición habitual"
                name="posicionHabitual"
                as="select"
                options={POSITIONS}
                value={form.posicionHabitual}
                onChange={update}
              />
              <InputField
                label="Mano dominante"
                name="manoDominante"
                as="select"
                options={HANDS}
                value={form.manoDominante}
                onChange={update}
              />
              <InputField
                label="Sexo"
                name="sexo"
                as="select"
                options={SEXES}
                value={form.sexo}
                onChange={update}
              />
              <InputField
                label="Nueva contraseña"
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder="Dejar vacío para mantenerla"
                hint="Si la completás, debe tener al menos 8 caracteres."
                value={form.password}
                onChange={update}
                className="form-grid__full"
              />
            </div>

            <div className="form-actions form-actions--between">
              <Alert variant="info">Solo vos podés ver y editar estos datos.</Alert>
              <button type="submit" className="button" disabled={submitting}>
                {submitting ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        </Card>

        <div className="stack">
          <Card title="Resumen de cuenta">
            <div className="stack">
              <div className="row">
                <Avatar name={user?.nombre} large />
                <div>
                  <strong className="text-strong">{user?.nombre}</strong>
                  <div className="text-small text-muted">{user?.email}</div>
                </div>
              </div>
              <div className="chip-list">
                <Badge tone={isAdmin ? 'success' : 'info'}>{isAdmin ? 'Administrador' : 'Jugador'}</Badge>
                {user?.categoria && <span className="chip">Categoría {user.categoria}</span>}
                {user?.posicionHabitual && <span className="chip">{user.posicionHabitual}</span>}
                {user?.manoDominante && <span className="chip">{user.manoDominante}</span>}
              </div>
              <dl className="detail-list">
                <div className="detail-list__row">
                  <dt>ID de usuario</dt>
                  <dd>#{user?.id ?? '—'}</dd>
                </div>
                <div className="detail-list__row">
                  <dt>Alta</dt>
                  <dd>{formatDate(user?.creadoEn || user?.createdAt)}</dd>
                </div>
              </dl>
            </div>
          </Card>

          <Card title="Reservar cancha" subtitle="Elegí fecha y horario en la grilla unificada.">
            <div className="stack stack--tight">
              <p className="text-small text-muted">
                Tu selección se conserva si necesitás iniciar sesión para confirmar.
              </p>
              <Link to="/" className="button button--accent">Ir a Reserva</Link>
            </div>
          </Card>

          <Card title="Avisos para vos" subtitle="Partidos incompletos de tu categoría o categorías vecinas.">
            {cargandoAvisos ? (
              <LoadingState label="Buscando partidos compatibles…" />
            ) : errorAvisos ? (
              <Alert variant="error" title="No se pudieron cargar los avisos">
                {errorAvisos}
                <button type="button" className="button button--ghost button--sm" onClick={recargarAvisos}>Reintentar</button>
              </Alert>
            ) : (avisosPartido || []).length ? (
              <div className="stack stack--tight">
                {(avisosPartido || []).map((partido) => (
                  <div key={partido.id} className="account-card">
                    <div className="account-card__meta">
                      <strong>{CATEGORIES.find((categoria) => categoria.value === partido.categoria)?.label || partido.categoria}</strong>
                      <span>
                        {formatDateTime(partido.fechaHora)} · faltan {Math.max(0, 4 - (partido.lugaresOcupados ?? 0))} jugadores
                      </span>
                    </div>
                    <Link to="/partidos" className="button button--outline button--sm">Ver partido</Link>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-small text-muted">
                {user?.categoria
                  ? 'No hay avisos compatibles en este momento. Cuando se publique un partido cercano a tu categoría, aparecerá acá.'
                  : 'Completá tu categoría en los datos personales para recibir avisos de partidos.'}
              </p>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
