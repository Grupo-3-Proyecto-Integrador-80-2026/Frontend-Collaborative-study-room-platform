import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { User } from 'firebase/auth';
import { AuthProvider } from '../src/context/AuthContext';
import { ProtectedRoute, PublicOnlyRoute } from '../src/components/ProtectedRoute';
import Profile from '../src/pages/Profile';
import Login from '../src/pages/Login';
import { ApiError, authApi, profileApi, type UserProfile } from '../src/services/api';

const mocks = vi.hoisted(() => ({
  auth: { currentUser: null as User | null },
  listener: undefined as ((user: User | null) => void | Promise<void>) | undefined,
  signOut: vi.fn(),
}));
vi.mock('../src/config/firebase', () => ({ auth: mocks.auth, googleProvider: {} }));
vi.mock('firebase/auth', () => ({
  setPersistence: vi.fn(async () => undefined), sendPasswordResetEmail: vi.fn(async () => undefined),
  browserLocalPersistence: {}, browserSessionPersistence: {},
  onAuthStateChanged: (_auth: unknown, listener: typeof mocks.listener) => {
    mocks.listener = listener;
    void listener?.(mocks.auth.currentUser);
    return () => { mocks.listener = undefined; };
  },
  signOut: mocks.signOut,
  signInWithEmailAndPassword: vi.fn(),
  signInWithPopup: vi.fn(),
}));

const sessionUser = { uid: 'borrar-qa', email: 'ana@correounivalle.edu.co' } as User;
const saved: UserProfile = {
  id: 'borrar-qa', firstName: 'Ana', lastName: 'Pérez', username: 'ana_qa',
  email: 'ana@correounivalle.edu.co', avatarUrl: null, provider: 'password',
  role: 'student', createdAt: null, updatedAt: null,
};

function renderProfile() {
  return render(
    <MemoryRouter initialEntries={['/perfil']}>
      <AuthProvider>
        <main>
          <Routes>
            <Route path="/perfil" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/ingreso" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
          </Routes>
        </main>
      </AuthProvider>
    </MemoryRouter>
  );
}

const openModal = async (user: ReturnType<typeof userEvent.setup>) => {
  renderProfile();
  await user.click(await screen.findByRole('button', { name: 'Eliminar cuenta' }));
  return screen.getByRole('dialog', { name: '¿Eliminar tu cuenta definitivamente?' });
};

beforeEach(() => {
  vi.restoreAllMocks();
  vi.resetAllMocks();
  sessionStorage.clear();
  mocks.auth.currentUser = sessionUser;
  mocks.signOut.mockImplementation(async () => {
    mocks.auth.currentUser = null;
    await mocks.listener?.(null);
  });
  vi.spyOn(authApi, 'getMyProfile').mockResolvedValue({ success: true, user: saved });
});

describe('US-05 | modal de advertencia', () => {
  it('abre con el foco en «Cancelar» y explica las consecuencias', async () => {
    const user = userEvent.setup();
    const dialog = await openModal(user);
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleDescription('Esta acción es irreversible y no se puede deshacer.');
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus();
    expect(dialog).toHaveTextContent('@ana_qa quedará disponible');
    expect(dialog).toHaveTextContent('incluidos los de otros participantes');
  });

  it('atrapa el foco dentro del modal', async () => {
    const user = userEvent.setup();
    await openModal(user);
    await user.tab();
    expect(screen.getByRole('button', { name: 'Eliminar cuenta definitivamente' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Cerrar ventana de advertencia' })).toHaveFocus();
    await user.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Eliminar cuenta definitivamente' })).toHaveFocus();
  });

  it('no tiene violaciones de axe', async () => {
    const user = userEvent.setup();
    await openModal(user);
    const results = await axe.run(document.body, { rules: { 'color-contrast': { enabled: false } } });
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});

describe('US-05 | E2 | cancelar la eliminación', () => {
  it.each([
    ['el botón «Cancelar»', async (user: ReturnType<typeof userEvent.setup>) => user.click(screen.getByRole('button', { name: 'Cancelar' }))],
    ['la tecla Esc', async (user: ReturnType<typeof userEvent.setup>) => user.keyboard('{Escape}')],
  ])('con %s cierra, devuelve el foco y no elimina nada', async (_label, cancel) => {
    const user = userEvent.setup();
    const remove = vi.spyOn(profileApi, 'deleteAccount');
    await openModal(user);
    await cancel(user);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Eliminar cuenta' })).toHaveFocus();
    expect(remove).not.toHaveBeenCalled();
    expect(mocks.signOut).not.toHaveBeenCalled();
  });
});

describe('US-05 | E1 | eliminación confirmada', () => {
  it('elimina la cuenta, cierra la sesión y muestra la confirmación en el login', async () => {
    const user = userEvent.setup();
    let finish!: () => void;
    vi.spyOn(profileApi, 'deleteAccount').mockReturnValue(new Promise((done) => { finish = () => done(null); }));
    await openModal(user);
    await user.click(screen.getByRole('button', { name: 'Eliminar cuenta definitivamente' }));

    expect(screen.getByRole('button', { name: 'Eliminando cuenta...' })).toBeDisabled();
    await user.keyboard('{Escape}');
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    finish();
    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();
    expect(mocks.signOut).toHaveBeenCalledOnce();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Tu cuenta fue eliminada definitivamente y el usuario @ana_qa quedó liberado.'
    );
  });
});

describe('US-05 | error al eliminar', () => {
  it('informa el fallo sin cerrar la sesión y permite reintentar', async () => {
    const user = userEvent.setup();
    const remove = vi.spyOn(profileApi, 'deleteAccount')
      .mockRejectedValueOnce(new ApiError(500, 'INTERNAL_ERROR', 'boom'))
      .mockResolvedValueOnce(null);
    await openModal(user);
    await user.click(screen.getByRole('button', { name: 'Eliminar cuenta definitivamente' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Tu sesión sigue activa');
    expect(mocks.signOut).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Intentar de nuevo' }));
    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();
    expect(remove).toHaveBeenCalledTimes(2);
  });
});
