import { Link, useLocation } from 'react-router-dom';
import { LogoMark } from '../ui/Logo';
import { APP_NAME } from './AppHeader';

interface AppFooterProps {
  isLoggedIn: boolean;
  isLoggingOut: boolean;
  onLogout: () => void;
}

const lightLink = 'min-h-11 flex items-center hover:text-indigo-700 transition-colors';

// Pie del prototipo: oscuro en Inicio y claro en el resto, con los enlaces de cada pantalla.
// Deja espacio abajo en celular para que la barra inferior no lo tape.
export const AppFooter: React.FC<AppFooterProps> = ({ isLoggedIn, isLoggingOut, onLogout }) => {
  const { pathname } = useLocation();

  if (pathname === '/') {
    return (
      <footer className="bg-slate-900 text-slate-300 py-12 pb-28 md:pb-16 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
          <div className="flex items-center gap-2.5">
            <LogoMark tone="light" />
            <span className="text-base font-semibold text-white">{APP_NAME}</span>
          </div>
          <nav aria-label="Enlaces del pie de página">
            <ul className="flex flex-col sm:flex-row items-center gap-1 sm:gap-6 text-sm">
              <li><Link to="/perfil" className="min-h-11 flex items-center hover:text-white transition-colors">Mi perfil</Link></li>
              <li><Link to="/ingreso" className="min-h-11 flex items-center hover:text-white transition-colors">Iniciar sesión</Link></li>
              <li><Link to="/registro" className="min-h-11 flex items-center hover:text-white transition-colors">Crear cuenta</Link></li>
              <li><Link to="/estado" className="min-h-11 flex items-center hover:text-white transition-colors">Estado de la conexión</Link></li>
            </ul>
          </nav>
          <p className="text-xs text-slate-400">© 2026 Salón de Estudio Colaborativo Universitario.</p>
        </div>
      </footer>
    );
  }

  const isProfile = pathname === '/perfil';
  const isRoom = pathname.startsWith('/salas/');
  const isPanel = pathname === '/panel';

  return (
    <footer className="bg-white border-t border-slate-200 py-6 pb-28 md:pb-8 text-sm text-slate-600 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {isProfile && <LogoMark />}
          <span className="font-semibold text-slate-800">{APP_NAME}</span>
        </div>
        <nav aria-label="Enlaces del pie de página">
          <ul className="flex items-center gap-6">
            {isProfile || isRoom ? (
              <li>
                <Link to="/panel" className="min-h-11 flex items-center font-semibold text-indigo-600 hover:text-indigo-700">
                  Volver al panel
                </Link>
              </li>
            ) : (
              <>
                {isPanel && <li><Link to="/perfil" className={lightLink}>Mi perfil</Link></li>}
                <li><Link to="/" className={lightLink}>Inicio</Link></li>
                {isPanel && isLoggedIn && (
                  <li>
                    <button type="button" onClick={onLogout} disabled={isLoggingOut} className="min-h-11 flex items-center hover:text-rose-700 transition-colors cursor-pointer disabled:opacity-60">
                      {isLoggingOut ? 'Cerrando...' : 'Cerrar sesión'}
                    </button>
                  </li>
                )}
              </>
            )}
          </ul>
        </nav>
      </div>
    </footer>
  );
};
