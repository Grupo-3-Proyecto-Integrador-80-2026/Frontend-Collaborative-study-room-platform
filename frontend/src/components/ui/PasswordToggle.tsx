import { Eye, EyeOff } from 'lucide-react';

// Control «Mostrar/Ocultar» dentro del campo de contraseña. El nombre accesible
// contiene el texto visible (WCAG 2.5.3) y aria-pressed anuncia el estado.
export const PasswordToggle: React.FC<{ visible: boolean; onToggle: () => void }> = ({ visible, onToggle }) => (
  <button
    type="button"
    onClick={onToggle}
    aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
    aria-pressed={visible}
    className="min-h-10 px-2 flex items-center gap-1 rounded-lg text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 cursor-pointer"
  >
    {visible ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
    <span>{visible ? 'Ocultar' : 'Mostrar'}</span>
  </button>
);
