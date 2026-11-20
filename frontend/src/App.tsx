// frontend/src/App.tsx
import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute, PublicOnlyRoute } from './components/ProtectedRoute';

import Home from './pages/Home';
import Register from './pages/Register';
import ChooseUsername from './pages/ChooseUsername';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Room from './pages/Room';
import NotFound from './pages/NotFound';

const APP_NAME = 'Salón de Estudio Colaborativo';

const PAGE_TITLES: Record<string, string> = {
  '/': 'Inicio',
  '/ingreso': 'Iniciar sesión',
  '/registro': 'Crear cuenta',
  '/registro/usuario': 'Elegir nombre de usuario',
  '/panel': 'Panel',
  '/perfil': 'Mi perfil',
  '/ayuda': 'Ayuda',
  '/accesibilidad': 'Declaración de accesibilidad',
};

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { firebaseUser, profile, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const [logoutError, setLogoutError] = React.useState(false);

  const currentPage =
    PAGE_TITLES[location.pathname] ||
    (/^\/salas\/[^/]+$/.test(location.pathname) ? 'Sala de estudio' : 'Página no encontrada');

  React.useEffect(() => {
    document.title = `${currentPage} · ${APP_NAME}`;
  }, [currentPage]);

  const handleLogout = async () => {
    setLogoutError(false);
    setIsLoggingOut(true);
    try {
      await logout();
    } catch {
      setLogoutError(true);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface-bg text-surface-text">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-6 focus:py-3 focus:bg-brand-600 focus:text-white focus:rounded-lg font-semibold"
      >
        Saltar al contenido principal
      </a>

      <header className="bg-surface-card border-b border-surface-border px-4 sm:px-6 py-3" role="banner">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-2 md:gap-4">
          <Link to="/" className="flex items-center gap-3 min-h-11 text-surface-text hover:text-brand-600 transition rounded-lg">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-lg text-white" aria-hidden="true">📖</span>
            <span className="text-lg font-bold tracking-tight">{APP_NAME}</span>
          </Link>

          <nav aria-label="Navegación principal">
            <ul className="flex flex-wrap items-center justify-center gap-x-1 gap-y-1 sm:gap-2 text-sm font-medium">
              <li>
                <Link
                  to="/"
                  aria-current={location.pathname === '/' ? 'page' : undefined}
                  className={`inline-flex min-h-11 items-center px-3 rounded-lg ${
                    location.pathname === '/' ? 'text-brand-600 font-semibold underline underline-offset-8' : 'text-surface-muted hover:text-brand-600'
                  }`}
                >
                  Inicio
                </Link>
              </li>

              {firebaseUser ? (
                <>
                  <li>
                    <Link
                      to="/panel"
                      aria-current={location.pathname === '/panel' ? 'page' : undefined}
                      className={`inline-flex min-h-11 items-center px-3 rounded-lg ${
                        location.pathname === '/panel' || location.pathname.startsWith('/salas/') ? 'text-brand-600 font-semibold underline underline-offset-8' : 'text-surface-muted hover:text-brand-600'
                      }`}
                    >
                      Panel
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/perfil"
                      aria-current={location.pathname === '/perfil' ? 'page' : undefined}
                      className={`inline-flex min-h-11 items-center px-3 rounded-lg ${
                        location.pathname === '/perfil' ? 'text-brand-600 font-semibold underline underline-offset-8' : 'text-surface-muted hover:text-brand-600'
                      }`}
                    >
                      Mi perfil
                    </Link>
                  </li>
                  <li className="flex items-center gap-2 md:pl-2 md:border-l md:border-surface-border">
                    <Link
                      to="/perfil"
                      aria-label={`Ir a Mi perfil (${profile?.username ? `@${profile.username}` : firebaseUser.email})`}
                      className="inline-flex min-h-11 items-center gap-2 px-1 rounded-lg hover:text-brand-600"
                    >
                      {profile?.avatarUrl && (
                        <img src={profile.avatarUrl} alt="" className="w-8 h-8 rounded-full bg-brand-50" />
                      )}
                      <span className="text-xs font-semibold text-surface-text hidden sm:inline">
                        {profile?.username ? `@${profile.username}` : firebaseUser.email}
                      </span>
                    </Link>
                    <button
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      aria-busy={isLoggingOut}
                      className="inline-flex min-h-11 items-center px-3 rounded-lg text-red-700 hover:bg-red-50 text-sm font-medium transition disabled:opacity-60"
                    >
                      {isLoggingOut ? 'Cerrando...' : 'Cerrar sesión'}
                    </button>
                    {logoutError && (
                      <p role="alert" className="text-xs text-red-700 font-medium">
                        No pudimos cerrar la sesión. Intenta de nuevo.
                      </p>
                    )}
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <Link
                      to="/ingreso"
                      className={`inline-flex min-h-11 items-center px-3 rounded-lg ${
                        location.pathname === '/ingreso' ? 'text-brand-600 font-semibold underline underline-offset-8' : 'text-surface-muted hover:text-brand-600'
                      }`}
                    >
                      Iniciar sesión
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/registro"
                      className="inline-flex min-h-11 items-center px-4 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-semibold transition"
                    >
                      Crear cuenta
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </nav>
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="flex-1 max-w-6xl w-full mx-auto p-6 outline-none" role="main">
        {children}
      </main>

      <footer className="bg-surface-card border-t border-surface-border text-surface-muted text-center py-6 text-sm" role="contentinfo">
        <div className="max-w-6xl mx-auto px-4 space-y-2">
          <p>© 2026-I {APP_NAME} — Proyecto Integrador I (Grupo 3)</p>
          <p className="text-xs">
            Diseñado bajo pautas de accesibilidad <strong>WCAG 2.2 Nivel AA</strong>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />

            {/* Rutas exclusivas para usuarios sin sesión */}
            <Route
              path="/registro"
              element={
                <PublicOnlyRoute>
                  <Register />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/ingreso"
              element={
                <PublicOnlyRoute>
                  <Login />
                </PublicOnlyRoute>
              }
            />

            {/* Flujo Username Obligatorio tras Google (US-02) */}
            <Route
              path="/registro/usuario"
              element={
                <ProtectedRoute>
                  <ChooseUsername />
                </ProtectedRoute>
              }
            />

            {/* Rutas Privadas Protegidas */}
            <Route
              path="/panel"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/perfil"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />

            <Route
              path="/salas/:id"
              element={
                <ProtectedRoute>
                  <Room />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </AuthProvider>
    </BrowserRouter>
  );
}