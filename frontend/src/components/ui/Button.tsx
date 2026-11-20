import React from 'react';
import { Loader2 } from 'lucide-react';

// Botón único del producto (S2-C05: un mismo botón en todas las pantallas).
// Las variantes replican las del prototipo aprobado.
type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'danger-soft';

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm',
  secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-700',
  outline: 'bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 hover:text-indigo-700',
  ghost: 'text-slate-600 hover:bg-slate-100',
  danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm',
  'danger-soft': 'bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-700',
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  /** Muestra el indicador de carga y deshabilita el botón. */
  loading?: boolean;
  /** Texto mientras carga (por ejemplo «Guardando cambios...»). */
  loadingText?: string;
  icon?: React.ReactNode;
  fullWidthOnMobile?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      loading = false,
      loadingText,
      icon,
      fullWidthOnMobile = true,
      className = '',
      children,
      disabled,
      type = 'button',
      ...rest
    },
    ref
  ) => (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`${fullWidthOnMobile ? 'w-full sm:w-auto' : ''} min-h-12 px-5 py-2.5 inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-70 ${VARIANT_CLASSES[variant]} ${className}`}
      {...rest}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" /> : icon}
      <span>{loading && loadingText ? loadingText : children}</span>
    </button>
  )
);
Button.displayName = 'Button';
