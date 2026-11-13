// Recarga el documento actual. Módulo propio para poder sustituirlo en pruebas,
// ya que window.location no admite espías ni redefiniciones en JSDOM.
export const reloadPage = (): void => {
  window.location.reload();
};
