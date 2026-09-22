/**
 * Utilidades centralizadas para el manejo consistente de fechas y horas
 * en la zona horaria oficial de Colombia (America/Bogota, UTC-5).
 */

export const COLOMBIA_TIMEZONE = 'America/Bogota';

/**
 * Obtiene la fecha local de Colombia en formato YYYY-MM-DD.
 * Garantiza que después de las 7:00 PM (cuando UTC pasa a 00:00:00)
 * no se desplace la fecha al día siguiente.
 */
export function getLocalDateString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: COLOMBIA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export const getColombiaDateStr = getLocalDateString;

/**
 * Obtiene la fecha local del día siguiente en Colombia en formato YYYY-MM-DD.
 */
export function getTomorrowDateStr(baseDate: Date = new Date()): string {
  const localStr = getLocalDateString(baseDate);
  const parts = localStr.split('-').map(Number);
  const nextDay = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] + 1));
  return nextDay.toISOString().split('T')[0];
}

/**
 * Obtiene la hora local de Colombia en formato HH:mm:ss.
 */
export function getColombiaTimeStr(d: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: COLOMBIA_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(d);
}

/**
 * Parsea una fecha manteniendo la hora exacta actual o la hora enviada, evitando
 * que se asigne la hora artificial de 12:00 UTC (7:00 AM Colombia) o se desplace el día de calendario.
 */
export function parseColombiaDate(inputDate?: string | Date | null): Date {
  if (!inputDate) return new Date();
  if (inputDate instanceof Date) return isNaN(inputDate.getTime()) ? new Date() : inputDate;

  const str = String(inputDate).trim();
  if (!str) return new Date();

  // Si contiene hora específica válida (no dummy 00:00 ni 12:00 UTC ni 05:00 UTC)
  if (
    str.includes('T') &&
    !str.endsWith('T00:00:00.000Z') &&
    !str.endsWith('T12:00:00.000Z') &&
    !str.endsWith('T05:00:00.000Z')
  ) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) return d;
  }

  const dateOnly = str.split('T')[0];
  const parts = dateOnly.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    const d = new Date(str);
    return isNaN(d.getTime()) ? new Date() : d;
  }

  const todayStr = getLocalDateString();
  if (dateOnly === todayStr) {
    return new Date();
  }

  // Combinar fecha con la hora actual en Colombia (UTC-5)
  const timeStr = getColombiaTimeStr(); // "HH:mm:ss"
  const isoWithTz = `${dateOnly}T${timeStr}-05:00`;
  const result = new Date(isoWithTz);
  if (!isNaN(result.getTime())) return result;

  // Fallback seguro a medio día UTC (12:00 PM Colombia = 17:00 UTC)
  return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 17, 0, 0));
}

/**
 * Obtiene el inicio del día (00:00:00) en hora de Colombia como objeto Date UTC.
 * 00:00:00 hora Colombia = 05:00:00 UTC del mismo día calendario.
 */
export function getColombiaStartOfDay(dateStr: string): Date {
  const parts = dateStr.split('T')[0].split('-').map(Number);
  return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 5, 0, 0, 0));
}

/**
 * Obtiene el fin del día (23:59:59.999) en hora de Colombia como objeto Date UTC.
 * 23:59:59.999 hora Colombia = 04:59:59.999 UTC del día siguiente.
 */
export function getColombiaEndOfDay(dateStr: string): Date {
  const parts = dateStr.split('T')[0].split('-').map(Number);
  return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] + 1, 4, 59, 59, 999));
}
