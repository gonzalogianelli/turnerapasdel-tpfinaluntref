import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { errorMessage, LOGIN_ERROR_MESSAGE } from '../utils/errors.js';
import { BrandLogo } from '../components/BrandLogo.jsx';
import { InputField, PasswordField, SubmitError } from '../components/Fields.jsx';
import { Icon } from '../components/Icon.jsx';

export function LoginPage() {
  const { login, message: authMessage } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (authMessage) setError(authMessage);
  }, [authMessage]);

  const update = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!form.email.trim() || !form.password) {
      setError('Ingresá tu correo y contraseña para continuar.');
      return;
    }

    setSubmitting(true);
    try {
      const user = await login(form);
      toast.success(`¡Hola, ${user.nombre}!`);
      const destino = location.state?.from?.pathname
        || (typeof location.state?.from === 'string' ? location.state.from : '/');
      navigate(destino, { replace: true });
    } catch (submitError) {
      setError(
        submitError?.status === 401
          ? LOGIN_ERROR_MESSAGE
          : errorMessage(submitError, 'No se pudo iniciar sesión.'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-layout">
      <div className="auth-panel">
        <div className="auth-form">
          <div className="auth-brand">
            <span className="auth-brand__mark">
              <BrandLogo className="brand-logo--auth" />
            </span>
            <span className="auth-brand__name">4to set padel</span>
          </div>

          <div className="login-heading">
            <div className="login-heading__eyebrow">Bienvenido de nuevo</div>
            <h1>Ingresá a tu cuenta</h1>
            <p>Gestioná turnos, reservas y partidos desde un solo lugar.</p>
          </div>

          <form className="stack" onSubmit={handleSubmit} noValidate autoComplete="off">
            <SubmitError error={error} title="No se pudo ingresar" />

            <InputField
              label="Correo electrónico"
              name="email"
              type="email"
              autoComplete="off"
              placeholder="tu@correo.com"
              value={form.email}
              onChange={update}
              required
            />
            <PasswordField
              label="Contraseña"
              name="password"
              autoComplete="off"
              placeholder="Tu contraseña"
              value={form.password}
              onChange={update}
              required
            />

            <div className="login-links">
              <Link to="/registro">Crear cuenta</Link>
              <Link to="/recuperar">¿Olvidaste tu contraseña?</Link>
            </div>

            <button type="submit" className="button button--accent button--wide" disabled={submitting}>
              {submitting ? 'Ingresando…' : 'Ingresar'}
            </button>
          </form>
        </div>
      </div>

      <aside className="auth-aside">
        <div className="auth-aside__top">
          <BrandLogo className="brand-logo--aside" />
          <div className="auth-aside__eyebrow">4to set padel</div>
          <h2>Tu club, siempre a punto.</h2>
          <p>Dos canchas, turnos claros y partidos que se completan sin perder tiempo.</p>
        </div>

        <div className="court-illustration" aria-hidden="true" />

        <div className="auth-aside__bottom">
          <div className="auth-aside__metrics">
            <div className="auth-aside__metric">
              <strong>2</strong>
              <span>Canchas activas</span>
            </div>
            <div className="auth-aside__metric">
              <strong>90'</strong>
              <span>Turnos</span>
            </div>
            <div className="auth-aside__metric">
              <strong>4</strong>
              <span>Jugadores</span>
            </div>
          </div>
          <p style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="shield" size={16} /> Acceso seguro con sesión HTTPOnly
          </p>
        </div>
      </aside>
    </div>
  );
}
