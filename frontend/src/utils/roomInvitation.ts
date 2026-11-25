export const isRoomId = (id: string) => /^[A-Za-z0-9]{20}$/.test(id);

export const roomIdHelp = 'El ID de la sala tiene 20 letras y números, sin espacios ni guiones. Revisa que lo hayas copiado completo.';
export const missingRoomHelp = 'No encontramos una sala con ese ID. Puede que la hayan eliminado. Pide el ID otra vez al anfitrión.';

// Solo una invitación interna sustituye al panel al finalizar el perfil de Google.
export function roomReturnPath(path?: string) {
  return path && /^\/salas\/[A-Za-z0-9]{20}$/.test(path) ? path : '/panel';
}
