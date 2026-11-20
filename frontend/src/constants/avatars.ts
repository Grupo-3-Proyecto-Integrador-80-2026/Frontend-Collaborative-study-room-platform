// Avatares predefinidos del producto (registro y «Mi Perfil»).
// La API exige direcciones https, por eso se usan imágenes publicadas.
export interface AvatarOption {
  name: string;
  url: string;
}

export const AVATAR_OPTIONS: AvatarOption[] = ['Felix', 'Aria', 'Luna', 'Milo', 'Leo'].map((name) => ({
  name,
  url: `https://api.dicebear.com/9.x/bottts/svg?seed=${name}`,
}));

export const AVATAR_PRESETS = AVATAR_OPTIONS.map((option) => option.url);

export const avatarName = (url: string | null | undefined): string | undefined =>
  AVATAR_OPTIONS.find((option) => option.url === url)?.name;
