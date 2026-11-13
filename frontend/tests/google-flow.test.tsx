import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { User } from 'firebase/auth';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { ProtectedRoute, PublicOnlyRoute } from '../src/components/ProtectedRoute';
import ChooseUsername from '../src/pages/ChooseUsername';
import Login from '../src/pages/Login';
import Register from '../src/pages/Register';
import { ApiError, authApi, type UserProfile } from '../src/services/api';

const mocks = vi.hoisted(() => ({
  auth: { currentUser: null as User | null },
  listener: undefined as ((user: User | null) => void | Promise<void>) | undefined,
  popup: vi.fn(), signOut: vi.fn(), deleteUser: vi.fn(),
}));
vi.mock('../src/config/firebase', () => ({ auth: mocks.auth, googleProvider: {} }));
vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (_auth: unknown, listener: typeof mocks.listener) => {
    mocks.listener = listener;
    void listener?.(mocks.auth.currentUser);
    return () => { mocks.listener = undefined; };
  },
  signInWithPopup: mocks.popup, signOut: mocks.signOut,
  deleteUser: mocks.deleteUser, signInWithEmailAndPassword: vi.fn(),
}));

const googleUser = {
  uid: 'google-qa', displayName: 'Ana Pérez', email: 'ana@example.edu.co',
  photoURL: 'https://example.com/avatar.png',
} as User;
const profile: UserProfile = {
  id: googleUser.uid, firstName: 'Ana', lastName: 'Pérez', username: 'ana_qa',
  email: googleUser.email!, avatarUrl: googleUser.photoURL, provider: 'google.com',
  role: 'student', createdAt: null, updatedAt: null,
};
const missingProfile = () => new ApiError(404, 'PROFILE_NOT_FOUND', 'Elige tu username.');

function SessionControls() {
  const { logout, refreshProfile } = useAuth();
  return <>
    <button onClick={() => void logout()}>Salir de prueba</button>
    <button onClick={() => void refreshProfile().catch(() => undefined)}>Sincronizar prueba</button>
  </>;
}

function renderFlow(path = '/panel') {
  return render(<MemoryRouter initialEntries={[path]}><AuthProvider><main>
    <SessionControls />
    <Routes>
      <Route path="/ingreso" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
      <Route path="/registro" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />
      <Route path="/registro/usuario" element={<ProtectedRoute><ChooseUsername /></ProtectedRoute>} />
      <Route path="/panel" element={<ProtectedRoute><h1>Panel privado</h1></ProtectedRoute>} />
      <Route path="/otra-privada" element={<ProtectedRoute><h1>Otra ruta privada</h1></ProtectedRoute>} />
    </Routes>
  </main></AuthProvider></MemoryRouter>);
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.resetAllMocks();
  mocks.auth.currentUser = googleUser;
  mocks.signOut.mockImplementation(async () => {
    mocks.auth.currentUser = null;
    await mocks.listener?.(null);
  });
  vi.spyOn(authApi, 'getMyProfile').mockRejectedValue(missingProfile());
  vi.spyOn(authApi, 'completeProfile').mockRejectedValue(new Error('API simulada sin configurar'));
  vi.spyOn(authApi, 'checkUsernameAvailability').mockResolvedValue({ success: true, username: 'ana_qa', available: true });
});

describe('US-02 | E1/E3 | sesión y rutas privadas', () => {
  it.each(['/panel', '/otra-privada'])('obliga a elegir username al abrir %s sin perfil', async path => {
    renderFlow(path);
    expect(await screen.findByRole('heading', { name: 'Completa tu perfil' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /privad/ })).not.toBeInTheDocument();
  });

  it('QA-01: un fallo de API bloquea el panel y permite reintentar', async () => {
    vi.mocked(authApi.getMyProfile).mockRejectedValueOnce(new ApiError(503, 'UNAVAILABLE', 'Sin servicio.'));
    renderFlow();
    expect(await screen.findByRole('alert')).toHaveTextContent(/perfil/i);
    expect(screen.queryByRole('heading', { name: 'Panel privado' })).not.toBeInTheDocument();
    vi.mocked(authApi.getMyProfile).mockResolvedValue({ success: true, user: profile });
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('heading', { name: 'Panel privado' })).toBeInTheDocument();
  });

  it('QA-01: un perfil devuelto sin username tampoco permite entrar', async () => {
    vi.mocked(authApi.getMyProfile).mockResolvedValue({ success: true, user: { ...profile, username: '' } });
    renderFlow();
    expect(await screen.findByRole('heading', { name: 'Completa tu perfil' })).toBeInTheDocument();
  });

  it('QA-01: muestra carga durante la consulta inicial', async () => {
    let resolve!: (value: { success: boolean; user: UserProfile }) => void;
    vi.mocked(authApi.getMyProfile).mockReturnValue(new Promise(done => { resolve = done; }));
    renderFlow();
    expect(screen.getByRole('status')).toHaveTextContent('Verificando sesión');
    expect(screen.queryByRole('heading', { name: 'Panel privado' })).not.toBeInTheDocument();
    await act(async () => resolve({ success: true, user: profile }));
    expect(await screen.findByRole('heading', { name: 'Panel privado' })).toBeInTheDocument();
  });

  it('QA-01: ignora la respuesta de un usuario anterior tras cambiar de cuenta', async () => {
    let resolveOld!: (value: { success: boolean; user: UserProfile }) => void;
    vi.mocked(authApi.getMyProfile).mockReturnValueOnce(new Promise(done => { resolveOld = done; }));
    renderFlow();
    await act(async () => {
      mocks.auth.currentUser = { ...googleUser, uid: 'segunda-cuenta' } as User;
      await mocks.listener?.(mocks.auth.currentUser);
    });
    expect(await screen.findByRole('heading', { name: 'Completa tu perfil' })).toBeInTheDocument();
    await act(async () => resolveOld({ success: true, user: profile }));
    expect(screen.queryByRole('heading', { name: 'Panel privado' })).not.toBeInTheDocument();
  });

  it('QA-01: un perfil completo no vuelve al formulario de alta', async () => {
    vi.mocked(authApi.getMyProfile).mockResolvedValue({ success: true, user: profile });
    renderFlow('/registro/usuario');
    expect(await screen.findByRole('heading', { name: 'Panel privado' })).toBeInTheDocument();
  });
});

describe('US-02 | E2/E4 | completar perfil', () => {
  it('E2: normaliza el username, guarda y sincroniza antes de entrar al panel', async () => {
    vi.mocked(authApi.completeProfile).mockImplementation(async () => {
      vi.mocked(authApi.getMyProfile).mockResolvedValue({ success: true, user: profile });
      return { success: true, user: profile };
    });
    renderFlow();
    await userEvent.type(await screen.findByLabelText(/^Nombre de usuario/), ' Ana_QA ');
    await userEvent.click(screen.getByRole('button', { name: 'Completar y entrar al panel' }));
    expect(await screen.findByRole('heading', { name: 'Panel privado' })).toBeInTheDocument();
    expect(authApi.completeProfile).toHaveBeenCalledExactlyOnceWith({ username: 'ana_qa' });
  });

  it.each(['', 'ab', 'a'.repeat(21), 'ana qa', 'niña'])('E4: username inválido "%s" no se envía', async username => {
    renderFlow();
    const input = await screen.findByLabelText(/^Nombre de usuario/);
    if (username) await userEvent.type(input, username);
    await userEvent.click(screen.getByRole('button', { name: 'Completar y entrar al panel' }));
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription();
    expect(input).toHaveFocus();
    expect(authApi.completeProfile).not.toHaveBeenCalled();
  });

  it('E4: username ocupado conserva el valor y asocia el error al campo', async () => {
    vi.mocked(authApi.completeProfile).mockRejectedValue(new ApiError(409, 'USERNAME_TAKEN', 'Nombre ocupado.', [
      { field: 'username', message: 'Prueba con otro nombre.' },
    ]));
    renderFlow();
    const input = await screen.findByLabelText(/^Nombre de usuario/);
    await userEvent.type(input, 'ana_qa');
    await userEvent.click(screen.getByRole('button', { name: 'Completar y entrar al panel' }));
    await waitFor(() => expect(input).toHaveAccessibleDescription(/Prueba con otro/));
    expect(input).toHaveValue('ana_qa');
    expect(input).toHaveFocus();
    expect(screen.queryByRole('heading', { name: 'Panel privado' })).not.toBeInTheDocument();
  });

  it('QA-03: permite completar nombres y apellidos ausentes en Google', async () => {
    mocks.auth.currentUser = { ...googleUser, displayName: null } as User;
    renderFlow();
    await userEvent.type(await screen.findByLabelText(/^Nombre de usuario/), 'ana_qa');
    await userEvent.type(screen.getByLabelText(/^Tus nombres/), 'Ana');
    await userEvent.type(screen.getByLabelText(/^Tus apellidos/), 'Pérez');
    await userEvent.click(screen.getByRole('button', { name: 'Completar y entrar al panel' }));
    expect(authApi.completeProfile).toHaveBeenCalledExactlyOnceWith({ username: 'ana_qa', firstName: 'Ana', lastName: 'Pérez' });
  });

  it('anuncia guardado, evita envíos duplicados y permite reintentar un error de red', async () => {
    let reject!: (error: Error) => void;
    vi.mocked(authApi.completeProfile).mockReturnValue(new Promise((_resolve, fail) => { reject = fail; }));
    renderFlow();
    await userEvent.type(await screen.findByLabelText(/^Nombre de usuario/), 'ana_qa');
    await userEvent.click(screen.getByRole('button', { name: 'Completar y entrar al panel' }));
    expect(screen.getByRole('status')).toHaveTextContent('Guardando');
    expect(screen.getByRole('button', { name: 'Guardando...' })).toBeDisabled();
    await act(async () => reject(new Error('Sin conexión')));
    expect(await screen.findByRole('alert')).toHaveTextContent(/error/i);
    expect(screen.getByRole('button', { name: 'Completar y entrar al panel' })).toBeEnabled();
    expect(authApi.completeProfile).toHaveBeenCalledOnce();
  });

  it('permite cancelar el alta y cierra la sesión', async () => {
    renderFlow();
    await userEvent.click(await screen.findByRole('button', { name: 'Cancelar y salir de esta cuenta' }));
    expect(mocks.signOut).toHaveBeenCalledOnce();
    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();
  });
});

describe.each(['/ingreso', '/registro'])('US-02 | Google desde %s', path => {
  beforeEach(() => { mocks.auth.currentUser = null; });

  it('E1: autentica con Google y obliga a elegir username', async () => {
    mocks.popup.mockImplementation(async () => {
      mocks.auth.currentUser = googleUser;
      await mocks.listener?.(googleUser);
      return { user: googleUser };
    });
    renderFlow(path);
    await userEvent.click(await screen.findByRole('button', { name: 'Continuar con Google' }));
    expect(await screen.findByRole('heading', { name: 'Completa tu perfil' })).toBeInTheDocument();
    expect(screen.getByText(/ana@example.edu.co/)).toBeInTheDocument();
  });

  it.each(['auth/popup-closed-by-user', 'auth/popup-blocked', 'auth/network-request-failed'])('E5: %s muestra un error recuperable', async code => {
    mocks.popup.mockRejectedValue({ code });
    renderFlow(path);
    await userEvent.click(await screen.findByRole('button', { name: 'Continuar con Google' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/Google/);
    expect(screen.getByRole('button', { name: 'Continuar con Google' })).toBeEnabled();
    expect(authApi.getMyProfile).not.toHaveBeenCalled();
  });

  it('QA-02: rechaza un correo externo cerrando sesión sin borrar la cuenta', async () => {
    const externalUser = { ...googleUser, email: 'qa@example.com' } as User;
    mocks.popup.mockImplementation(async () => {
      mocks.auth.currentUser = externalUser;
      await mocks.listener?.(externalUser);
      return { user: externalUser };
    });
    renderFlow(path);
    await userEvent.click(await screen.findByRole('button', { name: 'Continuar con Google' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/institucional/);
    expect(mocks.deleteUser).not.toHaveBeenCalled();
    expect(mocks.signOut).toHaveBeenCalledOnce();
    expect(authApi.getMyProfile).not.toHaveBeenCalled();
  });
});
