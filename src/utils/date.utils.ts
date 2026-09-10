/**
 * Utilidades para el manejo consistente de fechas y horas en la zona horaria de Colombia (America/Bogota, UTC-5).
 */

export const getColombiaDateStr = (d: Date = new Date()): string => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d); // "YYYY-MM-DD"
};

export const getColombiaTimeStr = (d: Date = new Date()): string => {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Bogota',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(d); // "HH:mm:ss"
};

/**
 * Parsea una fecha manteniendo la hora exacta actual o la hora enviada, evitando
 * que se asigne la hora artificial de 12:00 UTC (7:00 AM Colombia) o se desplace el día de calendario.
 */
export const parseColombiaDate = (inputDate?: string | Date | null): Date => {
  if (!inputDate) return new Date();
  if (inputDate instanceof Date) return isNaN(inputDate.getTime()) ? new Date() : inputDate;

  const str = String(inputDate).trim();
  if (!str) return new Date();

  // Si contiene hora específica válida (no dummy 00:00 ni 12:00 UTC)
  if (str.includes('T') && !str.endsWith('T00:00:00.000Z') && !str.endsWith('T12:00:00.000Z')) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) return d;
  }

  const dateOnly = str.split('T')[0];
  const parts = dateOnly.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    const d = new Date(str);
    return isNaN(d.getTime()) ? new Date() : d;
  }

  const todayStr = getColombiaDateStr();
  if (dateOnly === todayStr) {
    return new Date();
  }

  // Combinar fecha con la hora actual en Colombia (UTC-5)
  const timeStr = getColombiaTimeStr(); // "HH:mm:ss"
  const isoWithTz = `${dateOnly}T${timeStr}-05:00`;
  const result = new Date(isoWithTz);
  if (!isNaN(result.getTime())) return result;

  // Fallback seguro a medio día UTC
  return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 17, 0, 0)); // 17:00 UTC = 12:00 PM Colombia
};

/**
 * Obtiene el inicio del día (00:00:00) en hora de Colombia como objeto Date UTC
 */
export const getColombiaStartOfDay = (dateStr: string): Date => {
  const parts = dateStr.split('-').map(Number);
  // 00:00:00 hora Colombia = 05:00:00 UTC
  return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 5, 0, 0, 0));
};

/**
 * Obtiene el fin del día (23:59:59.999) en hora de Colombia como objeto Date UTC
 */
export const getColombiaEndOfDay = (dateStr: string): Date => {
  const parts = dateStr.split('-').map(Number);
  // 23:59:59.999 hora Colombia = 04:59:59.999 UTC del día siguiente
  const nextDay = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] + 1, 4, 59, 59, 999));
  return nextDay;
};
