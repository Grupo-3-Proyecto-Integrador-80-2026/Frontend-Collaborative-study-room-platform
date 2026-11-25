import React, { useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { ApiError, roomsApi, type Room } from '../services/api';
import { Modal } from './ui/Modal';
import { TextField } from './ui/TextField';
import { Button } from './ui/Button';
import { Alert } from './ui/Alert';

// Límite del prototipo aprobado. La API admite hasta 80, así que 50 siempre pasa.
const MAX_ROOM_NAME_LENGTH = 50;

type RoomNameModalProps = {
  isOpen: boolean;
  onClose: () => void;
} & ({ room?: undefined; onCreated: (room: Room) => void } |
     { room: Pick<Room, 'name' | 'id'>; onRenamed: (name: string) => void });

export const RoomNameModal: React.FC<RoomNameModalProps> = (props) => {
  const { isOpen, onClose, room } = props;
  const [roomName, setRoomName] = useState(room?.name ?? '');
  const [touched, setTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const rawLength = roomName.length;
  const isEmpty = roomName.trim().length === 0;
  const exceedsMax = rawLength > MAX_ROOM_NAME_LENGTH;

  let nameError: string | undefined;
  if (exceedsMax) {
    const excess = rawLength - MAX_ROOM_NAME_LENGTH;
    nameError = `El nombre supera el límite de ${MAX_ROOM_NAME_LENGTH} caracteres (actual: ${rawLength}). Acórtalo en ${excess} ${
      excess === 1 ? 'carácter' : 'caracteres'
    } para continuar.`;
  } else if (touched && isEmpty) {
    nameError = `El nombre de la sala es obligatorio. Escribe entre 1 y ${MAX_ROOM_NAME_LENGTH} caracteres para identificarla.`;
  }

  const close = () => {
    if (isSubmitting) return;
    setRoomName('');
    setTouched(false);
    setServerError(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setTouched(true);
    setServerError(null);
    // US-06 E3: nombre vacío o demasiado largo no se envía.
    if (isEmpty || exceedsMax) {
      inputRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      const name = roomName.trim();
      if (props.room) {
        await roomsApi.rename(props.room.id, name);
        props.onRenamed(name);
      } else {
        const result = await roomsApi.create(name);
        setRoomName('');
        setTouched(false);
        props.onCreated(result.room);
      }
      setIsSubmitting(false);
    } catch (err) {
      setIsSubmitting(false);
      if (err instanceof ApiError && err.statusCode === 403) {
        setServerError('Solo el anfitrión puede editar esta sala.');
      } else if (err instanceof ApiError && err.statusCode < 500 && err.code !== 'ERROR_DESCONOCIDO') {
        setServerError(err.message);
      } else {
        setServerError(
          `No pudimos ${room ? 'editar' : 'crear'} la sala en este momento. Conservamos el nombre que escribiste para que puedas intentarlo de nuevo.`
        );
      }
    }
  };

  const counterTone = exceedsMax ? 'text-rose-700 font-semibold' : rawLength >= 40 ? 'text-amber-700' : 'text-slate-600';

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      busy={isSubmitting}
      titleId="room-name-title"
      title={room ? 'Editar nombre de la sala' : 'Crear sala'}
      descriptionId="room-name-description"
      description={<p className="text-slate-600">{room ? 'El cambio se reflejará de inmediato en la sala y en tu Panel.' : 'Elige un nombre para tu sala y generaremos un ID único para compartir.'}</p>}
      closeLabel={room ? 'Cerrar ventana de editar nombre' : 'Cerrar ventana de crear sala'}
      initialFocusRef={inputRef}
    >
      {serverError && (
        <Alert tone="error" className="mb-4">
          {serverError}
        </Alert>
      )}
      <p role="status" className="sr-only">
        {isSubmitting && (room ? 'Guardando…' : 'Creando sala...')}
      </p>

      <form onSubmit={handleSubmit} noValidate aria-busy={isSubmitting} className="space-y-4 mt-5">
        <TextField
          id="room-name-input"
          ref={inputRef}
          label="Nombre de la sala"
          labelAside={
            <span className={`text-xs font-mono tabular-nums font-medium ${counterTone}`} aria-hidden="true">
              {rawLength}/{MAX_ROOM_NAME_LENGTH}
            </span>
          }
          value={roomName}
          disabled={isSubmitting}
          placeholder="Ej: Taller de Cálculo Multivariable"
          autoComplete="off"
          error={nameError}
          announceError
          help={`Máximo ${MAX_ROOM_NAME_LENGTH} caracteres.`}
          onChange={(e) => {
            setRoomName(e.target.value);
            if (!touched) setTouched(true);
          }}
          onBlur={() => setTouched(true)}
        />

        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-200">
          <Button variant="ghost" onClick={close} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" loading={isSubmitting} loadingText={room ? 'Guardando…' : 'Creando sala...'} icon={!room && <Plus className="w-4 h-4" aria-hidden="true" />}>
            {room ? 'Guardar' : 'Crear sala'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
