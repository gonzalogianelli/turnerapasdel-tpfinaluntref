import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { LoadingState } from './Ui.jsx';

export function GuestRoute({ children }) {
  const { status } = useAuth();

  if (status === 'loading') {
    return (
      <div className="auth-layout">
        <div className="auth-panel">
          <LoadingState label="Verificando tu sesión…" />
        </div>
      </div>
    );
  }

  if (status === 'authenticated') return <Navigate to="/" replace />;

  return children;
}
