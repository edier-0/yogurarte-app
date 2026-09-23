/**
 * Estándar global de métodos de pago en YogurArte
 * Únicamente se admiten dos canales en todo el sistema:
 * - EFECTIVO: Efectivo Caja Menor
 * - NEQUI_BANCOLOMBIA: Nequi o Bancolombia (Billeteras y transferencias digitales)
 */
export type PaymentMethod = 'EFECTIVO' | 'NEQUI_BANCOLOMBIA';

export interface PaymentMethodOption {
  value: PaymentMethod;
  label: string;
  description: string;
}

export const PAYMENT_METHOD_OPTIONS: readonly PaymentMethodOption[] = [
  {
    value: 'EFECTIVO',
    label: 'Efectivo Caja Menor',
    description: 'Dinero en efectivo físico disponible en caja menor',
  },
  {
    value: 'NEQUI_BANCOLOMBIA',
    label: 'Nequi o Bancolombia',
    description: 'Transferencias digitales vía Nequi o cuenta Bancolombia',
  },
] as const;

export function formatPaymentMethod(method?: string | null): string {
  if (!method) return 'Efectivo';
  const clean = method.toUpperCase().trim();
  if (clean === 'EFECTIVO') return 'Efectivo (Caja Menor)';
  if (
    clean === 'NEQUI_BANCOLOMBIA' ||
    clean === 'NEQUI' ||
    clean === 'BANCOLOMBIA' ||
    clean === 'TRANSFERENCIA' ||
    clean === 'DIGITAL'
  ) {
    return 'Nequi / Bancolombia';
  }
  return method;
}
