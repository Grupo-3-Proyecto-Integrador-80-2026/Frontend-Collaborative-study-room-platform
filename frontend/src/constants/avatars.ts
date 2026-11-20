// Avatares del prototipo aprobado (registro y «Mi perfil»).
// La API exige direcciones https, así que se publican en /public/avatars y se
// guardan con el dominio de producción (en local también se ven desde allí).
export const PUBLIC_APP_URL = (import.meta.env.VITE_PUBLIC_APP_URL || 'https://miniproyecto-2-inky.vercel.app').replace(/\/$/, '');

export interface AvatarOption {
  name: string;
  url: string;
}

export const AVATAR_OPTIONS: AvatarOption[] = [
  { name: 'Búho Sabio', file: 'buho-sabio' },
  { name: 'Zorrito', file: 'zorrito' },
  { name: 'Pandita', file: 'pandita' },
  { name: 'Gatito', file: 'gatito' },
  { name: 'Perrito', file: 'perrito' },
].map(({ name, file }) => ({ name, url: `${PUBLIC_APP_URL}/avatars/${file}.jpg` }));

export const AVATAR_PRESETS = AVATAR_OPTIONS.map((option) => option.url);

export const avatarName = (url: string | null | undefined): string | undefined =>
  AVATAR_OPTIONS.find((option) => option.url === url)?.name;
