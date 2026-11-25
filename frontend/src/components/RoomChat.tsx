import { useLayoutEffect, useRef, useState } from 'react';
import { ArrowDown, MessageSquare, Send } from 'lucide-react';
import type { ChatEntry } from '../hooks/useRoomChat';
import { MAX_MESSAGE_LENGTH } from '../services/chat';
import { Button } from './ui/Button';

interface Props {
  messages: ChatEntry[];
  uid: string;
  visibleOnMobile: boolean;
  connected: boolean;
  draft: string;
  setDraft(value: string): void;
  submit(): void;
  retry(message: ChatEntry): void;
}

const clock = new Intl.DateTimeFormat('es-CO', { hour: '2-digit', minute: '2-digit' });

export function RoomChat({ messages, uid, visibleOnMobile, connected, draft, setDraft, submit, retry }: Props) {
  const viewport = useRef<HTMLDivElement>(null);
  // null: seguir el final; número: cuántos mensajes había al desplazarse hacia arriba.
  const [readCount, setReadCount] = useState<number | null>(null);
  const unread = readCount === null ? 0 : messages.length - readCount;
  useLayoutEffect(() => {
    if (readCount === null && viewport.current) viewport.current.scrollTop = viewport.current.scrollHeight;
  }, [messages, readCount, visibleOnMobile]);

  return (
    <section id="room-chat" aria-labelledby="room-chat-title" className={`${visibleOnMobile ? 'block' : 'hidden lg:block'} lg:col-span-8 min-w-0 self-start bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm`}>
      <header className="px-5 py-4 flex justify-between gap-3 border-b border-slate-200">
        <h2 id="room-chat-title" className="flex items-center gap-2 font-bold text-slate-900">
          <MessageSquare size={18} className="text-indigo-600" aria-hidden="true" />Chat
        </h2>
        <span className="text-sm text-slate-600">{messages.length} {messages.length === 1 ? 'mensaje' : 'mensajes'}</span>
      </header>
      <div ref={viewport} role="log" aria-live="polite" aria-relevant="additions" aria-label="Mensajes del chat" tabIndex={0}
        onScroll={e => {
          const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
          const atEnd = scrollHeight - scrollTop - clientHeight <= 16;
          setReadCount(previous => atEnd ? null : previous ?? messages.length);
        }}
        className="h-[48dvh] lg:h-[420px] overflow-y-auto overscroll-contain p-4 sm:p-5 bg-slate-50">
        {!messages.length && <p className="text-center text-sm text-slate-600 py-8">Aún no hay mensajes en esta sesión. Escribe el primero para empezar la conversación.</p>}
        <ul className="space-y-3.5">
          {messages.map(message => {
            const own = message.authorId === uid;
            return (
              <li key={message.localKey ?? message.id} className={`flex flex-col ${own ? 'items-end' : 'items-start'}`}>
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
