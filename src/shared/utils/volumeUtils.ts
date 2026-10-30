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

/**
 * Limpia y normaliza el nombre de una presentación comercial (ej. "Botella 1L" -> "1L", "Botella plástica de 500 ML" -> "500ml")
 */
export function cleanPresentationLabel(name: string, capacityLiters?: number): string {
  let label = (name || '').trim();

  // Limpiar prefijos de tipo de empaque redundantes
  label = label.replace(/botellas?\s+(pl[aá]sticas?\s+)?(de\s+)?/gi, '').trim();
  label = label.replace(/envases?\s+(pl[aá]sticos?\s+)?(de\s+)?/gi, '').trim();
  label = label.replace(/vasos?\s+(pl[aá]sticos?\s+)?(de\s+)?/gi, '').trim();
  label = label.replace(/tarros?\s+(pl[aá]sticos?\s+)?(de\s+)?/gi, '').trim();
  label = label.replace(/\bpet\b/gi, '').trim();
  label = label.replace(/\s+/g, ' ').trim();

  // Si tras la limpieza queda vacío o un término genérico, inferir desde capacityLiters
  if (!label || /^(envases?|unidades?|vasos?|tarros?)$/i.test(label)) {
    const cap = Number(capacityLiters) || 0;
    if (cap >= 1) {
      label = `${cap}L`;
    } else if (cap > 0) {
      label = `${Math.round(cap * 1000)}ml`;
    } else {
      label = '1L';
    }
  }

  // Estandarizar unidades comunes: "1 Litro" -> "1L", "500 ML" -> "500ml"
  return label
    .replace(/(\d+)\s*litros?/gi, '$1L')
    .replace(/(\d+)\s*l\b/gi, '$1L')
    .replace(/(\d+)\s*ml\b/gi, '$1ml')
    .trim();
}

/**
 * Formatea un chip de presentación comercial para badges visuales (ej. "5x 1L", "6x 500ml")
 */
export function formatPresentationChip(item: any): string {
  if (!item) return '';
  if (typeof item === 'string') return item;

  const qty = Number(item.quantity) || 1;
  const cap = Number(item.capacityLiters) || 0;
  const label = cleanPresentationLabel(item.name || item.containerName || '', cap);

  return `${qty}x ${label}`;
}
