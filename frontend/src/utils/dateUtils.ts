/**
 * Utilidades universales de fecha y hora para el frontend de YogurArte.
 * Zona horaria oficial: America/Bogota (UTC-5).
 * 
 * Garantiza captura de la hora real del dispositivo y blindaje contra desfases
 * al cruzar las 7:00 PM (00:00:00 UTC).
 */

export const COLOMBIA_TIMEZONE = 'America/Bogota';

/**
 * Obtiene la fecha local actual del dispositivo/Colombia en formato YYYY-MM-DD.
 */
export function getDeviceLocalDate(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: COLOMBIA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * Alias de compatibilidad con código existente
 */
export const getTodayDateBogota = getDeviceLocalDate;

/**
 * Convierte de forma segura cualquier string ISO, Date o timestamp de la base de datos
 * a formato YYYY-MM-DD en la zona horaria oficial (America/Bogota).
 * 
 * NUNCA uses .slice(0, 10) ni .split('T')[0] sobre cadenas UTC, porque después de las 7:00 PM
 * UTC ya es mañana y provocará que el input muestre el día siguiente.
 */
export function toInputDateFormat(rawDate?: string | Date | null): string {
  if (!rawDate) return getDeviceLocalDate();

  // Si ya viene como YYYY-MM-DD exacto sin hora
  if (typeof rawDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rawDate.trim())) {
    return rawDate.trim();
  }

  try {
    const d = typeof rawDate === 'string' ? new Date(rawDate) : rawDate;
    if (isNaN(d.getTime())) return getDeviceLocalDate();
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: COLOMBIA_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  } catch {
    return getDeviceLocalDate();
  }
}

/**
 * Construye un timestamp ISO representativo con la hora del dispositivo para enviar al backend:
 * - Si es hoy (o no se especifica fecha): adjunta la hora, minuto y segundo reales del dispositivo.
 * - Si es una fecha manual diferente a hoy: fija a las 12:00:00-05:00 (17:00 UTC) para evitar saltos.
 */
export function getDeviceTimestamp(selectedDateStr?: string): string {
  const today = getDeviceLocalDate();
  const cleanDate = selectedDateStr ? toInputDateFormat(selectedDateStr) : today;

  if (!cleanDate || cleanDate === today) {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    const secs = String(now.getSeconds()).padStart(2, '0');
    return `${today}T${hours}:${mins}:${secs}-05:00`;
  }

  return `${cleanDate}T12:00:00-05:00`;
}

/**
 * Formatea una fecha/hora para visualización amigable en la UI respetando America/Bogota.
 * Ejemplo: "18 oct, 08:30 p. m."
 */
export function formatLocalDateTime(
  dateInput?: string | Date | null,
  options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }
): string {
  if (!dateInput) return '';
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return String(dateInput);
    return new Intl.DateTimeFormat('es-CO', {
      timeZone: COLOMBIA_TIMEZONE,
      ...options,
    }).format(d);
  } catch {
    return String(dateInput);
  }
}
