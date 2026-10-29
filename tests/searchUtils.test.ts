import { describe, it, expect } from 'vitest';
import { filterSelectOptions, normalizeSearchText, SelectOption } from '../frontend/src/utils/searchUtils.js';

describe('searchUtils - filterSelectOptions', () => {
  const sampleOptions: SelectOption[] = [
    { id: 1, name: 'Azúcar de kilo Rio paila', code: 'AZUCAR_KILO', category: 'INSUMO', stock: 2.1, unit: 'Kg' },
    { id: 2, name: 'Fresa Fresca', code: 'FRESA', category: 'MATERIA_PRIMA', stock: 1.72, unit: 'Kg' },
    { id: 3, name: 'Botella Plástica 1L', code: 'BOT_1L', category: 'EMPAQUE', stock: 50, unit: 'Und' },
    { id: 4, name: 'Tapa para Botella 1L', code: 'TAPA_1L', category: 'EMPAQUE', stock: 45, unit: 'Und' },
    { id: 5, name: 'Mermelada de Fresa Artesanal', code: 'MERM_FRESA', category: 'INSUMO', stock: 0, unit: 'Kg' },
  ];

  it('debe retornar todas las opciones si el término de búsqueda está vacío', () => {
    expect(filterSelectOptions(sampleOptions, '')).toEqual(sampleOptions);
    expect(filterSelectOptions(sampleOptions, '   ')).toEqual(sampleOptions);
  });

  it('debe filtrar ignorando mayúsculas y minúsculas', () => {
    const results = filterSelectOptions(sampleOptions, 'fresa');
    expect(results).toHaveLength(2);
    expect(results.map(r => r.id)).toEqual([2, 5]);
  });

  it('debe filtrar ignorando tildes y diacríticos (ej. azúcar -> Azúcar)', () => {
    const res1 = filterSelectOptions(sampleOptions, 'azucar');
    expect(res1).toHaveLength(1);
    expect(res1[0].id).toBe(1);

    const res2 = filterSelectOptions(sampleOptions, 'AZÚCAR');
    expect(res2).toHaveLength(1);
    expect(res2[0].id).toBe(1);

    const res3 = filterSelectOptions(sampleOptions, 'plastica');
    expect(res3).toHaveLength(1);
    expect(res3[0].id).toBe(3);
  });

  it('debe filtrar por código de insumo', () => {
    const results = filterSelectOptions(sampleOptions, 'BOT_1L');
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe(3);
  });

  it('debe filtrar por categoría de insumo', () => {
    const results = filterSelectOptions(sampleOptions, 'empaque');
    expect(results).toHaveLength(2);
    expect(results.map(r => r.id)).toEqual([3, 4]);
  });

  it('debe retornar un array vacío si no hay coincidencias', () => {
    const results = filterSelectOptions(sampleOptions, 'maracuyá inexistente');
    expect(results).toHaveLength(0);
  });

  it('normalizeSearchText debe manejar cadenas nulas, indefinidas y con espacios', () => {
    expect(normalizeSearchText('')).toBe('');
    expect(normalizeSearchText(null as any)).toBe('');
    expect(normalizeSearchText(undefined as any)).toBe('');
    expect(normalizeSearchText('  Árbol  ')).toBe('arbol');
  });
});
