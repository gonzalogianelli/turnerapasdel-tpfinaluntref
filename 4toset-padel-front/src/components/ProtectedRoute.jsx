import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { LoadingState } from './Ui.jsx';

export function ProtectedRoute({ children, adminOnly = false }) {
  const { status, user } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <div className="page">
        <LoadingState label="Verificando tu sesión…" />
      </div>
    );
  }

  if (status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (adminOnly && user?.rol !== 'administrador') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
