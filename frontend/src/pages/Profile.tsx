import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Camera, Check, Edit3, LogOut, Mail, User } from 'lucide-react';
import { auth } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { ApiError, authApi, profileApi, type ProfileUpdate, type UserProfile } from '../services/api';
import { AVATAR_OPTIONS, avatarName } from '../constants/avatars';
import { validateProfile, type ProfileErrors, type ProfileForm } from '../utils/profileValidation';
import { setFlashNotice } from '../utils/flashNotice';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';
import { TextField } from '../components/ui/TextField';
import { ErrorBanner, LoadingBanner } from '../components/ui/StatusBanner';

type LoadState = 'loading' | 'ready' | 'error';
const FIELD_ORDER: Array<keyof ProfileForm> = ['firstName', 'lastName', 'username', 'email'];

const toForm = (p: UserProfile): ProfileForm => ({
  firstName: p.firstName ?? '',
  lastName: p.lastName ?? '',
  username: p.username ?? '',
  email: p.email ?? '',
});

export default function Profile() {
  const { profile: cachedProfile, replaceProfile, logout } = useAuth();

  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [profile, setProfile] = useState<UserProfile | null>(cachedProfile);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<ProfileForm>(() => (cachedProfile ? toForm(cachedProfile) : toForm({} as UserProfile)));
  const [avatarUrl, setAvatarUrl] = useState<string | null>(cachedProfile?.avatarUrl ?? null);
  const [fieldErrors, setFieldErrors] = useState<ProfileErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState(false);

  const editButtonRef = useRef<HTMLButtonElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const lastNameRef = useRef<HTMLInputElement>(null);
  const usernameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const restoreFocusToEdit = useRef(false);

  const isGoogleAccount = profile?.provider === 'google.com';

  // Se piden datos frescos al entrar y con cada «Reintentar» (reloadKey).
  const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => {
    let active = true;
    authApi
      .getMyProfile()
      .then((res) => {
        if (!active) return;
        setProfile(res.user);
        replaceProfile(res.user);
        setLoadState('ready');
      })
      .catch(() => {
        if (active) setLoadState('error');
      });
    return () => {
      active = false;
    };
  }, [reloadKey, replaceProfile]);

  const retryLoad = () => {
    setLoadState('loading');
    setReloadKey((key) => key + 1);
  };

  // Al salir del modo edición, el foco vuelve a «Editar perfil» (no se pierde en el documento).
  useEffect(() => {
    if (!isEditing && restoreFocusToEdit.current) {
      restoreFocusToEdit.current = false;
      editButtonRef.current?.focus();
    }
    if (isEditing) firstFieldRef.current?.focus();
  }, [isEditing]);

  const resetForm = (source: UserProfile) => {
    setForm(toForm(source));
    setAvatarUrl(source.avatarUrl ?? null);
    setFieldErrors({});
    setSaveError(null);
  };

  const startEdit = () => {
    if (!profile) return;
    resetForm(profile);
    setSuccessMsg(null);
    setIsEditing(true);
  };

  // US-04 E4: Cancelar descarta los cambios y vuelve a mostrar los datos guardados.
  const cancelEdit = () => {
    if (profile) resetForm(profile);
    restoreFocusToEdit.current = true;
    setIsEditing(false);
  };

  const updateField = (field: keyof ProfileForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  // El foco se mueve al primer campo con error cuando el formulario vuelve a estar
  // habilitado (durante el guardado los campos están deshabilitados).
  const pendingFocus = useRef<keyof ProfileForm | null>(null);
  const focusFirstError = (errors: ProfileErrors) => {
    pendingFocus.current = FIELD_ORDER.find((field) => errors[field]) ?? null;
  };
  useEffect(() => {
    if (isSaving || !pendingFocus.current) return;
    const refs = { firstName: firstFieldRef, lastName: lastNameRef, username: usernameRef, email: emailRef };
    refs[pendingFocus.current].current?.focus();
    pendingFocus.current = null;
  }, [isSaving, fieldErrors]);

  const buildChanges = (): ProfileUpdate => {
    if (!profile) return {};
    const changes: ProfileUpdate = {};
    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();
    const username = form.username.trim();
    const email = form.email.trim().toLowerCase();
    if (firstName !== profile.firstName) changes.firstName = firstName;
    if (lastName !== profile.lastName) changes.lastName = lastName;
    if (username !== profile.username) changes.username = username;
    if (!isGoogleAccount && email !== profile.email.toLowerCase()) changes.email = email;
    if (avatarUrl !== profile.avatarUrl) changes.avatarUrl = avatarUrl;
    return changes;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving || !profile) return;
    setSaveError(null);

    const errors = validateProfile(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setSaveError('Revisa los campos marcados para poder guardar.');
      focusFirstError(errors);
      return;
    }

    const changes = buildChanges();
    if (Object.keys(changes).length === 0) {
      restoreFocusToEdit.current = true;
      setIsEditing(false);
      setSuccessMsg('No había cambios para guardar.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await profileApi.update(changes);
      setProfile(res.user);
      replaceProfile(res.user);

      if (changes.email) {
        // La API cambió el correo en Firebase Authentication: se renueva el token
        // para que la sesión lleve el correo nuevo.
        try {
          await auth.currentUser?.reload();
          await auth.currentUser?.getIdToken(true);
        } catch {
          setFlashNotice('Actualizamos tu correo. Inicia sesión de nuevo con tu correo nuevo.');
          await logout().catch(() => undefined);
          return;
        }
      }

      restoreFocusToEdit.current = true;
      setIsEditing(false);
      setSuccessMsg('Perfil actualizado');
    } catch (err) {
      if (err instanceof ApiError) {
        const mapped: ProfileErrors = {};
        if (err.code === 'USERNAME_TAKEN') {
          mapped.username = `El nombre de usuario «@${form.username.trim()}» ya está en uso. Elige otro para poder guardar.`;
        } else if (err.code === 'EMAIL_TAKEN') {
          mapped.email = `El correo «${form.email.trim()}» ya pertenece a otra cuenta. Usa otro correo para guardar.`;
        } else {
          err.errors?.forEach(({ field, message }) => {
            if (FIELD_ORDER.includes(field as keyof ProfileForm)) mapped[field as keyof ProfileForm] = message;
          });
        }
        setFieldErrors(mapped);
        if (Object.keys(mapped).length > 0) {
          setSaveError(
            err.statusCode === 409
              ? 'No pudimos guardar los cambios porque ese dato ya está en uso. Revisa el campo marcado sin perder lo que escribiste.'
              : 'Revisa los campos marcados para poder guardar.'
          );
          focusFirstError(mapped);
        } else if (err.statusCode >= 500 || err.code === 'ERROR_DESCONOCIDO') {
          setSaveError('No pudimos guardar tus cambios por un problema de conexión. Inténtalo de nuevo; conservamos lo que escribiste.');
        } else {
          setSaveError(err.message);
        }
      } else {
        setSaveError('No pudimos guardar tus cambios por un problema de conexión. Inténtalo de nuevo; conservamos lo que escribiste.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    setLogoutError(false);
    setIsLoggingOut(true);
    try {
      await logout();
    } catch {
      setLogoutError(true);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const fullName = profile ? `${profile.firstName} ${profile.lastName}`.trim() : '';
  const currentAvatarName = avatarName(profile?.avatarUrl);
  const avatarChoices =
    profile?.avatarUrl && !avatarName(profile.avatarUrl)
      ? [{ name: 'Foto actual', url: profile.avatarUrl }, ...AVATAR_OPTIONS]
      : AVATAR_OPTIONS;

  return (
    <div className="max-w-4xl mx-auto w-full">
      <div className="mb-5">
        <Link
          to="/panel"
          className="min-h-11 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-indigo-700 transition-colors rounded-lg px-1"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>Volver al Panel de Salas</span>
        </Link>
      </div>

      {loadState === 'loading' && <LoadingBanner>Cargando la información de tu perfil...</LoadingBanner>}
      {loadState === 'error' && (
        <ErrorBanner title="No pudimos cargar la información de tu perfil." onRetry={retryLoad}>
          Revisa tu conexión e inténtalo de nuevo.
        </ErrorBanner>
      )}

      {/* Región viva siempre montada: anuncia «Perfil actualizado» al lector de pantalla. */}
      <div aria-live="polite" aria-atomic="true">
        {successMsg && (
          <Alert tone="success" onDismiss={() => setSuccessMsg(null)} dismissLabel="Cerrar confirmación" className="mb-6">
            {successMsg}
          </Alert>
        )}
      </div>

      {loadState === 'loading' || !profile ? (
        loadState === 'loading' ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 animate-pulse space-y-6" aria-hidden="true">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl bg-slate-200 shrink-0" />
              <div className="space-y-2.5 flex-1">
                <div className="h-5 bg-slate-200 rounded w-1/3" />
                <div className="h-4 bg-slate-100 rounded w-1/4" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="h-3 bg-slate-100 rounded w-24" />
                  <div className="h-10 bg-slate-200 rounded-xl w-full" />
                </div>
              ))}
            </div>
          </div>
        ) : null
      ) : (
        <div className="space-y-6">
          <section aria-labelledby="profile-heading" className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-8 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
              <div className="flex items-center gap-4 min-w-0">
                {(isEditing ? avatarUrl : profile.avatarUrl) ? (
                  <img
                    src={(isEditing ? avatarUrl : profile.avatarUrl) ?? undefined}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-indigo-100 bg-indigo-50 shadow-sm shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-indigo-600 text-white text-2xl font-bold flex items-center justify-center shrink-0" aria-hidden="true">
                    {profile.firstName?.[0] ?? 'E'}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wider mb-0.5">Mi Perfil</p>
                  <h1 id="profile-heading" className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight [text-wrap:pretty] break-words">
                    {fullName}
                  </h1>
                  <p className="text-sm text-slate-600 font-mono mt-0.5 break-all">
                    @{profile.username}
                    {currentAvatarName ? ` · ${currentAvatarName}` : ''}
                  </p>
                </div>
              </div>

              {!isEditing && (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
                  <Button ref={editButtonRef} onClick={startEdit} disabled={loadState !== 'ready'} icon={<Edit3 className="w-4 h-4" aria-hidden="true" />}>
                    Editar perfil
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleLogout}
                    loading={isLoggingOut}
                    loadingText="Cerrando..."
                    icon={<LogOut className="w-4 h-4" aria-hidden="true" />}
                    className="hover:!text-rose-700 hover:!bg-rose-50 hover:border-rose-200"
                  >
                    Cerrar sesión
                  </Button>
                </div>
              )}
            </div>
            {logoutError && (
              <p role="alert" className="mt-3 text-sm text-rose-700 font-medium">
                No pudimos cerrar la sesión. Intenta de nuevo.
              </p>
            )}

            {!isEditing ? (
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-6">
                <div>
                  <dt className="text-xs font-semibold text-slate-600 mb-1">Nombres</dt>
                  <dd className="text-base font-semibold text-slate-900 break-words">{profile.firstName}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-slate-600 mb-1">Apellidos</dt>
                  <dd className="text-base font-semibold text-slate-900 break-words">{profile.lastName || '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-slate-600 mb-1">Nombre de usuario</dt>
                  <dd className="text-base font-mono font-semibold text-indigo-700 break-all">@{profile.username}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-slate-600 mb-1">Correo electrónico</dt>
                  <dd className="text-base font-medium text-slate-900 break-all">{profile.email}</dd>
                </div>
              </dl>
            ) : (
              <form onSubmit={handleSave} noValidate aria-busy={isSaving} className="pt-6 space-y-5">
                {saveError && <Alert tone="error">{saveError}</Alert>}
                <p role="status" className="sr-only">
                  {isSaving ? 'Guardando cambios...' : ''}
                </p>

                <fieldset className="p-4 bg-slate-50/80 border border-slate-200 rounded-2xl" disabled={isSaving}>
                  <legend className="sr-only">Elige tu avatar</legend>
                  <div className="flex items-center justify-between gap-2 mb-3" aria-hidden="true">
                    <span className="flex items-center gap-2 text-sm font-bold text-slate-800">
                      <Camera className="w-4 h-4 text-indigo-600" />
                      <span>Elige tu avatar</span>
                    </span>
                    <span className="text-xs text-slate-600">{avatarChoices.find((o) => o.url === avatarUrl)?.name ?? ''}</span>
                  </div>
                  <div className="flex flex-wrap items-center justify-center sm:justify-around gap-3 py-1 px-1">
                    {avatarChoices.map((option) => {
                      const isSelected = avatarUrl === option.url;
                      return (
                        <label key={option.url} className="flex flex-col items-center gap-1.5 cursor-pointer shrink-0 rounded-xl p-1 has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-indigo-700">
                          <input
                            type="radio"
                            name="avatar"
                            value={option.url}
                            checked={isSelected}
                            onChange={() => setAvatarUrl(option.url)}
                            className="sr-only"
                          />
                          <span className="relative">
                            <img
                              src={option.url}
                              alt=""
                              className={`w-12 h-12 rounded-full object-cover bg-white transition-all ${
                                isSelected ? 'ring-2 ring-indigo-600 ring-offset-2' : 'opacity-80 hover:opacity-100 border border-slate-200'
                              }`}
                            />
                            {isSelected && (
                              <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center text-white border-2 border-white" aria-hidden="true">
                                <Check className="w-3 h-3" />
                              </span>
                            )}
                          </span>
                          <span className={`text-xs ${isSelected ? 'font-bold text-indigo-700' : 'text-slate-600'}`}>{option.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <TextField
                    id="profile-first-name"
                    ref={firstFieldRef}
                    label="Nombres"
                    autoComplete="given-name"
                    leading={<User className="w-4 h-4" />}
                    value={form.firstName}
                    disabled={isSaving}
                    error={fieldErrors.firstName}
                    onChange={(e) => updateField('firstName', e.target.value)}
                  />
                  <TextField
                    id="profile-last-name"
                    ref={lastNameRef}
                    label="Apellidos"
                    autoComplete="family-name"
                    leading={<User className="w-4 h-4" />}
                    value={form.lastName}
                    disabled={isSaving}
                    error={fieldErrors.lastName}
                    onChange={(e) => updateField('lastName', e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <TextField
                    id="profile-username"
                    ref={usernameRef}
                    label="Nombre de usuario"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    leading={<span className="font-mono text-sm">@</span>}
                    className="[&_input]:font-mono"
                    value={form.username}
                    disabled={isSaving}
                    error={fieldErrors.username}
                    help="De 3 a 20 caracteres: letras sin tilde, números y guion bajo (_)."
                    onChange={(e) => updateField('username', e.target.value.replace(/\s+/g, '').toLowerCase())}
                  />
                  <TextField
                    id="profile-email"
                    ref={emailRef}
                    type="email"
                    label="Correo institucional (.edu.co)"
                    autoComplete="email"
                    leading={<Mail className="w-4 h-4" />}
                    value={form.email}
                    disabled={isSaving}
                    readOnly={isGoogleAccount}
                    error={fieldErrors.email}
                    help={
                      isGoogleAccount
                        ? 'Tu correo está vinculado a tu cuenta de Google y no se puede cambiar aquí.'
                        : 'Solo se permiten correos terminados en .edu.co.'
                    }
                    onChange={(e) => updateField('email', e.target.value)}
                  />
                </div>

                <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-4 border-t border-slate-200">
                  <Button variant="secondary" onClick={cancelEdit} disabled={isSaving}>
                    Cancelar
                  </Button>
                  <Button type="submit" loading={isSaving} loadingText="Guardando cambios...">
                    Guardar cambios
                  </Button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
