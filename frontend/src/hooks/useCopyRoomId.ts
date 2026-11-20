import { useCallback, useEffect, useRef, useState } from 'react';
import type { ToastMessage } from '../components/ui/Toast';

// US-06 E4: copia el ID al portapapeles y devuelve la confirmación visible
// (botón «Copiado» + aviso) que también anuncia el lector de pantalla.
export function useCopyRoomId() {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const copy = useCallback(async (roomId: string) => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard-unavailable');
      await navigator.clipboard.writeText(roomId);
      setCopiedId(roomId);
      setToast({ tone: 'success', text: `ID de la sala copiado al portapapeles (${roomId})` });
      timers.current.push(window.setTimeout(() => setCopiedId(null), 2000));
    } catch {
      setCopiedId(null);
      setToast({ tone: 'error', text: `No pudimos copiar el ID. Selecciónalo y cópialo manualmente: ${roomId}` });
    }
    timers.current.push(window.setTimeout(() => setToast(null), 4000));
  }, []);

  return { copiedId, toast, copy };
}
