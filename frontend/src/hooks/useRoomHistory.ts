import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, roomsApi } from '../services/api';
import type { ChatMessage } from '../services/chat';

type Operation = 'latest' | 'older';
type Phase = 'loading' | 'loading-older' | 'ready' | 'error';

export function useRoomHistory(roomId: string) {
  const [entries, setEntries] = useState<ChatMessage[]>([]);
  const [phase, setPhase] = useState<Phase>('loading');
  const [notice, setNotice] = useState('');
  const [hasOlder, setHasOlder] = useState(false);
  const request = useRef<AbortController | null>(null);
  const oldestCursor = useRef<string | null>(null);
  const newestId = useRef<string | null>(null);
  const retryOperation = useRef<Operation>('latest');
  useEffect(() => () => request.current?.abort(), [roomId]);

  const load = useCallback(async (operation: Operation) => {
    const older = operation === 'older';
    if (older && (request.current || !oldestCursor.current)) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setPhase(older ? 'loading-older' : 'loading');
    setNotice('');
    let cursor = older ? oldestCursor.current : null;
    const anchor = older ? null : newestId.current;
    const batch: ChatMessage[] = [];
    let overlaps: boolean;
    let newest: string | undefined;
    try {
      do {
        const page = await roomsApi.history(roomId, cursor, controller.signal);
        if (controller.signal.aborted) return;
        const items = page.messages.filter(m => m.roomId === roomId);
        newest ??= items.at(-1)?.id;
        batch.push(...items);
        overlaps = items.some(m => m.id === anchor);
        cursor = page.nextBefore;
        // En una reconexión puede haber más de una página desde la última sincronización.
      } while (anchor && !overlaps && cursor);
      if (!overlaps) oldestCursor.current = cursor;
      setHasOlder(Boolean(oldestCursor.current));
      if (!older) newestId.current = newest ?? null;
      setEntries(prev => {
        const byId = new Map(prev.map(m => [m.id, m]));
        for (const m of batch) byId.set(m.id, m);
        return [...byId.values()];
      });
      setNotice(batch.length ? `Se cargaron ${batch.length} mensajes${older ? ' anteriores' : ''}.` : '');
      setPhase('ready');
    } catch (error) {
      if (controller.signal.aborted) return;
      if (error instanceof ApiError && error.code === 'INVALID_CURSOR') {
        newestId.current = null;
        oldestCursor.current = null;
        setHasOlder(false);
        retryOperation.current = 'latest';
      } else retryOperation.current = operation;
      setPhase('error');
    } finally {
      if (request.current === controller) request.current = null;
    }
  }, [roomId]);

  const syncHistory = useCallback(() => { void load('latest'); }, [load]);
  return { entries, syncHistory, history: {
    phase, notice, hasOlder,
    loadOlder: () => { void load('older'); },
    retry: () => { void load(retryOperation.current); },
  } };
}
