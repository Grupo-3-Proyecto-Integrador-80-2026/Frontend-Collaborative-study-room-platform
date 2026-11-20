import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, LayoutGrid, LogOut, Menu, User, X } from 'lucide-react';
import type { User as FirebaseUser } from 'firebase/auth';
import type { UserProfile } from '../../services/api';
import { LogoMark } from '../ui/Logo';

export const APP_NAME = 'Salón de Estudio Colaborativo';

interface AppHeaderProps {
  firebaseUser: FirebaseUser | null;
  profile: UserProfile | null;
  isLoggingOut: boolean;
  logoutError: boolean;
  onLogout: () => void;
}

const navLinkClass = (active: boolean) =>
  `transition-colors whitespace-nowrap shrink-0 px-1 py-1 rounded-md ${
    active ? 'text-indigo-600 font-semibold' : 'text-slate-600 hover:text-slate-900'
  }`;

const drawerLinkClass = (active: boolean) =>
  `flex items-center gap-2.5 px-3 py-3 min-h-11 rounded-xl text-sm font-semibold transition-colors ${
    active ? 'bg-indigo-50 text-indigo-700' : 'text-slate-800 hover:bg-slate-100'
  }`;

// Encabezado del prototipo: marca, navegación (Inicio · Panel · Mi perfil), cuenta y menú móvil.
export const AppHeader: React.FC<AppHeaderProps> = ({ firebaseUser, profile, isLoggingOut, logoutError, onLogout }) => {
  const { pathname } = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [openedAt, setOpenedAt] = useState(pathname);

  // El menú móvil se cierra al cambiar de pantalla.
  if (mobileNavOpen && openedAt !== pathname) {
    setMobileNavOpen(false);
  }

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileNavOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mobileNavOpen]);

  const isHome = pathname === '/';
  const isPanel = pathname === '/panel' || pathname.startsWith('/salas/');
  const isProfile = pathname === '/perfil';
  const fullName = profile ? `${profile.firstName} ${profile.lastName}`.trim() : firebaseUser?.displayName || firebaseUser?.email || '';
  // Mientras no hay perfil (alta con Google) se usa la foto de la cuenta de Google.
  const avatarUrl = profile?.avatarUrl ?? firebaseUser?.photoURL ?? null;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        <Link
          to="/"
          className="flex items-center gap-2.5 text-base sm:text-lg font-bold tracking-tight text-slate-900 shrink min-w-0 hover:text-indigo-600 transition-colors rounded-lg px-1"
        >
          <LogoMark />
          <span className="truncate">{APP_NAME}</span>
        </Link>

        <nav aria-label="Navegación principal" className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link to="/" aria-current={isHome ? 'page' : undefined} className={navLinkClass(isHome)}>
            Inicio
          </Link>
          <Link to="/panel" aria-current={pathname === '/panel' ? 'page' : undefined} className={navLinkClass(isPanel)}>
            Panel
          </Link>
          <Link to="/perfil" aria-current={isProfile ? 'page' : undefined} className={navLinkClass(isProfile)}>
            Mi perfil
          </Link>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {firebaseUser ? (
            <>
              <Link
                to="/perfil"
                aria-label={`Ir a Mi perfil (${profile?.username ? `@${profile.username}` : fullName})`}
                className={`flex items-center gap-2.5 px-2 py-1.5 min-h-11 rounded-xl border transition-colors ${
                  isProfile ? 'bg-indigo-50 border-indigo-200' : 'border-transparent hover:bg-slate-50 hover:border-slate-200'
                }`}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" referrerPolicy="no-referrer" className="w-8 h-8 rounded-full object-cover border border-slate-200 bg-indigo-50 shrink-0" />
                ) : (
                  <span aria-hidden="true" className="w-8 h-8 rounded-full bg-indigo-600 text-white text-sm font-bold flex items-center justify-center shrink-0">
                    {(profile?.firstName || fullName || 'E')[0]}
                  </span>
                )}
                <span className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-semibold text-slate-900 leading-tight max-w-[140px] truncate">{fullName}</span>
                  {profile?.username && (
                    <span className="text-[11px] text-slate-600 leading-tight max-w-[140px] truncate font-mono">@{profile.username}</span>
                  )}
                </span>
              </Link>
              <button
                type="button"
                onClick={onLogout}
                disabled={isLoggingOut}
                aria-busy={isLoggingOut || undefined}
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 min-h-11 text-xs font-semibold text-slate-700 hover:text-rose-700 bg-slate-100 hover:bg-rose-50 rounded-xl transition-colors border border-slate-200 cursor-pointer whitespace-nowrap disabled:opacity-60"
              >
                <LogOut className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{isLoggingOut ? 'Cerrando...' : 'Cerrar sesión'}</span>
              </button>
            </>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Link
                to="/ingreso"
                aria-current={pathname === '/ingreso' ? 'page' : undefined}
                className="text-sm font-semibold text-slate-700 hover:text-indigo-600 transition-colors px-3 py-2 min-h-11 flex items-center whitespace-nowrap rounded-xl hover:bg-slate-100"
              >
                Iniciar sesión
              </Link>
              <Link
                to="/registro"
                aria-current={pathname === '/registro' ? 'page' : undefined}
                className="px-4 py-2 min-h-11 flex items-center text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm whitespace-nowrap"
              >
                Crear cuenta
              </Link>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setOpenedAt(pathname);
              setMobileNavOpen((open) => !open);
            }}
            aria-expanded={mobileNavOpen}
            aria-controls="mobile-menu"
            aria-label={mobileNavOpen ? 'Cerrar menú' : 'Abrir menú'}
            className="md:hidden flex items-center justify-center w-11 h-11 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            {mobileNavOpen ? <X className="w-5 h-5" aria-hidden="true" /> : <Menu className="w-5 h-5" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {logoutError && (
        <p role="alert" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-2 text-xs text-rose-700 font-medium text-right">
          No pudimos cerrar la sesión. Intenta de nuevo.
        </p>
      )}

      {mobileNavOpen && (
        <div id="mobile-menu" className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-5 shadow-lg">
          <nav aria-label="Menú móvil" className="flex flex-col gap-1 mb-3">
            <Link to="/" aria-current={isHome ? 'page' : undefined} className={drawerLinkClass(isHome)}>
              <Home className="w-4 h-4 text-indigo-600 shrink-0" aria-hidden="true" />
              <span>Inicio</span>
            </Link>
            <Link to="/panel" aria-current={pathname === '/panel' ? 'page' : undefined} className={drawerLinkClass(isPanel)}>
              <LayoutGrid className="w-4 h-4 text-indigo-600 shrink-0" aria-hidden="true" />
              <span>Panel</span>
            </Link>
            <Link to="/perfil" aria-current={isProfile ? 'page' : undefined} className={drawerLinkClass(isProfile)}>
              <User className="w-4 h-4 text-indigo-600 shrink-0" aria-hidden="true" />
              <span>Mi perfil</span>
            </Link>
          </nav>
          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
            {firebaseUser ? (
              <button
                type="button"
                onClick={onLogout}
                disabled={isLoggingOut}
                className="w-full min-h-12 flex items-center justify-center gap-2 text-sm font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors cursor-pointer disabled:opacity-60"
              >
                <LogOut className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{isLoggingOut ? 'Cerrando...' : 'Cerrar sesión'}</span>
              </button>
            ) : (
              <>
                <Link to="/ingreso" className="w-full min-h-12 flex items-center justify-center text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
                  Iniciar sesión
                </Link>
                <Link to="/registro" className="w-full min-h-12 flex items-center justify-center text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors">
                  Crear cuenta
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
