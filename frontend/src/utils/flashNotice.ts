// Aviso de una sola lectura que sobrevive a la redirección al login
// (por ejemplo, «Tu cuenta fue eliminada…»). Se guarda en sessionStorage
// porque los guardias de ruta redirigen antes de que llegue un state propio.
const KEY = 'sec:flash-notice';

export const setFlashNotice = (message: string): void => {
  try {
    sessionStorage.setItem(KEY, message);
  } catch {
    // Almacenamiento no disponible (modo privado estricto): se omite el aviso.
  }
};

/** Lee el aviso sin borrarlo (seguro dentro de inicializadores de estado). */
export const peekFlashNotice = (): string | null => {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
};

export const clearFlashNotice = (): void => {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Sin almacenamiento no hay nada que borrar.
  }
};
