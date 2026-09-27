/**
 * Utilidades de formateo para la interfaz de usuario de YogurArte
 */

/**
 * Detecta si una unidad de medida es discreta (números enteros: unidades, botellas, tapas, etiquetas)
 */
export function isDiscreteUnit(unit?: string): boolean {
  if (!unit) return false;
  const u = unit.trim().toLowerCase();
  return (
    u === 'und' ||
    u === 'unds' ||
    u === 'unidad' ||
    u === 'unidades' ||
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
 * Formatea stock junto a su unidad de medida
 */
export function formatStockWithUnit(qty: number | string | null | undefined, unit?: string): string {
  const formatted = formatStockQuantity(qty, unit);
  return unit ? `${formatted} ${unit}` : formatted;
}
