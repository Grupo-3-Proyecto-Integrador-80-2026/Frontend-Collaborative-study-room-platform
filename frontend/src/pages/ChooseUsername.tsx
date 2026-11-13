import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi, ApiError } from '../services/api';

export default function ChooseUsername() {
  const navigate = useNavigate();
  const { firebaseUser, refreshProfile, logout } = useAuth();

  // Si Google solo entregó un nombre, preparamos el campo de apellidos
  const nameParts = (firebaseUser?.displayName || '').trim().split(/\s+/).filter(Boolean);
  const hasLastName = nameParts.length >= 2;
  const hasFirstName = nameParts.length > 0;

  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const usernameRef = React.useRef<HTMLInputElement>(null);
  const firstNameRef = React.useRef<HTMLInputElement>(null);
  const lastNameRef = React.useRef<HTMLInputElement>(null);

  const showFieldErrors = (errors: Record<string, string>) => {
    setFieldErrors(errors);
    if (errors.username) usernameRef.current?.focus();
    else if (errors.firstName) firstNameRef.current?.focus();
    else if (errors.lastName) lastNameRef.current?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setGeneralError(null);
    setFieldErrors({});

    const cleanUser = username.trim().toLowerCase();
    const errors: Record<string, string> = {};

    if (!cleanUser) {
      errors.username = 'Escribe un nombre de usuario.';
    } else if (!/^[A-Za-z0-9_]{3,20}$/.test(cleanUser)) {
      errors.username = 'Usa entre 3 y 20 caracteres (solo letras sin tilde, números y _).';
    }

    if (!hasLastName && !lastName.trim()) {
      errors.lastName = 'Escribe tus apellidos.';
    }
    if (!hasFirstName && !firstName.trim()) {
      errors.firstName = 'Escribe tus nombres.';
    }

    if (Object.keys(errors).length > 0) {
      showFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      await authApi.completeProfile({
        username: cleanUser,
        ...(firstName.trim() ? { firstName: firstName.trim() } : {}),
        ...(lastName.trim() ? { lastName: lastName.trim() } : {}),
      });

      await refreshProfile();
      navigate('/panel', { replace: true });
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.errors && err.errors.length > 0) {
          const map: Record<string, string> = {};
          err.errors.forEach((item) => {
            map[item.field] = item.message;
          });
          showFieldErrors(map);
        }
        setGeneralError(err.message);
      } else {
        setGeneralError('Ocurrió un error al completar tu perfil.');
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
          <h1 className="text-2xl font-bold text-surface-text mt-2">Completa tu perfil</h1>
          <p className="text-sm text-surface-muted mt-1 break-words">
            Hola, <strong>{firebaseUser?.displayName || 'Estudiante'}</strong> ({firebaseUser?.email}). Elige tu nombre de usuario para terminar de configurar tu cuenta.
          </p>
        </div>

        {generalError && (
          <div role="alert" className="mb-4 p-3 bg-red-50 border border-red-700 text-red-900 rounded-lg text-sm flex items-center gap-2">
            <span aria-hidden="true">⚠️</span>
            <span>{generalError}</span>
          </div>
        )}

        <p role="status" className="sr-only">{isSubmitting ? 'Guardando tu perfil...' : ''}</p>
        <form onSubmit={handleSubmit} noValidate aria-busy={isSubmitting} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-semibold text-surface-text mb-1">
              Nombre de usuario <span className="text-red-700" aria-hidden="true">*</span>
            </label>
            <input
              id="username"
              ref={usernameRef}
              type="text"
              autoComplete="username"
              required
              aria-required="true"
              aria-invalid={!!fieldErrors.username}
              aria-describedby={`username-help${fieldErrors.username ? ' username-error' : ''}`}
              placeholder="ejemplo_2026"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              className="w-full min-h-11 px-3 py-2 rounded-lg border border-surface-control bg-surface-card text-surface-text"
            />
            {fieldErrors.username && (
              <p id="username-error" className="mt-1 text-xs text-red-700 font-medium" role="alert">
                {fieldErrors.username}
              </p>
            )}
            <p id="username-help" className="mt-1 text-xs text-surface-muted">
              De 3 a 20 caracteres: letras sin tilde, números y guiones bajos (_).
            </p>
          </div>

          {!hasFirstName && (
            <div>
              <label htmlFor="firstName" className="block text-sm font-semibold text-surface-text mb-1">
                Tus nombres <span className="text-red-700" aria-hidden="true">*</span>
              </label>
              <input
                id="firstName"
                ref={firstNameRef}
                type="text"
                autoComplete="given-name"
                required
                aria-invalid={!!fieldErrors.firstName}
                aria-describedby={fieldErrors.firstName ? 'firstName-error' : undefined}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full min-h-11 px-3 py-2 rounded-lg border border-surface-control bg-surface-card text-surface-text"
              />
              {fieldErrors.firstName && <p id="firstName-error" role="alert" className="mt-1 text-xs text-red-700 font-medium">{fieldErrors.firstName}</p>}
            </div>
          )}

          {/* Si Google no tiene apellidos registrados, se solicita aquí */}
          {!hasLastName && (
            <div>
              <label htmlFor="lastName" className="block text-sm font-semibold text-surface-text mb-1">
                Tus apellidos <span className="text-red-700" aria-hidden="true">*</span>
              </label>
              <input
                id="lastName"
                ref={lastNameRef}
                type="text"
                autoComplete="family-name"
                required
                aria-required="true"
                aria-invalid={!!fieldErrors.lastName}
                aria-describedby={fieldErrors.lastName ? 'lastName-error' : undefined}
                placeholder="Ingresa tus apellidos"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full min-h-11 px-3 py-2 rounded-lg border border-surface-control bg-surface-card text-surface-text"
              />
              {fieldErrors.lastName && (
                <p id="lastName-error" className="mt-1 text-xs text-red-700 font-medium" role="alert">
                  {fieldErrors.lastName}
                </p>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full min-h-11 flex items-center justify-center px-4 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-semibold transition disabled:opacity-50"
          >
            {isSubmitting ? 'Guardando...' : 'Completar y entrar al panel'}
          </button>

          <div className="pt-2 text-center">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => void logout().catch(() => setGeneralError('No pudimos cerrar la sesión. Intenta de nuevo.'))}
              className="min-h-11 px-2 rounded text-xs text-red-700 hover:underline"
            >
              Cancelar y salir de esta cuenta
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
