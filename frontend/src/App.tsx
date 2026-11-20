// frontend/src/App.tsx
import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute, PublicOnlyRoute } from './components/ProtectedRoute';
import { APP_NAME, AppHeader } from './components/layout/AppHeader';
import { AppFooter } from './components/layout/AppFooter';
import { MobileBottomNav } from './components/layout/MobileBottomNav';

import Home from './pages/Home';
import Register from './pages/Register';
import ChooseUsername from './pages/ChooseUsername';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Room from './pages/Room';
import NotFound from './pages/NotFound';
import ConnectionStatus from './pages/ConnectionStatus';

const PAGE_TITLES: Record<string, string> = {
  '/': 'Inicio',
  '/ingreso': 'Iniciar sesión',
  '/registro': 'Crear cuenta',
  '/registro/usuario': 'Elegir nombre de usuario',
  '/panel': 'Panel',
  '/perfil': 'Mi perfil',
  '/estado': 'Estado de la conexión',
  '/ayuda': 'Ayuda',
  '/accesibilidad': 'Declaración de accesibilidad',
};

// Contenedor de las pantallas privadas, con los márgenes del prototipo.
const Page: React.FC<{ narrow?: boolean; children: React.ReactNode }> = ({ narrow, children }) => (
  <div className={`${narrow ? 'max-w-4xl' : 'max-w-7xl'} mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8`}>{children}</div>
);

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { firebaseUser, profile, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const [logoutError, setLogoutError] = React.useState(false);

  const currentPage =
    PAGE_TITLES[location.pathname] ||
    (/^\/salas\/[^/]+$/.test(location.pathname) ? 'Sala' : 'Página no encontrada');

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
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2.5 focus:rounded-xl focus:bg-indigo-600 focus:text-white focus:text-sm focus:font-semibold focus:shadow-lg"
      >
        Saltar al contenido principal
      </a>

      <AppHeader
        firebaseUser={firebaseUser}
        profile={profile}
        isLoggingOut={isLoggingOut}
        logoutError={logoutError}
        onLogout={handleLogout}
      />

      {/* Cada pantalla define su propio contenedor (Inicio ocupa todo el ancho). */}
      <main id="main-content" tabIndex={-1} className="flex-1 w-full outline-none">
        {children}
      </main>

      <AppFooter isLoggedIn={Boolean(firebaseUser)} isLoggingOut={isLoggingOut} onLogout={handleLogout} />
      <MobileBottomNav isLoggedIn={Boolean(firebaseUser)} isLoggingOut={isLoggingOut} onLogout={handleLogout} />
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
            <Route path="/estado" element={<ConnectionStatus />} />

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
                  <Page><Dashboard /></Page>
                </ProtectedRoute>
              }
            />

            <Route
              path="/perfil"
              element={
                <ProtectedRoute>
                  <Page narrow><Profile /></Page>
                </ProtectedRoute>
              }
            />

            <Route
              path="/salas/:id"
              element={
                <ProtectedRoute>
                  <Page><Room /></Page>
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