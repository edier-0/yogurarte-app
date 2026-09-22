<script setup lang="ts">
import { ref, watch } from 'vue';
import {
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from 'reka-ui';
import { X, DollarSign, Wallet, CheckCircle2 } from 'lucide-vue-next';
import { useOperationsStore, type Order } from '@/stores/operations.store';

const props = defineProps<{
  open: boolean;
  order: Order | null;
}>();

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void;
  (e: 'saved'): void;
}>();

const store = useOperationsStore();

const amount = ref<number>(0);
const paymentMethod = ref<string>('EFECTIVO');
const notes = ref<string>('');
const isSubmitting = ref<boolean>(false);

watch(
  () => props.order,
  (o) => {
    if (o) {
      amount.value = store.getPendingBalance(o);
      paymentMethod.value = 'EFECTIVO';
      notes.value = '';
    }
  },
  { immediate: true }
);

const handleClose = () => {
  emit('update:open', false);
};

const handleSubmit = async () => {
  if (!props.order || amount.value <= 0) return;

  isSubmitting.value = true;
  try {
    await store.addPayment(props.order.id, {
      amount: Number(amount.value),
      paymentMethod: paymentMethod.value,
      notes: notes.value.trim() || undefined,
    });
    emit('saved');
    handleClose();
  } catch (err) {
    console.error(err);
  } finally {
    isSubmitting.value = false;
  }
};

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(val || 0);
};
</script>

<template>
  <DialogRoot :open="open" @update:open="emit('update:open', $event)">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity" />
      <DialogContent
        class="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-surface-light-border bg-surface-light-card p-6 shadow-elevated focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-card sm:p-7"
      >
        <div class="flex items-center justify-between border-b border-surface-light-border pb-3 dark:border-surface-dark-border">
          <div class="flex items-center gap-2.5">
            <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-natural-500 text-white shadow-card">
              <DollarSign class="h-5 w-5" />
            </div>
            <div>
              <DialogTitle class="text-base font-extrabold text-slate-900 dark:text-white">
                Registrar Abono / Pago
              </DialogTitle>
              <DialogDescription class="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {{ order?.orderCode }} • {{ order?.customer?.fullName || order?.customerName }}
              </DialogDescription>
            </div>
          </div>

          <DialogClose
            @click="handleClose"
            class="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X class="h-4 w-4" />
          </DialogClose>
        </div>

        <form v-if="order" @submit.prevent="handleSubmit" class="mt-5 space-y-4">
          <!-- Pending balance highlight -->
          <div class="flex items-center justify-between rounded-2xl bg-amber-50 p-3.5 dark:bg-amber-950/40">
            <div>
              <span class="block text-[11px] font-bold uppercase text-amber-700 dark:text-amber-300">
                Saldo Pendiente
              </span>
              <span class="text-lg font-black text-amber-700 dark:text-amber-300">
                {{ formatCurrency(store.getPendingBalance(order)) }}
              </span>
            </div>
            <Wallet class="h-6 w-6 text-amber-500" />
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Monto a Pagar ($ COP) *
            </label>
            <input
              type="number"
              step="500"
              min="1"
              required
              v-model.number="amount"
              class="w-full rounded-xl border border-slate-200 bg-surface-light-canvas py-2.5 px-3 text-sm font-extrabold text-slate-900 focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-surface-dark-canvas dark:text-white"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Medio de Pago *
            </label>
            <select
              v-model="paymentMethod"
              class="w-full rounded-xl border border-slate-200 bg-surface-light-canvas py-2.5 px-3 text-xs font-semibold dark:border-slate-700 dark:bg-surface-dark-canvas"
            >
              <option value="EFECTIVO">Efectivo (Caja Menor)</option>
              <option value="NEQUI">Nequi</option>
              <option value="BANCOLOMBIA">Bancolombia / Transferencia</option>
              <option value="DAVIPLATA">Daviplata</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Referencia / Nota
            </label>
            <input
              type="text"
              v-model="notes"
              placeholder="Ej. Comprobante Nequi #12345"
              class="w-full rounded-xl border border-slate-200 bg-surface-light-canvas py-2 px-3 text-xs dark:border-slate-700 dark:bg-surface-dark-canvas"
            />
          </div>

          <div class="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              @click="handleClose"
              class="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              :disabled="isSubmitting || amount <= 0"
              class="inline-flex items-center gap-2 rounded-xl bg-natural-500 px-5 py-2.5 text-xs font-extrabold text-white shadow-card transition-transform active:scale-95 hover:bg-natural-600 disabled:opacity-50"
            >
              <CheckCircle2 class="h-4 w-4" />
              <span>{{ isSubmitting ? 'Registrando...' : 'Confirmar Abono' }}</span>
            </button>
          </div>
        </form>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
