import React from 'react';
import { AlertCircle, Check } from 'lucide-react';

export interface ToastMessage {
  tone: 'success' | 'error';
  text: string;
}

// Aviso flotante del prototipo. La región viva queda montada siempre para que
// NVDA/VoiceOver anuncien el mensaje en cuanto aparece (S2-C09).
export const Toast: React.FC<{ message: ToastMessage | null }> = ({ message }) => (
  <div aria-live="polite" aria-atomic="true" className="fixed top-20 right-4 left-4 sm:left-auto z-50 pointer-events-none flex justify-end">
    {message && (
      <div
        role="status"
        className="pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-xl bg-slate-900 text-white text-sm font-semibold shadow-xl border border-slate-700 max-w-md"
      >
        {message.tone === 'success' ? (
          <Check className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
        ) : (
          <AlertCircle className="w-4 h-4 text-rose-300 shrink-0" aria-hidden="true" />
        )}
        <span className="break-all sm:break-normal">{message.text}</span>
      </div>
    )}
  </div>
);
