import { describe, it, expect } from 'vitest';
import { resolveOrderPaidAmount } from '../frontend/src/utils/orderUtils.js';

describe('resolveOrderPaidAmount (Función Pura de Abonos)', () => {
  it('debe retornar paidAmount si viene definido numéricamente', () => {
    const order = { paidAmount: 12000, totalAmount: 24000 };
    expect(resolveOrderPaidAmount(order)).toBe(12000);
  });

  it('debe priorizar paidAmount incluso si totalPaid o payments existen', () => {
    const order = {
      paidAmount: 12000,
      totalPaid: 15000,
      payments: [{ amount: 5000 }]
    };
    expect(resolveOrderPaidAmount(order)).toBe(12000);
  });

  it('debe retornar totalPaid si paidAmount es undefined o null', () => {
    const order = { paidAmount: null, totalPaid: 18000 };
    expect(resolveOrderPaidAmount(order)).toBe(18000);
  });

  it('debe calcular la suma de payments si paidAmount y totalPaid no están definidos', () => {
    const order = {
      payments: [
        { amount: 10000 },
        { amount: 14000 }
      ]
    };
    expect(resolveOrderPaidAmount(order)).toBe(24000);
  });

  it('debe retornar 0 si no hay abonos, payments está vacío o es null/undefined', () => {
    expect(resolveOrderPaidAmount(null)).toBe(0);
    expect(resolveOrderPaidAmount(undefined)).toBe(0);
    expect(resolveOrderPaidAmount({})).toBe(0);
    expect(resolveOrderPaidAmount({ paidAmount: 0 })).toBe(0);
    expect(resolveOrderPaidAmount({ payments: [] })).toBe(0);
  });

  it('debe proteger contra números negativos o cadenas numéricas', () => {
    expect(resolveOrderPaidAmount({ paidAmount: -5000 })).toBe(0);
    expect(resolveOrderPaidAmount({ paidAmount: '12000' as any })).toBe(12000);
  });
});
