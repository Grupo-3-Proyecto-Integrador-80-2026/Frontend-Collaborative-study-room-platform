import { io } from 'socket.io-client';
import type { User } from 'firebase/auth';
import { MAX_MESSAGE_LENGTH, type ChatMessage, type SendMessage } from './chat';

interface RoomListeners {
  joined(send: SendMessage): void;
  messageReceived(message: ChatMessage): void;
  membersChanged(members: string[]): void;
  renamed(name: string): void;
  deleted(): void;
  missing(): void;
  unavailable(): void;
}

/** Una suscripción por vista. El servidor deja el canal al desconectar el socket. */
export function watchRoom(roomId: string, user: User, listeners: RoomListeners) {
  const url = import.meta.env.VITE_REALTIME_URL || (import.meta.env.DEV ? 'http://localhost:3001' : '');
  if (!url) {
    listeners.unavailable();
    return () => {};
  }
  let active = true;
  let joinedBefore = false;
  let admitted = false;
  const members = new Set<string>();
  const socket = io(url, {
    autoConnect: false,
    auth: (done) => {
      void user.getIdToken().then(token => { if (active) done({ token }); })
        .catch(() => { if (active) listeners.unavailable(); });
    },
  });
  const send: SendMessage = async (value) => {
    const text = value.trim();
    if (!active || !admitted || !socket.connected || !text || text.length > MAX_MESSAGE_LENGTH) {
      return { status: 'failed' };
    }
    try {
      const ack = await socket.timeout(8000).emitWithAck('message:send', { roomId, text });
      if (ack?.ok === false) return { status: 'failed' };
      return ack?.ok && ack.message?.roomId === roomId
        ? { status: 'sent', message: ack.message }
        : { status: 'unconfirmed' };
    } catch {
      return { status: 'unconfirmed' };
    }
  };
  socket.on('message:new', (message: ChatMessage) => {
    if (message?.roomId === roomId) listeners.messageReceived(message);
  });
  socket.on('connect', async () => {
    const connection = socket.id;
    try {
      const ack = await socket.timeout(8000).emitWithAck('room:join', { roomId });
      if (!active || !socket.connected || connection !== socket.id) return;
      if (ack.ok && ack.roomId === roomId) {
        members.clear();
        for (const uid of ack.members) members.add(uid);
        listeners.membersChanged([...members]);
        joinedBefore = true;
        admitted = true;
        listeners.joined(send);
      } else if (ack.code === 'ROOM_NOT_FOUND' || ack.code === 'INVALID_ROOM_ID') {
        if (joinedBefore) listeners.deleted();
        else listeners.missing();
      } else listeners.unavailable();
    } catch {
      if (active && connection === socket.id) listeners.unavailable();
    }
  });
  socket.on('presence:joined', ({ roomId: id, uid }) => {
    if (id !== roomId) return;
    members.add(uid);
    listeners.membersChanged([...members]);
  });
  socket.on('presence:left', ({ roomId: id, uid }) => {
    if (id !== roomId) return;
    members.delete(uid);
    listeners.membersChanged([...members]);
  });
  socket.on('room:updated', (data) => {
    if (data?.roomId === roomId && typeof data.name === 'string') listeners.renamed(data.name);
  });
  socket.on('room:deleted', (data) => {
    if (data?.roomId === roomId) {
      admitted = false;
      listeners.deleted();
    }
  });
  socket.on('connect_error', listeners.unavailable);
  socket.on('disconnect', (reason) => {
    admitted = false;
    listeners.unavailable();
    // El servidor cierra la conexión cuando vence el token.
    if (reason === 'io server disconnect') socket.connect();
  });
  socket.connect();
  return () => {
    active = false;
    socket.removeAllListeners();
    socket.disconnect();
  };
}
