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
const activeTab = ref<'PRESENTATIONS' | 'ORDERS' | 'PARTNERS'>('PRESENTATIONS');

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
      await Promise.all([loadSummary(), loadStaff()]);
      if (partners.value.length > 0 && !selectedPartnerId.value) {
        selectedPartnerId.value = partners.value[0].id;
      }
    } else {
      summary.value = null;
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
          <div class="flex items-center gap-2 border-b border-surface-light-border pb-2 dark:border-surface-dark-border">
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

            <!-- Tabla Dinámica de Presentaciones Envasadas -->
            <div class="rounded-2xl border border-surface-light-border bg-surface-light-card p-4 shadow-sm dark:border-surface-dark-border dark:bg-surface-dark-card">
              <h4 class="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Presentaciones Envasadas en esta Fracción
              </h4>

              <div class="mt-3 overflow-x-auto">
                <table class="w-full text-left text-xs">
                  <thead class="border-b border-slate-100 bg-slate-50 text-[10px] font-bold uppercase text-slate-400 dark:border-slate-800 dark:bg-slate-900/40">
                    <tr>
                      <th class="p-2.5">Presentación / Formato</th>
                      <th class="p-2.5 text-center">Producidas</th>
                      <th class="p-2.5 text-center">Vendidas</th>
                      <th class="p-2.5 text-center">Retiros Socios</th>
                      <th class="p-2.5 text-center">Libres</th>
                      <th class="p-2.5 text-right">Precio Venta</th>
                      <th class="p-2.5 text-right">Ingreso Proyectado</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                    <tr v-for="(pres, idx) in summary.presentations" :key="idx" class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td class="p-2.5 font-bold text-slate-800 dark:text-white">
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
                      <td class="p-2.5 text-right font-semibold text-slate-600 dark:text-slate-300">
                        {{ formatCOP(pres.price) }}
                      </td>
                      <td class="p-2.5 text-right font-black text-slate-900 dark:text-white">
                        {{ formatCOP(pres.quantity * pres.price) }}
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
