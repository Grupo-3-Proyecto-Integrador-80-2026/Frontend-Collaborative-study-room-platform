import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  browserLocalPersistence,
  browserSessionPersistence,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { ArrowLeft, Lock, Mail } from 'lucide-react';
import { auth, googleProvider } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { clearFlashNotice, peekFlashNotice } from '../utils/flashNotice';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { TextField } from '../components/ui/TextField';
import { LogoMark } from '../components/ui/Logo';
import { PasswordToggle } from '../components/ui/PasswordToggle';
import { AuthDivider, GoogleButton } from '../components/ui/GoogleButton';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshProfile } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetState, setResetState] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');
  // Aviso que deja otra pantalla antes de cerrar la sesión (US-05: cuenta eliminada).
  const [notice, setNotice] = useState<string | null>(peekFlashNotice);

  useEffect(() => {
    clearFlashNotice();
  }, []);

  // Ruta a la que intentaba acceder el usuario antes de ser interceptado
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/panel';

  // «Recordar sesión»: la sesión dura entre visitas o solo mientras la pestaña esté abierta.
  const applyPersistence = async () => {
    try {
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
    } catch {
      // Si el navegador no permite elegir, Firebase conserva su comportamiento por defecto.
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setFieldErrors({});
    setResetState('idle');

    const errors: { email?: string; password?: string } = {};
    if (!email.trim()) errors.email = 'Escribe tu correo institucional.';
    if (!password) errors.password = 'Escribe tu contraseña.';
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    // US-03: solo se permite el acceso con cuentas institucionales (.edu.co).
    // Se rechaza el dominio antes de autenticar para no dejar una sesión fantasma.
    const emailLower = email.trim().toLowerCase();
    if (!emailLower.endsWith('.edu.co')) {
      setFieldErrors({
        email: 'Acceso denegado: usa tu correo institucional terminado en .edu.co (ej. @correounivalle.edu.co).',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await applyPersistence();
      await signInWithEmailAndPassword(auth, emailLower, password);
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
      await applyPersistence();
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

  // «¿Olvidaste tu contraseña?» envía el correo real de Firebase. El mensaje no revela
  // si la cuenta existe.
  const handlePasswordReset = async () => {
    setErrorMessage(null);
    const emailLower = email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(emailLower) || !emailLower.endsWith('.edu.co')) {
      setFieldErrors({ email: 'Escribe tu correo institucional para enviarte las instrucciones.' });
      return;
    }
    setFieldErrors({});
    setResetState('sending');
    try {
      await sendPasswordResetEmail(auth, emailLower);
      setResetState('sent');
    } catch (err) {
      // Sin protección contra enumeración, Firebase responde «user-not-found»: se muestra
      // el mismo mensaje neutro para no revelar qué correos tienen cuenta.
      setResetState((err as { code?: string })?.code === 'auth/user-not-found' ? 'sent' : 'failed');
    }
  };

  return (
    <div className="flex flex-col justify-center py-6 sm:py-10 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md mb-4 w-full">
        <Link to="/" className="min-h-11 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors">
          <ArrowLeft className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>Volver al inicio</span>
        </Link>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md w-full">
        <div className="text-center mb-6 flex flex-col items-center">
          <div className="mb-3">
            <LogoMark size="lg" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Iniciar sesión</h1>
          <p className="text-sm text-slate-600 mt-1">Accede a tus salas de estudio colaborativas</p>
        </div>

        <div className="bg-white py-6 sm:py-8 px-5 sm:px-10 shadow-sm border border-slate-200 rounded-2xl w-full">
          <div aria-live="polite" aria-atomic="true">
            {notice && (
              <Alert tone="success" onDismiss={() => setNotice(null)} dismissLabel="Cerrar aviso" className="mb-5">
                {notice}
              </Alert>
            )}
          </div>

          <GoogleButton onClick={handleGoogleLogin} disabled={isSubmitting} />
          <AuthDivider>o con tu correo</AuthDivider>

          {errorMessage && (
            <Alert tone="error" className="mb-4">
              {errorMessage}
            </Alert>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <TextField
              id="login-email"
              name="email"
              type="email"
              autoComplete="username"
              label="Correo institucional (.edu.co)"
              placeholder="estudiante@correounivalle.edu.co"
              leading={<Mail className="w-5 h-5" />}
              required
              aria-required="true"
              announceError
              value={email}
              error={fieldErrors.email}
              help="Solo se permiten correos terminados en .edu.co."
              onChange={(e) => setEmail(e.target.value)}
            />

            <TextField
              id="login-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              label="Contraseña"
              placeholder="••••••••"
              leading={<Lock className="w-5 h-5" />}
              required
              aria-required="true"
              announceError
              value={password}
              error={fieldErrors.password}
              onChange={(e) => setPassword(e.target.value)}
              trailing={<PasswordToggle visible={showPassword} onToggle={() => setShowPassword(!showPassword)} />}
            />

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 sm:gap-2.5 text-sm pt-1">
              <label className="min-h-11 flex items-center gap-2.5 cursor-pointer text-slate-600">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  disabled={isSubmitting}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-500 text-indigo-600"
                />
                <span>Recordar sesión</span>
              </label>
              <button
                type="button"
                onClick={handlePasswordReset}
                disabled={resetState === 'sending'}
                className="min-h-11 flex items-center font-medium text-indigo-600 hover:text-indigo-700 cursor-pointer disabled:opacity-60"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            <div aria-live="polite" aria-atomic="true">
              {resetState === 'sent' && (
                <Alert tone="info">Si existe una cuenta con ese correo, te enviamos las instrucciones para restablecer tu contraseña.</Alert>
              )}
              {resetState === 'failed' && <Alert tone="error">No pudimos enviar las instrucciones. Inténtalo de nuevo en unos minutos.</Alert>}
            </div>

            <Button type="submit" loading={isSubmitting} loadingText="Ingresando..." className="!w-full">
              Iniciar sesión
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600 flex flex-wrap items-center justify-center gap-1">
            <span>¿Aún no tienes cuenta?</span>
            <Link to="/registro" className="font-semibold text-indigo-600 hover:text-indigo-700 transition-colors p-1">
              Regístrate aquí
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
