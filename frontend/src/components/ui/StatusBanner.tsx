import React from 'react';
import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { Button } from './Button';

// Franja de estado de página del prototipo: «Cargando…» o error con «Reintentar».
export const LoadingBanner: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div role="status" className="mb-6 bg-indigo-50 border border-indigo-200 rounded-2xl py-3 px-4 text-sm text-indigo-800 font-medium flex items-center justify-center gap-2 text-center">
    <Loader2 className="w-4 h-4 animate-spin text-indigo-600 shrink-0" aria-hidden="true" />
    <span>{children}</span>
  </div>
);

export const ErrorBanner: React.FC<{ title: string; children: React.ReactNode; onRetry: () => void }> = ({ title, children, onRetry }) => (
  <div className="mb-6 bg-rose-50 border border-rose-200 rounded-2xl py-3.5 px-4 sm:px-6">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm text-rose-800">
      <div className="flex items-start sm:items-center gap-2.5">
        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5 sm:mt-0" aria-hidden="true" />
        <span role="alert" className="[text-wrap:pretty]">
          <strong>{title}</strong> {children}
        </span>
      </div>
      <Button variant="danger" onClick={onRetry} icon={<RefreshCw className="w-4 h-4" aria-hidden="true" />} className="min-h-11 shrink-0">
        Reintentar
      </Button>
    </div>
  </div>
);
