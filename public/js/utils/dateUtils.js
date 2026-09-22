/**
 * Utilidades de fecha y zona horaria para el frontend de YogurArte.
 * Zona horaria oficial: America/Bogota (UTC-5).
 */

export const COLOMBIA_TIMEZONE = 'America/Bogota';

/**
 * Obtiene la fecha local de Colombia en formato YYYY-MM-DD.
 * Evita el salto de día al pasar las 7:00 PM (00:00:00 UTC).
 */
export function getLocalDateString(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: COLOMBIA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export const getTodayLocalDateStr = () => getLocalDateString();

/**
 * Obtiene la fecha local del día siguiente en Colombia en formato YYYY-MM-DD.
 */
export function getTomorrowDateStr(baseDate = new Date()) {
  const localStr = getLocalDateString(baseDate);
  const parts = localStr.split('-').map(Number);
  const nextDay = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] + 1));
  return nextDay.toISOString().split('T')[0];
}

/**
 * Convierte cualquier fecha (Date, string ISO o string YYYY-MM-DD)
 * a formato YYYY-MM-DD en la zona horaria de Colombia.
 */
export function toColombiaDateStr(input) {
  if (!input) return '';

  // Si ya viene como YYYY-MM-DD exacto, retornarlo sin parsear a UTC
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
    // Si viene con T o Z, parsear como Date
    const d = new Date(trimmed);
    if (isNaN(d.getTime())) return '';
    try {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: COLOMBIA_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(d);
    } catch (e) {
      return trimmed.split('T')[0];
    }
  }

  if (input instanceof Date) {
    if (isNaN(input.getTime())) return '';
    try {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: COLOMBIA_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(input);
    } catch (e) {
      const year = input.getFullYear();
      const month = String(input.getMonth() + 1).padStart(2, '0');
      const day = String(input.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }

  return '';
}
