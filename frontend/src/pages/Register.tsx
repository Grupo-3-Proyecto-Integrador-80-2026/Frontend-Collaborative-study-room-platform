import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, signInWithPopup, signOut } from 'firebase/auth';
import { ArrowLeft, Camera, Check, CheckCircle2, Lock, Mail, User } from 'lucide-react';
import { auth, googleProvider } from '../config/firebase';
import { authApi, ApiError } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { AVATAR_OPTIONS } from '../constants/avatars';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { TextField } from '../components/ui/TextField';
import { PasswordToggle } from '../components/ui/PasswordToggle';
import { AuthDivider, GoogleButton } from '../components/ui/GoogleButton';

// Validador de correo institucional: exige sintaxis válida y dominio .edu.co
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const isInstitutionalEmail = (email: string): boolean => {
  const lower = email.trim().toLowerCase();
  return EMAIL_PATTERN.test(lower) && lower.endsWith('.edu.co');
};

type Field = 'firstName' | 'lastName' | 'username' | 'email' | 'password' | 'terms';

export default function Register() {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    password: '',
    avatarUrl: AVATAR_OPTIONS[0].url,
  });
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<Field, string>>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(false);

  const update = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateClient = () => {
    const errors: Partial<Record<Field, string>> = {};

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
    } else if (formData.password.length < 8) errors.password = 'Tu contraseña debe tener al menos 8 caracteres.';
    else if (!/\p{L}/u.test(formData.password)) errors.password = 'Tu contraseña debe incluir al menos una letra.';
    else if (!/\d/.test(formData.password)) errors.password = 'Tu contraseña debe incluir al menos un número.';

    if (!agreeTerms) errors.terms = 'Acepta las normas de convivencia para crear tu cuenta.';

    return errors;
  };

  const handleBlurUsername = async () => {
    const u = formData.username.trim();
    if (u.length < 3) return;

    setCheckingUsername(true);
    setUsernameAvailable(false);
    try {
      const res = await authApi.checkUsernameAvailability(u);
      if (!res.available) {
        setFieldErrors((prev) => ({ ...prev, username: 'Ese nombre de usuario ya está en uso. Prueba con otro.' }));
      } else {
        setFieldErrors((prev) => ({ ...prev, username: undefined }));
        setUsernameAvailable(true);
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
          const map: Partial<Record<Field, string>> = {};
          err.errors.forEach((item) => {
            map[item.field as Field] = item.message;
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
        await signOut(auth);
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
    <div className="flex flex-col justify-center py-6 sm:py-10 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2.5 w-full">
        <Link to="/" className="min-h-11 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors">
          <ArrowLeft className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>Volver al inicio</span>
        </Link>
        <p className="min-h-11 flex items-center text-sm text-slate-600">
          <span>¿Ya tienes cuenta?</span>
          <Link to="/ingreso" className="font-semibold text-indigo-600 hover:text-indigo-700 ml-1 p-1">
            Iniciar sesión
          </Link>
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-lg w-full">
        <div className="bg-white py-6 sm:py-8 px-5 sm:px-8 shadow-sm border border-slate-200 rounded-3xl w-full">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 text-center mb-5">Crear cuenta</h1>

          <GoogleButton onClick={handleGoogleSignup} disabled={isSubmitting} />
          <AuthDivider>o regístrate con tus datos</AuthDivider>

          {generalError && (
            <Alert tone="error" className="mb-5">
              {generalError}
            </Alert>
          )}
          <p role="status" className="sr-only">
            {isSubmitting ? 'Creando tu cuenta y guardando tu perfil...' : ''}
          </p>

          <form onSubmit={handleSubmit} noValidate aria-busy={isSubmitting} className="space-y-4">
            <fieldset className="mb-2 p-4 sm:p-5 bg-slate-50/70 border border-slate-200 rounded-2xl" disabled={isSubmitting}>
              <legend className="sr-only">Elige tu avatar</legend>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-4" aria-hidden="true">
                <span className="flex items-center gap-2 text-sm font-bold text-slate-800">
                  <Camera className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>Elige tu avatar</span>
                </span>
                <span className="text-xs text-slate-600">Visible en tus salas</span>
              </div>
              <div className="flex flex-wrap items-center justify-center sm:justify-around gap-2 pb-1 pt-1 px-1">
                {AVATAR_OPTIONS.map((avatar) => {
                  const isSelected = formData.avatarUrl === avatar.url;
                  return (
                    <label
                      key={avatar.url}
                      className="flex flex-col items-center gap-1.5 group cursor-pointer shrink-0 rounded-xl p-1 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-indigo-600 has-[:focus-visible]:ring-offset-2"
                    >
                      <input
                        type="radio"
                        name="avatarUrl"
                        value={avatar.url}
                        checked={isSelected}
                        onChange={() => update('avatarUrl', avatar.url)}
                        className="sr-only"
                      />
                      <span className="relative">
                        <img
                          src={avatar.url}
                          alt=""
                          className={`w-12 h-12 rounded-full object-cover transition-all bg-white ${
                            isSelected ? 'ring-2 ring-indigo-600 ring-offset-2 scale-105 shadow-sm' : 'opacity-85 hover:opacity-100 border border-slate-200'
                          }`}
                        />
                        {isSelected && (
                          <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center text-white border-2 border-white shadow-sm" aria-hidden="true">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </span>
                        )}
                      </span>
                      <span className={`text-xs transition-colors ${isSelected ? 'font-bold text-indigo-700' : 'font-medium text-slate-600 group-hover:text-slate-900'}`}>
                        {avatar.name}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField
                id="firstName"
                name="firstName"
                label="Nombres"
                autoComplete="given-name"
                placeholder="Valentina"
                leading={<User className="w-4 h-4" />}
                required
                aria-required="true"
                announceError
                disabled={isSubmitting}
                value={formData.firstName}
                error={fieldErrors.firstName}
                onChange={(e) => update('firstName', e.target.value)}
              />
              <TextField
                id="lastName"
                name="lastName"
                label="Apellidos"
                autoComplete="family-name"
                placeholder="Ramos Morales"
                leading={<User className="w-4 h-4" />}
                required
                aria-required="true"
                announceError
                disabled={isSubmitting}
                value={formData.lastName}
                error={fieldErrors.lastName}
                onChange={(e) => update('lastName', e.target.value)}
              />
            </div>

            <TextField
              id="username"
              name="username"
              label="Nombre de usuario"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="valentinaramos"
              leading={<span className="font-mono text-sm">@</span>}
              className="[&_input]:font-mono"
              required
              aria-required="true"
              announceError
              disabled={isSubmitting}
              value={formData.username}
              error={fieldErrors.username}
              help={checkingUsername ? 'Comprobando disponibilidad...' : 'De 3 a 20 caracteres: letras sin tilde, números y guion bajo.'}
              labelAside={
                usernameAvailable && !fieldErrors.username ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>Disponible</span>
                  </span>
                ) : undefined
              }
              onBlur={handleBlurUsername}
              onChange={(e) => {
                setUsernameAvailable(false);
                update('username', e.target.value.toLowerCase());
              }}
            />
            <p role="status" className="sr-only">
              {usernameAvailable && !fieldErrors.username ? 'Nombre de usuario disponible.' : ''}
            </p>

            <TextField
              id="email"
              name="email"
              type="email"
              label="Correo institucional (.edu.co)"
              autoComplete="email"
              placeholder="valentina.estudio@correounivalle.edu.co"
              leading={<Mail className="w-4 h-4" />}
              required
              aria-required="true"
              announceError
              disabled={isSubmitting}
              value={formData.email}
              error={fieldErrors.email}
              help="Solo se permiten correos institucionales terminados en .edu.co."
              onChange={(e) => update('email', e.target.value)}
            />

            <TextField
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              label="Contraseña"
              autoComplete="new-password"
              placeholder="••••••••"
              leading={<Lock className="w-4 h-4" />}
              required
              aria-required="true"
              announceError
              disabled={isSubmitting}
              value={formData.password}
              error={fieldErrors.password}
              help="Mínimo 8 caracteres, con al menos una letra y un número."
              onChange={(e) => update('password', e.target.value)}
              trailing={<PasswordToggle visible={showPassword} onToggle={() => setShowPassword(!showPassword)} />}
            />

            <div>
              <label className="min-h-11 flex items-start gap-3 p-2 rounded-xl cursor-pointer text-sm mt-3 text-slate-700 select-none">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  disabled={isSubmitting}
                  aria-invalid={fieldErrors.terms ? true : undefined}
                  aria-describedby={fieldErrors.terms ? 'terms-error' : undefined}
                  onChange={(e) => {
                    setAgreeTerms(e.target.checked);
                    if (e.target.checked) setFieldErrors((prev) => ({ ...prev, terms: undefined }));
                  }}
                  className="w-4 h-4 rounded border-slate-400 text-indigo-600 mt-0.5 shrink-0 cursor-pointer"
                />
                <span className="[text-wrap:pretty] leading-snug">Acepto las normas de respeto y convivencia en las salas colaborativas.</span>
              </label>
              {fieldErrors.terms && (
                <p id="terms-error" role="alert" className="text-xs text-rose-700 font-medium pl-2">
                  {fieldErrors.terms}
                </p>
              )}
            </div>

            <Button type="submit" loading={isSubmitting} loadingText="Creando cuenta..." className="!w-full mt-4">
              Crear cuenta
            </Button>
          </form>

          <div className="mt-5 pt-4 border-t border-slate-200 text-center">
            <Link to="/" className="min-h-11 inline-flex items-center justify-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors">
              <ArrowLeft className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Cancelar y volver al inicio</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
