import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { profile, logout } = useAuth();

  return (
    <section aria-labelledby="dashboard-title" className="space-y-6">
      {/* Banner de bienvenida con perfil */}
      <div className="bg-surface-card p-6 rounded-xl border border-surface-border shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {profile?.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={`Avatar de ${profile.firstName}`}
              className="w-16 h-16 rounded-full border border-surface-border bg-brand-50"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-brand-600 text-white font-bold text-2xl flex items-center justify-center">
              {profile?.firstName?.[0] || 'U'}
            </div>
          )}
          <div>
            <h1 id="dashboard-title" className="text-2xl font-bold text-surface-text">
              ¡Hola, {profile?.firstName} {profile?.lastName}!
            </h1>
            <p className="text-sm text-surface-muted">
              @{profile?.username} · <span className="font-mono text-xs">{profile?.email}</span>
            </p>
            <span className="inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded bg-brand-50 text-brand-700 border border-brand-100 uppercase">
              Rol: {profile?.role || 'student'}
            </span>
          </div>
        </div>

        <button
          onClick={logout}
          type="button"
          className="min-h-11 px-4 py-2 bg-surface-card hover:bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm font-semibold transition"
        >
          🚪 Cerrar sesión
        </button>
      </div>

      {/* Estado vacío de salas (Sprint 1 DoD) */}
      <div className="bg-surface-card p-8 rounded-xl border border-surface-border text-center space-y-4">
        <span className="text-5xl" aria-hidden="true">🛋️</span>
        <h2 className="text-xl font-bold text-surface-text">Aún no tienes salas de estudio</h2>
        <p className="text-surface-muted text-sm max-w-md mx-auto">
          En el próximo Sprint podrás crear tus propias salas privadas o unirte a sesiones de estudio con tus compañeros mediante un ID.
        </p>
        <div>
          <button
            type="button"
            disabled
            className="min-h-11 px-5 rounded-lg bg-surface-border text-surface-muted font-semibold text-sm cursor-not-allowed opacity-60"
            title="Se habilitará en el Sprint 2"
          >
            + Crear sala (Disponible en Sprint 2)
          </button>
        </div>
      </div>
    </section>
  );
}