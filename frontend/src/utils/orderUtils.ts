/**
 * Utilidades puras de pedidos y abonos
 */

export interface OrderLikeWithPayments {
  paidAmount?: number | string | null;
  totalPaid?: number | string | null;
  payments?: Array<{ amount?: number | string | null } | null> | null;
}

/**
 * Resuelve el monto abonado de forma robusta y en cascada:
 * 1. Si existe paidAmount numérico/definido, lo retorna (no negativo).
 * 2. Si existe totalPaid numérico/definido, lo retorna.
 * 3. Si existe un array payments, suma sus montos válidos.
 * 4. Por defecto retorna 0.
 */
export function resolveOrderPaidAmount(order?: OrderLikeWithPayments | null): number {
  if (!order) return 0;

  if (order.paidAmount !== undefined && order.paidAmount !== null) {
    const val = Number(order.paidAmount);
    return isNaN(val) ? 0 : Math.max(0, val);
  }

  if (order.totalPaid !== undefined && order.totalPaid !== null) {
    const val = Number(order.totalPaid);
    return isNaN(val) ? 0 : Math.max(0, val);
  }

  if (Array.isArray(order.payments) && order.payments.length > 0) {
    const sum = order.payments.reduce((acc, p) => {
      const amt = Number(p?.amount || 0);
      return acc + (isNaN(amt) ? 0 : Math.max(0, amt));
    }, 0);
    return Math.max(0, sum);
  }

  return 0;
}
