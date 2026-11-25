import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BrandLogo } from '../components/BrandLogo.jsx';
import { InputField } from '../components/Fields.jsx';
import { Icon } from '../components/Icon.jsx';
import { Alert, Card } from '../components/Ui.jsx';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    setSubmitted(true);
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
            <div className="login-heading__eyebrow">Recuperación</div>
            <h1>Restablecer contraseña</h1>
            <p>Te mostramos el flujo previsto sin enviar correos a direcciones inexistentes.</p>
          </div>

          <form className="stack" onSubmit={handleSubmit} noValidate>
            <InputField
              label="Correo electrónico"
              name="recoveryEmail"
              type="email"
              autoComplete="email"
              placeholder="tu@correo.com"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setSubmitted(false);
              }}
              hint="Este formulario no realiza peticiones ni envía correos."
            />

            <button type="submit" className="button button--accent button--wide">
              Continuar
            </button>
          </form>

          {submitted && (
            <div style={{ marginTop: 16 }}>
              <Alert variant="info" title="Funcionalidad no disponible">
                El backend todavía no expone un endpoint de recuperación de contraseña, por lo que no se envió ningún correo. Comunicate con el administrador del complejo para que gestione el cambio de forma segura.
              </Alert>
            </div>
          )}

          <p className="text-small text-muted" style={{ marginTop: 18, textAlign: 'center' }}>
            <Link to="/login">Volver al inicio de sesión</Link>
          </p>
        </div>
      </div>

      <aside className="auth-aside">
        <div className="auth-aside__top">
          <BrandLogo className="brand-logo--aside" />
          <div className="auth-aside__eyebrow">Cuenta protegida</div>
          <h2>Sin atajos peligrosos.</h2>
          <p>Preferimos mostrar el flujo y explicar la limitación antes que simular un envío o apuntar a un correo que no existe.</p>
        </div>

        <div className="stack" style={{ position: 'relative', zIndex: 1 }}>
          <Card className="card--elevated">
            <div className="step-card">
              <span className="step-card__number">1</span>
              <div>
                <h3>Ingresá tu correo</h3>
                <p>La pantalla valida el formato localmente.</p>
              </div>
            </div>
          </Card>
          <Card className="card--elevated">
            <div className="step-card">
              <span className="step-card__number">2</span>
              <div>
                <h3>Te avisamos la limitación</h3>
                <p>No se llama a ninguna ruta inexistente.</p>
              </div>
            </div>
          </Card>
          <Card className="card--elevated">
            <div className="step-card">
              <span className="step-card__number">3</span>
              <div>
                <h3>Contactá al club</h3>
                <p>El administrador puede gestionar el acceso.</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="auth-aside__bottom">
          <p style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="lock" size={16} /> Sin envíos SMTP simulados
          </p>
        </div>
      </aside>
    </div>
  );
}
