import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Card, PageHeader } from '../components/Ui.jsx';
import { Icon } from '../components/Icon.jsx';

export function DashboardPage() {
  const { user, isAdmin } = useAuth();
  const nombre = user?.nombre?.split(' ')[0] || '';

  const accesos = isAdmin
    ? [
        { to: '/', label: 'Reserva', description: 'Grilla, bloqueos y avisos', icon: 'ticket' },
        { to: '/canchas', label: 'Canchas', description: 'Alta y estado', icon: 'court' },
        { to: '/usuarios', label: 'Usuarios', description: 'Cuentas y roles', icon: 'users' },
        { to: '/perfil', label: 'Mi cuenta', description: 'Datos y contraseña', icon: 'user' },
      ]
    : [
        { to: '/', label: 'Reservar', description: 'Elegí fecha y horario', icon: 'ticket' },
        { to: '/partidos', label: 'Partidos', description: 'Buscá jugadores', icon: 'match' },
        { to: '/perfil', label: 'Mi perfil', description: 'Datos y categoría', icon: 'user' },
      ];

  return (
    <>
      <PageHeader
        eyebrow="Resumen"
        title={nombre ? `Hola, ${nombre}` : 'Hola'}
        description="Todo lo que necesitás para jugar, en una sola vista. El detalle de cada gestión vive en su sección."
      />

      <Card title="Accesos rápidos" subtitle="Entrá directo a lo que querés hacer; no hay listas repetidas en este panel.">
        <div className="quick-actions">
          {accesos.map((acceso) => (
            <Link key={acceso.to} to={acceso.to} className="quick-action">
              <span className="quick-action__icon"><Icon name={acceso.icon} size={20} /></span>
              <span>
                <strong>{acceso.label}</strong>
                <small className="text-muted">{acceso.description}</small>
              </span>
            </Link>
          ))}
        </div>
      </Card>

      <Card title="Cómo reservar" subtitle="La grilla muestra solo los horarios libres de 90 minutos por cancha.">
        <ol className="dashboard-steps">
          <li>Elegí la fecha en la parte superior de Reserva.</li>
          <li>Tocá un bloque libre de la cancha que quieras.</li>
          <li>Confirmá con tu cuenta; tu elección se conserva si tenés que iniciar sesión.</li>
        </ol>
      </Card>
    </>
  );
}
