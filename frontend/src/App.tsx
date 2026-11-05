import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import NotFound from './pages/NotFound';

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
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-brand-600 focus:text-white focus:rounded focus:outline-none focus:ring-4 focus:ring-brand-500"
      >
        Saltar al contenido principal
      </a>

      {/* Encabezado accesible */}
      <header className="bg-brand-900 text-white border-b border-indigo-950 px-6 py-4 shadow-sm" role="banner">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl" aria-hidden="true">📖</span>
            <span className="text-xl font-bold tracking-tight">Salón de Estudio Virtual</span>
          </div>

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
                          ? 'bg-brand-600 text-white font-semibold'
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
        <div className="max-w-6xl mx-auto px-4">
          <p>© 2026-I Salón de Estudio Colaborativo — Proyecto Integrador I</p>
          <p className="mt-1 text-xs">Cumple con pautas de accesibilidad WCAG 2.2 Nivel AA</p>
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
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}