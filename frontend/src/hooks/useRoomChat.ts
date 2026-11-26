import { useMemo, useState } from 'react';
import { useRoomHistory } from './useRoomHistory';
import { MAX_MESSAGE_LENGTH, type ChatMessage, type SendMessage } from '../services/chat';

export interface ChatEntry extends ChatMessage {
  localKey?: string;
  status?: 'sending' | 'failed' | 'unconfirmed';
}

export function useRoomChat(roomId: string, authorId: string, authorName: string) {
  const [messages, setMessages] = useState<ChatEntry[]>([]);
  const [draft, setDraft] = useState('');
  const [sender, setSender] = useState<SendMessage | null>(null);
  const { entries, history, syncHistory } = useRoomHistory(roomId);
  const timeline = useMemo(() => {
    const byId = new Map<string, ChatEntry>(entries.map(m => [m.id, m]));
    for (const m of messages) byId.set(m.id, m);
    return [...byId.values()].sort((a, b) =>
      Date.parse(a.createdAt) - Date.parse(b.createdAt) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  }, [entries, messages]);

  function received(message: ChatMessage) {
    if (message.roomId !== roomId) return;
    setMessages(prev => prev.some(m => m.id === message.id) ? prev : [...prev, message]);
  }

  async function deliver(localId: string, text: string, send: SendMessage) {
    const result = await send(text);
    setMessages(prev => {
      if (result.status === 'sent') {
        const confirmed = result.message;
        if (prev.some(m => m.id === confirmed.id)) return prev.filter(m => m.id !== localId);
        return prev.map(m => m.id === localId ? { ...confirmed, localKey: localId } : m);
      }
      return prev.map(m => m.id === localId ? { ...m, status: result.status } : m);
    });
  }

  function submit() {
    const text = draft.trim();
    if (!sender || !text || text.length > MAX_MESSAGE_LENGTH) return;
    const id = `local:${crypto.randomUUID()}`;
    setMessages(prev => [...prev, { id, roomId, authorId, authorName, text, createdAt: new Date().toISOString(), status: 'sending' }]);
    setDraft('');
    void deliver(id, text, sender);
  }

  function retry(message: ChatEntry) {
    if (!sender || message.status !== 'failed') return;
    setMessages(prev => prev.map(m => m.id === message.id ? { ...m, status: 'sending' } : m));
    void deliver(message.id, message.text, sender);
  }

  return { messages: timeline, liveCount: messages.length, latestLive: messages.at(-1), history, syncHistory,
    draft, setDraft, submit, retry, connected: Boolean(sender), received, setSender };
}
