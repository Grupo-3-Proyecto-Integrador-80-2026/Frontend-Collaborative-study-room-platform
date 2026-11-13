import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { signInWithEmailAndPassword, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshProfile } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Ruta a la que intentaba acceder el usuario antes de ser interceptado
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/panel';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setFieldErrors({});

    const errors: { email?: string; password?: string } = {};
    if (!email.trim()) errors.email = 'Escribe tu correo institucional.';
    if (!password) errors.password = 'Escribe tu contraseña.';
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      await refreshProfile();
      navigate(from, { replace: true });
    } catch {
      // US-03 DoD: Mensaje genérico sin revelar si falló el correo o la clave
      setErrorMessage('Correo o contraseña incorrectos');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const userEmail = (result.user.email || '').toLowerCase();

      // Validación estricta de correo institucional
      if (!userEmail.endsWith('.edu.co')) {
        await signOut(auth);
        setErrorMessage(
          `Acceso denegado: La cuenta (${userEmail}) no es institucional. Solo se permiten correos terminados en .edu.co (ej. @correounivalle.edu.co).`
        );
        return;
      }

      await refreshProfile();
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === 'auth/popup-closed-by-user') {
        setErrorMessage('Se canceló el ingreso con Google.');
      } else {
        setErrorMessage('No fue posible iniciar sesión con Google.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-10 px-4">
      <div className="bg-surface-card p-6 sm:p-8 rounded-xl shadow-sm border border-surface-border">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-surface-text">Iniciar sesión</h1>
          <p className="mt-1 text-sm text-surface-muted">
            Ingresa para acceder a tus salas de estudio colaborativo.
          </p>
        </header>

        {errorMessage && (
          <div
            role="alert"
            className="mb-4 p-3 bg-red-50 border border-red-700 text-red-900 rounded-lg text-sm flex items-start gap-2"
          >
            <span aria-hidden="true" className="text-lg">⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label htmlFor="login-email" className="block text-sm font-semibold text-surface-text mb-1">
              Correo institucional <span className="text-red-700" aria-hidden="true">*</span>
            </label>
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="username"
              required
              aria-required="true"
              aria-invalid={!!fieldErrors.email}
              aria-describedby={fieldErrors.email ? 'login-email-error' : undefined}
              placeholder="nombre.apellido@correounivalle.edu.co"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full min-h-11 px-3 py-2 rounded-lg border border-surface-control bg-surface-card text-surface-text focus-visible:outline-none focus-visible:ring-0"
            />
            {fieldErrors.email && (
              <p id="login-email-error" role="alert" className="mt-1 text-xs text-red-700 font-medium">
                {fieldErrors.email}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="login-password" className="block text-sm font-semibold text-surface-text mb-1">
              Contraseña <span className="text-red-700" aria-hidden="true">*</span>
            </label>
            <div className="relative">
              <input
                id="login-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                aria-required="true"
                aria-invalid={!!fieldErrors.password}
                aria-describedby={fieldErrors.password ? 'login-password-error' : undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full min-h-11 pl-3 pr-24 py-2 rounded-lg border border-surface-control bg-surface-card text-surface-text focus-visible:outline-none focus-visible:ring-0"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 min-h-9 px-2 text-xs font-semibold text-brand-600 hover:text-brand-700 rounded"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                aria-pressed={showPassword}
              >
                {showPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
            {fieldErrors.password && (
              <p id="login-password-error" role="alert" className="mt-1 text-xs text-red-700 font-medium">
                {fieldErrors.password}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full min-h-11 flex items-center justify-center px-4 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-semibold transition disabled:opacity-50"
          >
            {isSubmitting ? 'Ingresando...' : 'Iniciar sesión'}
          </button>
        </form>

        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-surface-border" />
          </div>
          <span className="relative bg-surface-card px-3 text-xs text-surface-muted uppercase font-semibold">
            O
          </span>
        </div>

        {/* Botón Google */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isSubmitting}
          className="w-full min-h-11 flex items-center justify-center gap-3 px-4 rounded-lg border border-surface-control hover:bg-brand-50 transition font-medium text-surface-text"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.99 0 12s.45 3.83 1.25 5.42l4.03-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </svg>
          <span>Continuar con Google</span>
        </button>

        {/* Mensaje de advertencia institucional */}
        <p className="mt-2 text-xs text-center text-surface-muted bg-brand-50 border border-brand-100 p-2 rounded-lg">
          🔒 <strong>Nota:</strong> Solo se permite el acceso con cuentas terminadas en <strong>.edu.co</strong>. Las cuentas personales de Gmail serán rechazadas.
        </p>

        <p className="mt-6 text-center text-sm text-surface-muted">
          ¿No tienes una cuenta aún?{' '}
          <Link to="/registro" className="text-brand-600 font-semibold hover:underline">
            Regístrate aquí
          </Link>
        </p>
      </div>
    </div>
  );
}
