import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProfileError = () => {
  const { profileError, refreshProfile, logout } = useAuth();
  const [logoutError, setLogoutError] = React.useState(false);
  return (
    <section className="max-w-md mx-auto space-y-4 py-10" aria-label="Verificación de perfil">
      <p role="alert">{profileError || 'No pudimos verificar tu perfil.'}</p>
      <button className="min-h-11 px-4 rounded-lg bg-brand-600 text-white" onClick={() => void refreshProfile().catch(() => undefined)}>
        Reintentar
      </button>
      <button className="min-h-11 px-4 rounded-lg text-red-700" onClick={() => void logout().catch(() => setLogoutError(true))}>
        Cerrar sesión
      </button>
      {logoutError && <p role="alert">No pudimos cerrar la sesión. Intenta de nuevo.</p>}
    </section>
  );
};

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { firebaseUser, profile, loading, needsUsername, profileError } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3" role="status">
        <svg className="animate-spin h-8 w-8 text-brand-600" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        <span className="text-surface-muted text-sm font-medium">Verificando sesión...</span>
      </div>
    );
  }

  // 1. Si no hay sesión iniciada -> Al Login guardando la ruta solicitada
  if (!firebaseUser) {
    return <Navigate to="/ingreso" state={{ from: location }} replace />;
  }

  if (profileError || (!profile && !needsUsername)) return <ProfileError />;

  // 2. Si entró con Google y no ha completado el username (US-02) -> Obligatorio a /registro/usuario
  if (needsUsername && location.pathname !== '/registro/usuario') {
    return <Navigate to="/registro/usuario" replace />;
  }

  if (!needsUsername && location.pathname === '/registro/usuario') {
    return <Navigate to="/panel" replace />;
  }

  return <>{children}</>;
};

export const PublicOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { firebaseUser, profile, loading, needsUsername, profileError } = useAuth();

  if (loading) return <p role="status">Verificando sesión...</p>;

  if (firebaseUser) {
    if (profileError || (!profile && !needsUsername)) return <ProfileError />;
    if (needsUsername) {
      return <Navigate to="/registro/usuario" replace />;
    }
    return <Navigate to="/panel" replace />;
  }

  return <>{children}</>;
};
