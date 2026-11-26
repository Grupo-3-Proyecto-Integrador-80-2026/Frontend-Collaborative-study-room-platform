import { useLayoutEffect, useRef, useState } from 'react';
import { ArrowDown, Loader2, MessageSquare, Send } from 'lucide-react';
import type { ChatEntry } from '../hooks/useRoomChat';
import type { useRoomHistory } from '../hooks/useRoomHistory';
import { MAX_MESSAGE_LENGTH } from '../services/chat';
import { Button } from './ui/Button';

interface Props {
  messages: ChatEntry[];
  liveCount: number;
  latestLive?: ChatEntry;
  history: ReturnType<typeof useRoomHistory>['history'];
  uid: string;
  visibleOnMobile: boolean;
  connected: boolean;
  draft: string;
  setDraft(value: string): void;
  submit(): void;
  retry(message: ChatEntry): void;
}

const clock = new Intl.DateTimeFormat('es-CO', { hour: '2-digit', minute: '2-digit' });
const day = new Intl.DateTimeFormat('es-CO', { dateStyle: 'long' });

export function RoomChat({ messages, liveCount, latestLive, history, uid, visibleOnMobile, connected, draft, setDraft, submit, retry }: Props) {
  const viewport = useRef<HTMLDivElement>(null);
  const firstRow = useRef<{ element: HTMLElement; top: number } | null>(null);
  // Solo los mensajes en vivo cuentan para «Mensajes nuevos», nunca una página anterior.
  const [readCount, setReadCount] = useState<number | null>(null);
  const unread = readCount === null ? 0 : liveCount - readCount;
  useLayoutEffect(() => {
    const box = viewport.current;
    if (!box) return;
    if (readCount === null) box.scrollTop = box.scrollHeight;
    else if (firstRow.current && box.contains(firstRow.current.element)) {
      box.scrollTop += firstRow.current.element.offsetTop - firstRow.current.top;
    }
    const element = box.querySelector<HTMLElement>('li');
    firstRow.current = element ? { element, top: element.offsetTop } : null;
  }, [messages, readCount, visibleOnMobile]);

  return (
    <section id="room-chat" aria-labelledby="room-chat-title" className={`${visibleOnMobile ? 'block' : 'hidden lg:block'} lg:col-span-8 min-w-0 self-start bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm`}>
      <header className="px-5 py-4 flex justify-between gap-3 border-b border-slate-200">
        <h2 id="room-chat-title" className="flex items-center gap-2 font-bold text-slate-900">
          <MessageSquare size={18} className="text-indigo-600" aria-hidden="true" />Chat
        </h2>
        <span className="text-sm text-slate-600">{messages.length} {messages.length === 1 ? 'mensaje' : 'mensajes'}</span>
      </header>
      <div className="px-4 py-2 text-center text-sm text-slate-700">
        {history.phase === 'loading' ? <p role="status" className="inline-flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin text-indigo-600" aria-hidden="true" />Cargando mensajes…</p>
          : history.phase === 'error' ? <div className="rounded-xl bg-rose-50 p-2">
            <p role="alert">No pudimos cargar los mensajes. Revisa tu conexión.</p>
            <Button variant="outline" onClick={() => {
              viewport.current?.focus({ preventScroll: true });
              history.retry();
            }}>Reintentar historial</Button>
          </div>
          : history.hasOlder ? <Button variant="outline" loading={history.phase === 'loading-older'} loadingText="Cargando anteriores…"
            onClick={() => {
              setReadCount(prev => prev ?? liveCount);
              viewport.current?.focus({ preventScroll: true });
              history.loadOlder();
            }}>Cargar mensajes anteriores</Button>
          : messages.length > 0 && <p>Este es el inicio de la conversación</p>}
      </div>
      <p className="sr-only" role="status">{history.phase === 'loading-older' ? 'Cargando mensajes anteriores…' : history.notice}</p>
      {/* Los lotes se anuncian con un resumen, no leyendo hasta 50 mensajes seguidos. */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {latestLive && !latestLive.status && <span key={latestLive.id}>{latestLive.authorName}: {latestLive.text}</span>}
      </div>
      <div ref={viewport} role="log" aria-live="off" aria-label="Mensajes del chat" tabIndex={0}
        onScroll={e => {
          const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
          const atEnd = scrollHeight - scrollTop - clientHeight <= 16;
          setReadCount(previous => atEnd ? null : previous ?? liveCount);
        }}
        className="relative h-[48dvh] lg:h-[420px] overflow-y-auto [overflow-anchor:none] overscroll-contain p-4 sm:p-5 bg-slate-50">
        {!messages.length && history.phase === 'ready' && <p className="text-center text-sm text-slate-600 py-8">Aún no hay mensajes en esta sala. Escribe el primero para empezar la conversación.</p>}
        <ul className="space-y-3.5">
          {messages.map((message, index) => {
            const own = message.authorId === uid;
            const date = day.format(new Date(message.createdAt));
            return (
              <li key={message.localKey ?? message.id} className={`flex flex-col ${own ? 'items-end' : 'items-start'}`}>
                {(index === 0 || date !== day.format(new Date(messages[index - 1].createdAt))) &&
                  <span className="self-center text-xs font-semibold text-slate-600 my-2">{date}</span>}
                <div className="max-w-[85%] text-xs text-slate-700 break-words">
                  <strong>{message.authorName}{own && ' (tú)'}</strong>{' · '}
                  <time dateTime={message.createdAt}>{clock.format(new Date(message.createdAt))}</time>
                </div>
                <p className={`mt-1 max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap break-words ${own
                  ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm'}`}>{message.text}</p>
                {message.status === 'sending' && <span className="text-xs text-slate-600">Enviando…</span>}
                {message.status === 'failed' && <div role="alert" className="text-sm text-rose-700">No se envió.{' '}
                  <button type="button" disabled={!connected} className="min-h-11 underline font-semibold" onClick={() => retry(message)}>Reintentar envío</button>
                </div>}
                {message.status === 'unconfirmed' && <p role="alert" className="text-xs text-amber-800">No pudimos confirmar el envío. Revisa el chat antes de volver a enviarlo.</p>}
              </li>
            );
          })}
        </ul>
      </div>
      {unread > 0 && <div className="flex justify-center py-1">
        <Button onClick={() => { viewport.current?.focus({ preventScroll: true }); setReadCount(null); }}
          icon={<ArrowDown size={16} aria-hidden="true" />}>Mensajes nuevos ({unread})</Button>
      </div>}
      <form className="p-3 sm:p-5 border-t border-slate-200" onSubmit={e => { e.preventDefault(); submit(); }}>
        <div className="flex items-end gap-2">
          <label htmlFor="chat-draft" className="sr-only">Escribe un mensaje</label>
          <textarea id="chat-draft" rows={1} maxLength={MAX_MESSAGE_LENGTH} value={draft} onChange={e => setDraft(e.target.value)}
            aria-describedby="chat-help" placeholder="Escribe un mensaje"
            className="flex-1 min-w-0 min-h-12 max-h-32 p-3 text-base sm:text-sm border border-slate-500 rounded-xl bg-slate-50"
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                if (!e.repeat) e.currentTarget.form?.requestSubmit();
              }
            }} />
          <Button type="submit" fullWidthOnMobile={false} disabled={!connected || !draft.trim()}
            icon={<Send size={16} aria-hidden="true" />}>Enviar</Button>
        </div>
        <p id="chat-help" className="mt-2 text-xs text-slate-600">
          {connected ? 'Enter para enviar · Shift+Enter para salto de línea' : 'El envío estará disponible al conectar con la sala.'}
          {draft.length >= 1800 && ` · ${draft.length}/${MAX_MESSAGE_LENGTH}`}
        </p>
      </form>
    </section>
  );
}
