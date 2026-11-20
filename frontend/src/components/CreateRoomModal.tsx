import React, { useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { ApiError, roomsApi, type Room } from '../services/api';
import { Modal } from './ui/Modal';
import { TextField } from './ui/TextField';
import { Button } from './ui/Button';
import { Alert } from './ui/Alert';

// Límite del prototipo aprobado. La API admite hasta 80, así que 50 siempre pasa.
export const MAX_ROOM_NAME_LENGTH = 50;

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (room: Room) => void;
}

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({ isOpen, onClose, onCreated }) => {
  const [roomName, setRoomName] = useState('');
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
      const { room } = await roomsApi.create(roomName.trim());
      setIsSubmitting(false);
      setRoomName('');
      setTouched(false);
      onCreated(room);
    } catch (err) {
      setIsSubmitting(false);
      if (err instanceof ApiError && err.code === 'INVALID_ROOM_NAME') {
        setServerError(err.message);
      } else if (err instanceof ApiError && err.statusCode < 500 && err.code !== 'ERROR_DESCONOCIDO') {
        setServerError(err.message);
      } else {
        setServerError(
          'No pudimos crear la sala en este momento por un problema de conexión. Conservamos el nombre que escribiste para que puedas intentarlo de nuevo.'
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
      titleId="create-room-title"
      title="Crear sala"
      descriptionId="create-room-description"
      description={<p className="text-slate-600">Elige un nombre para tu sala y generaremos un ID único para compartir.</p>}
      closeLabel="Cerrar ventana de crear sala"
      initialFocusRef={inputRef}
    >
      {serverError && (
        <Alert tone="error" className="mb-4">
          {serverError}
        </Alert>
      )}
      <p role="status" className="sr-only">
        {isSubmitting ? 'Creando sala...' : ''}
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
          <Button type="submit" loading={isSubmitting} loadingText="Creando sala..." icon={<Plus className="w-4 h-4" aria-hidden="true" />}>
            Crear sala
          </Button>
        </div>
      </form>
    </Modal>
  );
};
