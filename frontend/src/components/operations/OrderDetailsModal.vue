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
  ShoppingBag,
  X,
  Milk,
  Receipt,
  User,
  Phone,
  MapPin,
  ChevronLeft,
  ChevronRight,
} from 'lucide-vue-next';
import { http } from '@/api/client';
import { type Order } from '@/stores/operations.store';

const props = defineProps<{
  open: boolean;
  orderId: number | null;
}>();

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void;
}>();

const order = ref<Order | null>(null);
const isLoading = ref<boolean>(false);

// Subtabla 1: Paginación de Ítems a 5 registros
const itemsPage = ref<number>(1);
const itemsLimit = 5;

const paginatedItems = computed(() => {
  if (!order.value?.items) return [];
  const start = (itemsPage.value - 1) * itemsLimit;
  return order.value.items.slice(start, start + itemsLimit);
});

const totalItemPages = computed(() => {
  if (!order.value?.items) return 1;
  return Math.ceil(order.value.items.length / itemsLimit) || 1;
});

// Subtabla 2: Paginación de Pagos / Abonos a 5 registros
const paymentsPage = ref<number>(1);
const paymentsLimit = 5;

const paginatedPayments = computed(() => {
  if (!order.value?.payments) return [];
  const start = (paymentsPage.value - 1) * paymentsLimit;
  return order.value.payments.slice(start, start + paymentsLimit);
});

const totalPaymentPages = computed(() => {
  if (!order.value?.payments) return 1;
  return Math.ceil(order.value.payments.length / paymentsLimit) || 1;
});

const formatCurrency = (val?: number | null) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(val || 0);
};

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(d);
  } catch {
    return dateStr;
  }
};

async function loadOrder() {
  if (!props.orderId) return;
  isLoading.value = true;
  try {
    const res = await http.get<Order>(`/orders/${props.orderId}`);
    order.value = res;
  } catch {
    order.value = null;
  } finally {
    isLoading.value = false;
  }
}

watch(
  () => [props.open, props.orderId],
  async ([isOpen, id]) => {
    if (isOpen && id) {
      itemsPage.value = 1;
      paymentsPage.value = 1;
      await loadOrder();
    } else {
      order.value = null;
    }
  },
  { immediate: true }
);

function handleClose() {
  emit('update:open', false);
}
</script>

<template>
  <DialogRoot :open="open" @update:open="(val: boolean) => emit('update:open', val)">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity" />

      <DialogContent
        class="fixed left-1/2 top-1/2 z-50 w-[95%] max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-surface-light-border bg-surface-light-card p-6 shadow-2xl transition-all focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-card sm:p-7 max-h-[90vh] overflow-y-auto"
      >
        <!-- Encabezado del Modal -->
        <div class="flex items-center justify-between border-b border-surface-light-border pb-4 dark:border-surface-dark-border">
          <div class="flex items-center gap-3">
            <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-800 dark:bg-purple-950/40 dark:text-purple-300">
              <ShoppingBag class="h-6 w-6 stroke-[2]" />
            </div>
            <div>
              <div class="flex items-center gap-2">
                <DialogTitle class="text-lg font-black text-slate-900 dark:text-white sm:text-xl">
                  Detalle y Auditoría de Pedido
                </DialogTitle>
                <span
                  v-if="order"
                  class="rounded-xl bg-surface-light-canvas px-2.5 py-0.5 font-mono text-xs font-black text-brand-800 border border-slate-200 dark:border-slate-700 dark:bg-surface-dark-canvas dark:text-brand-darkText"
                >
                  {{ order.orderCode || '#' + order.id }}
                </span>
              </div>
              <DialogDescription class="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Desglose de productos, trazabilidad de abonos y saldo de cartera
              </DialogDescription>
            </div>
          </div>

          <button
            type="button"
            @click="handleClose"
            class="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X class="h-5 w-5" />
          </button>
        </div>

        <div v-if="isLoading" class="py-12 text-center text-xs text-slate-400">
          Cargando auditoría del pedido...
        </div>

        <div v-else-if="order" class="mt-5 space-y-6">
          <!-- Datos del Cliente y Entrega -->
          <div class="grid grid-cols-1 gap-3 rounded-2xl border border-surface-light-border bg-surface-light-canvas p-4 sm:grid-cols-2 dark:border-surface-dark-border dark:bg-surface-dark-canvas">
            <div class="space-y-1">
              <span class="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Cliente</span>
              <p class="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                <User class="h-4 w-4 text-brand-800 dark:text-brand-darkText" />
                {{ order.customer?.fullName || order.customerName || 'Cliente Ocasional' }}
              </p>
              <p class="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                <Phone class="h-3.5 w-3.5" />
                {{ order.customer?.phone || order.customerPhone || 'Sin teléfono' }}
              </p>
              <p v-if="order.customerAddress || order.customer?.address" class="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                <MapPin class="h-3.5 w-3.5" />
                {{ order.customerAddress || order.customer?.address }}
              </p>
            </div>

            <div class="space-y-1 border-t border-slate-200 pt-2 sm:border-0 sm:pt-0 dark:border-slate-800">
              <span class="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Estado Financiero</span>
              <div class="flex items-center justify-between">
                <span class="text-xs text-slate-600 dark:text-slate-300">Total Pedido:</span>
                <span class="text-sm font-black text-slate-900 dark:text-white">{{ formatCurrency(order.totalAmount) }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-xs text-slate-600 dark:text-slate-300">Abonado:</span>
                <span class="text-xs font-bold text-emerald-600 dark:text-emerald-400">{{ formatCurrency(order.paidAmount || 0) }}</span>
              </div>
              <div class="flex items-center justify-between border-t border-slate-200/60 pt-1 dark:border-slate-800">
                <span class="text-xs font-bold text-slate-700 dark:text-slate-200">Saldo Pendiente:</span>
                <span
                  class="text-sm font-black"
                  :class="(order.totalAmount - (order.paidAmount || 0)) > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'"
                >
                  {{ formatCurrency(Math.max(0, order.totalAmount - (order.paidAmount || 0))) }}
                </span>
              </div>
            </div>
          </div>

          <!-- SUBTABLA 1: PRODUCTOS / ÍTEMS (Paginada a 5) -->
          <div class="space-y-2.5">
            <div class="flex items-center justify-between">
              <h4 class="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Milk class="h-4 w-4 text-brand-800 dark:text-brand-darkText" />
                <span>Productos de la Comanda ({{ order.items?.length || 0 }})</span>
              </h4>
            </div>

            <div class="overflow-x-auto rounded-2xl border border-surface-light-border dark:border-surface-dark-border">
              <table class="w-full text-left text-xs">
                <thead class="bg-slate-50 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  <tr>
                    <th class="px-3.5 py-2.5">Sabor</th>
                    <th class="px-3.5 py-2.5 text-center">Presentación</th>
                    <th class="px-3.5 py-2.5 text-center">Cantidad</th>
                    <th class="px-3.5 py-2.5 text-right">Precio Unitario</th>
                    <th class="px-3.5 py-2.5 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800 bg-surface-light-card dark:bg-surface-dark-card font-medium text-slate-700 dark:text-slate-300">
                  <tr v-for="it in paginatedItems" :key="it.id || it.flavor">
                    <td class="px-3.5 py-2.5 font-bold text-slate-900 dark:text-white">
                      {{ it.flavor }}
                    </td>
                    <td class="px-3.5 py-2.5 text-center">
                      <span class="rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {{ it.bottleSize }}
                      </span>
                    </td>
                    <td class="px-3.5 py-2.5 text-center font-black">
                      {{ it.quantity }} und
                    </td>
                    <td class="px-3.5 py-2.5 text-right font-semibold">
                      {{ formatCurrency(it.unitPrice) }}
                    </td>
                    <td class="px-3.5 py-2.5 text-right font-black text-slate-900 dark:text-white">
                      {{ formatCurrency(it.totalPrice) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Paginación de Ítems (5 registros) -->
            <div
              v-if="totalItemPages > 1"
              class="flex items-center justify-between border-t border-slate-100 pt-2 dark:border-slate-800 text-xs text-slate-500"
            >
              <span>Página {{ itemsPage }} de {{ totalItemPages }}</span>
              <div class="flex items-center gap-1.5">
                <button
                  type="button"
                  @click="itemsPage--"
                  :disabled="itemsPage <= 1"
                  class="rounded-lg border border-slate-200 p-1 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800"
                >
                  <ChevronLeft class="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  @click="itemsPage++"
                  :disabled="itemsPage >= totalItemPages"
                  class="rounded-lg border border-slate-200 p-1 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800"
                >
                  <ChevronRight class="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          <!-- SUBTABLA 2: HISTORIAL DE ABONOS / PAGOS (Paginada a 5) -->
          <div class="space-y-2.5">
            <div class="flex items-center justify-between">
              <h4 class="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Receipt class="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>Historial de Pagos y Abonos ({{ order.payments?.length || 0 }})</span>
              </h4>
            </div>

            <div v-if="!order.payments || order.payments.length === 0" class="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400 dark:border-slate-700">
              No se han registrado abonos para este pedido.
            </div>

            <div v-else class="space-y-2">
              <div class="overflow-x-auto rounded-2xl border border-surface-light-border dark:border-surface-dark-border">
                <table class="w-full text-left text-xs">
                  <thead class="bg-slate-50 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    <tr>
                      <th class="px-3.5 py-2.5">Fecha</th>
                      <th class="px-3.5 py-2.5">Medio de Pago</th>
                      <th class="px-3.5 py-2.5">Referencia / Nota</th>
                      <th class="px-3.5 py-2.5 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100 dark:divide-slate-800 bg-surface-light-card dark:bg-surface-dark-card font-medium text-slate-700 dark:text-slate-300">
                    <tr v-for="pay in paginatedPayments" :key="pay.id">
                      <td class="px-3.5 py-2.5 whitespace-nowrap text-slate-600 dark:text-slate-300">
                        {{ formatDate(pay.paymentDate) }}
                      </td>
                      <td class="px-3.5 py-2.5 font-bold text-slate-800 dark:text-white">
                        {{ pay.paymentMethod }}
                      </td>
                      <td class="px-3.5 py-2.5 text-slate-500 italic">
                        {{ pay.notes || '—' }}
                      </td>
                      <td class="px-3.5 py-2.5 text-right font-black text-emerald-600 dark:text-emerald-400">
                        {{ formatCurrency(pay.amount) }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Paginación de Pagos (5 registros) -->
              <div
                v-if="totalPaymentPages > 1"
                class="flex items-center justify-between border-t border-slate-100 pt-2 dark:border-slate-800 text-xs text-slate-500"
              >
                <span>Página {{ paymentsPage }} de {{ totalPaymentPages }}</span>
                <div class="flex items-center gap-1.5">
                  <button
                    type="button"
                    @click="paymentsPage--"
                    :disabled="paymentsPage <= 1"
                    class="rounded-lg border border-slate-200 p-1 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800"
                  >
                    <ChevronLeft class="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    @click="paymentsPage++"
                    :disabled="paymentsPage >= totalPaymentPages"
                    class="rounded-lg border border-slate-200 p-1 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800"
                  >
                    <ChevronRight class="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-6 flex justify-end border-t border-surface-light-border pt-4 dark:border-surface-dark-border">
          <button
            type="button"
            @click="handleClose"
            class="rounded-xl bg-brand-800 px-5 py-2.5 text-xs font-extrabold text-white transition-transform active:scale-95 dark:bg-brand-500"
          >
            Cerrar
          </button>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
