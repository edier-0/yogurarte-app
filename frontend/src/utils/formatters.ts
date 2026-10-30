/**
 * Utilidades de formateo para la interfaz de usuario de YogurArte
 */

/**
 * Detecta si una unidad de medida es discreta (números enteros: unidades, envases, vasos, tapas, etiquetas)
 */
export function isDiscreteUnit(unit?: string): boolean {
  if (!unit) return false;
  const u = unit.trim().toLowerCase();
  return (
    u === 'und' ||
    u === 'unds' ||
    u === 'unidad' ||
    u === 'unidades' ||
    u === 'envase' ||
    u === 'envases' ||
    u === 'vaso' ||
    u === 'vasos' ||
    u === 'tarro' ||
    u === 'tarros' ||
    u === 'botella' ||
    u === 'botellas' ||
    u === 'tapa' ||
    u === 'tapas' ||
    u === 'etiqueta' ||
    u === 'etiquetas' ||
    u === 'paquete' ||
    u === 'paquetes' ||
    u === 'caja' ||
    u === 'cajas' ||
    u === 'bolsa' ||
    u === 'bolsas'
  );
}

/**
 * Formatea cantidades de inventario evitando desbordamientos de punto flotante IEEE 754.
 * - Si es unidad discreta (und, unidad, etc.): entero Math.round(qty).
 * - Si es peso o volumen (kg, L, etc.): máximo 2 decimales redondeados de forma limpia (Number(qty.toFixed(2))).
 */
export function formatStockQuantity(qty: number | string | null | undefined, unit?: string): string {
  const num = typeof qty === 'number' ? qty : Number(qty);
  if (isNaN(num)) return '0';

  if (isDiscreteUnit(unit)) {
    return `${Math.round(num)}`;
  }

  // Peso o volumen (kg, L, etc.): máximo 2 decimales redondeados de forma limpia
  const clean = Number(num.toFixed(2));
  return `${clean}`;
}

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

/**
 * Formatea stock junto a su unidad de medida
 */
export function formatStockWithUnit(qty: number | string | null | undefined, unit?: string): string {
  const formatted = formatStockQuantity(qty, unit);
  return unit ? `${formatted} ${unit}` : formatted;
}

/**
 * Formatea un valor monetario en pesos colombianos ($ COP)
 */
export function formatCurrency(amount: number | string | null | undefined): string {
  const val = typeof amount === 'number' ? amount : Number(amount);
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(isNaN(val) ? 0 : val);
}
