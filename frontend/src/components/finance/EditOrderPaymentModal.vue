<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import {
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from 'reka-ui';
import {
  X,
  Receipt,
  ShoppingBag,
  User,
  Wallet,
  AlertCircle,
  CheckCircle2,
  Package,
} from 'lucide-vue-next';
import { useFinanceStore, getTodayDateBogota } from '@/stores/finance.store';

const props = defineProps<{
  open: boolean;
  payment: any | null;
}>();

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void;
  (e: 'saved'): void;
}>();

const financeStore = useFinanceStore();

const amount = ref<number | ''>('');
const paymentMethod = ref<string>('EFECTIVO');
const paymentDate = ref<string>(getTodayDateBogota());
const notes = ref<string>('');
const isSubmitting = ref<boolean>(false);
const errorMessage = ref<string>('');

// Formateador de moneda en pesos colombianos
const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(val || 0);
};

// Sincronizar datos al abrir el modal con el pago seleccionado
watch(
  () => [props.open, props.payment],
  () => {
    if (!props.open || !props.payment) return;

    const p = props.payment;
    amount.value = Math.abs(Number(p.amount) || 0);
    paymentMethod.value = p.paymentMethod ? String(p.paymentMethod).toUpperCase().trim() : 'EFECTIVO';

    const rawDate = p.date || p.movementDate || p.paymentDate || '';
    paymentDate.value = rawDate ? String(rawDate).slice(0, 10) : getTodayDateBogota();
    notes.value = p.notes || '';
    errorMessage.value = '';
  },
  { immediate: true }
);

// Cálculos del impacto en el pedido
const currentPaymentAmount = computed(() => {
  return Math.abs(Number(props.payment?.amount) || 0);
});

const orderTotal = computed(() => {
  return Number(props.payment?.totalAmount) || 0;
});

const currentPending = computed(() => {
  return Number(props.payment?.pendingAmount) || 0;
});

const newPendingBalance = computed(() => {
  if (typeof amount.value !== 'number' || amount.value < 0) return currentPending.value;
  const delta = amount.value - currentPaymentAmount.value;
  return Math.max(0, currentPending.value - delta);
});

const isFormValid = computed(() => {
  return typeof amount.value === 'number' && amount.value > 0;
});

function handleClose() {
  emit('update:open', false);
  errorMessage.value = '';
}

async function handleSubmit() {
  if (!isFormValid.value || typeof amount.value !== 'number' || !props.payment) {
    errorMessage.value = 'Por favor ingresa un monto válido mayor a 0.';
    return;
  }

  isSubmitting.value = true;
  errorMessage.value = '';

  try {
    const orderId = props.payment.orderId || props.payment.rawId;
    const paymentId = props.payment.paymentId || 0;

    await financeStore.updateOrderPayment(orderId, paymentId, {
      amount: amount.value,
      paymentMethod: paymentMethod.value,
      paymentDate: paymentDate.value,
      notes: notes.value.trim() || null,
    });

    emit('saved');
    handleClose();
  } catch (err: any) {
    errorMessage.value = err?.message || 'Error al actualizar el pago del pedido';
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
        class="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-surface-light-border bg-surface-light-card p-6 shadow-elevated focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-card sm:p-7 max-h-[90vh] overflow-y-auto"
      >
        <!-- Encabezado con Icono -->
        <div class="flex items-center justify-between border-b border-surface-light-border pb-3 dark:border-surface-dark-border">
          <div class="flex items-center gap-3">
            <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 shadow-sm">
              <Receipt class="h-6 w-6 stroke-[2]" />
            </div>
            <div>
              <DialogTitle class="text-base font-extrabold text-slate-900 dark:text-white sm:text-lg">
                Editar Cobro de Venta
              </DialogTitle>
              <DialogDescription class="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Modifica el monto o el método de pago asentado en este pedido.
              </DialogDescription>
            </div>
          </div>

          <DialogClose
            @click="handleClose"
            class="rounded-xl p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <X class="h-4 w-4" />
          </DialogClose>
        </div>

        <!-- Banner de Contexto del Pedido -->
        <div v-if="payment" class="mt-4 rounded-2xl border border-surface-light-border bg-surface-light-canvas p-4 dark:border-surface-dark-border dark:bg-surface-dark-canvas space-y-2.5">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <span class="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 px-2 py-1 text-xs font-black text-brand-800 dark:bg-brand-950/40 dark:text-brand-darkText">
                <ShoppingBag class="h-3.5 w-3.5 stroke-[2]" />
                {{ payment.orderNumber || `Pedido #${payment.orderId || payment.rawId}` }}
              </span>
              <span class="inline-flex items-center gap-1 text-xs font-extrabold text-slate-900 dark:text-white">
                <User class="h-3.5 w-3.5 text-slate-400" />
                {{ payment.customerName || 'Cliente' }}
              </span>
            </div>

            <!-- Total del Pedido -->
            <div v-if="orderTotal > 0" class="text-right">
              <span class="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Pedido</span>
              <span class="text-xs font-black text-slate-900 dark:text-white">{{ formatCurrency(orderTotal) }}</span>
            </div>
          </div>

          <!-- Resumen de Productos / Sabores -->
          <div v-if="payment.itemsSummary || payment.flavor" class="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
            <Package class="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span class="truncate font-semibold">{{ payment.itemsSummary || payment.flavor }}</span>
          </div>

          <!-- Teléfono / Dirección si existe -->
          <div v-if="payment.customerPhone || payment.customerAddress" class="text-[11px] text-slate-500 dark:text-slate-400">
            <span v-if="payment.customerPhone">📞 {{ payment.customerPhone }}</span>
            <span v-if="payment.customerPhone && payment.customerAddress"> • </span>
            <span v-if="payment.customerAddress">📍 {{ payment.customerAddress }}</span>
          </div>
        </div>

        <!-- Formulario de Edición -->
        <form @submit.prevent="handleSubmit" novalidate class="mt-4 space-y-4">
          <!-- Alerta de Error -->
          <div
            v-if="errorMessage"
            class="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50"
          >
            <AlertCircle class="h-4 w-4 shrink-0" />
            <span>{{ errorMessage }}</span>
          </div>

          <!-- Campo: Monto del Pago -->
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Monto del Abono / Pago ($ COP) *
            </label>
            <div class="relative">
              <input
                type="number"
                step="any"
                min="0"
                required
                v-model.number="amount"
                placeholder="Ej: 24000"
                class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas py-2.5 pl-3 pr-10 text-sm font-black text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
              />
              <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                COP
              </span>
            </div>
            <p class="mt-1 text-[11px] font-semibold text-slate-400">
              Valor registrado anteriormente: <span class="font-bold text-slate-600 dark:text-slate-300">{{ formatCurrency(currentPaymentAmount) }}</span>
            </p>
          </div>

          <!-- Simulación de Saldo Pendiente del Pedido -->
          <div
            v-if="orderTotal > 0"
            class="rounded-xl border p-3 text-xs font-semibold transition-all"
            :class="
              newPendingBalance === 0
                ? 'border-emerald-200 bg-emerald-50/70 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300'
                : 'border-amber-200 bg-amber-50/70 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300'
            "
          >
            <div class="flex items-center gap-1.5 font-bold">
              <CheckCircle2 v-if="newPendingBalance === 0" class="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <Wallet v-else class="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                {{ newPendingBalance === 0 ? '¡El pedido quedará Pagado Total!' : 'El pedido quedará con saldo pendiente' }}
              </span>
            </div>
            <p class="mt-0.5 text-[11px] opacity-90">
              Nuevo saldo pendiente estimado: <strong class="font-black">{{ formatCurrency(newPendingBalance) }}</strong>
            </p>
          </div>

          <!-- Campo: Medio de Pago -->
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Método de Pago *
            </label>
            <select
              v-model="paymentMethod"
              class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas py-2.5 px-3 text-xs font-bold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
            >
              <option value="EFECTIVO">💵 Efectivo (Caja Menor Física)</option>
              <option value="NEQUI">🟣 Nequi</option>
              <option value="BANCOLOMBIA">🟡 Bancolombia</option>
              <option value="DAVIPLATA">🔴 Daviplata</option>
              <option value="TRANSFERENCIA">🏦 Transferencia Bancaria</option>
              <option value="OTRO">📱 Otro Medio Digital</option>
            </select>
          </div>

          <!-- Campo: Fecha del Pago -->
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Fecha del Pago
            </label>
            <div class="relative">
              <input
                type="date"
                v-model="paymentDate"
                class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas py-2.5 pl-3 pr-3 text-xs font-bold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
              />
            </div>
          </div>

          <!-- Campo: Notas / Observación -->
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Notas o Corrección (Opcional)
            </label>
            <input
              type="text"
              v-model="notes"
              placeholder="Ej: Corregido monto por digitación incorrecta..."
              class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas py-2.5 px-3 text-xs font-medium text-slate-900 placeholder-slate-400 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
            />
          </div>

          <!-- Botones de Acción -->
          <div class="flex items-center justify-end gap-2 border-t border-surface-light-border pt-4 dark:border-surface-dark-border">
            <button
              type="button"
              @click="handleClose"
              class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-surface-dark-canvas dark:text-slate-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              :disabled="!isFormValid || isSubmitting"
              class="inline-flex items-center gap-1.5 rounded-xl bg-hero-gradient px-4 py-2 text-xs font-extrabold text-white shadow-card transition-transform active:scale-95 disabled:opacity-50"
            >
              <span>{{ isSubmitting ? 'Guardando...' : 'Guardar Cambios' }}</span>
            </button>
          </div>
        </form>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
