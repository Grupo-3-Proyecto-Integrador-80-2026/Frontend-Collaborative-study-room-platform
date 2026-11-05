import { useState, useEffect, useCallback } from 'react';

interface FirestoreHealthData {
  connected: boolean;
  message: string;
  documentsFound: number;
  timestamp?: string;
}

export default function Home() {
  const [data, setData] = useState<FirestoreHealthData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFirestoreCheck = useCallback(async () => {
    setLoading(true);
    setError(null);

    const apiUrl = import.meta.env.VITE_API_URL || 'https://tu-api.onrender.com';

    try {
      // Consumimos el endpoint del backend que realmente hace la consulta a Firestore
      const response = await fetch(`${apiUrl}/api/test/firebase`, {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Error en el servidor: Código de respuesta HTTP ${response.status}`);
      }

      const json = await response.json();
      
      // Agregamos marca de tiempo local de la consulta exitosa
      setData({
        ...json,
        timestamp: new Date().toLocaleTimeString('es-CO', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido al conectar con la API';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFirestoreCheck();
  }, [fetchFirestoreCheck]);

  return (
    <section aria-labelledby="home-title" className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
        <h1 id="home-title" className="text-2xl font-bold text-surface-text">
          Sprint 0: Base Técnica End-to-End
        </h1>
        <p className="mt-2 text-surface-muted">
          Esta vista verifica la conexión síncrona desacoplada de la plataforma: <br />
          <code className="text-xs bg-slate-100 px-2 py-1 rounded text-brand-700 font-mono inline-block mt-2">
            Frontend (Vercel) ➔ API (Render) ➔ Cloud Firestore (Colección users)
          </code>
        </p>
      </div>

      <div
        className="p-6 rounded-lg border bg-white shadow-sm"
        aria-live="polite"
        aria-atomic="true"
      >
        <h2 className="text-lg font-semibold text-slate-800 mb-4">
          Estado de la Conexión con Firestore
        </h2>

        {/* ESTADO 1: CARGANDO ⏳ */}
        {loading && (
          <div className="flex items-center gap-3 text-brand-700 py-6" role="status">
            <svg
              className="animate-spin h-6 w-6 text-brand-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
            </svg>
            <span className="font-medium text-base">⏳ Consultando el estado de la base de datos Firestore...</span>
          </div>
        )}

        {/* ESTADO 2: ERROR ❌ CON BOTÓN REINTENTAR */}
        {!loading && error && (
          <div className="p-5 bg-red-50 border border-red-200 rounded-md text-red-900 space-y-3" role="alert">
            <div className="flex items-center gap-2 font-semibold">
              <span aria-hidden="true" className="text-xl">❌</span>
              <span>No se pudo conectar con la API o con Firestore</span>
            </div>
            <p className="text-sm text-red-700">{error}</p>
            <div>
              <button
                onClick={fetchFirestoreCheck}
                type="button"
                className="px-4 py-2 bg-red-700 text-white rounded font-medium text-sm hover:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-700 transition"
              >
                🔄 Reintentar conexión
              </button>
            </div>
          </div>
        )}

        {/* ESTADO 3: ÉXITO ✅ */}
        {!loading && !error && data && (
          <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-md text-emerald-900 space-y-4">
            <div className="flex items-center gap-2">
              <span aria-hidden="true" className="text-2xl">✅</span>
              <span className="font-semibold text-emerald-800 text-base">
                Conexión exitosa y dato recuperado desde Firestore:
              </span>
            </div>

            <div className="bg-white p-4 rounded border border-emerald-200 font-mono text-sm text-slate-800 space-y-2">
              <p>
                <strong>Estado de conexión:</strong>{' '}
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800">
                  {data.connected ? 'CONECTADO' : 'DESCONECTADO'}
                </span>
              </p>
              <p>
                <strong>Respuesta de la BD:</strong> {data.message}
              </p>
              <p>
                <strong>Documentos encontrados en Firestore (users):</strong>{' '}
                <span className="font-bold text-brand-600">{data.documentsFound}</span>
              </p>
              {data.timestamp && (
                <p className="text-xs text-slate-500 pt-1 border-t border-slate-100">
                  <strong>Última consulta realizada:</strong> {data.timestamp}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={fetchFirestoreCheck}
                type="button"
                className="px-4 py-2 bg-brand-600 text-white rounded font-medium text-sm hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-600 transition"
              >
                🔄 Refrescar dato de Firestore
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}