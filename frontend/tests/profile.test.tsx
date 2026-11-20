import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { User } from 'firebase/auth';
import { AuthProvider } from '../src/context/AuthContext';
import { ProtectedRoute } from '../src/components/ProtectedRoute';
import Profile from '../src/pages/Profile';
import Login from '../src/pages/Login';
import { PublicOnlyRoute } from '../src/components/ProtectedRoute';
import { ApiError, authApi, profileApi, type UserProfile } from '../src/services/api';

const mocks = vi.hoisted(() => ({
  auth: { currentUser: null as (User & { reload: () => Promise<void> }) | null },
  signOut: vi.fn(),
  listener: undefined as ((user: User | null) => void) | undefined,
}));
vi.mock('../src/config/firebase', () => ({ auth: mocks.auth, googleProvider: {} }));
vi.mock('firebase/auth', () => ({
  setPersistence: vi.fn(async () => undefined), sendPasswordResetEmail: vi.fn(async () => undefined),
  browserLocalPersistence: {}, browserSessionPersistence: {},
  onAuthStateChanged: (_auth: unknown, listener: (user: User | null) => void) => {
    mocks.listener = listener;
    void listener(mocks.auth.currentUser);
    return () => undefined;
  },
  signOut: mocks.signOut,
  signInWithEmailAndPassword: vi.fn(),
  signInWithPopup: vi.fn(),
}));

const sessionUser = {
  uid: 'perfil-qa',
  email: 'ana@correounivalle.edu.co',
  reload: vi.fn(),
  getIdToken: vi.fn(),
} as unknown as User & { reload: () => Promise<void> };

const saved: UserProfile = {
  id: 'perfil-qa', firstName: 'Ana', lastName: 'Pérez', username: 'ana_qa',
  email: 'ana@correounivalle.edu.co', avatarUrl: 'https://api.dicebear.com/9.x/bottts/svg?seed=Felix',
  provider: 'password', role: 'student', createdAt: null, updatedAt: null,
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

const openEditor = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(await screen.findByRole('button', { name: 'Editar perfil' }));
  return screen.getByRole('textbox', { name: 'Nombres' });
};

beforeEach(() => {
  vi.restoreAllMocks();
  vi.resetAllMocks();
  sessionStorage.clear();
  mocks.auth.currentUser = sessionUser;
  mocks.signOut.mockImplementation(async () => {
    mocks.auth.currentUser = null;
    mocks.listener?.(null);
  });
  vi.spyOn(authApi, 'getMyProfile').mockResolvedValue({ success: true, user: saved });
});

describe('US-04 | carga del perfil', () => {
  it('muestra el estado de carga y luego los datos guardados', async () => {
    renderProfile();
    expect(await screen.findByText('Cargando la información de tu perfil...')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Ana Pérez' })).toBeInTheDocument();
    expect(screen.getByText('@ana_qa', { selector: 'dd' })).toBeInTheDocument();
    expect(screen.getByText('ana@correounivalle.edu.co')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Cargando la información de tu perfil...')).not.toBeInTheDocument());
  });

  it('si falla la carga ofrece «Reintentar» y vuelve a pedir los datos', async () => {
    const user = userEvent.setup();
    let calls = 0;
    vi.spyOn(authApi, 'getMyProfile').mockImplementation(async () => {
      calls += 1;
      // La primera llamada la hace el AuthContext; la segunda, la pantalla.
      if (calls === 2) throw new ApiError(500, 'INTERNAL_ERROR', 'boom');
      return { success: true, user: saved };
    });
    renderProfile();
    expect(await screen.findByText(/No pudimos cargar la información de tu perfil/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Editar perfil' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Editar perfil' })).toBeEnabled());
    expect(screen.queryByText(/No pudimos cargar/)).not.toBeInTheDocument();
  });
});

describe('US-04 | E1 | edición exitosa', () => {
  it('envía solo lo modificado, anuncia «Perfil actualizado» y devuelve el foco', async () => {
    const user = userEvent.setup();
    const updated = { ...saved, firstName: 'Ana María' };
    const update = vi.spyOn(profileApi, 'update').mockResolvedValue({ success: true, user: updated });
    renderProfile();
    const firstName = await openEditor(user);
    expect(firstName).toHaveFocus();
    await user.clear(firstName);
    await user.type(firstName, 'Ana María{Enter}');

    expect(update).toHaveBeenCalledWith({ firstName: 'Ana María' });
    expect(await screen.findByText('Perfil actualizado')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Ana María Pérez' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Editar perfil' })).toHaveFocus();
  });

  it('al cambiar el correo renueva el token de la sesión', async () => {
    const user = userEvent.setup();
    const updated = { ...saved, email: 'ana.nueva@correounivalle.edu.co' };
    vi.spyOn(profileApi, 'update').mockResolvedValue({ success: true, user: updated });
    renderProfile();
    await openEditor(user);
    const email = screen.getByRole('textbox', { name: 'Correo institucional (.edu.co)' });
    await user.clear(email);
    await user.type(email, 'Ana.Nueva@correounivalle.edu.co');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(profileApi.update).toHaveBeenCalledWith({ email: 'ana.nueva@correounivalle.edu.co' });
    expect(await screen.findByText('Perfil actualizado')).toBeInTheDocument();
    expect(sessionUser.getIdToken).toHaveBeenCalledWith(true);
  });
});

describe('US-04 | cambio de correo con sesión revocada', () => {
  it('si no se puede renovar el token, cierra la sesión y explica en el login que ingrese con el correo nuevo', async () => {
    const user = userEvent.setup();
    vi.mocked(sessionUser.getIdToken).mockRejectedValue(new Error('auth/user-token-expired'));
    vi.spyOn(profileApi, 'update').mockResolvedValue({ success: true, user: { ...saved, email: 'ana.nueva@correounivalle.edu.co' } });
    renderProfile();
    await openEditor(user);
    const email = screen.getByRole('textbox', { name: 'Correo institucional (.edu.co)' });
    await user.clear(email);
    await user.type(email, 'ana.nueva@correounivalle.edu.co{Enter}');

    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();
    expect(mocks.signOut).toHaveBeenCalledOnce();
    expect(screen.getByText('Actualizamos tu correo. Inicia sesión de nuevo con tu correo nuevo.')).toBeInTheDocument();
  });

  it('si la renovación funciona no deja avisos pendientes para el login', async () => {
    const user = userEvent.setup();
    vi.spyOn(profileApi, 'update').mockResolvedValue({ success: true, user: { ...saved, email: 'ana.nueva@correounivalle.edu.co' } });
    renderProfile();
    await openEditor(user);
    const email = screen.getByRole('textbox', { name: 'Correo institucional (.edu.co)' });
    await user.clear(email);
    await user.type(email, 'ana.nueva@correounivalle.edu.co{Enter}');
    expect(await screen.findByText('Perfil actualizado')).toBeInTheDocument();
    expect(sessionStorage.length).toBe(0);
  });
});

describe('US-04 | E2 y E3 | colisiones', () => {
  it('bloquea un username ocupado y lo explica junto al campo sin perder lo escrito', async () => {
    const user = userEvent.setup();
    vi.spyOn(profileApi, 'update').mockRejectedValue(
      new ApiError(409, 'USERNAME_TAKEN', 'Ese nombre de usuario ya está en uso.', [
        { field: 'username', message: 'Ese nombre de usuario ya está en uso. Prueba con otro.' },
      ])
    );
    renderProfile();
    await openEditor(user);
    const username = screen.getByRole('textbox', { name: 'Nombre de usuario' });
    await user.clear(username);
    await user.type(username, 'camilo');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('ese dato ya está en uso');
    expect(username).toHaveValue('camilo');
    expect(username).toHaveAttribute('aria-invalid', 'true');
    expect(username).toHaveAccessibleDescription(/«@camilo» ya está en uso/);
    expect(username).toHaveFocus();
  });

  it('bloquea un correo que ya existe', async () => {
    const user = userEvent.setup();
    vi.spyOn(profileApi, 'update').mockRejectedValue(
      new ApiError(409, 'EMAIL_TAKEN', 'Ese correo ya tiene una cuenta.', [
        { field: 'email', message: 'Ese correo ya tiene una cuenta.' },
      ])
    );
    renderProfile();
    await openEditor(user);
    const email = screen.getByRole('textbox', { name: 'Correo institucional (.edu.co)' });
    await user.clear(email);
    await user.type(email, 'camilo@correounivalle.edu.co');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(email).toHaveAccessibleDescription(/ya pertenece a otra cuenta/);
    expect(email).toHaveFocus();
    expect(screen.queryByText('Perfil actualizado')).not.toBeInTheDocument();
  });
});

describe('US-04 | validaciones antes de enviar', () => {
  it('no envía nombres vacíos ni correos fuera de .edu.co', async () => {
    const user = userEvent.setup();
    const update = vi.spyOn(profileApi, 'update');
    renderProfile();
    const firstName = await openEditor(user);
    await user.clear(firstName);
    const email = screen.getByRole('textbox', { name: 'Correo institucional (.edu.co)' });
    await user.clear(email);
    await user.type(email, 'ana@gmail.com');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(update).not.toHaveBeenCalled();
    expect(firstName).toHaveAccessibleDescription('Escribe tus nombres para continuar.');
    expect(email).toHaveAccessibleDescription(/terminados en \.edu\.co/);
    expect(firstName).toHaveFocus();
  });

  it('una cuenta de Google no puede cambiar su correo', async () => {
    const user = userEvent.setup();
    vi.spyOn(authApi, 'getMyProfile').mockResolvedValue({ success: true, user: { ...saved, provider: 'google.com' } });
    renderProfile();
    await openEditor(user);
    const email = screen.getByRole('textbox', { name: 'Correo institucional (.edu.co)' });
    expect(email).toHaveAttribute('readonly');
    expect(email).toHaveAccessibleDescription(/vinculado a tu cuenta de Google/);
  });
});

describe('US-04 | E4 | cancelar', () => {
  it('descarta los cambios y muestra los datos guardados', async () => {
    const user = userEvent.setup();
    const update = vi.spyOn(profileApi, 'update');
    renderProfile();
    const firstName = await openEditor(user);
    await user.clear(firstName);
    await user.type(firstName, 'Otro nombre');
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(update).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'Ana Pérez' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Editar perfil' })).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Editar perfil' }));
    expect(screen.getByRole('textbox', { name: 'Nombres' })).toHaveValue('Ana');
  });
});

describe('US-04 | accesibilidad', () => {
  it('el formulario de edición no tiene violaciones de axe', async () => {
    const user = userEvent.setup();
    const { container } = renderProfile();
    await openEditor(user);
    const results = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
