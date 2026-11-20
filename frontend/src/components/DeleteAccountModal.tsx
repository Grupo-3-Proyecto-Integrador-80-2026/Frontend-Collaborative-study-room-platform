import React, { useRef, useState } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { ApiError, profileApi } from '../services/api';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Alert } from './ui/Alert';

interface DeleteAccountModalProps {
  isOpen: boolean;
  username: string;
  onClose: () => void;
  /** Se llama solo cuando la API confirmó la eliminación (204). */
  onDeleted: () => Promise<void> | void;
}

// US-05: advertencia crítica antes de llamar a DELETE /api/users/me.
// El texto de salas y mensajes refleja la política implementada en la API
// (docs/US-05-eliminar-cuenta.md del repositorio Backend-API).
export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({ isOpen, username, onClose, onDeleted }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  const close = () => {
    if (isDeleting) return;
    setDeleteError(null);
    onClose();
  };

  const handleConfirm = async () => {
    setDeleteError(null);
    setIsDeleting(true);
    try {
      await profileApi.deleteAccount();
      await onDeleted();
    } catch (err) {
      // Si falla, la sesión se conserva y se puede reintentar (la API tolera reintentos).
      setDeleteError(
        err instanceof ApiError && err.statusCode === 401
          ? 'Tu sesión expiró. Cierra sesión e ingresa de nuevo para eliminar tu cuenta.'
          : 'No pudimos eliminar tu cuenta en este momento. Tu sesión sigue activa: puedes intentarlo de nuevo o cancelar.'
      );
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      busy={isDeleting}
      size="lg"
      titleId="delete-account-title"
      title="¿Eliminar tu cuenta definitivamente?"
      descriptionId="delete-account-warning"
      description={<p className="text-sm text-rose-700 font-semibold">Esta acción es irreversible y no se puede deshacer.</p>}
      icon={
        <div className="w-11 h-11 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0" aria-hidden="true">
          <AlertTriangle className="w-6 h-6" />
        </div>
      }
      closeLabel="Cerrar ventana de advertencia"
      initialFocusRef={cancelRef}
    >
      <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-200 text-sm text-slate-700 space-y-2.5 mb-5">
        <p className="font-semibold text-slate-900">Al confirmar la eliminación ocurrirá lo siguiente:</p>
        <ul className="space-y-2 list-disc pl-5">
          <li>
            <strong>Borrado permanente de tu cuenta:</strong> se eliminarán tu perfil, tu avatar y tu acceso al Salón de Estudio Colaborativo.
          </li>
          <li>
            <strong>Liberación de tu nombre de usuario:</strong>{' '}
            <span className="font-mono text-rose-800 font-semibold break-words">@{username}</span> quedará disponible para que otro estudiante pueda usarlo.
          </li>
          <li>
            <strong>Salas y mensajes:</strong> las salas donde eres Administrador se eliminarán con todos sus mensajes, incluidos los de otros participantes. Tus mensajes en otras salas también se eliminarán.
          </li>
        </ul>
      </div>

      {deleteError && (
        <Alert tone="error" className="mb-5">
          {deleteError}
        </Alert>
      )}
      <p role="status" className="sr-only">
        {isDeleting ? 'Eliminando tu cuenta...' : ''}
      </p>

      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-4 border-t border-slate-200">
        <Button ref={cancelRef} variant="secondary" onClick={close} disabled={isDeleting}>
          Cancelar
        </Button>
        <Button
          variant="danger"
          onClick={handleConfirm}
          loading={isDeleting}
          loadingText="Eliminando cuenta..."
          icon={<Trash2 className="w-4 h-4" aria-hidden="true" />}
        >
          {deleteError ? 'Intentar de nuevo' : 'Eliminar cuenta definitivamente'}
        </Button>
      </div>
    </Modal>
  );
};
