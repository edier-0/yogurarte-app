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
  CheckCircle2,
  Wallet,
  Clock,
  Banknote,
  AlertCircle,
  MapPin,
  User,
  RotateCw,
} from 'lucide-vue-next';
import { useOperationsStore, type Order, type DeliveryStatus } from '@/stores/operations.store';

const props = defineProps<{
  open: boolean;
  order: Order | null;
}>();

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void;
  (e: 'confirmed', order: Order): void;
}>();

const store = useOperationsStore();

// Modos de recaudo
export type CollectionMode = 'PAID_FULL' | 'PARTIAL' | 'PENDING';

const collectionMode = ref<CollectionMode>('PAID_FULL');
const paymentMethod = ref<string>('EFECTIVO');
const partialAmount = ref<number>(0);
const notes = ref<string>('');
const isSubmitting = ref<boolean>(false);

// Montos base calculados
const orderTotal = computed(() => props.order?.totalAmount || 0);

const previouslyPaid = computed(() => {
  if (!props.order) return 0;
  return props.order.totalPaid ?? props.order.paidAmount ?? 0;
});

const currentPending = computed(() => {
  if (!props.order) return 0;
  return store.getPendingBalance(props.order);
});

// Detectar si el pedido ya está 100% pagado (Paz y Salvo)
const isAlreadyPaid = computed(() => {
  if (!props.order) return false;
  return (
    props.order.paymentStatus === 'PAID' ||
    currentPending.value <= 0 ||
    previouslyPaid.value >= orderTotal.value
  );
});

// Inicialización reactiva cuando cambia la orden o cuando se abre el modal
const syncState = (o: Order | null) => {
  if (o) {
    const pending = store.getPendingBalance(o);
    if (pending <= 0 || o.paymentStatus === 'PAID') {
      collectionMode.value = 'PAID_FULL';
      partialAmount.value = 0;
    } else {
      collectionMode.value = 'PAID_FULL';
      partialAmount.value = pending;
    }
    paymentMethod.value = 'EFECTIVO';
    notes.value = '';
  }
};

watch(
  () => props.order,
  (o) => syncState(o),
  { immediate: true }
);

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      syncState(props.order);
    } else {
      notes.value = '';
      isSubmitting.value = false;
    }
  }
);

// Cuánto paga AHORA en esta entrega (solo aplica si NO está pago de antemano)
const amountToPayNow = computed(() => {
  if (isAlreadyPaid.value || currentPending.value <= 0) return 0;
  if (collectionMode.value === 'PAID_FULL') {
    return currentPending.value;
  }
  if (collectionMode.value === 'PARTIAL') {
    const entered = Number(partialAmount.value) || 0;
    return Math.max(0, Math.min(entered, currentPending.value));
  }
  return 0; // PENDING
});

// Saldo acumulado pagado resultante
const resultingTotalPaid = computed(() => {
  if (isAlreadyPaid.value) return previouslyPaid.value;
  return previouslyPaid.value + amountToPayNow.value;
});

// Saldo pendiente final después de la entrega
const resultingPendingBalance = computed(() => {
  if (isAlreadyPaid.value) return 0;
  return Math.max(0, orderTotal.value - resultingTotalPaid.value);
});

// Estado de pago resultante
const resultingPaymentStatus = computed<'PAID' | 'PARTIAL' | 'PENDING'>(() => {
  if (isAlreadyPaid.value || resultingPendingBalance.value <= 0) return 'PAID';
  if (resultingTotalPaid.value > 0) return 'PARTIAL';
  return 'PENDING';
});

// Formateador de moneda colombiana
const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(val || 0);
};

// Opciones rápidas de porcentaje para abono
const setPartialPercentage = (pct: number) => {
  partialAmount.value = Math.round((currentPending.value * pct) / 100);
};

const handleClose = () => {
  if (isSubmitting.value) return;
  emit('update:open', false);
};

const handleConfirm = async () => {
  if (!props.order) return;

  isSubmitting.value = true;
  try {
    const deliveryNote = notes.value.trim();
    let finalNotes: string | undefined = undefined;
    if (deliveryNote) {
      finalNotes = props.order.notes
        ? `${props.order.notes} | Entrega: ${deliveryNote}`
        : deliveryNote;
    }

    const payload: {
      deliveryStatus: DeliveryStatus;
      paidAmount?: number;
      paymentMethod?: string;
      paymentStatus?: 'PAID' | 'PARTIAL' | 'PENDING';
      notes?: string;
    } = {
      deliveryStatus: 'DELIVERED',
      notes: finalNotes,
    };

    if (!isAlreadyPaid.value) {
      payload.paidAmount = resultingTotalPaid.value;
      payload.paymentStatus = resultingPaymentStatus.value;
      if (amountToPayNow.value > 0) {
        payload.paymentMethod = paymentMethod.value;
      }
    }

    const updated = await store.updateDeliveryStatus(props.order.id, payload);
    emit('confirmed', updated);
    emit('update:open', false);
  } catch (err) {
    console.error('Error al confirmar entrega:', err);
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <DialogRoot :open="open" @update:open="emit('update:open', $event)">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity" />
      <DialogContent
        class="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 max-h-[92vh] overflow-y-auto rounded-3xl border border-surface-light-border bg-surface-light-card p-6 shadow-elevated focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-card sm:p-7"
      >
        <!-- Modal Header -->
        <div class="flex items-center justify-between border-b border-surface-light-border pb-4 dark:border-surface-dark-border">
          <div class="flex items-center gap-3">
            <div
              class="flex h-10 w-10 items-center justify-center rounded-2xl text-white shadow-card transition-colors"
              :class="isAlreadyPaid ? 'bg-emerald-600 dark:bg-emerald-500' : 'bg-brand-800 dark:bg-brand-500'"
            >
              <CheckCircle2 class="h-5 w-5 stroke-[2]" />
            </div>
            <div>
              <DialogTitle class="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
                {{ isAlreadyPaid ? 'Confirmar Entrega de Pedido' : 'Confirmar Entrega y Recaudo' }}
              </DialogTitle>
              <DialogDescription class="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {{ order?.orderCode }} • {{ isAlreadyPaid ? 'Pedido Paz y Salvo (Sin cobro pendiente)' : 'Control financiero y liquidación de comanda' }}
              </DialogDescription>
            </div>
          </div>

          <DialogClose
            @click="handleClose"
            :disabled="isSubmitting"
            class="rounded-xl p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X class="h-4 w-4" />
          </DialogClose>
        </div>

        <div v-if="order" class="mt-4 space-y-4">
          <!-- Tarjeta de Información del Cliente y Dirección -->
          <div class="rounded-2xl border border-slate-200/80 bg-surface-light-canvas p-3.5 dark:border-slate-800 dark:bg-surface-dark-canvas">
            <div class="flex items-start justify-between gap-3">
              <div class="flex items-start gap-2.5 min-w-0">
                <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-200/70 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  <User class="h-4 w-4 stroke-[1.75]" />
                </div>
                <div class="min-w-0">
                  <h4 class="truncate text-xs font-extrabold text-slate-900 dark:text-white">
                    {{ order.customer?.fullName || order.customerName || 'Cliente' }}
                  </h4>
                  <p class="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    Tel: {{ order.customer?.phone || order.customerPhone || 'Sin teléfono' }}
                  </p>
                  <p v-if="order.customerAddress || order.customer?.address" class="mt-0.5 flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-300">
                    <MapPin class="h-3 w-3 shrink-0 text-accent-500" />
                    <span class="truncate">{{ order.customerAddress || order.customer?.address }}</span>
                  </p>
                </div>
              </div>

              <!-- Balance Actual de la Orden -->
              <div class="text-right shrink-0">
                <span class="block text-[10px] font-bold uppercase text-slate-400">Total Pedido</span>
                <span class="text-sm font-black text-slate-900 dark:text-white">
                  {{ formatCurrency(orderTotal) }}
                </span>
                <span
                  class="mt-0.5 block text-[10px] font-extrabold"
                  :class="currentPending > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'"
                >
                  {{ currentPending > 0 ? `Pendiente: ${formatCurrency(currentPending)}` : 'Paz y Salvo' }}
                </span>
              </div>
            </div>
          </div>

          <!-- Caso 1: Pedido Ya Pagado (Paz y Salvo) -> Solo confirmar entrega -->
          <div v-if="isAlreadyPaid" class="rounded-2xl border border-emerald-200/80 bg-emerald-50/70 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/30">
            <div class="flex items-start gap-3">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
                <CheckCircle2 class="h-6 w-6 stroke-[2]" />
              </div>
              <div class="space-y-1">
                <h5 class="text-sm font-extrabold text-emerald-950 dark:text-emerald-200">
                  Pedido Pagado en su Totalidad
                </h5>
                <p class="text-xs font-semibold text-emerald-800/90 dark:text-emerald-300/90 leading-relaxed">
                  Este pedido se encuentra a <strong>Paz y Salvo ($0 saldo pendiente)</strong> con un total liquidado de
                  <strong>{{ formatCurrency(previouslyPaid || orderTotal) }}</strong>.
                </p>
                <p class="text-[11px] font-medium text-emerald-700/80 dark:text-emerald-400">
                  No se requiere recaudar ningún dinero. Solo confirma la entrega para registrar la salida y marcar el pedido como entregado.
                </p>
              </div>
            </div>
          </div>

          <!-- Caso 2: Pedido con Saldo Pendiente -> Gestionar Modalidad de Recaudo -->
          <template v-else>
            <!-- Selector de Modo de Recaudo (3 Opciones Claras con Estilo Slate / Marfil) -->
            <div>
              <label class="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-2">
                Seleccionar Modalidad de Recaudo *
              </label>

              <div class="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                <!-- Opción 1: Pagó Total -->
                <button
                  type="button"
                  @click="collectionMode = 'PAID_FULL'"
                  class="relative flex flex-col justify-between rounded-2xl border p-3.5 text-left transition-all active:scale-95"
                  :class="[
                    collectionMode === 'PAID_FULL'
                      ? 'border-emerald-500 bg-emerald-50/70 shadow-sm ring-1 ring-emerald-500 dark:border-emerald-500 dark:bg-emerald-950/30'
                      : 'border-slate-200 bg-surface-light-card hover:bg-slate-50 dark:border-slate-800 dark:bg-surface-dark-card dark:hover:bg-slate-800/60'
                  ]"
                >
                  <div class="flex items-center justify-between">
                    <div class="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                      <Banknote class="h-4 w-4 stroke-[2]" />
                    </div>
                    <span class="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-extrabold uppercase text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                      Paz y Salvo
                    </span>
                  </div>
                  <div class="mt-2.5">
                    <span class="block text-xs font-black text-slate-900 dark:text-white">Pagó Total</span>
                    <span class="block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      {{ currentPending > 0 ? formatCurrency(currentPending) : 'Saldado' }}
                    </span>
                  </div>
                </button>

                <!-- Opción 2: Abonó -->
                <button
                  type="button"
                  @click="collectionMode = 'PARTIAL'"
                  class="relative flex flex-col justify-between rounded-2xl border p-3.5 text-left transition-all active:scale-95"
                  :class="[
                    collectionMode === 'PARTIAL'
                      ? 'border-amber-500 bg-amber-50/70 shadow-sm ring-1 ring-amber-500 dark:border-amber-500 dark:bg-amber-950/30'
                      : 'border-slate-200 bg-surface-light-card hover:bg-slate-50 dark:border-slate-800 dark:bg-surface-dark-card dark:hover:bg-slate-800/60'
                  ]"
                >
                  <div class="flex items-center justify-between">
                    <div class="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                      <Wallet class="h-4 w-4 stroke-[2]" />
                    </div>
                    <span class="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-extrabold uppercase text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                      Abono
                    </span>
                  </div>
                  <div class="mt-2.5">
                    <span class="block text-xs font-black text-slate-900 dark:text-white">Abonó</span>
                    <span class="block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      Pago parcial
                    </span>
                  </div>
                </button>

                <!-- Opción 3: No Pagó / A Crédito -->
                <button
                  type="button"
                  @click="collectionMode = 'PENDING'"
                  class="relative flex flex-col justify-between rounded-2xl border p-3.5 text-left transition-all active:scale-95"
                  :class="[
                    collectionMode === 'PENDING'
                      ? 'border-rose-500 bg-rose-50/70 shadow-sm ring-1 ring-rose-500 dark:border-rose-500 dark:bg-rose-950/30'
                      : 'border-slate-200 bg-surface-light-card hover:bg-slate-50 dark:border-slate-800 dark:bg-surface-dark-card dark:hover:bg-slate-800/60'
                  ]"
                >
                  <div class="flex items-center justify-between">
                    <div class="flex h-7 w-7 items-center justify-center rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300">
                      <Clock class="h-4 w-4 stroke-[2]" />
                    </div>
                    <span class="rounded-full bg-rose-100 px-2 py-0.5 text-[9px] font-extrabold uppercase text-rose-800 dark:bg-rose-900/60 dark:text-rose-300">
                      A Crédito
                    </span>
                  </div>
                  <div class="mt-2.5">
                    <span class="block text-xs font-black text-slate-900 dark:text-white">No Pagó</span>
                    <span class="block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      Fiado / Pendiente
                    </span>
                  </div>
                </button>
              </div>
            </div>

            <!-- Formulario Condicional por Modo -->
            <!-- Caso A: Pagó Total -->
            <div v-if="collectionMode === 'PAID_FULL'" class="space-y-3 rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
              <div class="flex items-center justify-between">
                <div>
                  <span class="text-xs font-extrabold text-emerald-900 dark:text-emerald-200">
                    Monto a Recaudar:
                  </span>
                  <span class="ml-1 text-sm font-black text-emerald-700 dark:text-emerald-300">
                    {{ formatCurrency(currentPending) }}
                  </span>
                </div>
                <span class="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  Ingreso directo a Caja Menor
                </span>
              </div>

              <div v-if="currentPending > 0">
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Medio de Pago Utilizado *
                </label>
                <select
                  v-model="paymentMethod"
                  class="w-full rounded-xl border border-slate-200 bg-surface-light-card py-2.5 px-3 text-xs font-bold text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-surface-dark-card dark:text-white"
                >
                  <option value="EFECTIVO">Efectivo Caja Menor</option>
                  <option value="NEQUI">Nequi</option>
                  <option value="BANCOLOMBIA">Bancolombia</option>
                  <option value="DAVIPLATA">Daviplata</option>
                  <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                </select>
              </div>
            </div>

            <!-- Caso B: Abonó Parcial -->
            <div v-else-if="collectionMode === 'PARTIAL'" class="space-y-3 rounded-2xl border border-amber-200/80 bg-amber-50/40 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
              <div>
                <div class="flex items-center justify-between mb-1">
                  <label class="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Monto Entregado en Mano ($ COP) *
                  </label>
                  <!-- Atajos rápidos -->
                  <div class="flex items-center gap-1">
                    <button
                      type="button"
                      @click="setPartialPercentage(25)"
                      class="rounded-lg bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 hover:bg-amber-200 dark:bg-amber-900/60 dark:text-amber-200"
                    >
                      25%
                    </button>
                    <button
                      type="button"
                      @click="setPartialPercentage(50)"
                      class="rounded-lg bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 hover:bg-amber-200 dark:bg-amber-900/60 dark:text-amber-200"
                    >
                      50%
                    </button>
                    <button
                      type="button"
                      @click="setPartialPercentage(75)"
                      class="rounded-lg bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 hover:bg-amber-200 dark:bg-amber-900/60 dark:text-amber-200"
                    >
                      75%
                    </button>
                  </div>
                </div>

                <input
                  type="number"
                  step="any"
                  min="0"
                  :max="currentPending"
                  v-model.number="partialAmount"
                  class="w-full rounded-xl border border-slate-200 bg-surface-light-card py-2.5 px-3 text-sm font-black text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-surface-dark-card dark:text-white"
                  placeholder="Ingresa el valor del abono..."
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Medio de Pago del Abono *
                </label>
                <select
                  v-model="paymentMethod"
                  class="w-full rounded-xl border border-slate-200 bg-surface-light-card py-2.5 px-3 text-xs font-bold text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-surface-dark-card dark:text-white"
                >
                  <option value="EFECTIVO">Efectivo Caja Menor</option>
                  <option value="NEQUI">Nequi</option>
                  <option value="BANCOLOMBIA">Bancolombia</option>
                  <option value="DAVIPLATA">Daviplata</option>
                  <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                </select>
              </div>
            </div>

            <!-- Caso C: No Pagó / A Crédito -->
            <div v-else-if="collectionMode === 'PENDING'" class="space-y-2 rounded-2xl border border-rose-200/80 bg-rose-50/50 p-4 dark:border-rose-900/40 dark:bg-rose-950/20">
              <div class="flex items-start gap-2.5">
                <AlertCircle class="h-5 w-5 shrink-0 text-rose-600 mt-0.5 dark:text-rose-400 stroke-[1.75]" />
                <div class="text-xs text-rose-900 dark:text-rose-200">
                  <p class="font-extrabold">Entrega a Crédito (Sin Recaudo Inmediato)</p>
                  <p class="mt-0.5 font-medium leading-relaxed">
                    El pedido cambiará de estado a <strong>Entregado</strong>, pero <strong>no se asentará ningún ingreso en Caja Menor</strong>. La deuda de
                    <strong>{{ formatCurrency(currentPending) }}</strong> quedará registrada en la cuenta del cliente para cobro posterior.
                  </p>
                </div>
              </div>
            </div>

            <!-- Despliegue en Vivo: Desglose Financiero -->
            <div class="rounded-2xl border border-surface-light-border bg-surface-light-canvas p-3.5 dark:border-surface-dark-border dark:bg-surface-dark-canvas space-y-2">
              <div class="flex items-center justify-between text-xs">
                <span class="font-bold text-slate-500 dark:text-slate-400">Total del Pedido:</span>
                <span class="font-extrabold text-slate-800 dark:text-slate-200">{{ formatCurrency(orderTotal) }}</span>
              </div>

              <div class="flex items-center justify-between text-xs">
                <span class="font-bold text-slate-500 dark:text-slate-400">Recaudo en esta Entrega:</span>
                <span class="font-black text-emerald-600 dark:text-emerald-400">
                  + {{ formatCurrency(amountToPayNow) }}
                </span>
              </div>

              <div class="flex items-center justify-between border-t border-slate-200/80 pt-2 text-xs dark:border-slate-800">
                <span class="font-extrabold text-slate-700 dark:text-slate-300">Saldo Pendiente Restante:</span>
                <span
                  class="font-black"
                  :class="resultingPendingBalance > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'"
                >
                  {{ resultingPendingBalance > 0 ? formatCurrency(resultingPendingBalance) : 'Paz y Salvo ($0)' }}
                </span>
              </div>
            </div>
          </template>

          <!-- Referencia / Notas de la Entrega -->
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Nota / Referencia de la Entrega (Opcional)
            </label>
            <input
              type="text"
              v-model="notes"
              placeholder="Ej. Recibido por vigilante / Entregado a satisfacción"
              class="w-full rounded-xl border border-slate-200 bg-surface-light-canvas py-2 px-3 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-surface-dark-canvas dark:text-white"
            />
          </div>

          <!-- Botones de Acción del Modal -->
          <div class="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              @click="handleClose"
              :disabled="isSubmitting"
              class="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>

            <button
              type="button"
              @click="handleConfirm"
              :disabled="isSubmitting"
              class="inline-flex items-center gap-2 rounded-xl bg-natural-500 px-5 py-2.5 text-xs font-black text-white shadow-card transition-all active:scale-95 hover:bg-natural-600 disabled:opacity-50"
            >
              <RotateCw v-if="isSubmitting" class="h-4 w-4 animate-spin stroke-[2]" />
              <CheckCircle2 v-else class="h-4 w-4 stroke-[2]" />
              <span>{{ isSubmitting ? 'Confirmando...' : (isAlreadyPaid ? 'Confirmar Entrega' : 'Confirmar y Entregar Pedido') }}</span>
            </button>
          </div>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
