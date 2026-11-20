// «Hoy · 14:20», «Ayer · 18:40» o «12 nov. 2026 · 09:15», como en el prototipo.
export function formatRoomDate(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const time = date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false });
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
  if (diffDays === 0) return `Hoy · ${time}`;
  if (diffDays === 1) return `Ayer · ${time}`;
  const day = date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${day} · ${time}`;
}
