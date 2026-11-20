import { Link, useLocation } from 'react-router-dom';
import { Home, LayoutGrid, LogIn, LogOut, User } from 'lucide-react';

interface MobileBottomNavProps {
  isLoggedIn: boolean;
  isLoggingOut: boolean;
  onLogout: () => void;
}

const tabClass = (active: boolean) =>
  `flex flex-col items-center justify-center min-h-12 py-1 px-2 rounded-xl transition-all ${
    active ? 'text-indigo-600 font-semibold' : 'text-slate-600 hover:text-slate-900'
  }`;

const Icon: React.FC<{ active: boolean; children: React.ReactNode }> = ({ active, children }) => (
  <span aria-hidden="true" className={`p-1 rounded-lg ${active ? 'bg-indigo-50 text-indigo-600' : ''}`}>
    {children}
  </span>
);

// Barra inferior del prototipo para celular. Con sesión, la cuarta pestaña cierra la sesión
// y así lo dice su nombre; sin sesión lleva al acceso.
export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ isLoggedIn, isLoggingOut, onLogout }) => {
  const { pathname } = useLocation();
  const isHome = pathname === '/';
  const isPanel = pathname === '/panel' || pathname.startsWith('/salas/');
  const isProfile = pathname === '/perfil';
  const isAuth = pathname === '/ingreso' || pathname.startsWith('/registro');

  return (
    <nav
      aria-label="Navegación inferior"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] px-2 py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]"
    >
      <ul className="grid grid-cols-4 items-center max-w-md mx-auto">
        <li>
          <Link to="/" aria-current={isHome ? 'page' : undefined} className={tabClass(isHome)}>
            <Icon active={isHome}><Home className="w-5 h-5" /></Icon>
            <span className="text-[11px] tracking-tight mt-0.5">Inicio</span>
          </Link>
        </li>
        <li>
          <Link to="/panel" aria-current={pathname === '/panel' ? 'page' : undefined} className={tabClass(isPanel)}>
            <Icon active={isPanel}><LayoutGrid className="w-5 h-5" /></Icon>
            <span className="text-[11px] tracking-tight mt-0.5">Panel</span>
          </Link>
        </li>
        <li>
          <Link to="/perfil" aria-current={isProfile ? 'page' : undefined} className={tabClass(isProfile)}>
            <Icon active={isProfile}><User className="w-5 h-5" /></Icon>
            <span className="text-[11px] tracking-tight mt-0.5">Mi perfil</span>
          </Link>
        </li>
        <li>
          {isLoggedIn ? (
            <button type="button" onClick={onLogout} disabled={isLoggingOut} className={`${tabClass(false)} w-full cursor-pointer disabled:opacity-60`}>
              <Icon active={false}><LogOut className="w-5 h-5" /></Icon>
              <span className="text-[11px] tracking-tight mt-0.5">{isLoggingOut ? 'Saliendo...' : 'Salir'}</span>
            </button>
          ) : isAuth ? (
            <Link to="/" className={tabClass(true)}>
              <Icon active><LogIn className="w-5 h-5" /></Icon>
              <span className="text-[11px] tracking-tight mt-0.5">Volver</span>
            </Link>
          ) : (
            <Link to="/ingreso" className={tabClass(false)}>
              <Icon active={false}><LogIn className="w-5 h-5" /></Icon>
              <span className="text-[11px] tracking-tight mt-0.5">Acceso</span>
            </Link>
          )}
        </li>
      </ul>
    </nav>
  );
};
