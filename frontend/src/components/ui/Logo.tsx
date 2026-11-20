import { GraduationCap } from 'lucide-react';

// Logo del prototipo: birrete blanco sobre cuadro índigo.
export const LogoMark: React.FC<{ size?: 'sm' | 'lg'; tone?: 'brand' | 'light' }> = ({ size = 'sm', tone = 'brand' }) => (
  <span
    aria-hidden="true"
    className={`${size === 'lg' ? 'w-12 h-12 rounded-xl' : 'w-8 h-8 rounded-lg'} ${
      tone === 'light' ? 'bg-indigo-500' : 'bg-indigo-600'
    } flex items-center justify-center text-white shadow-sm shrink-0`}
  >
    <GraduationCap className={size === 'lg' ? 'w-7 h-7' : 'w-5 h-5'} />
  </span>
);
