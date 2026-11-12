import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, signInWithPopup, deleteUser } from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';
import { authApi, ApiError } from '../services/api';
import { useAuth } from '../context/AuthContext';

const AVATAR_PRESETS = [
  'https://api.dicebear.com/9.x/bottts/svg?seed=Felix',
  'https://api.dicebear.com/9.x/bottts/svg?seed=Aria',
  'https://api.dicebear.com/9.x/bottts/svg?seed=Luna',
  'https://api.dicebear.com/9.x/bottts/svg?seed=Milo',
  'https://api.dicebear.com/9.x/bottts/svg?seed=Leo',
];

// Validador de correo institucional: exige sintaxis válida y dominio .edu.co
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const isInstitutionalEmail = (email: string): boolean => {
  const lower = email.trim().toLowerCase();
  return EMAIL_PATTERN.test(lower) && lower.endsWith('.edu.co');
};

export default function Register() {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    password: '',
    avatarUrl: AVATAR_PRESETS[0],
  });

  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameNotice, setUsernameNotice] = useState<string | null>(null);

  const validateClient = () => {
    const errors: Record<string, string> = {};

    if (!formData.firstName.trim()) errors.firstName = 'Escribe tus nombres.';
    if (!formData.lastName.trim()) errors.lastName = 'Escribe tus apellidos.';

    if (!formData.username.trim()) {
      errors.username = 'Escribe un nombre de usuario.';
    } else if (!/^[A-Za-z0-9_]{3,20}$/.test(formData.username)) {
      errors.username = 'Usa entre 3 y 20 caracteres (solo letras, números y guion bajo).';
    }

    if (!formData.email.trim()) {
      errors.email = 'Escribe tu correo institucional.';
    } else if (!isInstitutionalEmail(formData.email)) {
      errors.email = 'Debes usar tu correo institucional (@correounivalle.edu.co o terminación .edu.co).';
    }

    if (!formData.password) {
      errors.password = 'Escribe una contraseña.';
    } else {
      if (formData.password.length < 8) errors.password = 'Tu contraseña debe tener al menos 8 caracteres.';
      else if (!/\p{L}/u.test(formData.password)) errors.password = 'Tu contraseña debe incluir al menos una letra.';
      else if (!/\d/.test(formData.password)) errors.password = 'Tu contraseña debe incluir al menos un número.';
    }

    return errors;
  };

  const handleBlurUsername = async () => {
    const u = formData.username.trim();
    if (u.length < 3) return;

    setCheckingUsername(true);
    setUsernameNotice(null);
    try {
      const res = await authApi.checkUsernameAvailability(u);
      if (!res.available) {
        setFieldErrors((prev) => ({ ...prev, username: 'Ese nombre de usuario ya está en uso. Prueba con otro.' }));
      } else {
        setFieldErrors((prev) => {
          const next = { ...prev };
          delete next.username;
          return next;
        });
        setUsernameNotice('✓ Nombre de usuario disponible.');
      }
    } catch {
      // Ignorar error de red puntual en validación previa
    } finally {
      setCheckingUsername(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    const errors = validateClient();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Registro en Backend (Crea cuenta en Auth + perfil en Firestore de forma atómica)
      await authApi.register({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        username: formData.username.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        avatarUrl: formData.avatarUrl,
      });

      // 2. Iniciar sesión automática con las credenciales
      await signInWithEmailAndPassword(auth, formData.email.trim(), formData.password);
      await refreshProfile();

      navigate('/panel');
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.errors && err.errors.length > 0) {
          const map: Record<string, string> = {};
          err.errors.forEach((item) => {
            map[item.field] = item.message;
          });
          setFieldErrors(map);
        }
        setGeneralError(err.message);
      } else {
        setGeneralError('Error al crear la cuenta. Intenta de nuevo.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
const handleGoogleSignup = async () => {
    setGeneralError(null);
    setIsSubmitting(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const email = (result.user.email || '').toLowerCase();

      if (!email.endsWith('.edu.co')) {
        await deleteUser(result.user);
        setGeneralError(
          `Acceso denegado: La cuenta (${email}) no es institucional. Solo se permiten correos terminados en .edu.co (ej. @correounivalle.edu.co).`
        );
        return;
      }

      await refreshProfile();
      navigate('/panel');
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === 'auth/popup-closed-by-user') {
        setGeneralError('Se cerró la ventana de autenticación con Google.');
      } else {
        setGeneralError('No fue posible conectar con Google o la cuenta fue rechazada.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-6 px-4">
      <div className="bg-surface-card p-6 sm:p-8 rounded-xl shadow-sm border border-surface-border">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-surface-text tracking-tight">Crear cuenta</h1>
          <p className="mt-1 text-sm text-surface-muted">
            Únete con tu correo institucional y colabora en salas de estudio.
          </p>
        </header>

        {generalError && (
          <div
            role="alert"
            className="mb-6 p-4 bg-red-50 border border-red-700 text-red-900 rounded-lg text-sm flex items-start gap-2"
          >
            <span aria-hidden="true" className="text-lg">⚠️</span>
            <span>{generalError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* Nombres y Apellidos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-semibold text-surface-text mb-1">
                Nombres <span className="text-red-700" aria-hidden="true">*</span>
              </label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                autoComplete="given-name"
                required
                aria-required="true"
                aria-invalid={!!fieldErrors.firstName}
                aria-describedby={fieldErrors.firstName ? 'firstName-error' : undefined}
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full min-h-11 px-3 py-2 rounded-lg border border-surface-control bg-surface-card text-surface-text focus-visible:outline-none focus-visible:ring-0"
              />
              {fieldErrors.firstName && (
                <p id="firstName-error" className="mt-1 text-xs text-red-700 font-medium" role="alert">
                  {fieldErrors.firstName}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="lastName" className="block text-sm font-semibold text-surface-text mb-1">
                Apellidos <span className="text-red-700" aria-hidden="true">*</span>
              </label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                autoComplete="family-name"
                required
                aria-required="true"
                aria-invalid={!!fieldErrors.lastName}
                aria-describedby={fieldErrors.lastName ? 'lastName-error' : undefined}
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full min-h-11 px-3 py-2 rounded-lg border border-surface-control bg-surface-card text-surface-text focus-visible:outline-none focus-visible:ring-0"
              />
              {fieldErrors.lastName && (
                <p id="lastName-error" className="mt-1 text-xs text-red-700 font-medium" role="alert">
                  {fieldErrors.lastName}
                </p>
              )}
            </div>
          </div>

          {/* Nombre de usuario */}
          <div>
            <label htmlFor="username" className="block text-sm font-semibold text-surface-text mb-1">
              Nombre de usuario <span className="text-red-700" aria-hidden="true">*</span>
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              aria-required="true"
              aria-invalid={!!fieldErrors.username}
              aria-describedby={
                fieldErrors.username
                  ? 'username-error'
                  : usernameNotice
                  ? 'username-notice'
                  : 'username-hint'
              }
              value={formData.username}
              onBlur={handleBlurUsername}
              onChange={(e) => {
                setUsernameNotice(null);
                setFormData({ ...formData, username: e.target.value.toLowerCase() });
              }}
              className="w-full min-h-11 px-3 py-2 rounded-lg border border-surface-control bg-surface-card text-surface-text focus-visible:outline-none focus-visible:ring-0"
            />
            <p id="username-hint" className="mt-1 text-xs text-surface-muted">
              De 3 a 20 caracteres: letras sin tilde, números y guion bajo.
            </p>
            {checkingUsername && (
              <p className="text-xs text-brand-600 mt-1">Comprobando disponibilidad...</p>
            )}
            {usernameNotice && !fieldErrors.username && (
              <p id="username-notice" className="mt-1 text-xs text-emerald-700 font-medium" role="status">
                {usernameNotice}
              </p>
            )}
            {fieldErrors.username && (
              <p id="username-error" className="mt-1 text-xs text-red-700 font-medium" role="alert">
                {fieldErrors.username}
              </p>
            )}
          </div>

          {/* Correo Institucional */}
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-surface-text mb-1">
              Correo institucional <span className="text-red-700" aria-hidden="true">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              aria-required="true"
              placeholder="nombre.apellido@correounivalle.edu.co"
              aria-invalid={!!fieldErrors.email}
              aria-describedby={fieldErrors.email ? 'email-error' : 'email-hint'}
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full min-h-11 px-3 py-2 rounded-lg border border-surface-control bg-surface-card text-surface-text focus-visible:outline-none focus-visible:ring-0"
            />
            <p id="email-hint" className="mt-1 text-xs text-surface-muted">
              Solo se permiten cuentas institucionales universitarias (@correounivalle.edu.co o .edu.co).
            </p>
            {fieldErrors.email && (
              <p id="email-error" className="mt-1 text-xs text-red-700 font-medium" role="alert">
                {fieldErrors.email}
              </p>
            )}
          </div>

          {/* Contraseña */}
          <div>
            <label htmlFor="password" aria-label="Contraseña" className="block text-sm font-semibold text-surface-text mb-1">
              Contraseña <span className="text-red-700" aria-hidden="true">*</span>
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                aria-required="true"
                aria-invalid={!!fieldErrors.password}
                aria-describedby={fieldErrors.password ? 'password-error' : 'password-hint'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full min-h-11 pl-3 pr-24 py-2 rounded-lg border border-surface-control bg-surface-card text-surface-text focus-visible:outline-none focus-visible:ring-0"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 min-h-9 px-2 text-xs font-semibold text-brand-600 hover:text-brand-700 rounded"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {showPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
            <p id="password-hint" className="mt-1 text-xs text-surface-muted">
              Mínimo 8 caracteres, al menos una letra y un número.
            </p>
            {fieldErrors.password && (
              <p id="password-error" className="mt-1 text-xs text-red-700 font-medium" role="alert">
                {fieldErrors.password}
              </p>
            )}
          </div>

          {/* Selector de Avatar Accesible */}
          <fieldset className="pt-2">
            <legend className="text-sm font-semibold text-surface-text mb-2">
              Elige tu avatar <span className="text-red-700" aria-hidden="true">*</span>
            </legend>
            <div className="flex flex-wrap gap-3 items-center">
              {AVATAR_PRESETS.map((url, index) => {
                const isSelected = formData.avatarUrl === url;
                return (
                  <label
                    key={url}
                    className={`cursor-pointer p-1 rounded-full border-2 transition ${
                      isSelected ? 'border-brand-600 ring-2 ring-brand-100' : 'border-transparent hover:border-surface-border'
                    }`}
                  >
                    <input
                      type="radio"
                      name="avatarUrl"
                      value={url}
                      checked={isSelected}
                      onChange={() => setFormData({ ...formData, avatarUrl: url })}
                      className="sr-only"
                    />
                    <img
                      src={url}
                      alt={`Opción de avatar ${index + 1}`}
                      className="w-12 h-12 rounded-full bg-brand-50"
                    />
                  </label>
                );
              })}
            </div>
          </fieldset>

          {/* Botón de Enviar */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full min-h-11 flex items-center justify-center px-4 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-semibold transition disabled:opacity-50"
            >
              {isSubmitting ? 'Creando cuenta...' : 'Crear mi cuenta'}
            </button>
          </div>
        </form>

        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-surface-border" />
          </div>
          <span className="relative bg-surface-card px-3 text-xs text-surface-muted uppercase font-semibold">
            O continúa con
          </span>
        </div>

        {/* Botón Google */}
        <button
          type="button"
          onClick={handleGoogleSignup}
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

        {/* Mensaje de advertencia institucional visible */}
        <p className="mt-2 text-xs text-center text-surface-muted bg-brand-50 border border-brand-100 p-2 rounded-lg">
          🔒 <strong>Nota:</strong> Solo se permite el acceso con cuentas terminadas en <strong>.edu.co</strong>. Las cuentas personales de Gmail serán rechazadas.
        </p>

        <p className="mt-6 text-center text-sm text-surface-muted">
          ¿Ya tienes una cuenta?{' '}
          <Link to="/ingreso" className="text-brand-600 font-semibold hover:underline">
            Inicia sesión aquí
          </Link>
        </p>
      </div>
    </div>
  );
}