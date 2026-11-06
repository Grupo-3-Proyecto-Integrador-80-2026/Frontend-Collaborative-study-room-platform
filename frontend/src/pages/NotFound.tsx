import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center text-center px-4">
      <span className="text-6xl mb-3" role="img" aria-label="Lupa de búsqueda indicando no encontrado">
        🔍
      </span>
      <h1 className="text-3xl font-bold text-surface-text tracking-tight sm:text-4xl">
        404 - Página no encontrada
      </h1>
      <p className="mt-3 text-base text-surface-muted max-w-md">
        Lo sentimos, la ruta a la que intentas acceder no existe en la plataforma o fue trasladada.
      </p>
      <div className="mt-6">
        <Link
          to="/"
          className="inline-flex min-h-11 items-center px-5 rounded-lg bg-brand-600 text-white text-sm font-semibold shadow-sm hover:bg-brand-700 transition"
        >
          ← Volver al inicio
        </Link>
      </div>
    </div>
  );
}