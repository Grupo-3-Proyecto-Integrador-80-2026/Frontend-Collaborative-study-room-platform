import React from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

// Mensaje único del producto para errores, confirmaciones e información.
// Los errores usan role="alert" y las confirmaciones role="status" para que
// NVDA y VoiceOver los anuncien automáticamente (S2-C09).
type Tone = 'error' | 'success' | 'info';

const TONE: Record<Tone, { box: string; icon: React.ReactNode; role: 'alert' | 'status' }> = {
  error: {
    box: 'bg-rose-50 border-rose-200 text-rose-800',
    icon: <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" aria-hidden="true" />,
    role: 'alert',
  },
  success: {
    box: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" aria-hidden="true" />,
    role: 'status',
  },
  info: {
    box: 'bg-indigo-50 border-indigo-200 text-indigo-800',
    icon: <Info className="w-5 h-5 text-indigo-600 shrink-0" aria-hidden="true" />,
    role: 'status',
  },
};

interface AlertProps {
  tone: Tone;
  children: React.ReactNode;
  onDismiss?: () => void;
  dismissLabel?: string;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({ tone, children, onDismiss, dismissLabel = 'Cerrar mensaje', className = '' }) => {
  const t = TONE[tone];
  return (
    <div role={t.role} className={`p-4 border rounded-2xl flex items-start justify-between gap-3 text-sm ${t.box} ${className}`}>
      <div className="flex items-start gap-2.5 font-medium">
        {t.icon}
        <div className="[text-wrap:pretty]">{children}</div>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label={dismissLabel}
          className="min-h-11 min-w-11 -m-2 flex items-center justify-center rounded-lg hover:bg-black/5 cursor-pointer shrink-0"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
};
