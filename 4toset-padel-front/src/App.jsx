import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from './components/AppShell.jsx';
import { GuestRoute } from './components/GuestRoute.jsx';
import { GuestShell } from './components/GuestShell.jsx';
import { ProtectedRoute } from './components/ProtectedRoute.jsx';
import { LoadingState } from './components/Ui.jsx';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { CourtsPage } from './pages/CourtsPage.jsx';
import { DashboardPage } from './pages/DashboardPage.jsx';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { MatchesPage } from './pages/MatchesPage.jsx';
import { NotFoundPage } from './pages/NotFoundPage.jsx';
import { ProfilePage } from './pages/ProfilePage.jsx';
import { RegisterPage } from './pages/RegisterPage.jsx';
import { ReservaPage } from './pages/ReservaPage.jsx';
import { UsersPage } from './pages/UsersPage.jsx';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function ReservaAccess() {
  const { status } = useAuth();

  if (status === 'loading') {
    return (
      <div className="page">
        <LoadingState label="Verificando tu sesión…" />
      </div>
    );
  }

  return status === 'authenticated' ? <AppShell /> : <GuestShell />;
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<ReservaAccess />}>
              <Route index element={<ReservaPage />} />
            </Route>
            <Route path="/turnos" element={<Navigate to="/" replace />} />
            <Route path="/reservas" element={<Navigate to="/" replace />} />

            <Route
              path="/login"
              element={
                <GuestRoute>
                  <LoginPage />
                </GuestRoute>
              }
            />
            <Route
              path="/registro"
              element={
                <GuestRoute>
                  <RegisterPage />
                </GuestRoute>
              }
            />
            <Route
              path="/recuperar"
              element={
                <GuestRoute>
                  <ForgotPasswordPage />
                </GuestRoute>
              }
            />

            <Route
              element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/perfil" element={<ProfilePage />} />
              <Route
                path="/usuarios"
                element={
                  <ProtectedRoute adminOnly>
                    <UsersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/canchas"
                element={
                  <ProtectedRoute adminOnly>
                    <CourtsPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/partidos" element={<MatchesPage />} />
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
