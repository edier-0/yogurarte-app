/**
 * Utilidades para cálculo y formateo volumétrico adaptativo
 */

/**
 * Formatea un volumen en litros con precisión adaptativa:
 * - Enteros: "4 L"
 * - 1 decimal exacto (ej. 0.5L): "4.5 L"
 * - 2 decimales para formatos centesimales (ej. 0.08L, 0.15L): "4.08 L", "0.15 L"
 */
export function formatLitersVolume(liters: number | string | null | undefined): string {
  const num = typeof liters === 'number' ? liters : Number(liters);
  if (isNaN(num) || num <= 0) return '0 L';
  const rounded2 = Math.round(num * 100) / 100;
  if (Math.abs(rounded2 - Math.round(rounded2)) < 0.001) {
    return `${Math.round(rounded2)} L`;
  }
  if (Math.abs(rounded2 * 10 - Math.round(rounded2 * 10)) < 0.01) {
    return `${rounded2.toFixed(1)} L`;
  }
  return `${rounded2.toFixed(2)} L`;
}
