import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { BrandLogo } from './BrandLogo.jsx';
import { Icon } from './Icon.jsx';

export function GuestShell() {
  const { status } = useAuth();

  return (
    <div className="guest-shell">
      <header className="guest-topbar">
        <Link to="/" className="guest-topbar__brand" aria-label="Ir a reservar">
          <BrandLogo className="brand-logo--sidebar" />
          <span>
            <strong>4to set padel</strong>
            <span>Reservá tu cancha</span>
          </span>
        </Link>
        <div className="guest-topbar__actions">
          <Link to="/" className="button button--ghost button--sm">Reserva</Link>
          {status === 'authenticated' ? (
            <Link to="/perfil" className="button button--outline button--sm">Mi cuenta</Link>
          ) : (
            <Link to="/registro" className="button button--outline button--sm">Crear cuenta</Link>
          )}
          <Link
            to={status === 'authenticated' ? '/perfil' : '/login'}
            className="icon-button"
            title={status === 'authenticated' ? 'Gestionar mi sesión' : 'Iniciar sesión'}
            aria-label={status === 'authenticated' ? 'Gestionar mi sesión' : 'Iniciar sesión'}
          >
            <Icon name="user" size={17} />
          </Link>
        </div>
      </header>
      <main className="page">
        <Outlet />
      </main>
    </div>
  );
}
