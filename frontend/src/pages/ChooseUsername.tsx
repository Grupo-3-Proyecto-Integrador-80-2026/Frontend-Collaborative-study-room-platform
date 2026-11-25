import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { roomReturnPath } from '../utils/roomInvitation';
import { useAuth } from '../context/AuthContext';
import { authApi, ApiError } from '../services/api';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { TextField } from '../components/ui/TextField';
import { LogoMark } from '../components/ui/Logo';

export default function ChooseUsername() {
  const navigate = useNavigate();
  const destination = roomReturnPath(useLocation().state?.from?.pathname);
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
      navigate(destination, { replace: true });
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

  const handleExit = async (to: '/' | '/ingreso') => {
    try {
      await logout();
      navigate(to, { replace: true });
    } catch {
      setGeneralError('No pudimos cerrar la sesión. Intenta de nuevo.');
    }
  };

  return (
    <div className="flex flex-col justify-center py-6 sm:py-10 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg mb-4 w-full">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => void handleExit('/')}
          className="min-h-11 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer disabled:opacity-60"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>Cancelar y volver al inicio</span>
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-lg w-full">
        <div className="text-center mb-6 flex flex-col items-center">
          <div className="mb-3">
            <LogoMark size="lg" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Finalizar perfil con Google</h1>
          <p className="text-sm text-slate-600 mt-1">Solo falta elegir tu nombre de usuario único para entrar al salón</p>
        </div>

        <div className="bg-white py-6 sm:py-8 px-5 sm:px-8 shadow-sm border border-slate-200 rounded-2xl w-full">
          <div className="p-4 rounded-2xl border mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 border-slate-200">
            <div className="flex items-center gap-3.5 min-w-0">
              {firebaseUser?.photoURL ? (
                <img src={firebaseUser.photoURL} alt="" referrerPolicy="no-referrer" className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm shrink-0" />
              ) : (
                <span aria-hidden="true" className="w-12 h-12 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0">
                  {(firebaseUser?.displayName || 'E')[0]}
                </span>
              )}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <h2 className="text-base font-bold text-slate-900 leading-tight break-words">{firebaseUser?.displayName || 'Estudiante'}</h2>
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>Cuenta de Google</span>
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5 font-mono truncate" title={firebaseUser?.email ?? undefined}>{firebaseUser?.email}</p>
              </div>
            </div>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => void handleExit('/ingreso')}
              className="w-full sm:w-auto min-h-11 flex items-center justify-center text-sm font-semibold text-indigo-600 hover:text-indigo-700 bg-white hover:bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl transition-colors whitespace-nowrap cursor-pointer shrink-0 disabled:opacity-60"
            >
              Usar otra cuenta
            </button>
          </div>

          {generalError && (
            <Alert tone="error" className="mb-4">
              {generalError}
            </Alert>
          )}

          <p role="status" className="sr-only">{isSubmitting ? 'Guardando tu perfil...' : ''}</p>
          <form onSubmit={handleSubmit} noValidate aria-busy={isSubmitting} className="space-y-5">
            <TextField
              id="username"
              ref={usernameRef}
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
              value={username}
              error={fieldErrors.username}
              help="Con este usuario te identificarán en tus salas. De 3 a 20 caracteres: letras sin tilde, números y guion bajo (_)."
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
            />

            {!hasFirstName && (
              <TextField
                id="firstName"
                ref={firstNameRef}
                label="Tus nombres"
                autoComplete="given-name"
                required
                aria-required="true"
                announceError
                value={firstName}
                error={fieldErrors.firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            )}

            {/* Si Google no tiene apellidos registrados, se solicitan aquí */}
            {!hasLastName && (
              <TextField
                id="lastName"
                ref={lastNameRef}
                label="Tus apellidos"
                autoComplete="family-name"
                placeholder="Ingresa tus apellidos"
                required
                aria-required="true"
                announceError
                value={lastName}
                error={fieldErrors.lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            )}

            <div className="pt-2">
              <Button type="submit" loading={isSubmitting} loadingText="Guardando..." className="!w-full">
                {destination === '/panel' ? 'Completar y entrar al panel' : 'Completar y entrar a la sala'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
