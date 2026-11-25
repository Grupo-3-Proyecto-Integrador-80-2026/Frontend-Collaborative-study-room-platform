import { useEffect, useId, useRef, useState } from 'react';
import { EllipsisVertical, Pencil, Trash2, TriangleAlert } from 'lucide-react';
import { ApiError, roomsApi, type Room } from '../services/api';
import { Alert } from './ui/Alert';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { RoomNameModal } from './RoomNameModal';

interface Props {
  room: Pick<Room, 'id' | 'name'>;
  inRoom?: boolean;
  onRenamed: (name: string) => void;
  onDeleted: () => void;
  onDeletingChange?: (pending: boolean) => void;
}

export function RoomActions({ room, inRoom, onRenamed, onDeleted, onDeletingChange }: Props) {
  const [action, setAction] = useState<'edit' | 'delete' | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const cancel = useRef<HTMLButtonElement>(null);
  const groupId = useId();
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  async function remove() {
    if (busy) return;
    onDeletingChange?.(true);
    setBusy(true);
    setError('');
    try {
      await roomsApi.remove(room.id);
      if (mounted.current) onDeleted();
    } catch (err) {
      setError(err instanceof ApiError && err.statusCode === 403 ? 'Solo el anfitrión puede eliminar esta sala.'
        : err instanceof ApiError && err.statusCode === 404 ? 'Esta sala ya no existe.'
        : 'No pudimos eliminar la sala. Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      onDeletingChange?.(false);
      setBusy(false);
    }
  }

  const buttonStyle = 'min-h-11 px-3 rounded-xl inline-flex items-center gap-2 text-sm font-semibold';
  return (
    <div className="relative">
      {inRoom && <Button variant="outline" aria-expanded={expanded} aria-controls={groupId}
        icon={<EllipsisVertical size={16} />} onClick={() => setExpanded(!expanded)}>Acciones de la sala</Button>}
      <div id={groupId} hidden={inRoom && !expanded}>
        <div className={inRoom ? 'absolute z-10 mt-1 rounded-xl bg-white shadow-lg border border-slate-200 p-2 grid w-48' : 'flex flex-wrap justify-end gap-2'}>
          <button type="button" className={`${buttonStyle} text-slate-700 hover:bg-indigo-50`} aria-label={`Editar nombre de ${room.name}`} onClick={() => setAction('edit')}>
            <Pencil size={16} aria-hidden="true" />{inRoom ? 'Editar nombre' : 'Editar'}
          </button>
          <button type="button" className={`${buttonStyle} text-rose-700 hover:bg-rose-50`} aria-label={`Eliminar sala ${room.name}`} onClick={() => { setError(''); setAction('delete'); }}>
            <Trash2 size={16} aria-hidden="true" />{inRoom ? 'Eliminar sala' : 'Eliminar'}
          </button>
        </div>
      </div>
      {action === 'edit' && <RoomNameModal isOpen room={room} onClose={() => setAction(null)}
        onRenamed={(name) => { setAction(null); onRenamed(name); }} />}
      {action === 'delete' && <Modal isOpen busy={busy} onClose={() => setAction(null)} initialFocusRef={cancel}
        titleId="delete-room-title" title={`¿Eliminar la sala «${room.name}»?`} closeLabel="Cerrar ventana de eliminar sala"
        size="lg" icon={<TriangleAlert className="text-rose-700 shrink-0" aria-hidden="true" />}
        descriptionId="delete-room-description" description={<strong className="text-rose-700">Esta acción no se puede deshacer.</strong>}>
        <div className="space-y-2 rounded-xl bg-rose-50 border border-rose-200 p-4 text-sm">
          <p>Se borrarán la sala y todos sus mensajes. El ID dejará de funcionar.</p>
          <p>Los participantes conectados recibirán un aviso y volverán a su Panel.</p>
        </div>
        {error && <Alert tone="error" className="mt-4">{error}</Alert>}
        <p role="status" className="sr-only">{busy && 'Eliminando sala…'}</p>
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 mt-5 pt-4 border-t border-slate-200">
          <Button ref={cancel} variant="outline" disabled={busy} onClick={() => setAction(null)}>Cancelar</Button>
          <Button variant="danger" loading={busy} loadingText="Eliminando…" onClick={() => void remove()}>Eliminar sala</Button>
        </div>
      </Modal>}
    </div>
  );
}
