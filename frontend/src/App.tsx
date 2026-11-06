import React from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate, useLocation, useParams } from 'react-router-dom';
import Home from './pages/Home';
import NotFound from './pages/NotFound';

const APP_NAME = 'Salón de Estudio Colaborativo';

// Título de cada pantalla del mapa del sitio (WCAG 2.4.2)
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

const getPageTitle = (pathname: string): string => {
  if (pathname.startsWith('/salas/')) return 'Sala';
  return PAGE_TITLES[pathname] ?? 'Página no encontrada';
};

// Componente plantilla accesible para las páginas del mapa del sitio planificadas
const MapSitePlaceholder: React.FC<{
  title: string;
  description: string;
  sprint: string;
  icon: string;
}> = ({ title, description, sprint, icon }) => (
  <section aria-labelledby="page-title" className="space-y-4">
    <div className="bg-surface-card p-6 rounded-lg shadow-sm border border-surface-border">
      <div className="flex items-center gap-3">
        <span className="text-3xl" aria-hidden="true">{icon}</span>
        <div>
          <h1 id="page-title" className="text-2xl font-bold text-surface-text">
            {title}
          </h1>
          <span className="inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded bg-brand-50 text-brand-700 border border-brand-100">
            {sprint}
          </span>
        </div>
      </div>
      <p className="mt-4 text-surface-muted text-sm leading-relaxed max-w-2xl">
        {description}
      </p>
    </div>
  </section>
);

const RoomPlaceholder: React.FC = () => {
  const { id } = useParams();
  return (
    <MapSitePlaceholder
      title="Sala"
      description={`Sala con ID «${id ?? ''}»: chat con historial, cuadrícula de participantes, micrófono, cámara y compartir pantalla. Se habilita entre el Sprint 3 y el Sprint 5 (US-08 a US-14).`}
      sprint="Sprint 3 a 5: Sala, chat, audio, video y pantalla"
      icon="🚪"
    />
  );
};

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();

  const navLinks = [
    { name: 'Inicio', path: '/' },
    { name: 'Iniciar sesión', path: '/ingreso' },
    { name: 'Crear cuenta', path: '/registro' },
    { name: 'Panel', path: '/panel' },
    { name: 'Mi perfil', path: '/perfil' },
    { name: 'Ayuda', path: '/ayuda' },
  ];

  const footerLinks = [
    { name: 'Ayuda', path: '/ayuda' },
    { name: 'Declaración de accesibilidad', path: '/accesibilidad' },
  ];

  const currentPage = getPageTitle(location.pathname);

  React.useEffect(() => {
    document.title = `${currentPage} · ${APP_NAME}`;
  }, [currentPage]);

  return (
    <div className="min-h-screen flex flex-col bg-surface-bg text-surface-text">
      {/* Enlace de salto accesible WCAG 2.4.1 */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-6 focus:py-3 focus:bg-brand-600 focus:text-white focus:rounded-lg font-semibold"
      >
        Saltar al contenido principal
      </a>

      {/* Encabezado accesible WCAG */}
      <header className="bg-surface-card border-b border-surface-border px-6 py-3" role="banner">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <Link to="/" className="flex items-center gap-3 min-h-11 text-surface-text hover:text-brand-600 transition rounded-lg">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-lg" aria-hidden="true">📖</span>
            <span className="text-lg font-bold tracking-tight">{APP_NAME}</span>
          </Link>

          <nav aria-label="Navegación principal">
            <ul className="flex flex-wrap gap-1 text-sm font-medium">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.path;
                return (
                  <li key={link.path}>
                    <Link
                      to={link.path}
                      aria-current={isActive ? 'page' : undefined}
                      className={`inline-flex min-h-11 items-center px-3 rounded-lg transition-colors ${
                        isActive
                          ? 'text-brand-600 font-semibold underline decoration-2 underline-offset-8'
                          : 'text-surface-muted hover:text-brand-600 hover:bg-brand-50'
                      }`}
                    >
                      {link.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </header>

      {/* Contenido principal */}
      <main id="main-content" tabIndex={-1} className="flex-1 max-w-6xl w-full mx-auto p-6 outline-none" role="main">
        {children}
      </main>

      {/* Pie de página accesible */}
      <footer className="bg-surface-card border-t border-surface-border text-surface-muted text-center py-6 text-sm" role="contentinfo">
        <div className="max-w-6xl mx-auto px-4 space-y-2">
          <nav aria-label="Enlaces del pie de página">
            <ul className="flex flex-wrap justify-center gap-4">
              {footerLinks.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="inline-flex min-h-11 items-center px-2 underline text-brand-600 hover:text-brand-700 rounded-lg"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <p>© 2026-I {APP_NAME} — Proyecto Integrador I (Grupo 3)</p>
          <p className="text-xs text-surface-muted">
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
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route
            path="/ingreso"
            element={
              <MapSitePlaceholder
                title="Iniciar sesión"
                description="Ingreso con correo y contraseña o con «Continuar con Google». Se habilita en el Sprint 1 (US-03)."
                sprint="Sprint 1: Identidad y autenticación"
                icon="🔐"
              />
            }
          />
          <Route
            path="/registro"
            element={
              <MapSitePlaceholder
                title="Crear cuenta"
                description="Formulario para crear la cuenta con nombre de usuario único, avatar, correo y contraseña. Se habilita en el Sprint 1 (US-01)."
                sprint="Sprint 1: Identidad y autenticación"
                icon="📝"
              />
            }
          />
          <Route
            path="/registro/usuario"
            element={
              <MapSitePlaceholder
                title="Elegir nombre de usuario"
                description="Paso obligatorio después de «Continuar con Google» la primera vez. Se habilita en el Sprint 1 (US-02)."
                sprint="Sprint 1: Identidad y autenticación"
                icon="🪪"
              />
            }
          />
          <Route
            path="/panel"
            element={
              <MapSitePlaceholder
                title="Panel"
                description="Lista de mis salas con su ID, «Crear sala» y «Unirse a una sala». Se habilita en el Sprint 2 (US-06) y el Sprint 3 (US-07 y US-08)."
                sprint="Sprint 2: Salas"
                icon="📊"
              />
            }
          />
          <Route path="/salas/:id" element={<RoomPlaceholder />} />
          <Route
            path="/perfil"
            element={
              <MapSitePlaceholder
                title="Mi perfil"
                description="Ver y editar nombres, apellidos, avatar y nombre de usuario, y eliminar la cuenta. Se habilita en el Sprint 2 (US-04 y US-05)."
                sprint="Sprint 2: Perfil"
                icon="👤"
              />
            }
          />
          <Route
            path="/ayuda"
            element={
              <MapSitePlaceholder
                title="Ayuda"
                description="Preguntas frecuentes sobre crear y unirse a salas, permisos de cámara y micrófono, y uso con teclado y lector de pantalla."
                sprint="Página de apoyo"
                icon="❓"
              />
            }
          />
          <Route
            path="/accesibilidad"
            element={
              <MapSitePlaceholder
                title="Declaración de accesibilidad"
                description="Nivel de conformidad WCAG 2.2 AA, cómo se comprobó, limitaciones conocidas y contacto. Se publica completa en el Sprint 6 (US-15)."
                sprint="Página de apoyo"
                icon="♿"
              />
            }
          />
          {/* Rutas anteriores, redirigidas a los nombres del glosario */}
          <Route path="/login" element={<Navigate to="/ingreso" replace />} />
          <Route path="/dashboard" element={<Navigate to="/panel" replace />} />
          <Route path="/salas" element={<Navigate to="/panel" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
