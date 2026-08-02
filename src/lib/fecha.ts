export function fechaLocal(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dia}`;
}

export function fechaDesdeISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDias(fecha: string, n: number): string {
  const dt = fechaDesdeISO(fecha);
  dt.setDate(dt.getDate() + n);
  return fechaLocal(dt);
}

export function inicioSemana(fecha: string): string {
  const dt = fechaDesdeISO(fecha);
  const diff = dt.getDay() === 0 ? -6 : 1 - dt.getDay();
  dt.setDate(dt.getDate() + diff);
  return fechaLocal(dt);
}

export function diasDeSemana(lunes: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDias(lunes, i));
}

export function formatoCorto(fecha: string): string {
  return fechaDesdeISO(fecha).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
  });
}

export function formatoLargo(fecha: string): string {
  return fechaDesdeISO(fecha).toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
