import { useMemo } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { errorMessage } from '../utils/errors.js';
import { Avatar, Badge } from './Ui.jsx';
import { BrandLogo } from './BrandLogo.jsx';
import { Icon } from './Icon.jsx';

const ROUTE_TITLES = {
  '/': 'Reserva',
  '/dashboard': 'Resumen general',
  '/perfil': 'Mi perfil',
  '/usuarios': 'Usuarios',
  '/canchas': 'Canchas',
  '/partidos': 'Partidos',
};

const baseNav = [
  { to: '/', label: 'Reserva', icon: 'ticket', end: true },
  { to: '/dashboard', label: 'Resumen', icon: 'dashboard' },
  { to: '/partidos', label: 'Partidos', icon: 'match' },
];

const adminNav = [
  { to: '/usuarios', label: 'Usuarios', icon: 'users' },
  { to: '/canchas', label: 'Canchas', icon: 'court' },
];

export function AppShell() {
  const { user, isAdmin, logout } = useAuth();
  const toast = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = useMemo(() => {
    const items = [...baseNav];
    if (isAdmin) items.unshift(...adminNav);
    return [...items, { to: '/perfil', label: 'Mi perfil', icon: 'user' }];
  }, [isAdmin]);

  const pageTitle = ROUTE_TITLES[location.pathname] || '4to set padel';

  const today = useMemo(
    () =>
      new Intl.DateTimeFormat('es-AR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }).format(new Date()),
    [],
  );

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Cerraste sesión correctamente.');
      navigate('/', { replace: true });
    } catch (error) {
      toast.error(errorMessage(error, 'No se pudo cerrar la sesión.'));
    }
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link to="/dashboard" className="sidebar__brand" aria-label="Ir al resumen">
          <BrandLogo className="brand-logo--sidebar" />
          <span className="brand-copy">
            <strong>4to set padel</strong>
            <span>Club manager</span>
          </span>
        </Link>

        <div className="sidebar__section-label">Menú</div>
        <nav className="sidebar__nav" aria-label="Navegación principal">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-link ${isActive ? 'nav-link--active' : ''}`}
              title={item.label}
            >
              <span className="nav-link__icon">
                <Icon name={item.icon} size={18} />
              </span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__footer">
          <div className="sidebar-user">
            <Avatar name={user?.nombre} dark />
            <div className="sidebar-user__meta">
              <strong>{user?.nombre}</strong>
              <span>{isAdmin ? 'Administrador' : 'Jugador'}</span>
            </div>
          </div>
        </div>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <div>
            <div className="topbar__breadcrumb">4to set / {isAdmin ? 'Gestión' : 'Club'}</div>
            <div className="topbar__title">{pageTitle}</div>
          </div>
          <div className="topbar__actions">
            <span className="topbar__date">{today}</span>
            <Badge tone={isAdmin ? 'success' : 'info'}>{isAdmin ? 'ADM' : 'JUG'}</Badge>
            {isAdmin && (
              <Link to="/" className="icon-button" title="Avisos de reservas" aria-label="Ver avisos de reservas">
                <Icon name="bell" size={17} />
              </Link>
            )}
            <Link to="/perfil" className="icon-button" title="Mi perfil" aria-label="Ir a mi perfil">
              <Icon name="user" size={17} />
            </Link>
            <button type="button" className="icon-button" title="Cerrar sesión" aria-label="Cerrar sesión" onClick={handleLogout}>
              <Icon name="logout" size={17} />
            </button>
          </div>
        </header>

        <main className="page">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
