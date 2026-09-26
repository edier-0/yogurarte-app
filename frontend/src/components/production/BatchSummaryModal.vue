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
  FileText,
  X,
  Boxes,
  Unlink,
  Plus,
  Pencil,
  ChevronLeft,
  ChevronRight,
} from 'lucide-vue-next';
import {
  useProductionStore,
  type BatchSummaryData,
  type BatchPackagingItem,
  type PartnerWithdrawalPayload,
} from '@/stores/production.store';
import { useConfirm } from '@/composables/useConfirm';
import { getTodayDateBogota } from '@/stores/finance.store';
import { http } from '@/api/client';

const props = defineProps<{
  open: boolean;
  batchId: number | null;
}>();

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void;
  (e: 'updated'): void;
  (e: 'editPackaging', pkg: BatchPackagingItem): void;
}>();

const productionStore = useProductionStore();
const { confirm } = useConfirm();

const summary = ref<BatchSummaryData | null>(null);
const isLoading = ref<boolean>(false);
const activeTab = ref<'BALANCE' | 'PACKAGING' | 'ORDERS' | 'PARTNERS'>('BALANCE');

// Personal (socios)
interface StaffItem {
  id: number;
  fullName: string;
  role: string;
  type: string;
}
const staffList = ref<StaffItem[]>([]);
const partners = computed(() => staffList.value.filter((s) => s.type === 'SOCIO' || s.role.toLowerCase().includes('socio')));

// Formulario de retiro de socio
const showPartnerWithdrawalForm = ref<boolean>(false);
const selectedPartnerId = ref<number | null>(null);
const withdrawalBottleSize = ref<'1L' | '2L'>('1L');
const withdrawalQuantity = ref<number>(1);
const withdrawalNotes = ref<string>('');
const isSubmittingWithdrawal = ref<boolean>(false);
const withdrawalError = ref<string | null>(null);

// Paginación local de Fracciones a 5 registros
const packagingsPage = ref<number>(1);
const packagingsLimit = 5;
const paginatedPackagings = computed(() => {
  if (!summary.value?.packagings) return [];
  const start = (packagingsPage.value - 1) * packagingsLimit;
  return summary.value.packagings.slice(start, start + packagingsLimit);
});
const totalPackagingPages = computed(() => {
  if (!summary.value?.packagings) return 1;
  return Math.ceil(summary.value.packagings.length / packagingsLimit) || 1;
});

// Paginación local de Pedidos Vinculados a 5 registros
const ordersPage = ref<number>(1);
const ordersLimit = 5;
const paginatedOrders = computed(() => {
  if (!summary.value?.linkedOrders) return [];
  const start = (ordersPage.value - 1) * ordersLimit;
  return summary.value.linkedOrders.slice(start, start + ordersLimit);
});
const totalOrderPages = computed(() => {
  if (!summary.value?.linkedOrders) return 1;
  return Math.ceil(summary.value.linkedOrders.length / ordersLimit) || 1;
});

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

// Cargar auditoría completa
async function loadSummary() {
  if (!props.batchId) return;
  isLoading.value = true;
  try {
    const data = await productionStore.fetchBatchSummary(props.batchId);
    summary.value = data;
  } finally {
    isLoading.value = false;
  }
}

watch(
  () => [props.open, props.batchId],
  async ([isOpen, id]) => {
    if (isOpen && id) {
      packagingsPage.value = 1;
      ordersPage.value = 1;
      showPartnerWithdrawalForm.value = false;
      withdrawalError.value = null;
      activeTab.value = 'BALANCE';
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

// Desvincular pedido del lote
async function handleUnlinkOrder(order: any) {
  if (!summary.value) return;

  const ok = await confirm({
    title: 'Desvincular Pedido del Lote',
    message: `¿Estás seguro de desvincular el pedido #${order.orderNumber || order.id} de ${order.customer?.fullName || 'Cliente'}? El pedido regresará inmediatamente a pre-venta sin lote y los ${order.totalLiters}L asignados se reintegrarán al saldo disponible del lote.`,
    confirmText: 'Desvincular Pedido',
    cancelText: 'Cancelar',
    variant: 'danger',
  });

  if (!ok) return;

  const success = await productionStore.unlinkOrder(summary.value.batch.id, order.id);
  if (success) {
    await loadSummary();
    emit('updated');
  }
}

// Registrar retiro de socio
async function handleRegisterWithdrawal() {
  if (!summary.value || !selectedPartnerId.value || withdrawalQuantity.value <= 0) {
    withdrawalError.value = 'Selecciona el socio y una cantidad válida de botellas';
    return;
  }

  isSubmittingWithdrawal.value = true;
  withdrawalError.value = null;

  try {
    const payload: PartnerWithdrawalPayload = {
      bottleSize: withdrawalBottleSize.value,
      quantityBottles: Number(withdrawalQuantity.value),
      staffMemberId: Number(selectedPartnerId.value),
      notes: withdrawalNotes.value ? withdrawalNotes.value.trim() : 'Consumo propio de socio',
      registeredBy: 'Edier',
      dischargeDate: getTodayDateBogota(),
    };

    await productionStore.registerPartnerWithdrawal(summary.value.batch.id, payload);
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
            <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-800 dark:bg-purple-950/40 dark:text-purple-300">
              <FileText class="h-6 w-6 stroke-[2]" />
            </div>
            <div>
              <div class="flex items-center gap-2">
                <DialogTitle class="text-lg font-black text-slate-900 dark:text-white sm:text-xl">
                  Auditoría y Resumen de Lote
                </DialogTitle>
                <span
                  v-if="summary"
                  class="rounded-xl bg-surface-light-canvas px-2.5 py-0.5 font-mono text-xs font-black text-brand-800 border border-slate-200 dark:border-slate-700 dark:bg-surface-dark-canvas dark:text-brand-darkText"
                >
                  {{ summary.batch.batchCode }}
                </span>
              </div>
              <DialogDescription class="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Balance lácteo, desglose de botellas, fracciones por sabor y pedidos vinculados
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
          <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-brand-800 border-t-transparent dark:border-brand-400 dark:border-t-transparent"></div>
          <p class="mt-3 text-xs font-bold text-slate-500">Cargando balance y auditoría del lote...</p>
        </div>

        <div v-else-if="summary" class="mt-5 space-y-6">
          <!-- Tarjeta de Metadatos del Lote -->
          <div class="rounded-2xl border border-surface-light-border bg-slate-50/70 p-4 dark:border-surface-dark-border dark:bg-surface-dark-canvas">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div class="flex items-center gap-2">
                <span class="text-sm font-extrabold text-slate-900 dark:text-white">
                  Sabor Base: {{ summary.batch.flavor }}
                </span>
                <span
                  class="rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider"
                  :class="
                    summary.batch.status === 'EN_FERMENTACION'
                      ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300'
                      : summary.batch.status === 'DISPONIBLE'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                  "
                >
                  {{ summary.batch.status }}
                </span>
              </div>

              <div class="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span>Elaborado: {{ formatDate(summary.batch.preparationDate) }}</span>
                <span>•</span>
                <span>Vencimiento: {{ formatDate(summary.batch.expirationDate) }}</span>
                <span v-if="summary.batch.registeredBy">• Por: {{ summary.batch.registeredBy }}</span>
              </div>
            </div>

            <!-- Inoculación y Formulación Base si aplica -->
            <div
              v-if="summary.batch.cultureType"
              class="mt-3 border-t border-slate-200/70 pt-2.5 text-xs text-slate-600 dark:border-slate-700/70 dark:text-slate-400"
            >
              <span class="font-bold text-slate-700 dark:text-slate-300">Cultivo:</span>
              {{ summary.batch.cultureType }}
            </div>
          </div>

          <!-- Pestañas de Navegación del Resumen -->
          <div class="flex items-center gap-2 border-b border-surface-light-border pb-2 dark:border-surface-dark-border">
            <button
              type="button"
              @click="activeTab = 'BALANCE'"
              class="rounded-xl px-3.5 py-1.5 text-xs font-black transition-all"
              :class="
                activeTab === 'BALANCE'
                  ? 'bg-brand-900 text-white shadow-sm dark:bg-white dark:text-slate-900'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              "
            >
              Balance Lácteo y Costos
            </button>

            <button
              type="button"
              @click="activeTab = 'PACKAGING'"
              class="rounded-xl px-3.5 py-1.5 text-xs font-black transition-all"
              :class="
                activeTab === 'PACKAGING'
                  ? 'bg-brand-900 text-white shadow-sm dark:bg-white dark:text-slate-900'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              "
            >
              Fracciones Envasadas ({{ summary.packagings?.length || 0 }})
            </button>

            <button
              type="button"
              @click="activeTab = 'ORDERS'"
              class="rounded-xl px-3.5 py-1.5 text-xs font-black transition-all"
              :class="
                activeTab === 'ORDERS'
                  ? 'bg-brand-900 text-white shadow-sm dark:bg-white dark:text-slate-900'
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
                  ? 'bg-brand-900 text-white shadow-sm dark:bg-white dark:text-slate-900'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              "
            >
              Consumo de Socios
            </button>
          </div>

          <!-- PESTAÑA 1: BALANCE LÁCTEO Y COSTOS -->
          <div v-if="activeTab === 'BALANCE'" class="space-y-4">
            <!-- Cuadrícula de Métricas Lácteas -->
            <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <!-- Leche Utilizada -->
              <div class="rounded-2xl border border-surface-light-border bg-surface-light-card p-3.5 shadow-sm dark:border-surface-dark-border dark:bg-surface-dark-card">
                <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Leche Inoculada</span>
                <p class="mt-1 text-xl font-black text-slate-900 dark:text-white">
                  {{ summary.rawMaterialsBalance.milkUsedLiters }} L
                </p>
                <span class="text-[10px] text-slate-500">Materia prima cruda</span>
              </div>

              <!-- Yogur Obtenido -->
              <div class="rounded-2xl border border-surface-light-border bg-surface-light-card p-3.5 shadow-sm dark:border-surface-dark-border dark:bg-surface-dark-card">
                <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Yogur Obtenido</span>
                <p class="mt-1 text-xl font-black text-emerald-600 dark:text-emerald-400">
                  {{ summary.rawMaterialsBalance.totalLitersProduced }} L
                </p>
                <span class="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                  {{ summary.rawMaterialsBalance.yieldPercentage }}% Rendimiento
                </span>
              </div>

              <!-- Litros Envasados -->
              <div class="rounded-2xl border border-surface-light-border bg-surface-light-card p-3.5 shadow-sm dark:border-surface-dark-border dark:bg-surface-dark-card">
                <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Envasado en Fracciones</span>
                <p class="mt-1 text-xl font-black text-purple-600 dark:text-purple-400">
                  {{ summary.rawMaterialsBalance.packagedLiters }} L
                </p>
                <span class="text-[10px] text-slate-500">
                  Sin envasar: {{ summary.rawMaterialsBalance.unpackagedLiters }} L
                </span>
              </div>

              <!-- Costo por Litro -->
              <div class="rounded-2xl border border-surface-light-border bg-surface-light-card p-3.5 shadow-sm dark:border-surface-dark-border dark:bg-surface-dark-card">
                <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Costo Real / Litro</span>
                <p class="mt-1 text-xl font-black text-brand-800 dark:text-brand-darkText">
                  {{ formatCOP(summary.rawMaterialsBalance.costPerLiter) }}
                </p>
                <span class="text-[10px] text-slate-500">
                  Total: {{ formatCOP(summary.rawMaterialsBalance.totalCost) }}
                </span>
              </div>
            </div>


            <!-- Resumen General de Saldo de Volumen -->
            <div class="rounded-2xl border border-surface-light-border bg-surface-light-card p-4 dark:border-surface-dark-border dark:bg-surface-dark-card">
              <div class="flex items-center justify-between">
                <div>
                  <span class="text-xs font-bold text-slate-400">Saldo Disponible en Tiempo Real</span>
                  <p class="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    {{ summary.volumeBalance.remainingAvailable }} Litros
                  </p>
                </div>
                <div class="text-right text-xs text-slate-500 dark:text-slate-400">
                  <div>Vendido: {{ summary.volumeBalance.totalSold }}L</div>
                  <div>Consumo Socios: {{ summary.volumeBalance.partnerConsumed }}L</div>
                  <div>Total Descargado: {{ summary.volumeBalance.totalDischarged }}L</div>
                </div>
              </div>
            </div>
          </div>

          <!-- PESTAÑA 2: FRACCIONES ENVASADAS -->
          <div v-if="activeTab === 'PACKAGING'" class="space-y-3">
            <div v-if="!summary.packagings || summary.packagings.length === 0" class="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
              <Boxes class="mx-auto h-8 w-8 text-slate-400 mb-2" />
              Aún no se han registrado fracciones envasadas para este lote.
            </div>

            <div v-else class="space-y-3">
              <div class="overflow-x-auto rounded-2xl border border-surface-light-border dark:border-surface-dark-border">
                <table class="w-full text-left text-xs">
                  <thead class="bg-slate-50 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    <tr>
                      <th class="px-4 py-3">Código</th>
                      <th class="px-4 py-3">Fecha</th>
                      <th class="px-4 py-3">Sabor Envasado</th>
                      <th class="px-4 py-3">Presentaciones</th>
                      <th class="px-4 py-3 text-right">Litros Totales</th>
                      <th class="px-4 py-3">Responsable</th>
                      <th class="px-4 py-3">Notas</th>
                      <th class="px-4 py-3 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100 dark:divide-slate-800 bg-surface-light-card dark:bg-surface-dark-card font-medium text-slate-700 dark:text-slate-300">
                    <tr v-for="pkg in paginatedPackagings" :key="pkg.id">
                      <td class="px-4 py-3 whitespace-nowrap font-mono text-[11px] font-black text-purple-700 dark:text-purple-300">
                        {{ pkg.packagingCode || `${summary.batch.batchCode}-F` }}
                      </td>
                      <td class="px-4 py-3 whitespace-nowrap font-bold">
                        {{ formatDate(pkg.packagedAt) }}
                      </td>
                      <td class="px-4 py-3">
                        <div class="flex flex-col gap-1">
                          <span class="rounded-lg bg-purple-50 px-2 py-0.5 text-xs font-black text-purple-800 dark:bg-purple-950/40 dark:text-purple-300 w-fit">
                            {{ pkg.flavor }}
                          </span>
                          <div v-if="pkg.itemsUsed && pkg.itemsUsed.length > 0" class="flex flex-wrap gap-1">
                            <span
                              v-for="it in pkg.itemsUsed"
                              :key="it.id || it.rawMaterialId"
                              class="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[9px] font-bold text-slate-600 dark:text-slate-300"
                            >
                              + {{ it.rawMaterial?.name || 'Insumo' }}: {{ it.quantityUsed }} {{ it.dosageUnit === 'g/L' ? 'kg' : '' }}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td class="px-4 py-3">
                        <div class="flex flex-wrap gap-1.5">
                          <template v-if="pkg.presentations && pkg.presentations.length > 0">
                            <span
                              v-for="(pres, idx) in pkg.presentations"
                              :key="idx"
                              class="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            >
                              {{ pres.containerName }}: {{ pres.quantity }} unds
                              <span class="text-slate-400 font-normal">({{ formatCOP(pres.price) }})</span>
                            </span>
                          </template>
                          <template v-else>
                            <span v-if="pkg.bottles1L > 0" class="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              1L: {{ pkg.bottles1L }} unds ({{ formatCOP(pkg.price1L || 12000) }})
                            </span>
                            <span v-if="pkg.bottles2L > 0" class="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              2L: {{ pkg.bottles2L }} unds ({{ formatCOP(pkg.price2L || 24000) }})
                            </span>
                          </template>
                        </div>
                      </td>
                      <td class="px-4 py-3 text-right font-black text-emerald-600 dark:text-emerald-400">
                        {{ pkg.totalLiters }} L
                      </td>
                      <td class="px-4 py-3">
                        {{ pkg.packagedBy || 'Edier' }}
                      </td>
                      <td class="px-4 py-3 text-slate-400 italic">
                        {{ pkg.notes || '—' }}
                      </td>
                      <td class="px-4 py-3 text-center">
                        <button
                          type="button"
                          @click="emit('editPackaging', pkg)"
                          class="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                          title="Editar fraccionamiento"
                        >
                          <Pencil class="h-3 w-3 text-brand-800 dark:text-brand-darkText" />
                          <span>Editar</span>
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Paginación Local a 5 Fracciones -->
              <div
                v-if="totalPackagingPages > 1"
                class="flex items-center justify-between border-t border-slate-100 pt-2 dark:border-slate-800 text-xs text-slate-500"
              >
                <span>Página {{ packagingsPage }} de {{ totalPackagingPages }} ({{ summary.packagings.length }} fracciones)</span>
                <div class="flex items-center gap-1.5">
                  <button
                    type="button"
                    @click="packagingsPage--"
                    :disabled="packagingsPage <= 1"
                    class="rounded-lg border border-slate-200 p-1 hover:bg-slate-50 disabled:opacity-30 dark:border-slate-700 dark:hover:bg-slate-800"
                  >
                    <ChevronLeft class="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    @click="packagingsPage++"
                    :disabled="packagingsPage >= totalPackagingPages"
                    class="rounded-lg border border-slate-200 p-1 hover:bg-slate-50 disabled:opacity-30 dark:border-slate-700 dark:hover:bg-slate-800"
                  >
                    <ChevronRight class="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- PESTAÑA 3: PEDIDOS VINCULADOS -->
          <div v-if="activeTab === 'ORDERS'" class="space-y-3">
            <div v-if="!summary.linkedOrders || summary.linkedOrders.length === 0" class="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
              No hay pedidos vinculados actualmente a este lote.
            </div>

            <div v-else class="space-y-3">
              <div class="overflow-x-auto rounded-2xl border border-surface-light-border dark:border-surface-dark-border">
                <table class="w-full text-left text-xs">
                  <thead class="bg-slate-50 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    <tr>
                      <th class="px-4 py-3"># Pedido</th>
                      <th class="px-4 py-3">Cliente e Ítems</th>
                      <th class="px-4 py-3 text-center">Volumen</th>
                      <th class="px-4 py-3 text-right">Total</th>
                      <th class="px-4 py-3">Estado</th>
                      <th class="px-4 py-3 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100 dark:divide-slate-800 bg-surface-light-card dark:bg-surface-dark-card font-medium text-slate-700 dark:text-slate-300">
                    <tr v-for="order in paginatedOrders" :key="order.id">
                      <td class="px-4 py-3 font-mono font-bold text-brand-800 dark:text-brand-darkText">
                        #{{ order.orderNumber || order.id }}
                      </td>
                      <td class="px-4 py-3">
                        <div class="font-bold text-slate-900 dark:text-white">
                          {{ order.customer?.fullName || 'Cliente' }}
                        </div>
                        <div class="text-[11px] text-slate-400">
                          {{ order.customer?.phone || 'Sin teléfono' }}
                        </div>
                        <!-- Desglose de ítems vinculados a fracciones -->
                        <div v-if="order.items && order.items.length > 0" class="mt-1 flex flex-wrap gap-1">
                          <span
                            v-for="it in order.items"
                            :key="it.id"
                            class="rounded bg-purple-50 px-1.5 py-0.5 text-[10px] font-bold text-purple-700 dark:bg-purple-950/40 dark:text-purple-300"
                          >
                            {{ it.packagingFlavor || it.productName || 'Yogur' }} ({{ it.packagingCode || 'Lote' }}): {{ it.quantity }} unds
                          </span>
                        </div>
                      </td>
                      <td class="px-4 py-3 text-center">
                        <span class="font-bold text-emerald-600 dark:text-emerald-400">
                          {{ order.totalLiters }} L
                        </span>
                        <span class="block text-[10px] text-slate-400">
                          {{ order.quantityBottles }} botellas
                        </span>
                      </td>
                      <td class="px-4 py-3 text-right font-black">
                        {{ formatCOP(order.totalAmount) }}
                      </td>
                      <td class="px-4 py-3">
                        <span
                          class="rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider"
                          :class="
                            order.deliveryStatus === 'DELIVERED'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300'
                          "
                        >
                          {{ order.deliveryStatus }}
                        </span>
                      </td>
                      <td class="px-4 py-3 text-center">
                        <button
                          type="button"
                          @click="handleUnlinkOrder(order)"
                          class="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-bold text-rose-700 transition-colors hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300 dark:hover:bg-rose-900/40"
                          title="Desvincular pedido del lote"
                        >
                          <Unlink class="h-3.5 w-3.5 stroke-[2]" />
                          <span>Desvincular</span>
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Paginación Local a 5 Pedidos -->
              <div
                v-if="totalOrderPages > 1"
                class="flex items-center justify-between border-t border-slate-100 pt-2 dark:border-slate-800 text-xs text-slate-500"
              >
                <span>Página {{ ordersPage }} de {{ totalOrderPages }} ({{ summary.linkedOrders.length }} pedidos)</span>
                <div class="flex items-center gap-1.5">
                  <button
                    type="button"
                    @click="ordersPage--"
                    :disabled="ordersPage <= 1"
                    class="rounded-lg border border-slate-200 p-1 hover:bg-slate-50 disabled:opacity-30 dark:border-slate-700 dark:hover:bg-slate-800"
                  >
                    <ChevronLeft class="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    @click="ordersPage++"
                    :disabled="ordersPage >= totalOrderPages"
                    class="rounded-lg border border-slate-200 p-1 hover:bg-slate-50 disabled:opacity-30 dark:border-slate-700 dark:hover:bg-slate-800"
                  >
                    <ChevronRight class="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- PESTAÑA 4: CONSUMO DE SOCIOS -->
          <div v-if="activeTab === 'PARTNERS'" class="space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <h4 class="text-xs font-extrabold text-slate-800 dark:text-white">
                  Historial de Retiros y Consumos de Socios
                </h4>
                <p class="text-[11px] text-slate-400">
                  Descuento directo del inventario del lote para consumo propio
                </p>
              </div>

              <button
                type="button"
                @click="showPartnerWithdrawalForm = !showPartnerWithdrawalForm"
                class="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-3.5 py-1.5 text-xs font-extrabold text-white shadow-sm transition-transform active:scale-95 hover:bg-purple-700"
              >
                <Plus class="h-4 w-4" />
                <span>Registrar Retiro de Socio</span>
              </button>
            </div>

            <!-- Formulario Desplegable de Retiro de Socio -->
            <div
              v-if="showPartnerWithdrawalForm"
              class="rounded-2xl border border-purple-200 bg-purple-50/50 p-4 dark:border-purple-800/40 dark:bg-purple-950/20"
            >
              <h5 class="text-xs font-black text-purple-900 dark:text-purple-300 mb-3">
                Nuevo Retiro para Consumo de Socio
              </h5>

              <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label class="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Socio *
                  </label>
                  <select
                    v-model.number="selectedPartnerId"
                    class="w-full rounded-xl border border-slate-200 bg-surface-light-card px-3 py-2 text-xs font-bold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-slate-700 dark:bg-surface-dark-card dark:text-white"
                  >
                    <option v-for="p in partners" :key="p.id" :value="p.id">
                      {{ p.fullName }} ({{ p.role }})
                    </option>
                  </select>
                </div>

                <div>
                  <label class="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Presentación *
                  </label>
                  <select
                    v-model="withdrawalBottleSize"
                    class="w-full rounded-xl border border-slate-200 bg-surface-light-card px-3 py-2 text-xs font-bold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-slate-700 dark:bg-surface-dark-card dark:text-white"
                  >
                    <option value="1L">Botella 1 Litro</option>
                    <option value="2L">Botella 2 Litros</option>
                  </select>
                </div>

                <div>
                  <label class="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Cantidad de Botellas *
                  </label>
                  <input
                    v-model.number="withdrawalQuantity"
                    type="number"
                    min="1"
                    step="1"
                    class="w-full rounded-xl border border-slate-200 bg-surface-light-card px-3 py-2 text-xs font-bold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-slate-700 dark:bg-surface-dark-card dark:text-white"
                  />
                </div>
              </div>

              <div class="mt-3">
                <label class="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Notas / Observación
                </label>
                <input
                  v-model="withdrawalNotes"
                  type="text"
                  placeholder="Ej. Consumo personal reunión de socios"
                  class="w-full rounded-xl border border-slate-200 bg-surface-light-card px-3 py-2 text-xs font-medium text-slate-900 focus:border-brand-800 focus:outline-none dark:border-slate-700 dark:bg-surface-dark-card dark:text-white"
                />
              </div>

              <div v-if="withdrawalError" class="mt-2 text-xs font-bold text-rose-600">
                {{ withdrawalError }}
              </div>

              <div class="mt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  @click="showPartnerWithdrawalForm = false"
                  class="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  @click="handleRegisterWithdrawal"
                  :disabled="isSubmittingWithdrawal"
                  class="rounded-xl bg-purple-700 px-4 py-1.5 text-xs font-extrabold text-white shadow-sm hover:bg-purple-800 disabled:opacity-50"
                >
                  {{ isSubmittingWithdrawal ? 'Guardando...' : 'Confirmar Retiro' }}
                </button>
              </div>
            </div>

            <!-- Tabla de Descargos de Socio -->
            <div
              v-if="!summary.discharges || summary.discharges.length === 0"
              class="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400"
            >
              No hay retiros ni consumos de socio registrados en este lote.
            </div>

            <div v-else class="overflow-x-auto rounded-2xl border border-surface-light-border dark:border-surface-dark-border">
              <table class="w-full text-left text-xs">
                <thead class="bg-slate-50 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  <tr>
                    <th class="px-4 py-3">Fecha</th>
                    <th class="px-4 py-3">Socio / Colaborador</th>
                    <th class="px-4 py-3">Motivo</th>
                    <th class="px-4 py-3 text-center">Envase</th>
                    <th class="px-4 py-3 text-center">Cantidad</th>
                    <th class="px-4 py-3 text-right">Total Litros</th>
                    <th class="px-4 py-3">Notas</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800 bg-surface-light-card dark:bg-surface-dark-card font-medium text-slate-700 dark:text-slate-300">
                  <tr v-for="dis in summary.discharges" :key="dis.id">
                    <td class="px-4 py-3 whitespace-nowrap font-bold">
                      {{ formatDate(dis.dischargeDate) }}
                    </td>
                    <td class="px-4 py-3 font-bold text-slate-900 dark:text-white">
                      {{ dis.staffMember?.fullName || 'Socio' }}
                    </td>
                    <td class="px-4 py-3">
                      <span class="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                        {{ dis.reasonType }}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-center">
                      {{ dis.bottleSize || '1L' }}
                    </td>
                    <td class="px-4 py-3 text-center font-bold">
                      {{ dis.quantityBottles }} botellas
                    </td>
                    <td class="px-4 py-3 text-right font-black text-amber-600 dark:text-amber-400">
                      {{ dis.totalLiters }} L
                    </td>
                    <td class="px-4 py-3 text-slate-400 italic">
                      {{ dis.notes || '—' }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Pie del Modal -->
          <div class="flex items-center justify-end border-t border-surface-light-border pt-4 dark:border-surface-dark-border">
            <button
              type="button"
              @click="handleClose"
              class="rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-black text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
            >
              Cerrar Resumen
            </button>
          </div>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
