import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import NotFound from './pages/NotFound';

// Componente plantilla accesible para las páginas del mapa del sitio planificadas
const MapSitePlaceholder: React.FC<{
  title: string;
  description: string;
  sprint: string;
  icon: string;
}> = ({ title, description, sprint, icon }) => (
  <section aria-labelledby="page-title" className="space-y-4">
    <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
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

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();

  const navLinks = [
    { name: 'Inicio', path: '/' },
    { name: 'Iniciar Sesión', path: '/login' },
    { name: 'Registro', path: '/registro' },
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Salas', path: '/salas' },
    { name: 'Mi Perfil', path: '/perfil' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-surface-bg text-surface-text">
      {/* Enlace de salto accesible WCAG 2.4.1 */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-brand-600 focus:text-white focus:rounded focus:outline-none focus:ring-4 focus:ring-brand-500 font-medium"
      >
        Saltar al contenido principal
      </a>

      {/* Encabezado accesible WCAG */}
      <header className="bg-brand-900 text-white border-b border-indigo-950 px-6 py-4 shadow-sm" role="banner">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <Link to="/" className="flex items-center gap-3 text-white hover:text-indigo-200 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded">
            <span className="text-2xl" aria-hidden="true">📖</span>
            <span className="text-xl font-bold tracking-tight">Salón de Estudio Virtual</span>
          </Link>

          <nav aria-label="Navegación principal">
            <ul className="flex flex-wrap gap-2 text-sm font-medium">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.path;
                return (
                  <li key={link.path}>
                    <Link
                      to={link.path}
                      aria-current={isActive ? 'page' : undefined}
                      className={`px-3 py-1.5 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                        isActive
                          ? 'bg-brand-600 text-white font-semibold shadow-sm'
                          : 'text-indigo-200 hover:text-white hover:bg-brand-700'
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
      <footer className="bg-white border-t border-slate-200 text-surface-muted text-center py-6 text-sm" role="contentinfo">
        <div className="max-w-6xl mx-auto px-4 space-y-1">
          <p>© 2026-I Salón de Estudio Colaborativo — Proyecto Integrador I (Grupo 3)</p>
          <p className="text-xs text-slate-500">
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
            path="/login"
            element={
              <MapSitePlaceholder
                title="Iniciar Sesión"
                description="Pantalla de autenticación mediante correo/contraseña y Google Sign-In. Habilitada en Sprint 1 (US-03)."
                sprint="Sprint 1: Identidad y Autenticación"
                icon="🔐"
              />
            }
          />
          <Route
            path="/registro"
            element={
              <MapSitePlaceholder
                title="Registro de Usuario"
                description="Formulario para la creación de cuenta con validación de username único y persistencia en Firestore. Habilitado en Sprint 1 (US-01 / US-02)."
                sprint="Sprint 1: Identidad y Autenticación"
                icon="📝"
              />
            }
          />
          <Route
            path="/dashboard"
            element={
              <MapSitePlaceholder
                title="Panel Principal (Dashboard)"
                description="Vista protegida con el listado de salas activas y accesos rápidos de estudio. Habilitado en Sprint 1 y 2 (US-06)."
                sprint="Sprint 2: Gestión Base de Salas"
                icon="📊"
              />
            }
          />
          <Route
            path="/salas"
            element={
              <MapSitePlaceholder
                title="Salas de Estudio"
                description="Módulo para crear, unirse por código de invitación y gestionar salas colaborativas. Habilitado en Sprint 2 y 3 (US-06 / US-08)."
                sprint="Sprint 2 y 3: Salas y Tiempo Real"
                icon="🚪"
              />
            }
          />
          <Route
            path="/perfil"
            element={
              <MapSitePlaceholder
                title="Mi Perfil"
                description="Gestión completa de datos de usuario, actualización de avatar y opción de eliminación de cuenta. Habilitado en Sprint 2 (US-04 / US-05)."
                sprint="Sprint 2: Perfil Avanzado"
                icon="👤"
              />
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}