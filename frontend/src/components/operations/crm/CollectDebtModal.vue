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
  X,
  DollarSign,
  CheckCircle2,
  Receipt,
  User,
  Phone,
} from 'lucide-vue-next';
import { http } from '@/api/client';
import { toast } from 'vue-sonner';

export interface DebtOrderInfo {
  id: number;
  orderNumber: string;
  orderDate: string;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  calculatedPending?: number;
  paymentStatus: string;
}

export interface CustomerDebtData {
  id: number;
  fullName: string;
  phone: string;
  address?: string | null;
  pendingDebt?: number;
  pendingOrders?: DebtOrderInfo[];
}

const props = defineProps<{
  open: boolean;
  customer: CustomerDebtData | null;
}>();

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void;
  (e: 'saved'): void;
}>();

const amount = ref<number>(0);
const paymentMethod = ref<string>('EFECTIVO');
const targetOrderId = ref<string | number>('AUTO');
const notes = ref<string>('');
const isSubmitting = ref<boolean>(false);

const paymentMethods = [
  { id: 'EFECTIVO', label: 'Efectivo' },
  { id: 'NEQUI', label: 'Nequi' },
  { id: 'DAVIPLATA', label: 'Daviplata' },
  { id: 'TRANSFERENCIA', label: 'Transferencia' },
  { id: 'DATAFONO', label: 'Datáfono' },
];

const totalPendingDebt = computed(() => {
  if (!props.customer) return 0;
  if (typeof props.customer.pendingDebt === 'number') {
    return props.customer.pendingDebt;
  }
  const orders = props.customer.pendingOrders || [];
  return orders.reduce((sum, o) => {
    const p = o.calculatedPending ?? (o.pendingAmount > 0 ? o.pendingAmount : Math.max(0, o.totalAmount - (o.paidAmount || 0)));
    return sum + p;
  }, 0);
});

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen && props.customer) {
      amount.value = totalPendingDebt.value;
      paymentMethod.value = 'EFECTIVO';
      targetOrderId.value = 'AUTO';
      notes.value = '';
      isSubmitting.value = false;
    }
  }
);

function handleSetFullDebt() {
  amount.value = totalPendingDebt.value;
}

function handleClose() {
  emit('update:open', false);
}

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(val || 0);
};

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
};

async function handleSubmit() {
  if (!props.customer) return;
  const paymentVal = Number(amount.value);
  if (!paymentVal || paymentVal <= 0) {
    toast.error('Ingresa un monto válido a cobrar mayor a $0');
    return;
  }

  isSubmitting.value = true;
  try {
    const payload: any = {
      amount: paymentVal,
      paymentMethod: paymentMethod.value,
      notes: notes.value.trim() || undefined,
    };
    if (targetOrderId.value && targetOrderId.value !== 'AUTO') {
      payload.orderId = Number(targetOrderId.value);
    } else {
      payload.orderId = 'AUTO';
    }

    const res = await http.post<any>(`/customers/${props.customer.id}/payment`, payload);
    toast.success(res?.message || `Cobro de ${formatCurrency(paymentVal)} registrado con éxito`, {
      description: `Cliente: ${props.customer.fullName} • Se asentó el ingreso en caja y se actualizó el saldo.`,
    });
    emit('saved');
    handleClose();
  } catch (err: any) {
    toast.error(err?.response?.data?.error || 'Error al registrar el cobro de la deuda');
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <DialogRoot :open="open" @update:open="(val: boolean) => emit('update:open', val)">
    <DialogPortal to="body">
      <DialogOverlay class="fixed inset-0 z-[9998] bg-black/70 backdrop-blur-sm transition-opacity" />

      <DialogContent
        class="fixed left-1/2 top-1/2 z-[9999] w-[95%] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl transition-all focus:outline-none dark:border-slate-800 dark:bg-slate-900 sm:p-6 max-h-[92vh] flex flex-col"
      >
        <!-- Header del Modal -->
        <div class="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div class="flex items-center gap-3">
            <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-500/20 shadow-xs">
              <Receipt class="h-5 w-5 stroke-[2.5]" />
            </div>
            <div>
              <DialogTitle class="text-base font-black tracking-tight text-slate-900 dark:text-white sm:text-lg">
                Cobrar Pedidos con Deuda
              </DialogTitle>
              <DialogDescription class="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                <span>Registrar cobro o abono al saldo pendiente del cliente</span>
              </DialogDescription>
            </div>
          </div>

          <button
            type="button"
            @click="handleClose"
            class="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
            title="Cerrar"
          >
            <X class="h-5 w-5" />
          </button>
        </div>

        <!-- Contenido Desplazable -->
        <div class="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          <!-- Tarjeta de Información del Cliente -->
          <div class="rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-slate-800/50 flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <div class="h-9 w-9 rounded-xl bg-white dark:bg-slate-700 shadow-xs flex items-center justify-center text-slate-600 dark:text-slate-300">
                <User class="h-4 w-4" />
              </div>
              <div>
                <p class="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                  {{ customer?.fullName }}
                </p>
                <p class="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Phone class="h-3 w-3" />
                  <span>{{ customer?.phone || 'Sin teléfono' }}</span>
                </p>
              </div>
            </div>

            <!-- Resumen Total Deuda -->
            <div class="text-right">
              <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Deuda Total
              </span>
              <p class="text-sm sm:text-base font-black text-rose-600 dark:text-rose-400">
                {{ formatCurrency(totalPendingDebt) }}
              </p>
            </div>
          </div>

          <!-- Desglose de Pedidos con Saldo Pendiente si existen -->
          <div v-if="customer?.pendingOrders && customer.pendingOrders.length > 0" class="space-y-2">
            <label class="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Pedidos que componen la deuda ({{ customer.pendingOrders.length }}):</span>
              <span class="text-[10px] text-slate-400 font-normal">Del más antiguo al más reciente</span>
            </label>

            <div class="space-y-1.5 max-h-36 overflow-y-auto rounded-2xl border border-slate-200/80 p-2 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
              <div
                v-for="ord in customer.pendingOrders"
                :key="ord.id"
                class="flex items-center justify-between rounded-xl bg-white p-2.5 text-xs shadow-xs dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60"
              >
                <div class="flex items-center gap-2">
                  <span class="font-extrabold text-brand-800 dark:text-brand-darkText">
                    {{ ord.orderNumber }}
                  </span>
                  <span class="text-[10px] text-slate-400">
                    {{ formatDate(ord.orderDate) }}
                  </span>
                </div>

                <div class="flex items-center gap-3">
                  <span class="text-[11px] text-slate-500 dark:text-slate-400">
                    Total: {{ formatCurrency(ord.totalAmount) }}
                  </span>
                  <span class="font-bold text-rose-600 dark:text-rose-400">
                    Resta: {{ formatCurrency(ord.calculatedPending ?? ord.pendingAmount) }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Formulario de Cobro -->
          <div class="space-y-3 pt-1">
            <!-- Monto a Cobrar -->
            <div class="space-y-1">
              <div class="flex items-center justify-between">
                <label for="collect-amount" class="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Monto a Cobrar / Abonar ($ COP):
                </label>
                <button
                  type="button"
                  @click="handleSetFullDebt"
                  class="text-[11px] font-bold text-brand-800 hover:text-brand-900 dark:text-brand-darkText underline transition-colors"
                >
                  Cobrar Total ({{ formatCurrency(totalPendingDebt) }})
                </button>
              </div>

              <div class="relative">
                <DollarSign class="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  id="collect-amount"
                  v-model.number="amount"
                  type="number"
                  min="1"
                  :max="totalPendingDebt > 0 ? totalPendingDebt : undefined"
                  class="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm font-extrabold text-slate-900 focus:border-brand-800 focus:outline-none focus:ring-4 focus:ring-brand-800/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  placeholder="Ej: 24000"
                />
              </div>
            </div>

            <!-- Método de Pago -->
            <div class="space-y-1">
              <label class="text-xs font-bold text-slate-700 dark:text-slate-300">
                Método de Pago:
              </label>
              <div class="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                <button
                  v-for="m in paymentMethods"
                  :key="m.id"
                  type="button"
                  @click="paymentMethod = m.id"
                  class="rounded-xl px-2.5 py-2 text-[11px] font-extrabold transition-all border text-center"
                  :class="
                    paymentMethod === m.id
                      ? 'border-brand-800 bg-brand-800 text-white shadow-xs dark:bg-brand-700 dark:border-brand-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700/60'
                  "
                >
                  {{ m.label }}
                </button>
              </div>
            </div>

            <!-- Aplicación del Pago (Modo Cascada o Pedido Único) -->
            <div class="space-y-1">
              <label class="text-xs font-bold text-slate-700 dark:text-slate-300">
                Modo de Imputación:
              </label>
              <select
                v-model="targetOrderId"
                class="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="AUTO">
                  ⚡ Cascada automática (saldar pedidos más antiguos primero)
                </option>
                <option
                  v-for="ord in customer?.pendingOrders || []"
                  :key="ord.id"
                  :value="ord.id"
                >
                  Aplicar solo al pedido {{ ord.orderNumber }} (Saldo: {{ formatCurrency(ord.calculatedPending ?? ord.pendingAmount) }})
                </option>
              </select>
            </div>

            <!-- Notas Adicionales -->
            <div class="space-y-1">
              <label for="collect-notes" class="text-xs font-bold text-slate-700 dark:text-slate-300">
                Comentarios / N° Comprobante (Opcional):
              </label>
              <input
                id="collect-notes"
                v-model="notes"
                type="text"
                placeholder="Ej: Transferencia Nequi comprobante #9482"
                class="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-medium text-slate-900 focus:border-brand-800 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>
        </div>

        <!-- Footer / Acciones -->
        <div class="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
          <button
            type="button"
            @click="handleClose"
            :disabled="isSubmitting"
            class="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Cancelar
          </button>

          <button
            type="button"
            @click="handleSubmit"
            :disabled="amount <= 0 || isSubmitting"
            class="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-2.5 text-xs font-extrabold text-white shadow-md shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-50"
          >
            <CheckCircle2 v-if="!isSubmitting" class="h-4 w-4 stroke-[2.5]" />
            <span v-else class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
            <span>Registrar Cobro ({{ formatCurrency(amount) }})</span>
          </button>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
