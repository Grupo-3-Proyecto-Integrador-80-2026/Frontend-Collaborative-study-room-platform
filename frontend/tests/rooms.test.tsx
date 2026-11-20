import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { User } from 'firebase/auth';
import { AuthProvider } from '../src/context/AuthContext';
import { ProtectedRoute } from '../src/components/ProtectedRoute';
import Dashboard from '../src/pages/Dashboard';
import Room from '../src/pages/Room';
import { ApiError, authApi, roomsApi, type Room as RoomData, type UserProfile } from '../src/services/api';

const mocks = vi.hoisted(() => ({ auth: { currentUser: null as User | null } }));
vi.mock('../src/config/firebase', () => ({ auth: mocks.auth, googleProvider: {} }));
vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (_auth: unknown, listener: (user: User | null) => void) => {
    void listener(mocks.auth.currentUser);
    return () => undefined;
  },
  signOut: vi.fn(),
}));

const sessionUser = { uid: 'salas-qa', email: 'ana@correounivalle.edu.co' } as User;
const profile: UserProfile = {
  id: 'salas-qa', firstName: 'Ana', lastName: 'Pérez', username: 'ana_qa',
  email: 'ana@correounivalle.edu.co', avatarUrl: null, provider: 'password',
  role: 'student', createdAt: null, updatedAt: null,
};
const older: RoomData = { id: 'AAAAAAAAAAAAAAAAAAA1', ownerId: 'salas-qa', name: 'Física II', createdAt: '2026-11-01T10:00:00.000Z' };
const newer: RoomData = { id: 'BBBBBBBBBBBBBBBBBBB2', ownerId: 'salas-qa', name: 'Cálculo · Taller 3', createdAt: '2026-11-18T10:00:00.000Z' };

function renderAt(path = '/panel') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <main>
          <Routes>
            <Route path="/panel" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/salas/:id" element={<ProtectedRoute><Room /></ProtectedRoute>} />
            <Route path="/perfil" element={<h1>Mi Perfil</h1>} />
          </Routes>
        </main>
      </AuthProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.resetAllMocks();
  mocks.auth.currentUser = sessionUser;
  vi.spyOn(authApi, 'getMyProfile').mockResolvedValue({ success: true, user: profile });
});

describe('US-06 | E2 | panel vacío y con salas', () => {
  it('muestra la carga y luego un mensaje amigable si no hay salas', async () => {
    vi.spyOn(roomsApi, 'listMine').mockResolvedValue({ success: true, rooms: [] });
    renderAt();
    expect(await screen.findByText('Cargando tus salas de estudio...')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Aún no tienes salas creadas' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '¡Hola, Ana!' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Crear sala' })).toHaveLength(2);
  });

  it('lista nombre e ID de cada sala propia, de la más reciente a la más antigua', async () => {
    vi.spyOn(roomsApi, 'listMine').mockResolvedValue({ success: true, rooms: [older, newer] });
    renderAt();
    const items = await screen.findAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(within(items[0]).getByRole('heading')).toHaveTextContent('Cálculo · Taller 3');
    expect(items[0]).toHaveTextContent(newer.id);
    expect(within(items[1]).getByRole('heading')).toHaveTextContent('Física II');
    expect(screen.getByText('2 salas')).toBeInTheDocument();
  });

  it('si falla la carga ofrece «Reintentar»', async () => {
    const user = userEvent.setup();
    vi.spyOn(roomsApi, 'listMine')
      .mockRejectedValueOnce(new ApiError(500, 'INTERNAL_ERROR', 'boom'))
      .mockResolvedValueOnce({ success: true, rooms: [newer] });
    renderAt();
    expect(await screen.findByRole('heading', { name: 'No pudimos cargar tus salas de estudio' })).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'Reintentar' })[0]);
    expect(await screen.findByRole('heading', { name: 'Cálculo · Taller 3' })).toBeInTheDocument();
  });

  it('el panel con salas no tiene violaciones de axe', async () => {
    vi.spyOn(roomsApi, 'listMine').mockResolvedValue({ success: true, rooms: [older, newer] });
    const { container } = renderAt();
    await screen.findAllByRole('listitem');
    const results = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});

describe('US-06 | E1 y E3 | crear sala', () => {
  const openCreate = async (user: ReturnType<typeof userEvent.setup>) => {
    vi.spyOn(roomsApi, 'listMine').mockResolvedValue({ success: true, rooms: [] });
    renderAt();
    await user.click((await screen.findAllByRole('button', { name: 'Crear sala' }))[0]);
    return screen.getByRole('dialog', { name: 'Crear sala' });
  };

  it('valida nombre vacío y demasiado largo sin crear la sala', async () => {
    const user = userEvent.setup();
    const create = vi.spyOn(roomsApi, 'create');
    const dialog = await openCreate(user);
    const input = within(dialog).getByRole('textbox', { name: 'Nombre de la sala' });
    expect(input).toHaveFocus();

    await user.click(within(dialog).getByRole('button', { name: 'Crear sala' }));
    expect(input).toHaveAccessibleDescription(/El nombre de la sala es obligatorio/);
    expect(input).toHaveFocus();

    await user.type(input, 'x'.repeat(51));
    expect(input).toHaveAccessibleDescription(/supera el límite de 50 caracteres \(actual: 51\)\. Acórtalo en 1 carácter/);
    await user.keyboard('{Enter}');
    expect(create).not.toHaveBeenCalled();
  });

  it('crea la sala y entra a ella como Administrador', async () => {
    const user = userEvent.setup();
    const created: RoomData = { id: 'CCCCCCCCCCCCCCCCCCC3', ownerId: 'salas-qa', name: 'Álgebra', createdAt: new Date().toISOString() };
    const create = vi.spyOn(roomsApi, 'create').mockResolvedValue({ success: true, room: created });
    const dialog = await openCreate(user);
    await user.type(within(dialog).getByRole('textbox', { name: 'Nombre de la sala' }), '  Álgebra  {Enter}');

    expect(create).toHaveBeenCalledWith('Álgebra');
    expect(await screen.findByRole('heading', { level: 1, name: 'Álgebra' })).toBeInTheDocument();
    expect(screen.getByText(/Tu rol:/)).toHaveTextContent('Tu rol: Administrador');
    const confirmation = screen.getByText(/Sala «Álgebra» creada/).closest('[role="status"]');
    expect(confirmation).toHaveFocus();
    expect(screen.getAllByText(created.id).length).toBeGreaterThan(0);
  });

  it('si falla la creación conserva el nombre y lo explica', async () => {
    const user = userEvent.setup();
    vi.spyOn(roomsApi, 'create').mockRejectedValue(new ApiError(500, 'INTERNAL_ERROR', 'boom'));
    const dialog = await openCreate(user);
    const input = within(dialog).getByRole('textbox', { name: 'Nombre de la sala' });
    await user.type(input, 'Álgebra{Enter}');
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Conservamos el nombre que escribiste');
    expect(input).toHaveValue('Álgebra');
  });

  it('Esc cierra la ventana y devuelve el foco a «Crear sala»', async () => {
    const user = userEvent.setup();
    await openCreate(user);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Crear sala' })[0]).toHaveFocus();
  });
});

describe('US-06 | E4 | copiar el ID', () => {
  it('copia al portapapeles con confirmación visible y anunciada', async () => {
    const user = userEvent.setup();
    const write = vi.spyOn(navigator.clipboard, 'writeText');
    vi.spyOn(roomsApi, 'listMine').mockResolvedValue({ success: true, rooms: [newer] });
    renderAt();
    await user.click(await screen.findByRole('button', { name: 'Copiar ID de la sala Cálculo · Taller 3' }));

    expect(write).toHaveBeenCalledWith(newer.id);
    expect(await navigator.clipboard.readText()).toBe(newer.id);
    expect(screen.getByRole('button', { name: 'Copiar ID de la sala Cálculo · Taller 3' })).toHaveTextContent('Copiado');
    const toast = screen.getByText(`ID de sala copiado al portapapeles (${newer.id})`);
    expect(toast.closest('[aria-live="polite"]')).toBeInTheDocument();
  });

  it('si el navegador bloquea el portapapeles lo informa en vez de fingir éxito', async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('denied'));
    vi.spyOn(roomsApi, 'listMine').mockResolvedValue({ success: true, rooms: [newer] });
    renderAt();
    await user.click(await screen.findByRole('button', { name: 'Copiar ID de la sala Cálculo · Taller 3' }));
    expect(await screen.findByText(/No pudimos copiar el ID/)).toBeInTheDocument();
    expect(screen.queryByText('Copiado')).not.toBeInTheDocument();
  });
});

describe('US-06 | vista base de la sala', () => {
  it('se puede abrir por enlace directo (recarga)', async () => {
    vi.spyOn(roomsApi, 'listMine').mockResolvedValue({ success: true, rooms: [older, newer] });
    renderAt(`/salas/${older.id}`);
    expect(await screen.findByRole('heading', { level: 1, name: 'Física II' })).toBeInTheDocument();
  });

  it('informa cuando la sala no está entre las propias', async () => {
    vi.spyOn(roomsApi, 'listMine').mockResolvedValue({ success: true, rooms: [older] });
    renderAt('/salas/ZZZZZZZZZZZZZZZZZZZ9');
    expect(await screen.findByRole('heading', { name: 'No encontramos esta sala entre tus salas' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('link', { name: 'Volver al panel' })).toBeInTheDocument());
  });
});
