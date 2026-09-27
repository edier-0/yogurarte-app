<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import {
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from 'reka-ui';
import {
  Receipt,
  X,
  AlertCircle,
  Plus,
} from 'lucide-vue-next';
import { http } from '@/api/client';
import { toast } from 'vue-sonner';
import { getTodayDateBogota } from '@/stores/finance.store';

export interface CreditItemInfo {
  id: number;
  title: string;
  category: string;
  creditor: string;
  principalAmount: number;
  interestRate: number;
  totalAmount: number;
  initialPayment: number;
  remainingBalance: number;
  paymentType: string;
  frequency: string;
  installmentAmount: number;
  totalInstallments: number | null;
  paidInstallments: number;
  startDate: string;
  nextDueDate: string | null;
  status: string;
  notes?: string | null;
}

const props = defineProps<{
  open: boolean;
  credit: CreditItemInfo | null;
}>();

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void;
  (e: 'saved'): void;
}>();

const amount = ref<number | ''>('');
const paymentMethod = ref<'EFECTIVO' | 'NEQUI'>('EFECTIVO');
const paymentDate = ref<string>(getTodayDateBogota());
const justification = ref<string>('');
const receiptNumber = ref<string>('');
const isSubmitting = ref<boolean>(false);
const errorMessage = ref<string>('');

const formatCurrency = (val?: number | null) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number(val) || 0);
};

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen && props.credit) {
      // Si el crédito tiene un valor de cuota acordado, sugerirlo; de lo contrario, el saldo pendiente
      const suggested = props.credit.installmentAmount && props.credit.installmentAmount > 0
        ? Math.min(props.credit.installmentAmount, props.credit.remainingBalance)
        : props.credit.remainingBalance;

      amount.value = suggested > 0 ? suggested : '';
      paymentMethod.value = 'EFECTIVO';
      paymentDate.value = getTodayDateBogota();
      justification.value = `Abono de cuota a ${props.credit.title}`;
      receiptNumber.value = '';
      errorMessage.value = '';
      isSubmitting.value = false;
    }
  }
);

const isFormValid = computed(() => {
  if (!props.credit) return false;
  return typeof amount.value === 'number' && amount.value > 0;
});

function handleClose() {
  emit('update:open', false);
  errorMessage.value = '';
}

function setFullBalance() {
  if (props.credit) {
    amount.value = props.credit.remainingBalance;
  }
}

async function handleSubmit() {
  if (!props.credit || !isFormValid.value || typeof amount.value !== 'number') {
    errorMessage.value = 'Por favor ingresa un monto válido mayor a 0.';
    return;
  }

  if (amount.value > props.credit.remainingBalance) {
    errorMessage.value = `El monto a abonar (${formatCurrency(amount.value)}) no puede superar el saldo pendiente (${formatCurrency(props.credit.remainingBalance)}).`;
    return;
  }

  isSubmitting.value = true;
  errorMessage.value = '';

  try {
    await http.post(`/credits/${props.credit.id}/pay`, {
      amount: amount.value,
      paymentMethod: paymentMethod.value,
      paymentDate: paymentDate.value,
      receiptNumber: receiptNumber.value.trim() || null,
      justification: justification.value.trim() || `Abono a crédito ${props.credit.title}`,
    });

    toast.success('¡Abono Registrado con Éxito!', {
      description: `Se abonaron ${formatCurrency(amount.value)} al crédito de ${props.credit.creditor}.`,
    });

    emit('saved');
    handleClose();
  } catch (err: any) {
    errorMessage.value = err?.response?.data?.message || err?.message || 'Error al asentar el abono';
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <DialogRoot :open="open" @update:open="(val: boolean) => emit('update:open', val)">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity" />

      <DialogContent
        class="fixed left-1/2 top-1/2 z-50 w-[95%] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-surface-light-border bg-surface-light-card p-6 shadow-2xl transition-all focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-card sm:p-7"
      >
        <!-- Header del Modal -->
        <div class="flex items-center justify-between border-b border-surface-light-border pb-4 dark:border-surface-dark-border">
          <div class="flex items-center gap-3">
            <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-hero-gradient text-white shadow-card">
              <Receipt class="h-5 w-5 stroke-[2]" />
            </div>
            <div class="min-w-0">
              <DialogTitle class="text-base font-extrabold text-slate-900 dark:text-white sm:text-lg">
                Registrar Abono a Crédito
              </DialogTitle>
              <DialogDescription class="truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
                {{ credit?.creditor || 'Proveedor / Acreedor' }} • {{ credit?.title || 'Obligación' }}
              </DialogDescription>
            </div>
          </div>

          <button
            type="button"
            @click="handleClose"
            class="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            title="Cerrar modal"
            aria-label="Cerrar modal"
          >
            <X class="h-5 w-5" />
          </button>
        </div>

        <!-- Tarjeta de Resumen Financiero -->
        <div
          v-if="credit"
          class="mt-5 rounded-2xl border border-rose-200/80 bg-rose-50/50 p-4 dark:border-rose-900/40 dark:bg-rose-950/20"
        >
          <div class="grid grid-cols-2 gap-4">
            <div>
              <span class="block text-[11px] font-extrabold uppercase tracking-wider text-rose-700/80 dark:text-rose-400">
                Saldo Pendiente
              </span>
              <span class="text-xl font-black text-rose-600 dark:text-rose-400 sm:text-2xl">
                {{ formatCurrency(credit.remainingBalance) }}
              </span>
            </div>
            <div>
              <span class="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Total Financiado
              </span>
              <span class="text-lg font-extrabold text-slate-800 dark:text-slate-200 sm:text-xl">
                {{ formatCurrency(credit.totalAmount) }}
              </span>
            </div>
          </div>
          <div class="mt-2.5 flex items-center justify-between border-t border-rose-200/60 pt-2 text-[11px] font-bold text-slate-600 dark:border-rose-900/30 dark:text-slate-400">
            <span>Acreedor: <strong class="text-slate-900 dark:text-white">{{ credit.creditor }}</strong></span>
            <span>Abonos previos: <strong>{{ credit.paidInstallments }}</strong></span>
          </div>
        </div>

        <!-- Formulario de Abono -->
        <form @submit.prevent="handleSubmit" novalidate class="mt-5 space-y-4">
          <!-- Monto a Abonar -->
          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Monto a Abonar ($ COP) *
              </label>
              <button
                v-if="credit && credit.remainingBalance > 0"
                type="button"
                @click="setFullBalance"
                class="text-[11px] font-bold text-brand-800 hover:underline dark:text-brand-darkText"
              >
                Abonar saldo total
              </button>
            </div>
            <div class="relative">
              <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">$</span>
              <input
                v-model.number="amount"
                type="number"
                min="1"
                step="any"
                placeholder="50000"
                required
                class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas py-2.5 pl-8 pr-3 text-base font-black text-slate-900 placeholder-slate-400 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
              />
            </div>
          </div>

          <!-- Canal de Salida y Fecha -->
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Canal de Salida (Caja) *
              </label>
              <select
                v-model="paymentMethod"
                class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
              >
                <option value="EFECTIVO">Efectivo (Caja Menor)</option>
                <option value="NEQUI">Nequi / Bancolombia (Transferencia)</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Fecha del Pago
              </label>
              <input
                v-model="paymentDate"
                type="date"
                required
                class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
              />
            </div>
          </div>

          <!-- Comprobante y Justificación -->
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                N° Comprobante / Recibo
              </label>
              <input
                v-model="receiptNumber"
                type="text"
                placeholder="Ej: REC-0045, Trans #1234"
                class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Concepto / Justificación
              </label>
              <input
                v-model="justification"
                type="text"
                placeholder="Pago de cuota ordinaria"
                class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
              />
            </div>
          </div>

          <!-- Mensaje de Error si aplica -->
          <div
            v-if="errorMessage"
            class="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-400"
          >
            <AlertCircle class="h-4 w-4 shrink-0" />
            <span>{{ errorMessage }}</span>
          </div>

          <!-- Botones de Acción -->
          <div class="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              @click="handleClose"
              class="rounded-xl border border-surface-light-border bg-surface-light-canvas px-4 py-2.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-100 dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>

            <button
              type="submit"
              :disabled="isSubmitting || !isFormValid"
              class="flex items-center gap-2 rounded-xl bg-hero-gradient px-5 py-2.5 text-xs font-black text-white shadow-card transition-all hover:opacity-95 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus class="h-4 w-4 stroke-[2.5]" />
              <span>{{ isSubmitting ? 'Registrando...' : '+ Registrar Abono' }}</span>
            </button>
          </div>
        </form>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
