export interface SelectOption {
  id: number | string;
  name: string;
  code?: string;
  category?: string;
  stock?: number;
  unit?: string;
  disabled?: boolean;
  extraInfo?: string;
}

/**
 * Normaliza un texto para búsqueda:
 * - Elimina acentos/tildes y diacríticos (ej. á -> a, ñ se conserva o normaliza según NFD)
 * - Convierte a minúsculas
 * - Remueve espacios iniciales y finales
 */
export function normalizeSearchText(str: string | null | undefined): string {
  if (!str) return '';
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Filtra un arreglo de opciones comparando la consulta normalizada contra:
 * 1. Nombre (`name`)
 * 2. Código (`code`)
 * 3. Categoría (`category`)
 * 4. Información extra (`extraInfo`)
 */
export function filterSelectOptions<T extends SelectOption>(options: T[], query: string | null | undefined): T[] {
  const q = normalizeSearchText(query);
  if (!q) return options;

  return options.filter((opt) => {
    const nameMatch = normalizeSearchText(opt.name).includes(q);
    const codeMatch = opt.code ? normalizeSearchText(opt.code).includes(q) : false;
    const catMatch = opt.category ? normalizeSearchText(opt.category).includes(q) : false;
    const extraMatch = opt.extraInfo ? normalizeSearchText(opt.extraInfo).includes(q) : false;

    return nameMatch || codeMatch || catMatch || extraMatch;
  });
}
