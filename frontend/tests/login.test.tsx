import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { User } from 'firebase/auth';
import { AuthProvider } from '../src/context/AuthContext';
import { ProtectedRoute, PublicOnlyRoute } from '../src/components/ProtectedRoute';
import { Layout } from '../src/App';
import Dashboard from '../src/pages/Dashboard';
import Login from '../src/pages/Login';
import { authApi, type UserProfile } from '../src/services/api';

const mocks = vi.hoisted(() => ({
  auth: { currentUser: null as User | null },
  listener: undefined as ((user: User | null) => void | Promise<void>) | undefined,
  signIn: vi.fn(), popup: vi.fn(), signOut: vi.fn(), reload: vi.fn(),
}));
vi.mock('../src/config/firebase', () => ({ auth: mocks.auth, googleProvider: {} }));
vi.mock('../src/utils/navigation', () => ({ reloadPage: mocks.reload }));
vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (_auth: unknown, listener: typeof mocks.listener) => {
    mocks.listener = listener;
    void listener?.(mocks.auth.currentUser);
    return () => { mocks.listener = undefined; };
  },
  signInWithEmailAndPassword: mocks.signIn,
  signInWithPopup: mocks.popup,
  signOut: mocks.signOut,
  deleteUser: vi.fn(),
}));

const sessionUser = {  uid: 'manual-qa', displayName: 'Ana Pérez', email: 'ana@correounivalle.edu.co',
  photoURL: 'https://example.com/avatar.png',
} as User;
const profile: UserProfile = {
  id: sessionUser.uid, firstName: 'Ana', lastName: 'Pérez', username: 'ana_qa',
  email: sessionUser.email!, avatarUrl: sessionUser.photoURL, provider: 'password',
  role: 'student', createdAt: null, updatedAt: null,
};

function renderFlow(path = '/ingreso', withLayout = false) {
  const routes = (
    <Routes>
      <Route path="/ingreso" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
      <Route path="/panel" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/otra-privada" element={<ProtectedRoute><h1>Otra ruta privada</h1></ProtectedRoute>} />
    </Routes>
  );
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        {withLayout ? <Layout>{routes}</Layout> : <main>{routes}</main>}
      </AuthProvider>
    </MemoryRouter>
  );
}

const emailInput = () => screen.getByLabelText(/^Correo institucional/, { selector: 'input' });
const passwordInput = () => screen.getByLabelText(/^Contraseña/, { selector: 'input' });

const firePageShow = (persisted: boolean) => {
  window.dispatchEvent(Object.assign(new Event('pageshow'), { persisted }));
};

const successfulSignIn = () => {
  mocks.signIn.mockImplementation(async () => {
    mocks.auth.currentUser = sessionUser;
    await mocks.listener?.(sessionUser);
    return { user: sessionUser };
  });
};

beforeEach(() => {
  vi.restoreAllMocks();
  vi.resetAllMocks();
  mocks.auth.currentUser = null;
  mocks.signOut.mockImplementation(async () => {
    mocks.auth.currentUser = null;
    await mocks.listener?.(null);
  });
  vi.spyOn(authApi, 'getMyProfile').mockResolvedValue({ success: true, user: profile });
});

describe('US-03 | E1 | login manual exitoso', () => {
  it('accede al panel con credenciales correctas, normalizando el correo', async () => {
    successfulSignIn();
    const user = userEvent.setup();
    renderFlow();
    await user.type(emailInput(), ' Ana@Correounivalle.edu.co ');
    await user.type(passwordInput(), 'Prueba123');
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    expect(await screen.findByText('¡Hola, Ana Pérez!')).toBeInTheDocument();
    expect(mocks.signIn).toHaveBeenCalledExactlyOnceWith(mocks.auth, 'ana@correounivalle.edu.co', 'Prueba123');
    expect(authApi.getMyProfile).toHaveBeenCalled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('tras autenticarse devuelve a la ruta privada solicitada (E5)', async () => {
    successfulSignIn();
    const user = userEvent.setup();
    renderFlow('/otra-privada');
    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();
    await user.type(emailInput(), 'ana@correounivalle.edu.co');
    await user.type(passwordInput(), 'Prueba123');
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    expect(await screen.findByRole('heading', { name: 'Otra ruta privada' })).toBeInTheDocument();
  });

  it('deshabilita el envío mientras autentica (estado de carga)', async () => {
    let finishLogin!: () => Promise<void>;
    mocks.signIn.mockReturnValue(new Promise(done => {
      finishLogin = async () => {
        mocks.auth.currentUser = sessionUser;
        await mocks.listener?.(sessionUser);
        done({ user: sessionUser });
      };
    }));
    const user = userEvent.setup();
    renderFlow();
    await user.type(emailInput(), 'ana@correounivalle.edu.co');
    await user.type(passwordInput(), 'Prueba123');
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    expect(screen.getByRole('button', { name: 'Ingresando...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Continuar con Google' })).toBeDisabled();
    await act(async () => { await finishLogin(); });
    expect(await screen.findByText('¡Hola, Ana Pérez!')).toBeInTheDocument();
  });
});

describe('US-03 | E3 | credenciales incorrectas', () => {
  it.each(['auth/invalid-credential', 'auth/user-not-found', 'auth/wrong-password', 'fallo-de-red'])(
    'muestra el mensaje genérico ante %s sin revelar el campo fallido',
    async reason => {
      mocks.signIn.mockRejectedValue(reason === 'fallo-de-red' ? new Error('offline') : { code: reason });
      const user = userEvent.setup();
      renderFlow();
      await user.type(emailInput(), 'ana@correounivalle.edu.co');
      await user.type(passwordInput(), 'incorrecta');
      await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent('Correo o contraseña incorrectos');
      expect(alert.textContent).not.toContain('ana@correounivalle.edu.co');
      expect(screen.queryByRole('heading', { name: '¡Hola, Ana Pérez!' })).not.toBeInTheDocument();
      expect(authApi.getMyProfile).not.toHaveBeenCalled();
      expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeEnabled();
    }
  );

  it('permite reintentar tras un error de credenciales', async () => {
    mocks.signIn.mockRejectedValueOnce({ code: 'auth/invalid-credential' });
    const user = userEvent.setup();
    renderFlow();
    await user.type(emailInput(), 'ana@correounivalle.edu.co');
    await user.type(passwordInput(), 'incorrecta');
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    await screen.findByRole('alert');
    await user.clear(passwordInput());
    await user.type(passwordInput(), 'Prueba123');
    successfulSignIn();
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    expect(await screen.findByText('¡Hola, Ana Pérez!')).toBeInTheDocument();
  });
});

describe('US-03 | validación de campos', () => {
  it('campos vacíos anuncian errores por campo y no autentican', async () => {
    const user = userEvent.setup();
    renderFlow();
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    expect(screen.getAllByRole('alert')).toHaveLength(2);
    expect(emailInput()).toHaveAttribute('aria-invalid', 'true');
    expect(emailInput()).toHaveAccessibleDescription('Escribe tu correo institucional.');
    expect(passwordInput()).toHaveAttribute('aria-invalid', 'true');
    expect(passwordInput()).toHaveAccessibleDescription('Escribe tu contraseña.');
    expect(mocks.signIn).not.toHaveBeenCalled();
  });

  it('QA-04: rechaza un correo no institucional antes de autenticar', async () => {
    const user = userEvent.setup();
    renderFlow();
    await user.type(emailInput(), 'estudiante@gmail.com');
    await user.type(passwordInput(), 'Prueba123');
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    expect(emailInput()).toHaveAttribute('aria-invalid', 'true');
    expect(emailInput()).toHaveAccessibleDescription(/institucional/);
    expect(emailInput()).toHaveAccessibleDescription(/\.edu\.co/);
    expect(mocks.signIn).not.toHaveBeenCalled();
    expect(authApi.getMyProfile).not.toHaveBeenCalled();
    expect(mocks.auth.currentUser).toBeNull();
    expect(screen.queryByText('¡Hola, Ana Pérez!')).not.toBeInTheDocument();
  });

  it('QA-06/WCAG 3.3.8: permite pegar la contraseña sin restricciones', async () => {
    const user = userEvent.setup();
    renderFlow();
    await user.click(passwordInput());
    await user.paste('Prueba123');
    expect(passwordInput()).toHaveValue('Prueba123');
  });

  it('QA-06: no desactiva el foco visible de los campos', () => {
    renderFlow();
    for (const input of [emailInput(), passwordInput()]) {
      expect(input.className).not.toContain('focus-visible:outline-none');
      expect(input.className).not.toContain('focus-visible:ring-0');
    }
  });
});

describe('US-03 | E2 | Google recurrente', () => {
  it('con username ya registrado lleva directo al panel sin pedir username', async () => {
    const googleUser = { ...sessionUser, uid: 'google-qa', provider: 'google.com' } as User;
    mocks.popup.mockImplementation(async () => {
      mocks.auth.currentUser = googleUser;
      await mocks.listener?.(googleUser);
      return { user: googleUser };
    });
    const user = userEvent.setup();
    renderFlow();
    await user.click(await screen.findByRole('button', { name: 'Continuar con Google' }));
    expect(await screen.findByText('¡Hola, Ana Pérez!')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Completa tu perfil' })).not.toBeInTheDocument();
  });
});

describe('US-03 | E4 | cierre de sesión', () => {
  it('el header deshabilita el botón mientras cierra y lleva al login', async () => {
    mocks.auth.currentUser = sessionUser;
    let resolveLogout!: () => void;
    mocks.signOut.mockReturnValue(new Promise<void>(done => { resolveLogout = done; }));
    const user = userEvent.setup();
    renderFlow('/panel', true);
    expect(await screen.findByText('¡Hola, Ana Pérez!')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    expect(screen.getByRole('button', { name: 'Cerrando...' })).toBeDisabled();
    await act(async () => resolveLogout());
    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();
    expect(mocks.signOut).toHaveBeenCalledOnce();
  });

  it('el header anuncia el fallo del cierre y permite reintentar', async () => {
    mocks.auth.currentUser = sessionUser;
    mocks.signOut.mockRejectedValueOnce(new Error('offline'));
    const user = userEvent.setup();
    renderFlow('/panel', true);
    expect(await screen.findByText('¡Hola, Ana Pérez!')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cerrar la sesión');
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();
  });

  it('el botón del panel también cierra la sesión', async () => {
    mocks.auth.currentUser = sessionUser;
    const user = userEvent.setup();
    renderFlow('/panel');
    expect(await screen.findByText('¡Hola, Ana Pérez!')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '🚪 Cerrar sesión' }));
    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();
    expect(mocks.signOut).toHaveBeenCalledOnce();
  });

  it('tras cerrar sesión, la ruta privada vuelve al login sin datos (botón atrás)', async () => {
    mocks.auth.currentUser = null;
    renderFlow('/panel');
    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();
    expect(screen.queryByText('¡Hola, Ana Pérez!')).not.toBeInTheDocument();
    expect(authApi.getMyProfile).not.toHaveBeenCalled();
  });

  it('QA-03: recarga la página restaurada desde bfcache tras cerrar sesión', () => {
    renderFlow();
    expect(mocks.reload).not.toHaveBeenCalled();
    firePageShow(true);
    expect(mocks.reload).toHaveBeenCalledOnce();
    firePageShow(false);
    expect(mocks.reload).toHaveBeenCalledOnce();
  });

  it('QA-03: también recarga si la caché restaura una página con sesión activa', () => {
    mocks.auth.currentUser = sessionUser;
    renderFlow('/panel');
    firePageShow(true);
    expect(mocks.reload).toHaveBeenCalledOnce();
  });
});

describe('US-03 | accesibilidad', () => {
  it('recorre el formulario por teclado con foco visible en cada control', async () => {
    const user = userEvent.setup();
    renderFlow();
    const sequence = [
      screen.getByRole('heading', { name: 'Iniciar sesión' }),
      emailInput(),
      passwordInput(),
      screen.getByRole('button', { name: 'Ver contraseña' }),
      screen.getByRole('button', { name: 'Iniciar sesión' }),
      screen.getByRole('button', { name: 'Continuar con Google' }),
      screen.getByRole('link', { name: 'Regístrate aquí' }),
    ];
    // Salta los enlaces del header (skip link, logo, nav) hasta llegar al formulario
    await user.tab();
    while (document.activeElement !== sequence[1]) {
      await user.tab();
      expect(document.activeElement).not.toBe(document.body);
    }
    for (const expected of sequence.slice(1)) {
      expect(document.activeElement).toBe(expected);
      await user.tab();
    }
  });

  it('el botón de contraseña anuncia su estado (aria-pressed)', async () => {
    const user = userEvent.setup();
    renderFlow();
    const show = screen.getByRole('button', { name: 'Ver contraseña' });
    expect(show).toHaveAttribute('aria-pressed', 'false');
    await user.click(show);
    expect(screen.getByRole('button', { name: 'Ocultar contraseña' })).toHaveAttribute('aria-pressed', 'true');
    expect(passwordInput()).toHaveAttribute('type', 'text');
  });

  it.each([false, true])('axe sin violaciones estructurales, errores visibles: %s', async showErrors => {
    const { container } = renderFlow();
    if (showErrors) await userEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    const result = await axe.run(container, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
      // JSDOM no calcula contraste/layout; se auditan en navegador publicado.
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(result.violations).toEqual([]);
  });

  it('axe sin violaciones con el error genérico de credenciales visible', async () => {
    mocks.signIn.mockRejectedValue({ code: 'auth/invalid-credential' });
    const user = userEvent.setup();
    const { container } = renderFlow();
    await user.type(emailInput(), 'ana@correounivalle.edu.co');
    await user.type(passwordInput(), 'incorrecta');
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    await screen.findByRole('alert');
    const result = await axe.run(container, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(result.violations).toEqual([]);
  });
});
