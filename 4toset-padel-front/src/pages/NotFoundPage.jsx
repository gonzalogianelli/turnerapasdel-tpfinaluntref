import { Link, useLocation } from 'react-router-dom';
import { Icon } from '../components/Icon.jsx';

export function NotFoundPage() {
  const location = useLocation();

  return (
    <div className="auth-layout">
      <div className="auth-panel">
        <div className="auth-form">
          <div className="login-heading">
            <div className="login-heading__eyebrow">Error 404</div>
            <h1>Página no encontrada</h1>
            <p>No hay una sección disponible en <code>{location.pathname}</code>.</p>
          </div>
          <Link className="button button--accent button--wide" to="/dashboard">
            Volver al resumen
          </Link>
        </div>
      </div>
      <aside className="auth-aside">
        <div className="auth-aside__top">
          <div className="auth-aside__eyebrow">4to set padel</div>
          <h2>Seguí en la cancha correcta.</h2>
          <p>La ruta que buscás no existe o fue movida. Volvé al panel para seguir trabajando.</p>
        </div>
        <div className="court-illustration" aria-hidden="true" />
        <div className="auth-aside__bottom">
          <p style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="info" size={16} /> Verificá la dirección e intentá de nuevo
          </p>
        </div>
      </aside>
    </div>
  );
}
