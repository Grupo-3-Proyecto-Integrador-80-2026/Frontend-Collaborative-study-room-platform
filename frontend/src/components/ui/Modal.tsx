import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { X } from 'lucide-react';

// Ventana modal accesible reutilizada por «Crear sala» y «Eliminar cuenta»:
// foco atrapado, Esc y clic fuera cierran (salvo mientras se procesa) y, al
// cerrar, el foco vuelve al botón que la abrió (WCAG 2.4.3 y 2.1.2).
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  titleId: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  descriptionId?: string;
  /** Ícono destacado a la izquierda del título. */
  icon?: React.ReactNode;
  closeLabel: string;
  /** Bloquea el cierre mientras hay una operación en curso. */
  busy?: boolean;
  /** Elemento que recibe el foco al abrir; por defecto, el primero enfocable. */
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  size?: 'md' | 'lg';
  children: React.ReactNode;
}

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  titleId,
  title,
  description,
  descriptionId,
  icon,
  closeLabel,
  busy = false,
  initialFocusRef,
  size = 'md',
  children,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const busyRef = useRef(busy);
  useLayoutEffect(() => {
    onCloseRef.current = onClose;
    busyRef.current = busy;
  });

  useEffect(() => {
    if (!isOpen) return;
    const opener = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const target = initialFocusRef?.current ?? dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE);
    target?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (!busyRef.current) onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      const outside = !dialogRef.current.contains(active);
      if (e.shiftKey && (active === first || outside)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || outside)) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (opener && document.contains(opener)) opener.focus();
    };
    // initialFocusRef es estable (useRef); el efecto solo debe correr al abrir o cerrar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={`bg-white rounded-2xl border border-slate-200 shadow-2xl w-full ${size === 'lg' ? 'max-w-lg' : 'max-w-md'} p-5 sm:p-6 max-h-[90vh] overflow-y-auto`}
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            {icon}
            <div>
              <h2 id={titleId} className="text-lg font-bold text-slate-900 [text-wrap:pretty]">
                {title}
              </h2>
              {description && (
                <div id={descriptionId} className="text-sm mt-1 [text-wrap:pretty]">
                  {description}
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            aria-label={closeLabel}
            className="min-h-11 min-w-11 -mr-2 -mt-2 flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};
