import React from 'react';
import { AlertCircle } from 'lucide-react';

// Campo único del producto: etiqueta asociada, ayuda y error enlazados con
// aria-describedby, y estilo de error del prototipo (S2-C05 / S2-C09).
interface TextFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  id: string;
  label: React.ReactNode;
  error?: string;
  help?: React.ReactNode;
  /** Ícono o texto fijo a la izquierda del campo (por ejemplo «@»). */
  leading?: React.ReactNode;
  /** Contenido a la derecha de la etiqueta (por ejemplo un contador). */
  labelAside?: React.ReactNode;
  /** Control dentro del campo, a la derecha (por ejemplo «Mostrar contraseña»). */
  trailing?: React.ReactNode;
  /** Anuncia el error en cuanto aparece (role="alert"); útil en formularios largos. */
  announceError?: boolean;
}

export const TextField = React.forwardRef<HTMLInputElement, TextFieldProps>(
  ({ id, label, error, help, leading, labelAside, trailing, announceError = false, className = '', ...rest }, ref) => {
    // Como en el prototipo, la ayuda se reemplaza por el error mientras exista.
    const showHelp = Boolean(help) && !error;
    const helpId = showHelp ? `${id}-help` : undefined;
    const errorId = error ? `${id}-error` : undefined;
    const describedBy = [errorId, helpId].filter(Boolean).join(' ') || undefined;

    return (
      <div className={className}>
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <label htmlFor={id} className="block text-sm font-semibold text-slate-700">
            {label}
          </label>
          {labelAside}
        </div>
        <div className="relative">
          {leading && (
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" aria-hidden="true">
              {leading}
            </span>
          )}
          <input
            ref={ref}
            id={id}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={`w-full min-h-12 ${leading ? 'pl-10' : 'pl-3.5'} ${trailing ? 'pr-28' : 'pr-3.5'} py-2.5 text-base sm:text-sm rounded-xl transition-colors disabled:opacity-70 ${
              error
                ? 'bg-rose-50/50 border border-rose-600 text-rose-900'
                : 'bg-slate-50 border border-slate-500 focus:bg-white text-slate-900'
            }`}
            {...rest}
          />
          {trailing && <span className="absolute right-1.5 top-1/2 -translate-y-1/2">{trailing}</span>}
        </div>
        {error && (
          <p id={errorId} role={announceError ? 'alert' : undefined} className="text-xs text-rose-700 mt-1.5 font-medium flex items-start gap-1">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
            <span className="[text-wrap:pretty]">{error}</span>
          </p>
        )}
        {showHelp && (
          <p id={helpId} className="text-xs text-slate-600 mt-1">
            {help}
          </p>
        )}
      </div>
    );
  }
);
TextField.displayName = 'TextField';
