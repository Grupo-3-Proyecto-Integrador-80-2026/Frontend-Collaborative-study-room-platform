// frontend/src/pages/ChooseUsername.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi, ApiError } from '../services/api';

export default function ChooseUsername() {
  const navigate = useNavigate();
  const { firebaseUser, refreshProfile } = useAuth();

  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const clean = username.trim().toLowerCase();
    if (!/^[A-Za-z0-9_]{3,20}$/.test(clean)) {
      setError('Usa entre 3 y 20 caracteres (solo letras, números y guion bajo).');
      return;
    }

    setIsSubmitting(true);
    try {
      // US-02: Envía el POST /api/users/me con el token actual de Firebase
      await authApi.completeProfile({
        username: clean,
      });

      await refreshProfile();
      navigate('/panel', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'USERNAME_TAKEN') {
          setError('Ese nombre de usuario ya está en uso. Prueba con otro.');
        } else {
          setError(err.message);
        }
      } else {
        setError('Ocurrió un error al guardar tu nombre de usuario.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-10 px-4">
      <div className="bg-surface-card p-6 sm:p-8 rounded-xl shadow-sm border border-surface-border">
        <div className="text-center mb-6">
          <span className="text-4xl" aria-hidden="true">🪪</span>
          <h1 className="text-2xl font-bold text-surface-text mt-2">Elige tu nombre de usuario</h1>
          <p className="text-sm text-surface-muted mt-1">
            Hola, <strong>{firebaseUser?.displayName || 'Estudiante'}</strong>. Para completar tu cuenta en el salón de estudio, define cómo te identificarán tus compañeros.
          </p>
        </div>

        {error && (
          <div role="alert" className="mb-4 p-3 bg-red-50 border border-red-700 text-red-900 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-semibold text-surface-text mb-1">
              Nombre de usuario <span className="text-red-700" aria-hidden="true">*</span>
            </label>
            <input
              id="username"
              type="text"
              required
              aria-required="true"
              aria-invalid={!!error}
              placeholder="ejemplo_2026"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              className="w-full min-h-11 px-3 py-2 rounded-lg border border-surface-control bg-surface-card text-surface-text focus-visible:outline-none focus-visible:ring-0"
            />
            <p className="mt-1 text-xs text-surface-muted">
              De 3 a 20 caracteres: letras sin tilde, números y guiones bajos (_).
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !username.trim()}
            className="w-full min-h-11 flex items-center justify-center px-4 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-semibold transition disabled:opacity-50"
          >
            {isSubmitting ? 'Guardando...' : 'Completar y entrar al panel'}
          </button>
        </form>
      </div>
    </div>
  );
}