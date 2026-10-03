<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import {
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from 'reka-ui';
import {
  PackageCheck,
  X,
  Unlink,
  UserMinus,
  ChevronLeft,
  ChevronRight,
  Link,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
} from 'lucide-vue-next';
import {
  useProductionStore,
  type PackagingSummaryData,
} from '@/stores/production.store';
import { useConfirm } from '@/composables/useConfirm';
import { getTodayDateBogota } from '@/stores/finance.store';
import { http } from '@/api/client';

const props = defineProps<{
  open: boolean;
  packagingId: number | null;
}>();

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void;
  (e: 'updated'): void;
}>();

const productionStore = useProductionStore();
const { confirm } = useConfirm();

const summary = ref<PackagingSummaryData | null>(null);
const isLoading = ref<boolean>(false);
const activeTab = ref<'PRESENTATIONS' | 'ORDERS' | 'LINK_ORDERS' | 'PARTNERS'>('PRESENTATIONS');

// Pedidos sin lote para vincular masivamente
const unlinkedOrders = ref<any[]>([]);
const isLoadingUnlinked = ref<boolean>(false);
const unlinkedFilter = ref<'MATCH' | 'ALL'>('MATCH');
const selectedOrderIds = ref<number[]>([]);
const isLinkingOrders = ref<boolean>(false);

// Paginación local para pedidos vinculados a 5 registros
const ordersPage = ref<number>(1);
const ordersLimit = 5;

// Personal (socios)
interface StaffItem {
  id: number;
  fullName: string;
  role: string;
  type: string;
}
const staffList = ref<StaffItem[]>([]);
const partners = computed(() =>
  staffList.value.filter((s) => s.type === 'SOCIO' || s.role.toLowerCase().includes('socio'))
);

// Formulario de retiro de socio sobre la fracción
const showPartnerWithdrawalForm = ref<boolean>(false);
const selectedPartnerId = ref<number | null>(null);
const selectedPresentationSize = ref<string>('');
const withdrawalQuantity = ref<number>(1);
const withdrawalNotes = ref<string>('');
const isSubmittingWithdrawal = ref<boolean>(false);
const withdrawalError = ref<string | null>(null);

// Formateador de moneda en pesos colombianos
const formatCOP = (val?: number | null) => {
  return `$ ${(val || 0).toLocaleString('es-CO')}`;
};

// Formateador de fecha
const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return dateStr;
  }
};

// Rentabilidad comercial y ganancia por litro (con fallback reactivo)
const profitability = computed(() => {
  if (summary.value?.profitability) return summary.value.profitability;
  if (!summary.value) return null;
  const costPerL = summary.value.costs?.costPerLiter || 0;
  const totalCost = summary.value.costs?.totalCost || 0;
  const totalLiters = summary.value.volume?.totalLiters || 0;
  const soldLiters = summary.value.volume?.soldLiters || 0;

  let totalProjectedRev = 0;
  let totalSoldRev = 0;

  for (const p of summary.value.presentations || []) {
    totalProjectedRev += (p.quantity || 0) * (p.price || 0);
    totalSoldRev += (p.sold || 0) * (p.price || 0);
  }

  const avgSellingPricePerLiter = totalLiters > 0 ? Math.round(totalProjectedRev / totalLiters) : 0;
  const totalProjectedProfit = totalProjectedRev - totalCost;
  const avgProfitPerLiter = totalLiters > 0 ? Math.round(totalProjectedProfit / totalLiters) : (avgSellingPricePerLiter - costPerL);
  const globalProfitMarginPercent = totalProjectedRev > 0
    ? Math.round((totalProjectedProfit / totalProjectedRev) * 1000) / 10
    : 0;

  const totalSoldCost = Math.round(soldLiters * costPerL);
  const realizedProfit = totalSoldRev - totalSoldCost;
  const realizedMarginPercent = totalSoldRev > 0
    ? Math.round((realizedProfit / totalSoldRev) * 1000) / 10
    : 0;

  return {
    costPerLiter: costPerL,
    totalCost,
    avgSellingPricePerLiter,
    avgProfitPerLiter,
    globalProfitMarginPercent,
    totalProjectedRevenue: totalProjectedRev,
    totalProjectedProfit,
    totalSoldRevenue: totalSoldRev,
    totalSoldCost,
    realizedProfit,
    realizedMarginPercent,
  };
});

// Cargar personal
async function loadStaff() {
  if (staffList.value.length > 0) return;
  try {
    const data = await http.get<StaffItem[]>('/staff');
    if (Array.isArray(data)) {
      staffList.value = data;
    }
  } catch {
    staffList.value = [];
  }
}

// Cargar auditoría completa de la fracción
async function loadSummary() {
  if (!props.packagingId) return;
  isLoading.value = true;
  try {
    const data = await productionStore.fetchPackagingSummary(props.packagingId);
    summary.value = data;
    if (data?.presentations && data.presentations.length > 0 && !selectedPresentationSize.value) {
      selectedPresentationSize.value = data.presentations[0].containerName;
    }
  } finally {
    isLoading.value = false;
  }
}

watch(
  () => [props.open, props.packagingId],
  async ([isOpen, id]) => {
    if (isOpen && id) {
      showPartnerWithdrawalForm.value = false;
      withdrawalError.value = null;
      activeTab.value = 'PRESENTATIONS';
      ordersPage.value = 1;
      dischargesPage.value = 1;
      selectedOrderIds.value = [];
      unlinkedFilter.value = 'MATCH';
      await Promise.all([loadSummary(), loadStaff()]);
      await loadUnlinkedOrders();
      if (partners.value.length > 0 && !selectedPartnerId.value) {
        selectedPartnerId.value = partners.value[0].id;
      }
    } else {
      summary.value = null;
      unlinkedOrders.value = [];
      selectedOrderIds.value = [];
    }
  },
  { immediate: true }
);

function handleClose() {
  emit('update:open', false);
}

// Desvincular pedido de la fracción
async function handleUnlinkOrder(order: any) {
  if (!summary.value) return;

  const ok = await confirm({
    title: 'Desvincular Pedido de la Fracción',
    message: `¿Estás seguro de desvincular el pedido #${order.orderNumber || order.id} de ${order.customer?.fullName || 'Cliente'}? El pedido regresará inmediatamente a pre-venta sin lote y las botellas asignadas volverán a quedar libres en esta fracción.`,
    confirmText: 'Desvincular Pedido',
    cancelText: 'Cancelar',
    variant: 'danger',
  });

  if (!ok) return;

  const success = await productionStore.unlinkOrderFromPackaging(summary.value.packaging.id, order.id);
  if (success) {
    await loadSummary();
    emit('updated');
  }
}

// Registrar retiro de socio sobre la fracción
async function handleRegisterWithdrawal() {
  if (!summary.value || !selectedPartnerId.value || withdrawalQuantity.value <= 0 || !selectedPresentationSize.value) {
    withdrawalError.value = 'Selecciona el socio, la presentación y una cantidad válida de botellas';
    return;
  }

  isSubmittingWithdrawal.value = true;
  withdrawalError.value = null;

  try {
    await productionStore.registerPackagingWithdrawal(summary.value.packaging.id, {
      bottleSize: selectedPresentationSize.value,
      quantityBottles: Number(withdrawalQuantity.value),
      staffMemberId: Number(selectedPartnerId.value),
      notes: withdrawalNotes.value ? withdrawalNotes.value.trim() : 'Consumo propio de socio en fracción',
      registeredBy: 'Edier',
      dischargeDate: getTodayDateBogota(),
    });
    showPartnerWithdrawalForm.value = false;
    withdrawalQuantity.value = 1;
    withdrawalNotes.value = '';
    await loadSummary();
    emit('updated');
  } catch (err: any) {
    withdrawalError.value = err?.message || 'Error al registrar retiro de socio';
  } finally {
    isSubmittingWithdrawal.value = false;
  }
}

// Paginación computada para pedidos vinculados
const paginatedOrders = computed(() => {
  if (!summary.value?.linkedOrders) return [];
  const start = (ordersPage.value - 1) * ordersLimit;
  return summary.value.linkedOrders.slice(start, start + ordersLimit);
});

const totalOrderPages = computed(() => {
  if (!summary.value?.linkedOrders) return 1;
  return Math.ceil(summary.value.linkedOrders.length / ordersLimit) || 1;
});

// Paginación local para retiros de socios a 5 registros
const dischargesPage = ref<number>(1);
const dischargesLimit = 5;

const paginatedDischarges = computed(() => {
  if (!summary.value?.discharges) return [];
  const start = (dischargesPage.value - 1) * dischargesLimit;
  return summary.value.discharges.slice(start, start + dischargesLimit);
});

const totalDischargePages = computed(() => {
  if (!summary.value?.discharges) return 1;
  return Math.ceil(summary.value.discharges.length / dischargesLimit) || 1;
});

// Cargar pedidos sin lote
async function loadUnlinkedOrders() {
  if (!summary.value) return;
  isLoadingUnlinked.value = true;
  try {
    const flavorParam = unlinkedFilter.value === 'MATCH' ? summary.value.packaging.flavor : undefined;
    const res = await productionStore.fetchPendingOrders(flavorParam);
    unlinkedOrders.value = res?.orders || [];
    selectedOrderIds.value = selectedOrderIds.value.filter((id) =>
      unlinkedOrders.value.some((o) => o.id === id)
    );
  } finally {
    isLoadingUnlinked.value = false;
  }
}

// Alternar filtro de sabor
async function toggleUnlinkedFilter(filter: 'MATCH' | 'ALL') {
  unlinkedFilter.value = filter;
  await loadUnlinkedOrders();
}

// Seleccionar/Deseleccionar un pedido
function toggleOrderSelection(orderId: number) {
  const idx = selectedOrderIds.value.indexOf(orderId);
  if (idx >= 0) {
    selectedOrderIds.value.splice(idx, 1);
  } else {
    selectedOrderIds.value.push(orderId);
  }
}

// Estado de selección total
const isAllUnlinkedSelected = computed(() => {
  return (
    unlinkedOrders.value.length > 0 &&
    selectedOrderIds.value.length === unlinkedOrders.value.length
  );
});

function toggleSelectAllUnlinked() {
  if (isAllUnlinkedSelected.value) {
    selectedOrderIds.value = [];
  } else {
    selectedOrderIds.value = unlinkedOrders.value.map((o) => o.id);
  }
}

// Litros totales de los pedidos seleccionados
const selectedOrdersLiters = computed(() => {
  return selectedOrderIds.value.reduce((sum, id) => {
    const o = unlinkedOrders.value.find((ord) => ord.id === id);
    return sum + (o?.totalLiters || 0);
  }, 0);
});

// Vincular masivamente pedidos seleccionados a la fracción
async function handleLinkSelectedOrders() {
  if (!summary.value || selectedOrderIds.value.length === 0) return;

  const count = selectedOrderIds.value.length;
  const liters = Math.round(selectedOrdersLiters.value * 100) / 100;

  const ok = await confirm({
    title: 'Vincular Pedidos a la Fracción',
    message: `¿Estás seguro de vincular ${count} pedido(s) (${liters} L) a la fracción "${summary.value.packaging.packagingCode || summary.value.packaging.flavor}"? Los pedidos quedarán asignados a esta fracción y se descontarán de las botellas disponibles.`,
    confirmText: `Vincular ${count} Pedido(s)`,
    cancelText: 'Cancelar',
    variant: 'info',
  });

  if (!ok) return;

  isLinkingOrders.value = true;
  try {
    const success = await productionStore.linkOrdersToPackaging(
      summary.value.packaging.id,
      selectedOrderIds.value
    );
    if (success) {
      selectedOrderIds.value = [];
      await Promise.all([loadSummary(), loadUnlinkedOrders()]);
      emit('updated');
      activeTab.value = 'ORDERS';
    }
  } finally {
    isLinkingOrders.value = false;
  }
}

// Vincular un solo pedido rápidamente
async function handleLinkSingleOrder(order: any) {
  if (!summary.value) return;

  const ok = await confirm({
    title: 'Vincular Pedido a la Fracción',
    message: `¿Vincular el pedido #${order.orderNumber || order.id} de ${order.customer?.fullName || 'Cliente'} (${order.totalLiters} L) a esta fracción?`,
    confirmText: 'Vincular Pedido',
    cancelText: 'Cancelar',
    variant: 'info',
  });

  if (!ok) return;

  isLinkingOrders.value = true;
  try {
    const success = await productionStore.linkOrdersToPackaging(
      summary.value.packaging.id,
      [order.id]
    );
    if (success) {
      selectedOrderIds.value = selectedOrderIds.value.filter((id) => id !== order.id);
      await Promise.all([loadSummary(), loadUnlinkedOrders()]);
      emit('updated');
    }
  } finally {
    isLinkingOrders.value = false;
  }
}

watch(activeTab, async (newTab) => {
  if (newTab === 'LINK_ORDERS') {
    await loadUnlinkedOrders();
  }
});
</script>

<template>
  <DialogRoot :open="open" @update:open="(val: boolean) => emit('update:open', val)">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity" />

      <DialogContent
        class="fixed left-1/2 top-1/2 z-50 w-[95%] max-w-4xl -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-surface-light-border bg-surface-light-card p-6 shadow-2xl transition-all focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-card sm:p-7 max-h-[92vh] overflow-y-auto"
      >
        <!-- Cabecera del Modal -->
        <div class="flex items-center justify-between border-b border-surface-light-border pb-4 dark:border-surface-dark-border">
          <div class="flex items-center gap-3">
            <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
              <PackageCheck class="h-6 w-6 stroke-[2]" />
            </div>
            <div>
              <div class="flex items-center gap-2">
                <DialogTitle class="text-lg font-black text-slate-900 dark:text-white sm:text-xl">
                  Auditoría de Fracción Envasada
                </DialogTitle>
                <span
                  v-if="summary"
                  class="rounded-xl bg-surface-light-canvas px-2.5 py-0.5 font-mono text-xs font-black text-brand-800 border border-slate-200 dark:border-slate-700 dark:bg-surface-dark-canvas dark:text-brand-darkText"
                >
                  {{ summary.packaging.packagingCode || `F-${summary.packaging.id}` }}
                </span>
              </div>
              <DialogDescription class="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Lote Madre: {{ summary?.packaging.batch?.batchCode }} · Sabor: {{ summary?.packaging.flavor }}
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

        <!-- Indicador de Carga -->
        <div v-if="isLoading" class="py-16 text-center">
          <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent dark:border-emerald-400 dark:border-t-transparent"></div>
          <p class="mt-3 text-xs font-bold text-slate-500">Cargando balance y auditoría de la fracción...</p>
        </div>

        <div v-else-if="summary" class="mt-5 space-y-6">
          <!-- Tarjeta de Metadatos de la Fracción -->
          <div class="rounded-2xl border border-surface-light-border bg-slate-50/70 p-4 dark:border-surface-dark-border dark:bg-surface-dark-canvas">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div class="flex items-center gap-2">
                <span class="text-sm font-extrabold text-slate-900 dark:text-white">
                  {{ summary.packaging.flavor }}
                </span>
                <span
                  class="rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider"
                  :class="
                    summary.volume.status === 'AGOTADO'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                  "
                >
                  {{ summary.volume.status }}
                </span>
              </div>

              <div class="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span>Envasado: {{ formatDate(summary.packaging.packagedAt) }}</span>
                <span>•</span>
                <span>Por: {{ summary.packaging.packagedBy || 'Edier' }}</span>
                <span>•</span>
                <span>Lote Madre: {{ summary.packaging.batch?.batchCode }}</span>
              </div>
            </div>

            <p v-if="summary.packaging.notes" class="mt-2 text-xs italic text-slate-500 dark:text-slate-400">
              "{{ summary.packaging.notes }}"
            </p>
          </div>

          <!-- Pestañas de Navegación -->
          <div class="flex flex-wrap items-center gap-2 border-b border-surface-light-border pb-2 dark:border-surface-dark-border">
            <button
              type="button"
              @click="activeTab = 'PRESENTATIONS'"
              class="rounded-xl px-3.5 py-1.5 text-xs font-black transition-all"
              :class="
                activeTab === 'PRESENTATIONS'
                  ? 'bg-emerald-700 text-white shadow-sm dark:bg-emerald-600'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              "
            >
              Presentaciones y Costos
            </button>

            <button
              type="button"
              @click="activeTab = 'ORDERS'"
              class="rounded-xl px-3.5 py-1.5 text-xs font-black transition-all"
              :class="
                activeTab === 'ORDERS'
                  ? 'bg-emerald-700 text-white shadow-sm dark:bg-emerald-600'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              "
            >
              Pedidos Vinculados ({{ summary.linkedOrders?.length || 0 }})
            </button>

            <button
              type="button"
              @click="activeTab = 'LINK_ORDERS'"
              class="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-black transition-all"
              :class="
                activeTab === 'LINK_ORDERS'
                  ? 'bg-purple-700 text-white shadow-sm dark:bg-purple-600'
                  : 'bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-300'
              "
            >
              <Link class="h-3.5 w-3.5 stroke-[2.5]" />
              <span>Pedidos sin Lote</span>
              <span
                class="rounded-full px-2 py-0.2 text-[10px] font-black"
                :class="
                  activeTab === 'LINK_ORDERS'
                    ? 'bg-white/20 text-white'
                    : 'bg-purple-200 text-purple-900 dark:bg-purple-800 dark:text-purple-100'
                "
              >
                {{ unlinkedOrders.length }}
              </span>
            </button>

            <button
              type="button"
              @click="activeTab = 'PARTNERS'"
              class="rounded-xl px-3.5 py-1.5 text-xs font-black transition-all"
              :class="
                activeTab === 'PARTNERS'
                  ? 'bg-emerald-700 text-white shadow-sm dark:bg-emerald-600'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              "
            >
              Consumo de Socios ({{ summary.discharges?.length || 0 }})
            </button>
          </div>

          <!-- PESTAÑA 1: PRESENTACIONES Y COSTOS -->
          <div v-if="activeTab === 'PRESENTATIONS'" class="space-y-5">
            <!-- Cuadrícula de Métricas Clave -->
            <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div class="rounded-2xl border border-surface-light-border bg-surface-light-card p-3.5 shadow-sm dark:border-surface-dark-border dark:bg-surface-dark-card">
                <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Volumen</span>
                <p class="mt-1 text-xl font-black text-slate-900 dark:text-white">
                  {{ summary.volume.totalLiters }} L
                </p>
                <span class="text-[10px] text-slate-500">Fracción envasada</span>
              </div>

              <div class="rounded-2xl border border-surface-light-border bg-surface-light-card p-3.5 shadow-sm dark:border-surface-dark-border dark:bg-surface-dark-card">
                <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Costo Real / Litro</span>
                <p class="mt-1 text-xl font-black text-emerald-600 dark:text-emerald-400">
                  {{ formatCOP(summary.costs.costPerLiter) }}
                </p>
                <span class="text-[10px] text-slate-500">Base + empaque + pulpas</span>
              </div>

              <div class="rounded-2xl border border-surface-light-border bg-surface-light-card p-3.5 shadow-sm dark:border-surface-dark-border dark:bg-surface-dark-card">
                <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Salidas Totales</span>
                <p class="mt-1 text-xl font-black text-purple-600 dark:text-purple-400">
                  {{ (summary.volume.soldLiters + summary.volume.dischargedLiters).toFixed(1) }} L
                </p>
                <span class="text-[10px] text-slate-500">{{ summary.volume.progressPercentage }}% comercializado</span>
              </div>

              <div class="rounded-2xl border border-surface-light-border bg-surface-light-card p-3.5 shadow-sm dark:border-surface-dark-border dark:bg-surface-dark-card">
                <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Saldo Libre</span>
                <p class="mt-1 text-xl font-black text-dairy-600 dark:text-dairy-400">
                  {{ summary.volume.freeLiters.toFixed(1) }} L
                </p>
                <span class="text-[10px] text-slate-500">Disponible para venta</span>
              </div>
            </div>

            <!-- TARJETA DESTACADA: RENTABILIDAD COMERCIAL Y GANANCIA POR LITRO -->
            <div v-if="profitability" class="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent p-4 sm:p-5 shadow-sm dark:border-emerald-800/60 dark:from-emerald-950/30 dark:via-emerald-950/10">
              <div class="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-100 pb-3 dark:border-emerald-900/40">
                <div class="flex items-center gap-2">
                  <div class="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm dark:bg-emerald-500">
                    <TrendingUp class="h-4 w-4 stroke-[2.5]" />
                  </div>
                  <div>
                    <h4 class="text-xs font-black uppercase tracking-wider text-emerald-900 dark:text-emerald-200">
                      Rentabilidad Comercial y Ganancia por Litro
                    </h4>
                    <p class="text-[11px] text-emerald-700/80 dark:text-emerald-300/80">
                      Margen proyectado con base en precios de venta vs. costo total de la fracción ({{ formatCOP(summary.costs.costPerLiter) }}/L)
                    </p>
                  </div>
                </div>

                <div class="flex items-center gap-2">
                  <span class="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700">
                    <span>Margen Bruto:</span>
                    <span class="text-sm font-black">{{ profitability.globalProfitMarginPercent }}%</span>
                  </span>
                </div>
              </div>

              <!-- 4 KPIs Clave de Rentabilidad -->
              <div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <!-- 1. Precio Venta Promedio / L -->
                <div class="rounded-xl border border-emerald-100 bg-white/80 p-3 shadow-xs dark:border-emerald-900/40 dark:bg-slate-900/60">
                  <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Venta Promedio / L</span>
                  <p class="mt-1 text-lg font-black text-slate-900 dark:text-white sm:text-xl">
                    {{ formatCOP(profitability.avgSellingPricePerLiter) }}
                  </p>
                  <span class="text-[10px] text-slate-500">Ponderado por volumen</span>
                </div>

                <!-- 2. Ganancia Neta / Litro (KPI PRINCIPAL) -->
                <div class="rounded-xl border border-emerald-300 bg-emerald-50/90 p-3 shadow-xs dark:border-emerald-700/60 dark:bg-emerald-950/40">
                  <div class="flex items-center justify-between">
                    <span class="text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                      Ganancia Neta / Litro
                    </span>
                    <span class="rounded-md bg-emerald-600 px-1.5 py-0.2 text-[9px] font-extrabold text-white">
                      +{{ profitability.globalProfitMarginPercent }}%
                    </span>
                  </div>
                  <p class="mt-1 text-xl font-black text-emerald-700 dark:text-emerald-300 sm:text-2xl">
                    +{{ formatCOP(profitability.avgProfitPerLiter) }}
                  </p>
                  <span class="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    Utilidad neta por cada litro
                  </span>
                </div>

                <!-- 3. Utilidad Total Proyectada -->
                <div class="rounded-xl border border-emerald-100 bg-white/80 p-3 shadow-xs dark:border-emerald-900/40 dark:bg-slate-900/60">
                  <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Utilidad Proyectada</span>
                  <p class="mt-1 text-lg font-black text-brand-900 dark:text-white sm:text-xl">
                    +{{ formatCOP(profitability.totalProjectedProfit) }}
                  </p>
                  <span class="text-[10px] text-slate-500">
                    Ingreso total: {{ formatCOP(profitability.totalProjectedRevenue) }}
                  </span>
                </div>

                <!-- 4. Utilidad Realizada (Vendido hasta hoy) -->
                <div class="rounded-xl border border-emerald-100 bg-white/80 p-3 shadow-xs dark:border-emerald-900/40 dark:bg-slate-900/60">
                  <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Utilidad Realizada</span>
                  <p class="mt-1 text-lg font-black text-emerald-600 dark:text-emerald-400 sm:text-xl">
                    +{{ formatCOP(profitability.realizedProfit) }}
                  </p>
                  <span class="text-[10px] text-slate-500">
                    Cobrado: {{ formatCOP(profitability.totalSoldRevenue) }} ({{ summary.volume.soldLiters }} L)
                  </span>
                </div>
              </div>
            </div>

            <!-- Tabla Dinámica de Presentaciones Envasadas -->
            <div class="rounded-2xl border border-surface-light-border bg-surface-light-card p-4 shadow-sm dark:border-surface-dark-border dark:bg-surface-dark-card">
              <div class="flex items-center justify-between">
                <h4 class="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Presentaciones Envasadas y Ganancia por Formato
                </h4>
                <span class="text-[11px] font-semibold text-slate-400">
                  Costo Fracción: {{ formatCOP(summary.costs.costPerLiter) }}/L
                </span>
              </div>

              <div class="mt-3 overflow-x-auto">
                <table class="w-full text-left text-xs min-w-[720px]">
                  <thead class="border-b border-slate-100 bg-slate-50 text-[10px] font-bold uppercase text-slate-400 dark:border-slate-800 dark:bg-slate-900/40">
                    <tr>
                      <th class="p-2.5">Presentación</th>
                      <th class="p-2.5 text-center">Producidas</th>
                      <th class="p-2.5 text-center">Vendidas</th>
                      <th class="p-2.5 text-center">Retiros</th>
                      <th class="p-2.5 text-center">Libres</th>
                      <th class="p-2.5 text-right">Precio Venta</th>
                      <th class="p-2.5 text-right">Precio / Litro</th>
                      <th class="p-2.5 text-right">Ganancia / Litro</th>
                      <th class="p-2.5 text-right">Ingreso Proy.</th>
                      <th class="p-2.5 text-right">Ganancia Proy.</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                    <tr v-for="(pres, idx) in summary.presentations" :key="idx" class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td class="p-2.5 font-bold text-slate-800 dark:text-white whitespace-nowrap">
                        {{ pres.containerName }}
                        <span class="text-[10px] font-normal text-slate-400">({{ pres.capacityLiters }}L)</span>
                      </td>
                      <td class="p-2.5 text-center font-extrabold text-slate-700 dark:text-slate-200">
                        {{ pres.quantity }} und
                      </td>
                      <td class="p-2.5 text-center font-black text-emerald-600 dark:text-emerald-400">
                        {{ pres.sold }} und
                      </td>
                      <td class="p-2.5 text-center font-black text-amber-600 dark:text-amber-400">
                        {{ pres.discharged }} und
                      </td>
                      <td class="p-2.5 text-center font-black text-brand-800 dark:text-brand-darkText">
                        {{ pres.free }} und
                      </td>
                      <td class="p-2.5 text-right font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {{ formatCOP(pres.price) }}
                      </td>
                      <td class="p-2.5 text-right font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                        {{ formatCOP(pres.sellingPricePerLiter || (pres.capacityLiters > 0 ? Math.round(pres.price / pres.capacityLiters) : pres.price)) }}/L
                      </td>
                      <td class="p-2.5 text-right whitespace-nowrap">
                        <div class="flex flex-col items-end">
                          <span
                            class="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-black"
                            :class="(pres.profitPerLiter ?? ((pres.capacityLiters > 0 ? Math.round(pres.price / pres.capacityLiters) : pres.price) - summary.costs.costPerLiter)) >= 0
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                              : 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'"
                          >
                            {{ (pres.profitPerLiter ?? ((pres.capacityLiters > 0 ? Math.round(pres.price / pres.capacityLiters) : pres.price) - summary.costs.costPerLiter)) >= 0 ? '+' : '' }}{{ formatCOP(pres.profitPerLiter ?? ((pres.capacityLiters > 0 ? Math.round(pres.price / pres.capacityLiters) : pres.price) - summary.costs.costPerLiter)) }}/L
                          </span>
                          <span class="mt-0.5 text-[10px] font-semibold text-slate-400">
                            {{ pres.profitMarginPercent ?? (pres.price > 0 ? Math.round((((pres.capacityLiters > 0 ? Math.round(pres.price / pres.capacityLiters) : pres.price) - summary.costs.costPerLiter) / (pres.capacityLiters > 0 ? Math.round(pres.price / pres.capacityLiters) : pres.price)) * 1000) / 10 : 0) }}% margen
                            <span v-if="pres.profitPerUnit">({{ pres.profitPerUnit >= 0 ? '+' : '' }}{{ formatCOP(pres.profitPerUnit) }}/u)</span>
                          </span>
                        </div>
                      </td>
                      <td class="p-2.5 text-right font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {{ formatCOP(pres.quantity * pres.price) }}
                      </td>
                      <td class="p-2.5 text-right font-black text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        +{{ formatCOP(pres.totalProjectedProfit ?? (pres.quantity * Math.round(((pres.capacityLiters > 0 ? Math.round(pres.price / pres.capacityLiters) : pres.price) - summary.costs.costPerLiter) * pres.capacityLiters))) }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Insumos y Empaque Consumidos (itemsUsed) -->
            <div v-if="summary.itemsUsed && summary.itemsUsed.length > 0" class="rounded-2xl border border-surface-light-border bg-surface-light-card p-4 shadow-sm dark:border-surface-dark-border dark:bg-surface-dark-card">
              <h4 class="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Insumos, Envases y Dosificación Consumidos
              </h4>
              <div class="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div
                  v-for="item in summary.itemsUsed"
                  :key="item.id || item.rawMaterialId"
                  class="flex items-center justify-between rounded-xl bg-slate-50 p-2.5 text-xs dark:bg-slate-800/60"
                >
                  <div>
                    <span class="font-bold text-slate-800 dark:text-white">{{ item.rawMaterial?.name || 'Insumo' }}</span>
                    <p class="text-[10px] text-slate-400">
                      {{ item.quantityUsed }} {{ item.rawMaterial?.unit }}
                      <span v-if="item.dosagePerLiter">· {{ item.dosagePerLiter }} {{ item.dosageUnit || 'g/L' }}</span>
                    </p>
                  </div>
                  <span class="font-black text-slate-700 dark:text-slate-300">
                    {{ formatCOP(item.totalCost || item.quantityUsed * (item.unitCost || 0)) }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- PESTAÑA 2: PEDIDOS VINCULADOS -->
          <div v-if="activeTab === 'ORDERS'" class="space-y-4">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-500">
                Total vinculados: {{ summary.linkedOrders.length }} pedido(s)
              </span>
            </div>

            <div v-if="summary.linkedOrders.length === 0" class="py-12 text-center text-xs text-slate-400">
              No hay pedidos comerciales vinculados a esta fracción.
            </div>

            <div v-else class="space-y-2">
              <div
                v-for="order in paginatedOrders"
                :key="order.id"
                class="flex flex-col gap-2 rounded-2xl border border-surface-light-border bg-surface-light-card p-3.5 shadow-sm transition-all dark:border-surface-dark-border dark:bg-surface-dark-card sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div class="flex items-center gap-2">
                    <span class="rounded-lg bg-surface-light-canvas px-2 py-0.5 font-mono text-xs font-black text-brand-800 border border-slate-200 dark:border-slate-700 dark:bg-surface-dark-canvas dark:text-brand-darkText">
                      #{{ order.orderNumber || order.id }}
                    </span>
                    <span class="font-bold text-xs text-slate-800 dark:text-white">
                      {{ order.customer?.fullName }}
                    </span>
                    <span
                      class="rounded-full px-2 py-0.5 text-[9px] font-black uppercase"
                      :class="order.deliveryStatus === 'DELIVERED' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300'"
                    >
                      {{ order.deliveryStatus }}
                    </span>
                  </div>

                  <div class="mt-1 flex flex-wrap items-center gap-x-3 text-[11px] text-slate-500">
                    <span>Fecha: {{ formatDate(order.orderDate) }}</span>
                    <span>•</span>
                    <span>Total: {{ formatCOP(order.totalAmount) }}</span>
                    <span>•</span>
                    <span class="font-semibold text-purple-700 dark:text-purple-300">
                      {{ order.items.map((it: any) => `${it.quantity}x ${it.bottleSize}`).join(', ') }}
                    </span>
                  </div>
                </div>

                <div class="flex items-center justify-end">
                  <button
                    type="button"
                    @click="handleUnlinkOrder(order)"
                    class="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/70 px-3 py-1.5 text-xs font-bold text-rose-700 transition-colors hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300"
                    title="Desvincular pedido y liberar botellas de esta fracción"
                  >
                    <Unlink class="h-3.5 w-3.5" />
                    <span>Desvincular</span>
                  </button>
                </div>
              </div>

              <!-- Paginación de pedidos vinculados a 5 registros -->
              <div v-if="totalOrderPages > 1" class="flex items-center justify-between pt-2">
                <span class="text-xs text-slate-500">
                  Página {{ ordersPage }} de {{ totalOrderPages }}
                </span>
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    @click="ordersPage--"
                    :disabled="ordersPage <= 1"
                    class="rounded-xl border border-slate-200 px-3 py-1 text-xs font-bold disabled:opacity-40"
                  >
                    Anterior
                  </button>
                  <button
                    type="button"
                    @click="ordersPage++"
                    :disabled="ordersPage >= totalOrderPages"
                    class="rounded-xl border border-slate-200 px-3 py-1 text-xs font-bold disabled:opacity-40"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- PESTAÑA: PEDIDOS SIN LOTE (VINCULACIÓN MASIVA) -->
          <div v-if="activeTab === 'LINK_ORDERS'" class="space-y-4">
            <!-- Tarjeta Informativa Superior y Acción Principal -->
            <div class="rounded-2xl border border-purple-200 bg-purple-50/60 p-4 dark:border-purple-900/40 dark:bg-purple-950/20">
              <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div class="flex items-center gap-2">
                    <h4 class="text-xs font-black uppercase tracking-wider text-purple-900 dark:text-purple-200">
                      Asignar Pedidos en Pre-venta
                    </h4>
                    <span class="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                      {{ summary.volume.freeLiters }} L libres en esta fracción
                    </span>
                  </div>
                  <p class="mt-0.5 text-[11px] font-semibold text-purple-700/90 dark:text-purple-300/80">
                    Marca las casillas de los pedidos que deseas vincular a esta fracción y confirma la vinculación masiva.
                  </p>
                </div>

                <div>
                  <button
                    type="button"
                    @click="handleLinkSelectedOrders"
                    :disabled="selectedOrderIds.length === 0 || isLinkingOrders"
                    class="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-hero-gradient px-4 py-2 text-xs font-black text-white shadow-md transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed sm:w-auto"
                  >
                    <RefreshCw v-if="isLinkingOrders" class="h-4 w-4 animate-spin" />
                    <Link v-else class="h-4 w-4 stroke-[2.5]" />
                    <span>Vincular Seleccionados ({{ selectedOrderIds.length }})</span>
                  </button>
                </div>
              </div>

              <!-- Alerta de Capacidad y Resumen de Selección -->
              <div v-if="selectedOrderIds.length > 0" class="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-purple-200/70 pt-2 text-xs font-bold dark:border-purple-900/40">
                <span class="text-purple-900 dark:text-purple-200">
                  {{ selectedOrderIds.length }} pedido(s) seleccionado(s) · Volumen a vincular:
                  <strong class="font-black text-brand-800 dark:text-brand-darkText">
                    {{ Math.round(selectedOrdersLiters * 100) / 100 }} L
                  </strong>
                </span>
                <span v-if="selectedOrdersLiters > summary.volume.freeLiters" class="inline-flex items-center gap-1 text-[11px] font-extrabold text-amber-700 dark:text-amber-300">
                  <AlertTriangle class="h-3.5 w-3.5 stroke-[2]" />
                  <span>El volumen supera los {{ summary.volume.freeLiters }}L libres</span>
                </span>
              </div>
            </div>

            <!-- Controles de Filtro y Selección Rápida -->
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="flex items-center gap-1.5">
                <button
                  type="button"
                  @click="toggleUnlinkedFilter('MATCH')"
                  class="rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all"
                  :class="
                    unlinkedFilter === 'MATCH'
                      ? 'bg-purple-700 text-white shadow-sm dark:bg-purple-600'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                  "
                >
                  Sabor {{ summary.packaging.flavor }}
                </button>
                <button
                  type="button"
                  @click="toggleUnlinkedFilter('ALL')"
                  class="rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all"
                  :class="
                    unlinkedFilter === 'ALL'
                      ? 'bg-purple-700 text-white shadow-sm dark:bg-purple-600'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                  "
                >
                  Todos los pedidos sin lote
                </button>
              </div>

              <div v-if="unlinkedOrders.length > 0" class="flex items-center gap-2">
                <button
                  type="button"
                  @click="toggleSelectAllUnlinked"
                  class="text-xs font-extrabold text-purple-700 hover:underline dark:text-purple-300"
                >
                  {{ isAllUnlinkedSelected ? 'Deseleccionar todos' : `Seleccionar todos (${unlinkedOrders.length})` }}
                </button>
              </div>
            </div>

            <!-- Estado de Carga -->
            <div v-if="isLoadingUnlinked" class="py-12 text-center">
              <div class="inline-block h-7 w-7 animate-spin rounded-full border-4 border-purple-600 border-t-transparent dark:border-purple-400 dark:border-t-transparent"></div>
              <p class="mt-2 text-xs font-bold text-slate-500">Consultando pedidos sin lote...</p>
            </div>

            <!-- Estado Vacío -->
            <div
              v-else-if="unlinkedOrders.length === 0"
              class="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400"
            >
              No se encontraron pedidos pendientes sin lote con el filtro seleccionado.
            </div>

            <!-- Lista de Pedidos Disponibles para Selección -->
            <div v-else class="space-y-2">
              <div
                v-for="order in unlinkedOrders"
                :key="order.id"
                @click="toggleOrderSelection(order.id)"
                class="flex cursor-pointer flex-col gap-2 rounded-2xl border p-3.5 shadow-sm transition-all sm:flex-row sm:items-center sm:justify-between"
                :class="
                  selectedOrderIds.includes(order.id)
                    ? 'border-purple-500 bg-purple-50/70 dark:border-purple-600 dark:bg-purple-950/40'
                    : 'border-surface-light-border bg-surface-light-card hover:border-slate-300 dark:border-surface-dark-border dark:bg-surface-dark-card dark:hover:border-slate-600'
                "
              >
                <div class="flex items-center gap-3">
                  <!-- Checkbox de Selección -->
                  <input
                    type="checkbox"
                    :checked="selectedOrderIds.includes(order.id)"
                    @click.stop
                    @change="toggleOrderSelection(order.id)"
                    class="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 dark:border-slate-600 dark:bg-slate-700 cursor-pointer"
                  />

                  <div>
                    <div class="flex flex-wrap items-center gap-2">
                      <span class="rounded-lg bg-surface-light-canvas px-2 py-0.5 font-mono text-xs font-black text-brand-800 border border-slate-200 dark:border-slate-700 dark:bg-surface-dark-canvas dark:text-brand-darkText">
                        #{{ order.orderNumber || order.id }}
                      </span>
                      <span class="font-extrabold text-xs text-slate-800 dark:text-white">
                        {{ order.customer?.fullName || 'Cliente General' }}
                      </span>
                      <span v-if="order.customer?.phone" class="text-[11px] text-slate-400">
                        • {{ order.customer.phone }}
                      </span>
                    </div>

                    <div class="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                      <!-- Desglose de ítems del pedido -->
                      <div v-if="order.items && order.items.length > 0" class="flex flex-wrap gap-1">
                        <span
                          v-for="it in order.items"
                          :key="it.id"
                          class="rounded-md px-1.5 py-0.5 text-[10px] font-bold"
                          :class="
                            (it.flavor || '').toLowerCase().includes(summary.packaging.flavor.toLowerCase())
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          "
                        >
                          {{ it.quantity }}x {{ it.bottleSize }} ({{ it.flavor }})
                        </span>
                      </div>
                      <span v-else class="text-slate-500">
                        {{ order.totalLiters }} L ({{ order.flavor || 'Sabor general' }})
                      </span>

                      <span class="text-slate-300 dark:text-slate-600">•</span>
                      <span class="font-bold text-slate-700 dark:text-slate-300">Total: {{ formatCOP(order.totalAmount) }}</span>
                      <span class="text-slate-300 dark:text-slate-600">•</span>
                      <span class="text-slate-400">{{ formatDate(order.orderDate || order.createdAt) }}</span>
                    </div>
                  </div>
                </div>

                <!-- Botones y Acciones en Fila -->
                <div class="flex items-center justify-end gap-2" @click.stop>
                  <span class="rounded-lg bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                    {{ order.totalLiters }} L
                  </span>

                  <button
                    type="button"
                    @click="handleLinkSingleOrder(order)"
                    :disabled="isLinkingOrders"
                    class="inline-flex items-center gap-1 rounded-xl border border-purple-200 bg-purple-50 px-2.5 py-1.5 text-xs font-extrabold text-purple-700 transition-colors hover:bg-purple-100 disabled:opacity-40 dark:border-purple-800/40 dark:bg-purple-950/40 dark:text-purple-300 dark:hover:bg-purple-900/40"
                    title="Vincular solo este pedido inmediatamente"
                  >
                    <Link class="h-3.5 w-3.5" />
                    <span class="hidden sm:inline">Vincular</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- PESTAÑA 3: CONSUMO DE SOCIOS / BAJAS -->
          <div v-if="activeTab === 'PARTNERS'" class="space-y-4">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-500">
                Retiros realizados: {{ summary.discharges?.length || 0 }}
              </span>

              <button
                type="button"
                @click="showPartnerWithdrawalForm = !showPartnerWithdrawalForm"
                class="inline-flex items-center gap-1.5 rounded-xl bg-hero-gradient px-3 py-1.5 text-xs font-bold text-white shadow-sm"
              >
                <UserMinus class="h-3.5 w-3.5" />
                <span>{{ showPartnerWithdrawalForm ? 'Cancelar' : 'Registrar Consumo Socio' }}</span>
              </button>
            </div>

            <!-- Formulario de retiro de socio -->
            <div
              v-if="showPartnerWithdrawalForm"
              class="rounded-2xl border border-brand-200 bg-brand-50/40 p-4 dark:border-brand-900/40 dark:bg-purple-950/20 space-y-3"
            >
              <h5 class="text-xs font-extrabold text-slate-900 dark:text-white">
                Asentar Retiro Directo en Fracción
              </h5>

              <div v-if="withdrawalError" class="rounded-xl bg-rose-100 p-2.5 text-xs font-bold text-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
                {{ withdrawalError }}
              </div>

              <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <!-- Socio -->
                <div>
                  <label class="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Socio
                  </label>
                  <select
                    v-model="selectedPartnerId"
                    class="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-bold dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  >
                    <option v-for="p in partners" :key="p.id" :value="p.id">
                      {{ p.fullName }} ({{ p.role }})
                    </option>
                  </select>
                </div>

                <!-- Presentación a Retirar -->
                <div>
                  <label class="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Presentación
                  </label>
                  <select
                    v-model="selectedPresentationSize"
                    class="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-bold dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  >
                    <option
                      v-for="pres in summary.presentations"
                      :key="pres.containerName"
                      :value="pres.containerName"
                    >
                      {{ pres.containerName }} ({{ pres.free }} libres)
                    </option>
                  </select>
                </div>

                <!-- Cantidad -->
                <div>
                  <label class="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Cantidad (und)
                  </label>
                  <input
                    v-model.number="withdrawalQuantity"
                    type="number"
                    min="0"
                    step="any"
                    class="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-bold dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div class="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  @click="showPartnerWithdrawalForm = false"
                  class="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  @click="handleRegisterWithdrawal"
                  :disabled="isSubmittingWithdrawal"
                  class="rounded-xl bg-hero-gradient px-4 py-1.5 text-xs font-bold text-white shadow-sm disabled:opacity-50"
                >
                  Confirmar Retiro
                </button>
              </div>
            </div>

            <!-- Listado de retiros -->
            <div v-if="!summary.discharges || summary.discharges.length === 0" class="py-12 text-center text-xs text-slate-400">
              No hay retiros registrados para esta fracción.
            </div>

            <div v-else class="space-y-2">
              <div
                v-for="d in paginatedDischarges"
                :key="d.id"
                class="flex items-center justify-between rounded-xl border border-surface-light-border bg-slate-50 p-3 text-xs dark:border-surface-dark-border dark:bg-slate-800/40"
              >
                <div>
                  <span class="font-black text-slate-900 dark:text-white">{{ d.staffMember?.fullName || 'Socio' }}</span>
                  <p class="text-[10px] text-slate-500">
                    {{ d.quantityBottles }}x {{ d.bottleSize }} ({{ d.totalLiters }}L) · {{ formatDate(d.dischargeDate) }}
                    <span v-if="d.notes"> · "{{ d.notes }}"</span>
                  </p>
                </div>
                <span class="font-extrabold text-amber-600 dark:text-amber-400">
                  {{ formatCOP(d.totalAmount) }}
                </span>
              </div>

              <!-- Paginación de retiros a 5 registros -->
              <div v-if="totalDischargePages > 1" class="flex items-center justify-between border-t border-slate-100 pt-2 dark:border-slate-800 text-xs text-slate-500">
                <span>
                  Página {{ dischargesPage }} de {{ totalDischargePages }} ({{ summary.discharges.length }} retiros)
                </span>
                <div class="flex items-center gap-1.5">
                  <button
                    type="button"
                    @click="dischargesPage--"
                    :disabled="dischargesPage <= 1"
                    class="rounded-xl border border-slate-200 px-3 py-1 font-bold disabled:opacity-40 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 dark:text-slate-300"
                  >
                    <ChevronLeft class="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    @click="dischargesPage++"
                    :disabled="dischargesPage >= totalDischargePages"
                    class="rounded-xl border border-slate-200 px-3 py-1 font-bold disabled:opacity-40 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 dark:text-slate-300"
                  >
                    <ChevronRight class="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
