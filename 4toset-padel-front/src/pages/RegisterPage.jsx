import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CATEGORIES, HANDS, POSITIONS, SEXES } from '../api/catalogs.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { errorMessage } from '../utils/errors.js';
import { BrandLogo } from '../components/BrandLogo.jsx';
import { InputField, SubmitError } from '../components/Fields.jsx';
import { Alert } from '../components/Ui.jsx';

const emptyForm = {
  nombre: '',
  email: '',
  password: '',
  confirmPassword: '',
  telefono: '',
  categoria: '',
  posicionHabitual: '',
  manoDominante: '',
  sexo: '',
};

export function RegisterPage() {
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const update = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const validate = () => {
    const required = ['nombre', 'email', 'password', 'telefono', 'categoria', 'posicionHabitual', 'manoDominante', 'sexo'];
    const missing = required.filter((key) => !String(form[key] || '').trim());
    if (missing.length) return 'Completá todos los campos obligatorios.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Ingresá un correo electrónico válido.';
    if (form.password.length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
    if (form.password !== form.confirmPassword) return 'Las contraseñas no coinciden.';
    return '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setSubmitting(true);
    const payload = {
      nombre: form.nombre.trim(),
      email: form.email.trim(),
      password: form.password,
      telefono: form.telefono.trim(),
      categoria: form.categoria,
      posicionHabitual: form.posicionHabitual,
      manoDominante: form.manoDominante,
      sexo: form.sexo,
    };

    try {
      const user = await register(payload);
      toast.success(`Bienvenido/a, ${user.nombre}. Tu cuenta de jugador está lista.`);
      navigate('/', { replace: true });
    } catch (submitError) {
      setError(errorMessage(submitError, 'No se pudo crear la cuenta.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-layout">
      <div className="auth-panel">
        <div className="auth-form" style={{ width: 'min(100%, 620px)' }}>
          <div className="auth-brand">
            <span className="auth-brand__mark">
              <BrandLogo className="brand-logo--auth" />
            </span>
            <span className="auth-brand__name">4to set padel</span>
          </div>

          <div className="login-heading">
            <div className="login-heading__eyebrow">Sumate al club</div>
            <h1>Creá tu cuenta</h1>
            <p>El registro público siempre crea un perfil de jugador.</p>
          </div>

          <form className="stack" onSubmit={handleSubmit} noValidate>
            <SubmitError error={error} title="No se pudo registrar" />

            <div className="form-grid">
              <InputField
                label="Nombre completo"
                name="nombre"
                autoComplete="name"
                placeholder="Ana Gómez"
                value={form.nombre}
                onChange={update}
                required
              />
              <InputField
                label="Correo electrónico"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="tu@correo.com"
                value={form.email}
                onChange={update}
                required
              />
              <InputField
                label="Teléfono"
                name="telefono"
                type="tel"
                autoComplete="tel"
                placeholder="1122334455"
                value={form.telefono}
                onChange={update}
                required
              />
              <InputField
                label="Categoría"
                name="categoria"
                as="select"
                placeholder="Seleccioná tu categoría"
                options={CATEGORIES}
                value={form.categoria}
                onChange={update}
                required
              />
              <InputField
                label="Posición habitual"
                name="posicionHabitual"
                as="select"
                placeholder="Seleccioná una opción"
                options={POSITIONS}
                value={form.posicionHabitual}
                onChange={update}
                required
              />
              <InputField
                label="Mano dominante"
                name="manoDominante"
                as="select"
                placeholder="Seleccioná una opción"
                options={HANDS}
                value={form.manoDominante}
                onChange={update}
                required
              />
              <InputField
                label="Sexo"
                name="sexo"
                as="select"
                placeholder="Seleccioná una opción"
                options={SEXES}
                value={form.sexo}
                onChange={update}
                required
              />
              <InputField
                label="Contraseña"
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder="Mínimo 8 caracteres"
                value={form.password}
                onChange={update}
                required
              />
              <InputField
                label="Confirmar contraseña"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                placeholder="Repetí la contraseña"
                value={form.confirmPassword}
                onChange={update}
                className="form-grid__full"
                required
              />
            </div>

            <Alert variant="info">
              No enviamos el campo <strong>rol</strong>: la API lo fuerza a <strong>jugador</strong>. Si necesitás permisos de administración, pedilos al responsable del complejo.
            </Alert>

            <button type="submit" className="button button--accent button--wide" disabled={submitting}>
              {submitting ? 'Creando cuenta…' : 'Crear cuenta'}
            </button>

            <p className="text-small text-muted" style={{ textAlign: 'center' }}>
              ¿Ya tenés cuenta? <Link to="/login">Ingresá acá</Link>
            </p>
          </form>

          <p className="text-small text-muted" style={{ marginTop: 10 }}>
            El alta de administradores se hace desde Usuarios, nunca desde este formulario.
          </p>
        </div>
      </div>

      <aside className="auth-aside">
        <div className="auth-aside__top">
          <BrandLogo className="brand-logo--aside" />
          <div className="auth-aside__eyebrow">Perfil de jugador</div>
          <h2>Tu juego, tus datos.</h2>
          <p>Cargá tu categoría, mano dominante y posición para que los partidos sean compatibles desde el primer momento.</p>
        </div>
        <div className="court-illustration" aria-hidden="true" />
        <div className="auth-aside__bottom">
          <div className="auth-aside__metrics">
            <div className="auth-aside__metric">
              <strong>8</strong>
              <span>Categorías</span>
            </div>
            <div className="auth-aside__metric">
              <strong>1</strong>
              <span>Diferencia permitida</span>
            </div>
            <div className="auth-aside__metric">
              <strong>4</strong>
              <span>Lugares por partido</span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
