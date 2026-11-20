// Reglas de «Mi Perfil» alineadas con el validador de la API (updateProfileSchema),
// para avisar antes de enviar. La API sigue siendo la fuente de verdad.
export interface ProfileForm {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
}

export type ProfileErrors = Partial<Record<keyof ProfileForm, string>>;

const NAME_PATTERN = /^[\p{L}][\p{L}' -]*$/u;
const USERNAME_PATTERN = /^[A-Za-z0-9_]+$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const validateName = (value: string, label: 'nombres' | 'apellidos'): string | undefined => {
  const clean = value.trim();
  if (!clean) return `Escribe tus ${label} para continuar.`;
  if (clean.length > 50) return `Tus ${label} pueden tener máximo 50 caracteres.`;
  if (!NAME_PATTERN.test(clean)) return `Tus ${label} solo pueden tener letras, espacios, guiones (-) y apóstrofos (').`;
  return undefined;
};

export const validateProfile = (form: ProfileForm): ProfileErrors => {
  const errors: ProfileErrors = {};
  const firstName = validateName(form.firstName, 'nombres');
  const lastName = validateName(form.lastName, 'apellidos');
  if (firstName) errors.firstName = firstName;
  if (lastName) errors.lastName = lastName;

  const username = form.username.trim();
  if (!username) errors.username = 'El nombre de usuario no puede quedar vacío.';
  else if (username.length < 3 || username.length > 20) errors.username = 'Usa entre 3 y 20 caracteres.';
  else if (!USERNAME_PATTERN.test(username)) errors.username = 'Usa solo letras sin tilde, números y guion bajo (_), sin espacios.';

  const email = form.email.trim().toLowerCase();
  if (!email) errors.email = 'El correo es obligatorio.';
  else if (!EMAIL_PATTERN.test(email)) errors.email = 'Escribe un correo válido (ejemplo: nombre@correounivalle.edu.co).';
  else if (!email.endsWith('.edu.co')) errors.email = 'Solo se permiten correos institucionales terminados en .edu.co.';

  return errors;
};
