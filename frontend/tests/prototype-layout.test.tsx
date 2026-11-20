import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { User } from 'firebase/auth';
import { AuthProvider } from '../src/context/AuthContext';
import { PublicOnlyRoute } from '../src/components/ProtectedRoute';
import { Layout } from '../src/App';
import Home from '../src/pages/Home';
import Login from '../src/pages/Login';
import { authApi, type UserProfile } from '../src/services/api';

const mocks = vi.hoisted(() => ({
  auth: { currentUser: null as User | null },
  signIn: vi.fn(),
  setPersistence: vi.fn(),
  sendReset: vi.fn(),
  local: { type: 'LOCAL' },
  session: { type: 'SESSION' },
}));
vi.mock('../src/config/firebase', () => ({ auth: mocks.auth, googleProvider: {} }));
vi.mock('../src/utils/navigation', () => ({ reloadPage: vi.fn() }));
vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (_auth: unknown, listener: (user: User | null) => void) => {
    void listener(mocks.auth.currentUser);
    return () => undefined;
  },
  signOut: vi.fn(),
  signInWithEmailAndPassword: mocks.signIn,
  signInWithPopup: vi.fn(),
  setPersistence: mocks.setPersistence,
  sendPasswordResetEmail: mocks.sendReset,
  browserLocalPersistence: mocks.local,
  browserSessionPersistence: mocks.session,
}));

const sessionUser = { uid: 'ui-qa', email: 'ana@correounivalle.edu.co' } as User;
const profile: UserProfile = {
  id: 'ui-qa', firstName: 'Ana', lastName: 'Pérez', username: 'ana_qa', email: 'ana@correounivalle.edu.co',
  avatarUrl: null, provider: 'password', role: 'student', createdAt: null, updatedAt: null,
};

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/ingreso" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
            <Route path="/panel" element={<h1>Panel de prueba</h1>} />
          </Routes>
        </Layout>
      </AuthProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.currentUser = null;
  mocks.setPersistence.mockResolvedValue(undefined);
  mocks.sendReset.mockResolvedValue(undefined);
  mocks.signIn.mockRejectedValue(new Error('sin configurar'));
  vi.spyOn(authApi, 'getMyProfile').mockResolvedValue({ success: true, user: profile });
});

describe('Inicio del prototipo', () => {
  it('muestra la portada y lleva al acceso si no hay sesión', async () => {
    renderAt('/');
    expect(await screen.findByRole('heading', { level: 1, name: /Estudia en equipo/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Unirse a una sala ahora/ })).toHaveAttribute('href', '/ingreso');
    expect(within(screen.getByRole('contentinfo')).getByRole('link', { name: 'Estado de la conexión' })).toHaveAttribute('href', '/estado');
  });

  it('filtra las salas por modo y por búsqueda, con estado vacío', async () => {
    const user = userEvent.setup();
    renderAt('/');
    const rooms = await screen.findByRole('region', { name: 'Salas de estudio activas en este momento' });
    expect(within(rooms).getAllByRole('article')).toHaveLength(4);

    await user.click(within(rooms).getByRole('button', { name: 'Pomodoro 25/5' }));
    expect(within(rooms).getByRole('button', { name: 'Pomodoro 25/5' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(rooms).getAllByRole('article')).toHaveLength(1);
    expect(within(rooms).getByRole('link', { name: 'Entrar a la sala Física II · Dinámica y Electromagnetismo' })).toBeInTheDocument();

    await user.click(within(rooms).getByRole('button', { name: 'Todas' }));
    await user.type(within(rooms).getByRole('searchbox', { name: /Buscar salas/ }), 'química orgánica');
    expect(within(rooms).queryAllByRole('article')).toHaveLength(0);
    expect(within(rooms).getByRole('heading', { name: 'No encontramos salas con ese criterio' })).toBeInTheDocument();
  });

  it('no tiene violaciones de axe', async () => {
    const { container } = renderAt('/');
    await screen.findByRole('heading', { level: 1 });
    const results = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});

describe('Encabezado, pie y barra inferior', () => {
  it('con sesión, la barra inferior ofrece «Salir» y el pie del panel tiene sus enlaces', async () => {
    mocks.auth.currentUser = sessionUser;
    renderAt('/panel');
    await screen.findByRole('heading', { name: 'Panel de prueba' });
    const bottom = screen.getByRole('navigation', { name: 'Navegación inferior' });
    expect(within(bottom).getByRole('button', { name: 'Salir' })).toBeInTheDocument();
    expect(within(bottom).getByRole('link', { name: 'Panel' })).toHaveAttribute('aria-current', 'page');
    const footer = screen.getByRole('contentinfo');
    expect(within(footer).getByRole('link', { name: 'Mi perfil' })).toHaveAttribute('href', '/perfil');
    expect(within(footer).getByRole('button', { name: 'Cerrar sesión' })).toBeInTheDocument();
    expect(within(screen.getByRole('banner')).getByRole('link', { name: /Ir a Mi perfil \(@ana_qa\)/ })).toBeInTheDocument();
  });

  it('el menú móvil se abre, anuncia su estado y se cierra con Esc', async () => {
    const user = userEvent.setup();
    renderAt('/');
    const toggle = await screen.findByRole('button', { name: 'Abrir menú' });
    await user.click(toggle);
    expect(screen.getByRole('button', { name: 'Cerrar menú' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('navigation', { name: 'Menú móvil' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('navigation', { name: 'Menú móvil' })).not.toBeInTheDocument();
  });
});

describe('Login del prototipo', () => {
  it('«Recordar sesión» desmarcado limita la sesión a la pestaña', async () => {
    const user = userEvent.setup();
    renderAt('/ingreso');
    await user.type(await screen.findByLabelText(/^Correo institucional/, { selector: 'input' }), 'ana@correounivalle.edu.co');
    await user.type(screen.getByLabelText(/^Contraseña/, { selector: 'input' }), 'Prueba123');
    await user.click(screen.getByRole('checkbox', { name: 'Recordar sesión' }));
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    expect(mocks.setPersistence).toHaveBeenCalledWith(mocks.auth, mocks.session);
  });

  it('«¿Olvidaste tu contraseña?» pide el correo y luego envía las instrucciones', async () => {
    const user = userEvent.setup();
    renderAt('/ingreso');
    const email = await screen.findByLabelText(/^Correo institucional/, { selector: 'input' });
    await user.click(screen.getByRole('button', { name: '¿Olvidaste tu contraseña?' }));
    expect(email).toHaveAccessibleDescription('Escribe tu correo institucional para enviarte las instrucciones.');
    expect(mocks.sendReset).not.toHaveBeenCalled();

    await user.type(email, 'Ana@Correounivalle.edu.co');
    await user.click(screen.getByRole('button', { name: '¿Olvidaste tu contraseña?' }));
    expect(mocks.sendReset).toHaveBeenCalledWith(mocks.auth, 'ana@correounivalle.edu.co');
    expect(await screen.findByText(/te enviamos las instrucciones/)).toBeInTheDocument();
  });
});
