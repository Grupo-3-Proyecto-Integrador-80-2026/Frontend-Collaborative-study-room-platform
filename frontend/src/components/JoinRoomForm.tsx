import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError, roomsApi } from '../services/api';
import { isRoomId, missingRoomHelp, roomIdHelp } from '../utils/roomInvitation';
import { Button } from './ui/Button';
import { TextField } from './ui/TextField';
import { Alert } from './ui/Alert';

export function JoinRoomForm() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [serviceError, setServiceError] = useState('');
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (request.current) return;
    const id = code.trim();
    setCode(id);
    setServiceError('');
    if (!isRoomId(id)) {
      setFieldError(id ? roomIdHelp : 'Escribe o pega el ID de la sala que te compartieron.');
      input.current?.focus();
      return;
    }
    setFieldError('');
    setBusy(true);
    const controller = new AbortController();
    request.current = controller;
    try {
      await roomsApi.getById(id, controller.signal);
      if (!controller.signal.aborted) navigate(`/salas/${id}`);
    } catch (err) {
      if (controller.signal.aborted) return;
      if (err instanceof ApiError && (err.code === 'ROOM_NOT_FOUND' || err.code === 'INVALID_ROOM_ID')) {
        setFieldError(err.code === 'ROOM_NOT_FOUND' ? missingRoomHelp : roomIdHelp);
        input.current?.focus();
      } else if (err instanceof ApiError && err.statusCode === 404) {
        setServiceError('La consulta de salas por ID no está disponible en la API.');
      } else {
        setServiceError(err instanceof ApiError && err.statusCode === 403
          ? 'Tu cuenta no tiene permiso para entrar en esta sala.'
          : 'No pudimos buscar la sala. Revisa tu conexión e inténtalo de nuevo.');
      }
    } finally {
      request.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  return (
    <section aria-labelledby="join-title" className={`bg-white rounded-2xl border p-5 sm:p-6 shadow-sm ${fieldError || serviceError ? 'border-rose-300' : 'border-slate-200'}`}>
      <h2 id="join-title" className="text-base font-bold text-slate-900 mb-3">Unirse a una sala</h2>
      <form onSubmit={submit} noValidate aria-busy={busy} className="space-y-3">
        <TextField id="join-id" label="ID de la sala" ref={input} value={code} readOnly={busy}
          autoCapitalize="none" autoComplete="off" spellCheck={false} placeholder="Ej: p3Ln8QsWv5YdK2xJm7Rc"
          error={fieldError} announceError help="Son 20 letras y números. Pídeselo al anfitrión de la sala."
          onChange={e => { setCode(e.target.value); setFieldError(''); setServiceError(''); }} />
        {serviceError && <Alert tone="error">{serviceError}</Alert>}
        <Button type="submit" variant="outline" loading={busy} loadingText="Buscando la sala…"
          fullWidthOnMobile={false} className="w-full border-indigo-600 text-indigo-700">
          {serviceError ? 'Reintentar' : 'Unirse'}
        </Button>
      </form>
      <span role="status" className="sr-only">{busy && 'Buscando la sala…'}</span>
    </section>
  );
}
