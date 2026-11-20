import { Link } from 'react-router-dom';
import { ArrowLeft, Compass } from 'lucide-react';

export default function NotFound() {
  return (
    <section aria-labelledby="not-found-title" className="max-w-xl mx-auto px-4 py-12 sm:py-16">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-10 text-center shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4" aria-hidden="true">
          <Compass className="w-7 h-7" />
        </div>
        <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wider mb-1">Error 404</p>
        <h1 id="not-found-title" className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mb-2">
          Página no encontrada
        </h1>
        <p className="text-sm text-slate-600 max-w-md mx-auto mb-6 [text-wrap:pretty]">
          La dirección que abriste no existe en el Salón de Estudio Colaborativo o fue trasladada.
        </p>
        <Link
          to="/"
          className="min-h-12 inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>Volver al inicio</span>
        </Link>
      </div>
    </section>
  );
}
