import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
import { watchRoom } from '../src/services/roomEvents';
import type { ChatMessage, SendMessage, SendResult } from '../src/services/chat';

vi.mock('../src/services/roomEvents', () => ({ watchRoom: vi.fn() }));

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
  vi.mocked(watchRoom).mockReturnValue(() => {});
  vi.spyOn(authApi, 'getMyProfile').mockResolvedValue({ success: true, user: profile });
});

describe('US-06 | E2 | panel vacío y con salas', () => {
  it('muestra la carga y luego un mensaje amigable si no hay salas', async () => {
    let finish!: (result: { success: boolean; rooms: RoomData[] }) => void;
    vi.spyOn(roomsApi, 'listMine').mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    renderAt();
    expect(await screen.findByText('Cargando tus salas de estudio...')).toBeInTheDocument();
    await act(async () => finish({ success: true, rooms: [] }));
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

  it('crea la sala y entra a ella como anfitrión', async () => {
    const user = userEvent.setup();
    const created: RoomData = { id: 'CCCCCCCCCCCCCCCCCCC3', ownerId: 'salas-qa', name: 'Álgebra', createdAt: new Date().toISOString() };
    const create = vi.spyOn(roomsApi, 'create').mockResolvedValue({ success: true, room: created });
    const dialog = await openCreate(user);
    vi.spyOn(roomsApi, 'getById').mockResolvedValue({ success: true, room: created });
    await user.type(within(dialog).getByRole('textbox', { name: 'Nombre de la sala' }), '  Álgebra  {Enter}');

    expect(create).toHaveBeenCalledWith('Álgebra');
    expect(await screen.findByRole('heading', { level: 1, name: 'Álgebra' })).toBeInTheDocument();
    expect(screen.getByText(/Tu rol:/)).toHaveTextContent('Tu rol: Anfitrión');
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
    const toast = screen.getByText(`ID de la sala copiado al portapapeles (${newer.id})`);
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
    vi.spyOn(roomsApi, 'getById').mockResolvedValue({ success: true, room: older });
    renderAt(`/salas/${older.id}`);
    expect(await screen.findByRole('heading', { level: 1, name: 'Física II' })).toBeInTheDocument();
  });

  it('informa cuando el servidor confirma que el ID no existe', async () => {
    vi.spyOn(roomsApi, 'getById').mockRejectedValue(new ApiError(404, 'ROOM_NOT_FOUND', 'No existe.'));
    renderAt('/salas/ZZZZZZZZZZZZZZZZZZZ9');
    expect(await screen.findByRole('heading', { name: 'No encontramos esta sala' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('link', { name: 'Volver al panel' })).toBeInTheDocument());
  });
});

describe('US-07 | gestión de salas', () => {
  it('valida, conserva el nombre ante un 403 y actualiza la tarjeta solo tras guardar', async () => {
    const user = userEvent.setup();
    vi.spyOn(roomsApi, 'listMine').mockResolvedValue({ success: true, rooms: [older] });
    const rename = vi.spyOn(roomsApi, 'rename').mockRejectedValueOnce(new ApiError(403, 'HOST_REQUIRED', 'Sin permiso'))
      .mockResolvedValueOnce(null);
    renderAt();
    const opener = await screen.findByRole('button', { name: `Editar nombre de ${older.name}` });
    await user.click(opener);
    const input = screen.getByRole('textbox', { name: 'Nombre de la sala' });
    expect(input).toHaveFocus();
    expect(input).toHaveValue(older.name);
    await user.clear(input);
    await user.type(input, '   {Enter}');
    expect(input).toHaveAccessibleDescription(/obligatorio/);
    expect(rename).not.toHaveBeenCalled();
    await user.type(input, 'Álgebra  {Enter}');
    expect(await screen.findByRole('alert')).toHaveTextContent(/Solo el anfitrión/);
    expect(screen.getByRole('heading', { name: older.name })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(rename).toHaveBeenLastCalledWith(older.id, 'Álgebra');
    expect(await screen.findByRole('heading', { name: 'Álgebra' })).toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it('cancelar no elimina; confirmar la última sala muestra el panel vacío', async () => {
    const user = userEvent.setup();
    vi.spyOn(roomsApi, 'listMine').mockResolvedValue({ success: true, rooms: [older] });
    const remove = vi.spyOn(roomsApi, 'remove').mockResolvedValue(null);
    renderAt();
    const opener = await screen.findByRole('button', { name: `Eliminar sala ${older.name}` });
    await user.click(opener);
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(opener).toHaveFocus();
    expect(remove).not.toHaveBeenCalled();
    await user.click(opener);
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Eliminar sala' }));
    expect(remove).toHaveBeenCalledWith(older.id);
    expect(await screen.findByRole('heading', { name: 'Aún no tienes salas creadas' })).toBeInTheDocument();
    expect(screen.getByText(`Sala «${older.name}» eliminada.`)).toBeInTheDocument();
  });

  it('el anfitrión puede eliminar desde la sala y vuelve al panel', async () => {
    const user = userEvent.setup();
    vi.spyOn(roomsApi, 'getById').mockResolvedValue({ success: true, room: older });
    vi.spyOn(roomsApi, 'listMine').mockResolvedValue({ success: true, rooms: [] });
    let confirmDeletion!: (value: null) => void;
    vi.spyOn(roomsApi, 'remove').mockReturnValue(new Promise<null>((resolve) => { confirmDeletion = resolve; }));
    renderAt(`/salas/${older.id}`);
    await user.click(await screen.findByRole('button', { name: 'Acciones de la sala' }));
    await user.click(screen.getByRole('button', { name: `Eliminar sala ${older.name}` }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Eliminar sala' }));
    act(() => vi.mocked(watchRoom).mock.calls[0][2].deleted());
    expect(screen.getByRole('button', { name: 'Eliminando…' })).toBeDisabled();
    await act(async () => confirmDeletion(null));
    expect(await screen.findByRole('heading', { name: 'Aún no tienes salas creadas' })).toBeInTheDocument();
    expect(screen.getByText(`Sala «${older.name}» eliminada.`)).toBeInTheDocument();
  });

  it('el invitado no tiene acciones, recibe el cambio de nombre y sale con aviso al borrarse la sala', async () => {
    const user = userEvent.setup();
    vi.spyOn(roomsApi, 'getById').mockResolvedValue({ success: true, room: { ...older, ownerId: 'host' } });
    const stop = vi.fn();
    vi.mocked(watchRoom).mockImplementation((_id, _user, events) => {
      events.joined(vi.fn());
      events.renamed(older.name);
      return stop;
    });
    vi.spyOn(roomsApi, 'listMine').mockResolvedValue({ success: true, rooms: [] });
    renderAt(`/salas/${older.id}`);
    await screen.findByRole('heading', { name: older.name });
    expect(screen.getByText(/Tu rol:/)).toHaveTextContent('Participante');
    expect(screen.queryByRole('button', { name: /acciones de la sala|editar|eliminar/i })).not.toBeInTheDocument();
    const events = vi.mocked(watchRoom).mock.calls[0][2];
    act(() => events.renamed('Literatura'));
    expect(screen.getByRole('heading', { name: 'Literatura' })).toBeInTheDocument();
    act(() => events.deleted());
    const alert = await screen.findByRole('alertdialog', { name: 'El anfitrión eliminó la sala «Literatura»' });
    expect(within(alert).getByRole('button', { name: 'Ir al Panel' })).toHaveFocus();
    expect(stop).toHaveBeenCalledOnce();
    await user.keyboard('{Enter}');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Mis salas de estudio' })).toHaveFocus();
  });
});

describe('US-08 | unirse a una sala', () => {
  it('indica cómo corregir un ID vacío o incompleto sin consultar el servidor', async () => {
    const user = userEvent.setup();
    vi.spyOn(roomsApi, 'listMine').mockResolvedValue({ success: true, rooms: [] });
    const lookup = vi.spyOn(roomsApi, 'getById');
    renderAt();
    const input = await screen.findByRole('textbox', { name: 'ID de la sala' });
    await user.type(input, '  {Enter}');
    expect(input).toHaveValue('');
    expect(input).toHaveAccessibleDescription(/Escribe o pega/);
    await user.type(input, 'abc-123{Enter}');
    expect(input).toHaveAccessibleDescription(/20 letras y números/);
    expect(input).toHaveFocus();
    expect(lookup).not.toHaveBeenCalled();
  });

  it('distingue un 404 de un fallo de conexión, conserva el ID y permite reintentar', async () => {
    const user = userEvent.setup();
    vi.spyOn(roomsApi, 'listMine').mockResolvedValue({ success: true, rooms: [] });
    const lookup = vi.spyOn(roomsApi, 'getById')
      .mockRejectedValueOnce(new ApiError(503, 'UNAVAILABLE', 'Sin conexión'))
      .mockRejectedValueOnce(new ApiError(404, 'ROOM_NOT_FOUND', 'No existe.'));
    renderAt();
    const input = await screen.findByRole('textbox', { name: 'ID de la sala' });
    await user.type(input, `${older.id}{Enter}`);
    expect(await screen.findByRole('alert')).toHaveTextContent(/conexión/);
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(input).toHaveAccessibleDescription(/No encontramos una sala con ese ID/);
    expect(input).toHaveValue(older.id);
    expect(lookup).toHaveBeenCalledTimes(2);
    expect(watchRoom).not.toHaveBeenCalled();
  });

  it('un 404 de ruta no disponible no acusa al ID ni inicia el ingreso', async () => {
    const user = userEvent.setup();
    vi.spyOn(roomsApi, 'listMine').mockResolvedValue({ success: true, rooms: [] });
    vi.spyOn(roomsApi, 'getById').mockRejectedValue(new ApiError(404, 'NOT_FOUND', 'La ruta no existe.'));
    renderAt();
    const input = await screen.findByRole('textbox', { name: 'ID de la sala' });
    await user.type(input, `${older.id}{Enter}`);
    expect(await screen.findByRole('alert')).toHaveTextContent(/no está disponible en la API/);
    expect(input).not.toHaveAttribute('aria-invalid', 'true');
    expect(watchRoom).not.toHaveBeenCalled();
  });

  it('recorta el ID, espera la admisión en tiempo real y muestra la presencia de la sala', async () => {
    const user = userEvent.setup();
    vi.spyOn(roomsApi, 'listMine').mockResolvedValue({ success: true, rooms: [] });
    const room = { ...older, ownerId: 'otra-persona' };
    let found!: (result: { success: boolean; room: RoomData }) => void;
    const lookup = vi.spyOn(roomsApi, 'getById').mockImplementationOnce(() => new Promise(resolve => { found = resolve; }))
      .mockResolvedValue({ success: true, room });
    renderAt();
    const input = await screen.findByRole('textbox', { name: 'ID de la sala' });
    await user.type(input, `  ${older.id}  {Enter}`);
    expect(screen.getByRole('button', { name: 'Buscando la sala…' })).toBeDisabled();
    expect(lookup.mock.calls[0][0]).toBe(older.id);
    await act(async () => found({ success: true, room }));
    expect(await screen.findByText('Conectando con la sala…')).toBeInTheDocument();
    const [id, , events] = vi.mocked(watchRoom).mock.calls[0];
    expect(id).toBe(older.id);
    act(() => { events.membersChanged([room.ownerId, sessionUser.uid]); events.joined(vi.fn()); });
    expect(screen.getByRole('heading', { name: room.name })).toHaveFocus();
    expect(screen.getByText(/Tu rol:/)).toHaveTextContent('Participante');
    expect(screen.getByText('2 personas conectadas')).toBeInTheDocument();
    act(() => events.membersChanged([sessionUser.uid]));
    expect(screen.getByText('1 persona conectada')).toBeInTheDocument();
  });
});

describe('US-10 | chat de la sala', () => {
  const message: ChatMessage = {
    id: 'msg-1', roomId: older.id, authorId: 'luis', authorName: 'Luis Díaz',
    createdAt: '2026-11-25T12:30:00.000Z', text: '¿Estudiamos?',
  };

  async function openChat() {
    const send = vi.fn<SendMessage>();
    vi.spyOn(roomsApi, 'getById').mockResolvedValue({ success: true, room: older });
    vi.mocked(watchRoom).mockImplementation((_id, _user, events) => { events.joined(send); return () => {}; });
    renderAt(`/salas/${older.id}`);
    const input = await screen.findByRole('textbox', { name: 'Escribe un mensaje' });
    return { user: userEvent.setup(), input, send, events: vi.mocked(watchRoom).mock.calls[0][2] };
  }

  it('bloquea espacios, admite Shift+Enter y confirma una sola burbuja propia por ACK', async () => {
    const { user, input, send } = await openChat();
    let confirm!: (ack: SendResult) => void;
    send.mockImplementation(() => new Promise(resolve => { confirm = resolve; }));
    await user.type(input, '   {Enter}');
    expect(send).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled();
    await user.type(input, 'Hola{Shift>}{Enter}{/Shift}equipo  {Enter}');
    expect(send).toHaveBeenCalledExactlyOnceWith('Hola\nequipo');
    expect(screen.getByText('Enviando…')).toBeInTheDocument();
    expect(input).toHaveValue('');
    await act(async () => confirm({ status: 'sent', message: { ...message, authorId: sessionUser.uid, authorName: 'Ana Pérez', text: 'Hola\nequipo' } }));
    const log = screen.getByRole('log', { name: 'Mensajes del chat' });
    expect(within(log).getAllByRole('listitem')).toHaveLength(1);
    expect(log).toHaveTextContent('Ana Pérez (tú)');
    expect(log.querySelector('time')).toHaveAttribute('datetime', message.createdAt);
    expect(screen.queryByText('Enviando…')).not.toBeInTheDocument();
    expect(input).toHaveFocus();
  });

  it('anuncia solo mensajes de la sala, sin duplicar ni mover el foco; respeta a quien lee arriba', async () => {
    const { user, input, events } = await openChat();
    const log = screen.getByRole('log');
    Object.defineProperties(log, { clientHeight: { value: 200 }, scrollHeight: { value: 800 } });
    await user.click(input);
    act(() => events.messageReceived(message));
    expect(log.scrollTop).toBe(800);
    log.scrollTop = 100;
    fireEvent.scroll(log);
    act(() => {
      events.messageReceived({ ...message, id: 'otro', roomId: newer.id, text: 'Sala ajena' });
      events.messageReceived(message);
      events.messageReceived({ ...message, id: 'msg-2', text: 'Segundo' });
    });
    expect(within(log).getAllByRole('listitem')).toHaveLength(2);
    expect(log).not.toHaveTextContent('Sala ajena');
    expect(log).toHaveAttribute('aria-live', 'polite');
    expect(log.scrollTop).toBe(100);
    expect(input).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Mensajes nuevos (1)' }));
    expect(log.scrollTop).toBe(800);
    expect(screen.queryByRole('button', { name: /Mensajes nuevos/ })).not.toBeInTheDocument();
  });

  it('conserva el borrador al desconectar y distingue rechazo de envío no confirmado', async () => {
    const { user, input, send, events } = await openChat();
    await user.type(input, 'Mi pregunta');
    act(() => events.unavailable());
    await user.keyboard('{Enter}');
    expect(send).not.toHaveBeenCalled();
    expect(input).toHaveValue('Mi pregunta');
    expect(screen.getByRole('alert')).toHaveTextContent(/conexión/);
    act(() => events.joined(send));
    send.mockResolvedValueOnce({ status: 'failed' }).mockResolvedValueOnce({ status: 'unconfirmed' });
    await user.keyboard('{Enter}');
    expect(await screen.findByRole('alert')).toHaveTextContent('No se envió.');
    await user.click(screen.getByRole('button', { name: 'Reintentar envío' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos confirmar el envío');
    expect(screen.queryByRole('button', { name: 'Reintentar envío' })).not.toBeInTheDocument();
    expect(send).toHaveBeenCalledTimes(2);
    expect(within(screen.getByRole('log')).getAllByRole('listitem')).toHaveLength(1);
  });
});
