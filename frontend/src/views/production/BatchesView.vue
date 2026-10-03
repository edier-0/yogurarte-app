<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import {
  FlaskConical,
  TrendingUp,
  Boxes,
  Timer,
  AlertTriangle,
  Archive,
  Plus,
  Search,
  RefreshCw,
  Sparkles,
  PackageCheck,
  Eye,
  ChevronLeft,
  ChevronRight,
  Pencil,
  CheckCircle2,
  Trash2,
  Tag,
} from 'lucide-vue-next';
import {
  useProductionStore,
  type BatchItem,
  type BatchChip,
  type BatchPackagingCardItem,
} from '@/stores/production.store';
import { useConfirm } from '@/composables/useConfirm';
import { http } from '@/api/client';
import BatchModal from '@/components/production/BatchModal.vue';
import FlavorsManagementModal from '@/components/production/FlavorsManagementModal.vue';
import PackagingModal from '@/components/production/PackagingModal.vue';
import BatchSummaryModal from '@/components/production/BatchSummaryModal.vue';
import PackagingSummaryModal from '@/components/production/PackagingSummaryModal.vue';
import CompleteFermentationModal from '@/components/production/CompleteFermentationModal.vue';

const productionStore = useProductionStore();
const { confirm } = useConfirm();

// Pestaña principal: Fase A (Madre) vs Fase B (Envasados)
const activeMainTab = ref<'BASE' | 'PACKAGING'>('BASE');

const isBatchModalOpen = ref(false);
const isFlavorsModalOpen = ref(false);
const selectedBatchToEdit = ref<BatchItem | null>(null);

// Modal Finalizar Fermentación
const isCompleteModalOpen = ref(false);
const selectedBatchForCompletion = ref<BatchItem | null>(null);

// Modales Fase B y Auditoría Lote Madre
const isPackagingModalOpen = ref(false);
const selectedBatchForPackaging = ref<BatchItem | null>(null);
const selectedPackagingToEdit = ref<any | null>(null);

const isSummaryModalOpen = ref(false);
const selectedBatchIdForSummary = ref<number | null>(null);

// Modal Auditoría Fracción Envasada (Fase B)
const isPackagingSummaryModalOpen = ref(false);
const selectedPackagingIdForSummary = ref<number | null>(null);

onMounted(() => {
  productionStore.fetchBatches(1);
  productionStore.fetchBatchesMetrics();
  productionStore.fetchPackagings(1);
  productionStore.fetchFlavors();
});

// Formateador de fecha en Colombia
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

// Formateador de moneda en pesos colombianos
const formatCOP = (val?: number | null) => {
  return `$ ${(val || 0).toLocaleString('es-CO')}`;
};

// Selección de chip Fase A con recarga en página 1
async function handleSelectChip(chip: BatchChip) {
  productionStore.activeChip = chip;
  await productionStore.fetchBatches(1);
}

// Selección de chip Fase B con recarga en página 1
async function handleSelectPackagingChip(chip: 'ALL' | 'DISPONIBLE' | 'AGOTADO') {
  productionStore.packagingChip = chip;
  await productionStore.fetchPackagings(1);
}

// Abrir modal de creación de lote madre
function openCreateBatchModal() {
  selectedBatchToEdit.value = null;
  isBatchModalOpen.value = true;
}

// Abrir modal de edición de lote madre
function openEditBatchModal(batch: BatchItem) {
  selectedBatchToEdit.value = batch;
  isBatchModalOpen.value = true;
}

// Abrir modal para terminar fermentación
function openCompleteModal(batch: BatchItem) {
  selectedBatchForCompletion.value = batch;
  isCompleteModalOpen.value = true;
}

// Abrir modal de envasado
function openPackagingModal(batch: BatchItem, pkgToEdit?: any) {
  selectedBatchForPackaging.value = batch;
  selectedPackagingToEdit.value = pkgToEdit || null;
  isPackagingModalOpen.value = true;
}

// Editar fraccionamiento desde auditoría de lote madre
function handleEditPackaging(pkg: any) {
  const batch = productionStore.batches.find((b) => b.id === pkg.batchId) || null;
  openPackagingModal(batch!, pkg);
}

// Editar fraccionamiento directamente desde tarjeta de Fase B
async function handleEditPackagingFromCard(pkg: BatchPackagingCardItem) {
  let batch: BatchItem | null = productionStore.batches.find((b) => b.id === pkg.batchId) || null;
  if (!batch) {
    try {
      const res = await http.get<BatchItem>(`/batches/${pkg.batchId}`);
      batch = res || null;
    } catch {
      batch = null;
    }
  }
  if (batch) {
    openPackagingModal(batch, pkg as any);
  }
}

async function handlePackagingSaved() {
  await Promise.all([
    productionStore.fetchBatches(productionStore.currentPage),
    productionStore.fetchPackagings(productionStore.packagingCurrentPage),
  ]);
}

// Eliminar fracción envasada con advertencia de pedidos y restitución de insumos/litros
async function handleDeletePackaging(pkg: BatchPackagingCardItem) {
  const linkedOrders = pkg.linkedOrdersCount || 0;
  if (linkedOrders > 0) {
    await confirm({
      title: 'Fracción con Pedidos Vinculados',
      message: `La fracción "${pkg.packagingCode || pkg.flavor}" tiene ${linkedOrders} pedido(s) comercial(es) vinculado(s). No es posible eliminarla directamente. Por favor, abre la "Auditoría de Fracción" para desvincular o reasignar los pedidos antes de eliminarla.`,
      confirmText: 'Entendido',
      cancelText: 'Cerrar',
      variant: 'warning',
    });
    return;
  }

  const ok = await confirm({
    title: 'Eliminar Fracción Envasada',
    message: `¿Estás seguro de eliminar la fracción "${pkg.packagingCode || pkg.flavor}"? Los ${pkg.totalLiters}L serán reintegrados al saldo disponible del lote madre y todos los insumos de empaque se devolverán al inventario.`,
    confirmText: 'Eliminar Fracción',
    cancelText: 'Cancelar',
    variant: 'danger',
  });

  if (!ok) return;
  await productionStore.deletePackaging(pkg.id, false);
}

// Eliminar lote madre definitivamente de Fase A con advertencia correspondiente
async function handleDeleteBatch(batch: BatchItem) {
  const pkgsCount = batch.packagings?.length || 0;
  const ok = await confirm({
    title: '¿Eliminar Lote Definitivamente?',
    message: pkgsCount > 0
      ? `⚠️ ¡ADVERTENCIA CRÍTICA! El lote madre "${batch.batchCode}" cuenta con ${pkgsCount} fracción(es) envasada(s). Si continúas, se eliminarán todas sus fracciones envasadas, los pedidos vinculados quedarán como pre-venta sin lote y el lote será borrado permanentemente de la base de datos de manera irreversible. ¿Deseas proceder?`
      : `¿Estás seguro de eliminar DEFINITIVAMENTE el lote madre "${batch.batchCode}"? Esta acción borrará el registro de producción y sus insumos consumidos de forma irreversible de la base de datos.`,
    confirmText: 'Eliminar Definitivamente',
    cancelText: 'Cancelar',
    variant: 'danger',
  });

  if (!ok) return;
  await productionStore.deleteBatch(batch.id);
}

// Cambio rápido de estado 1-touch: si está en fermentación, abre modal para terminarla
async function handleQuickStatusToggle(batch: BatchItem) {
  if (batch.status === 'EN_FERMENTACION') {
    openCompleteModal(batch);
    return;
  }
  const nextStatus = 'EN_FERMENTACION';
  await productionStore.patchBatchStatus(batch.id, nextStatus);
}

// Abrir modal de resumen y auditoría de lote madre
function openSummaryModal(batch: BatchItem) {
  selectedBatchIdForSummary.value = batch.id;
  isSummaryModalOpen.value = true;
}

// Abrir modal de resumen y auditoría de fracción envasada
function openPackagingSummaryModal(pkgId: number) {
  selectedPackagingIdForSummary.value = pkgId;
  isPackagingSummaryModalOpen.value = true;
}

// Recargar al actualizar auditoría de fracción
async function handlePackagingSummaryUpdated() {
  await Promise.all([
    productionStore.fetchPackagings(productionStore.packagingCurrentPage),
    productionStore.fetchBatches(productionStore.currentPage),
  ]);
}

// Recargar fracciones al cambiar a la pestaña de Fase B si estuviera vacía
watch(activeMainTab, (newTab) => {
  if (newTab === 'PACKAGING' && productionStore.packagings.length === 0) {
    productionStore.fetchPackagings(1);
  }
});
</script>

<template>
  <div class="space-y-6">
    <!-- Encabezado de la Vista -->
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          Lotes y Rendimiento
        </h1>
        <p class="text-xs font-semibold text-slate-500 dark:text-slate-400">
          Control segregado en 2 fases: Fermentación base (Fase A), fraccionamiento multi-formato (Fase B), pre-ventas y auditoría láctea.
        </p>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          @click="
            activeMainTab === 'BASE'
              ? productionStore.fetchBatches(productionStore.currentPage)
              : productionStore.fetchPackagings(productionStore.packagingCurrentPage)
          "
          :disabled="productionStore.isLoading || productionStore.isLoadingPackagings"
          class="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-surface-light-card px-3 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition-all active:scale-95 hover:bg-slate-50 dark:border-slate-700 dark:bg-surface-dark-card dark:text-slate-200"
          title="Actualizar listados"
        >
          <RefreshCw
            class="h-4 w-4"
            :class="{ 'animate-spin': productionStore.isLoading || productionStore.isLoadingPackagings }"
          />
          <span class="hidden sm:inline">Refrescar</span>
        </button>

        <button
          type="button"
          @click="isFlavorsModalOpen = true"
          class="inline-flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50/70 px-3.5 py-2.5 text-xs font-bold text-purple-700 shadow-sm transition-all active:scale-95 hover:bg-purple-100/80 dark:border-purple-800/40 dark:bg-purple-950/30 dark:text-purple-300 dark:hover:bg-purple-900/40"
          title="Gestionar catálogo de sabores"
        >
          <Sparkles class="h-4 w-4 stroke-[2]" />
          <span class="hidden sm:inline">Gestionar Sabores</span>
          <span class="sm:hidden">Sabores</span>
        </button>

        <button
          type="button"
          @click="openCreateBatchModal"
          class="inline-flex items-center gap-2 rounded-xl bg-hero-gradient px-4 py-2.5 text-xs font-extrabold text-white shadow-card transition-transform active:scale-95"
        >
          <Plus class="h-4 w-4 stroke-[2.5]" />
          <span>Fase A · Registrar Lote</span>
        </button>
      </div>
    </div>

    <!-- 1. Métricas Superiores de Producción -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <!-- Litros en Fermentación -->
      <div class="rounded-2xl border border-surface-light-border bg-surface-light-card p-5 shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card">
        <span class="text-xs font-bold uppercase tracking-wider text-slate-400">
          Litros en Fermentación (Fase A)
        </span>
        <div class="mt-2 flex items-baseline justify-between">
          <span class="text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">
            {{ productionStore.fermentingLiters }} L
          </span>
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
            <FlaskConical class="h-5 w-5 stroke-[1.75]" />
          </div>
        </div>
        <span class="mt-1 block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
          Volumen total en proceso activo
        </span>
      </div>

      <!-- Yogur Terminado Disponible (Fase B) -->
      <div class="rounded-2xl border border-surface-light-border bg-surface-light-card p-5 shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold uppercase tracking-wider text-natural-500">
            Disponible para Ventas (Fase B)
          </span>
          <span class="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-black text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            Envasado
          </span>
        </div>
        <div class="mt-2 flex items-baseline justify-between">
          <span class="text-2xl font-black text-natural-500 sm:text-3xl">
            {{ productionStore.finishedYogurtLiters }} L
          </span>
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-natural-50 text-natural-500 dark:bg-emerald-950/40 dark:text-emerald-400">
            <PackageCheck class="h-5 w-5 stroke-[1.75]" />
          </div>
        </div>
        <div class="mt-1 flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
          <span>Stock envasado libre para clientes</span>
          <span v-if="(productionStore.unpackagedBaseLiters || 0) > 0" class="text-purple-600 dark:text-purple-400 font-bold">
            +{{ productionStore.unpackagedBaseLiters }} L base en tanque
          </span>
        </div>
      </div>

      <!-- Rendimiento Promedio -->
      <div class="rounded-2xl border border-surface-light-border bg-surface-light-card p-5 shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card">
        <span class="text-xs font-bold uppercase tracking-wider text-dairy-500">
          Rendimiento Promedio
        </span>
        <div class="mt-2 flex items-baseline justify-between">
          <span class="text-2xl font-black text-dairy-500 sm:text-3xl">
            {{ productionStore.averageYield }}%
          </span>
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-dairy-50 text-dairy-500 dark:bg-blue-950/40 dark:text-blue-400">
            <TrendingUp class="h-5 w-5 stroke-[1.75]" />
          </div>
        </div>
        <span class="mt-1 block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
          Control de mermas y aprovechamiento lácteo
        </span>
      </div>
    </div>

    <!-- 2. Selector Principal de Pestañas Segregadas (Fase A vs Fase B) -->
    <div class="flex items-center gap-2 border-b border-surface-light-border pb-3 dark:border-surface-dark-border">
      <button
        type="button"
        @click="activeMainTab = 'BASE'"
        class="inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-xs font-black transition-all"
        :class="
          activeMainTab === 'BASE'
            ? 'bg-brand-900 text-white shadow-md dark:bg-white dark:text-slate-900'
            : 'bg-surface-light-card text-slate-600 hover:bg-slate-100 dark:bg-surface-dark-card dark:text-slate-300 dark:hover:bg-slate-800'
        "
      >
        <FlaskConical class="h-4 w-4" />
        <span>Fase A · Lotes Base (Fermentación)</span>
        <span
          class="rounded-full px-2 py-0.5 text-[10px] font-extrabold"
          :class="
            activeMainTab === 'BASE'
              ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900'
              : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
          "
        >
          {{ productionStore.totalBatches }}
        </span>
      </button>

      <button
        type="button"
        @click="activeMainTab = 'PACKAGING'"
        class="inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-xs font-black transition-all"
        :class="
          activeMainTab === 'PACKAGING'
            ? 'bg-brand-900 text-white shadow-md dark:bg-white dark:text-slate-900'
            : 'bg-surface-light-card text-slate-600 hover:bg-slate-100 dark:bg-surface-dark-card dark:text-slate-300 dark:hover:bg-slate-800'
        "
      >
        <PackageCheck class="h-4 w-4" />
        <span>Fase B · Lotes Envasados (Fraccionados)</span>
        <span
          class="rounded-full px-2 py-0.5 text-[10px] font-extrabold"
          :class="
            activeMainTab === 'PACKAGING'
              ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900'
              : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
          "
        >
          {{ productionStore.totalPackagings }}
        </span>
      </button>
    </div>

    <!-- ========================================== -->
    <!-- CONTENIDO PESTAÑA 1: FASE A (LOTES BASE)   -->
    <!-- ========================================== -->
    <div v-if="activeMainTab === 'BASE'" class="space-y-6">
      <!-- Barra de Filtros Ergonómica y Buscador de Lotes Madre -->
      <div class="space-y-3 rounded-2xl border border-surface-light-border bg-surface-light-card p-4 shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <!-- Buscador por código LOT-... o sabor -->
          <div class="relative w-full sm:w-80">
            <Search class="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              v-model="productionStore.searchQuery"
              type="text"
              placeholder="Buscar por lote (LOT-...) o sabor..."
              class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas py-2.5 pl-10 pr-3.5 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
            />
          </div>

          <!-- Tira de 4 Chips Táctiles con Contadores Dinámicos -->
          <div class="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <!-- 1. Todos los Lotes -->
            <button
              type="button"
              @click="handleSelectChip('ALL')"
              class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition-all"
              :class="
                productionStore.activeChip === 'ALL'
                  ? 'bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              "
            >
              <Boxes class="h-4 w-4 stroke-[1.75]" />
              <span>Todos los Lotes ({{ productionStore.chipCounts.all }})</span>
            </button>

            <!-- 2. Disponibles / Activos -->
            <button
              type="button"
              @click="handleSelectChip('ACTIVE')"
              class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition-all"
              :class="
                productionStore.activeChip === 'ACTIVE'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              "
            >
              <Timer class="h-4 w-4 stroke-[1.75]" />
              <span>Disponibles / Activos ({{ productionStore.chipCounts.active }})</span>
            </button>

            <!-- 3. Agotados -->
            <button
              type="button"
              @click="handleSelectChip('DEPLETED')"
              class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition-all"
              :class="
                productionStore.activeChip === 'DEPLETED'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              "
            >
              <AlertTriangle class="h-4 w-4 stroke-[1.75]" />
              <span>Agotados ({{ productionStore.chipCounts.depleted }})</span>
            </button>

            <!-- 4. Archivados -->
            <button
              type="button"
              @click="handleSelectChip('ARCHIVED')"
              class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition-all"
              :class="
                productionStore.activeChip === 'ARCHIVED'
                  ? 'bg-slate-700 text-white shadow-sm dark:bg-slate-600'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              "
            >
              <Archive class="h-4 w-4 stroke-[1.75]" />
              <span>Archivados ({{ productionStore.chipCounts.archived }})</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Tarjetas de Lotes Madre (Fase A) con v-auto-animate -->
      <div v-auto-animate class="space-y-4">
        <!-- Estado Vacío -->
        <div
          v-if="productionStore.filteredBatches.length === 0"
          class="rounded-3xl border border-dashed border-surface-light-border bg-surface-light-card p-10 text-center dark:border-surface-dark-border dark:bg-surface-dark-card"
        >
          <FlaskConical class="mx-auto h-12 w-12 text-slate-400 stroke-[1.5]" />
          <h3 class="mt-3 text-base font-extrabold text-slate-900 dark:text-white">
            No hay lotes en esta categoría
          </h3>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Inicia un nuevo lote de producción presionando el botón "Fase A · Registrar Lote".
          </p>
        </div>

        <!-- Tarjetas de Lote Madre -->
        <div
          v-for="batch in productionStore.filteredBatches"
          :key="batch.id"
          class="rounded-3xl border border-surface-light-border bg-surface-light-card p-5 sm:p-6 shadow-card transition-all hover:border-slate-300 dark:border-surface-dark-border dark:bg-surface-dark-card"
        >
          <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <!-- Cabecera de la Tarjeta -->
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <span class="rounded-xl bg-surface-light-canvas px-3 py-1 font-mono text-xs font-black text-brand-800 dark:bg-surface-dark-canvas dark:text-brand-darkText border border-surface-light-border dark:border-surface-dark-border">
                  {{ batch.batchCode }}
                </span>

                <span class="text-base font-extrabold text-slate-900 dark:text-white sm:text-lg">
                  {{ batch.flavor }}
                </span>

                <!-- Badge de Estado Interactivo 1-Touch -->
                <button
                  type="button"
                  @click.stop="handleQuickStatusToggle(batch)"
                  class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider transition-all hover:scale-105 active:scale-95 shadow-xs"
                  :class="
                    batch.status === 'EN_FERMENTACION'
                      ? 'border border-purple-200 bg-purple-100 text-purple-800 dark:border-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                      : (batch.status === 'DISPONIBLE' || batch.status === 'COMPLETADO') && batch.remainingAvailableLiters > 0
                      ? 'border border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : (batch.packagedLiters || 0) >= (batch.totalLitersProduced || batch.milkUsedLiters || 1) - 0.05
                      ? 'border border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-800/60 dark:bg-brand-950/40 dark:text-brand-300'
                      : batch.status === 'AGOTADO' || batch.remainingAvailableLiters <= 0
                      ? 'border border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      : 'border border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  "
                  :title="
                    batch.status === 'EN_FERMENTACION'
                      ? 'Click para marcar como DISPONIBLE para envasar'
                      : 'Click para alternar a EN FERMENTACIÓN'
                  "
                >
                  <Timer v-if="batch.status === 'EN_FERMENTACION'" class="h-3 w-3 stroke-[2.5]" />
                  <PackageCheck v-else-if="(batch.packagedLiters || 0) >= (batch.totalLitersProduced || batch.milkUsedLiters || 1) - 0.05 && batch.remainingAvailableLiters <= 0" class="h-3 w-3 stroke-[2.5]" />
                  <CheckCircle2 v-else-if="batch.remainingAvailableLiters > 0" class="h-3 w-3 stroke-[2.5]" />
                  <span>
                    {{
                      batch.status === 'EN_FERMENTACION'
                        ? 'En Fermentación'
                        : batch.remainingAvailableLiters > 0
                        ? 'Disponible'
                        : (batch.packagedLiters || 0) >= (batch.totalLitersProduced || batch.milkUsedLiters || 1) - 0.05
                        ? 'Envasado Total'
                        : 'Agotado'
                    }}
                  </span>
                </button>
              </div>

              <!-- Fechas e información del lote -->
              <div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span>Elaborado: {{ formatDate(batch.preparationDate) }}</span>
                <span>•</span>
                <span>Vencimiento: {{ formatDate(batch.expirationDate) }}</span>
                <span v-if="batch.registeredBy">• Por: {{ batch.registeredBy }}</span>
                <span v-if="batch.packagings && batch.packagings.length > 0" class="rounded-md bg-purple-50 px-2 py-0.5 text-[10px] font-black text-purple-800 dark:bg-purple-950/40 dark:text-purple-300">
                  {{ batch.packagings.length }} fracción(es) envasada(s)
                </span>
              </div>

              <p v-if="batch.notes" class="mt-1.5 text-xs text-slate-500 dark:text-slate-400 italic">
                "{{ batch.notes }}"
              </p>
            </div>

            <!-- Métricas de Litros y Merma -->
            <div class="flex flex-col sm:items-end">
              <div class="text-right">
                <span class="text-xs font-bold text-slate-400">Saldo Disponible:</span>
                <div class="text-xl font-black text-natural-500 sm:text-2xl">
                  {{ batch.remainingAvailableLiters }} L
                  <span class="text-xs font-normal text-slate-400">/ {{ batch.totalLitersProduced || batch.milkUsedLiters }} L</span>
                </div>
              </div>

              <div class="mt-1 flex items-center gap-2 text-xs font-bold text-slate-500">
                <span>Rendimiento:</span>
                <span class="font-extrabold text-dairy-500">
                  {{
                    batch.yieldPercentage ||
                    Math.round(((batch.totalLitersProduced || batch.milkUsedLiters) / (batch.milkUsedLiters || 1)) * 1000) / 10
                  }}%
                </span>
                <span class="text-slate-300">•</span>
                <span class="text-slate-400">
                  Envasado: {{ batch.packagedLiters || 0 }} L
                </span>
              </div>
            </div>
          </div>

          <!-- Barra Reactiva de Fraccionamiento (Fase A) -->
          <div class="mt-5 space-y-2 border-t border-surface-light-border pt-4 dark:border-surface-dark-border">
            <div class="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
              <span>
                Envasado: {{ batch.packagedLiters || 0 }} L / Total: {{ batch.totalLitersProduced || batch.milkUsedLiters }} L
                <span class="text-slate-400 font-semibold">
                  ({{ Math.max(0, (batch.totalLitersProduced || batch.milkUsedLiters) - (batch.packagedLiters || 0)).toFixed(2) }} L libres por fraccionar)
                </span>
              </span>
              <span class="text-brand-800 dark:text-brand-darkText font-black">
                {{
                  Math.min(
                    100,
                    Math.round(
                      ((batch.packagedLiters || 0) / (batch.totalLitersProduced || batch.milkUsedLiters || 1)) * 100
                    )
                  )
                }}% Fraccionado
              </span>
            </div>

            <div class="h-2.5 w-full overflow-hidden rounded-full bg-surface-light-canvas dark:bg-surface-dark-canvas border border-surface-light-border dark:border-surface-dark-border">
              <div
                class="h-full rounded-full transition-all duration-500"
                :class="
                  (batch.totalLitersProduced || batch.milkUsedLiters) - (batch.packagedLiters || 0) <= 0
                    ? 'bg-slate-400'
                    : batch.status === 'EN_FERMENTACION'
                    ? 'bg-purple-500'
                    : 'bg-hero-gradient'
                "
                :style="{
                  width: `${Math.min(
                    100,
                    Math.round(
                      ((batch.packagedLiters || 0) / (batch.totalLitersProduced || batch.milkUsedLiters || 1)) * 100
                    )
                  )}%`,
                }"
              ></div>
            </div>
          </div>

          <!-- Acciones Directas por Tarjeta de Lote Madre -->
          <div class="mt-4 border-t border-surface-light-border pt-3 dark:border-surface-dark-border">
            <div class="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center md:justify-end">
              <!-- Acción Terminar Fermentación (Solo si está en fermentación) -->
              <button
                v-if="batch.status === 'EN_FERMENTACION'"
                type="button"
                @click="openCompleteModal(batch)"
                class="inline-flex h-9 w-full md:w-auto items-center justify-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50/80 px-3.5 text-xs font-extrabold text-purple-700 transition-colors hover:bg-purple-100 dark:border-purple-800/40 dark:bg-purple-950/40 dark:text-purple-300"
                title="Finalizar fermentación, confirmar volumen y pasar a Disponible"
              >
                <CheckCircle2 class="h-3.5 w-3.5 shrink-0 text-purple-600 dark:text-purple-400" />
                <span>Terminar Fermentación</span>
              </button>

              <!-- Acción Fase B: Envasar / Fraccionar Lote (Botón Principal) -->
              <button
                v-if="batch.status !== 'ARCHIVADO' && (batch.remainingAvailableLiters > 0 || batch.status === 'EN_FERMENTACION')"
                type="button"
                @click="openPackagingModal(batch)"
                class="inline-flex h-9 w-full md:w-auto items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 text-xs font-extrabold text-white shadow-sm transition-transform active:scale-95 hover:bg-emerald-700"
                title="Fraccionar por sabor, botellas y presentaciones flexibles"
              >
                <PackageCheck class="h-3.5 w-3.5 shrink-0 stroke-[2.5]" />
                <span>Envasar / Fraccionar</span>
              </button>

              <!-- Fila Secundaria: Auditoría, Editar y Eliminar en cuadrícula simétrica en móvil y horizontal en desktop -->
              <div class="grid grid-cols-2 gap-2 w-full md:w-auto md:flex md:items-center">
                <!-- Acción Auditoría y Detalle Lote Madre -->
                <button
                  type="button"
                  @click="openSummaryModal(batch)"
                  class="inline-flex h-9 w-full md:w-auto items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-surface-dark-canvas dark:text-slate-300"
                  :class="batch.status === 'ARCHIVADO' ? 'col-span-1' : ''"
                  title="Ver balance lácteo, pedidos vinculados y retiros de socios"
                >
                  <Eye class="h-3.5 w-3.5 shrink-0 text-slate-500" />
                  <span class="truncate">Auditoría</span>
                </button>

                <!-- Acción Editar Lote Madre -->
                <button
                  v-if="batch.status !== 'ARCHIVADO'"
                  type="button"
                  @click="openEditBatchModal(batch)"
                  class="inline-flex h-9 w-full md:w-auto items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-surface-dark-canvas dark:text-slate-300"
                  title="Editar parámetros, tiempo e insumos del lote madre"
                >
                  <Pencil class="h-3.5 w-3.5 shrink-0 text-slate-500" />
                  <span class="truncate">Editar</span>
                </button>

                <!-- Eliminar Lote Madre Definitivamente -->
                <button
                  type="button"
                  @click="handleDeleteBatch(batch)"
                  class="inline-flex h-9 w-full md:w-auto items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 text-xs font-bold text-rose-700 transition-colors hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300 dark:hover:bg-rose-900/40"
                  :class="batch.status !== 'ARCHIVADO' ? 'col-span-2 md:col-auto' : 'col-span-1'"
                  title="Eliminar lote madre definitivamente"
                >
                  <Trash2 class="h-3.5 w-3.5 shrink-0 stroke-[2]" />
                  <span class="truncate">Eliminar</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Barra de Paginación Institucional (Estricta a 5 lotes por página) -->
      <div
        v-if="productionStore.totalBatches > 0"
        class="flex flex-col items-center justify-between gap-3 rounded-2xl border border-surface-light-border bg-surface-light-card p-4 shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card sm:flex-row"
      >
        <div class="text-xs font-bold text-slate-600 dark:text-slate-400">
          Página
          <span class="font-black text-slate-900 dark:text-white">{{ productionStore.currentPage }}</span>
          de
          <span class="font-black text-slate-900 dark:text-white">{{ productionStore.totalPages }}</span>
          <span class="ml-1 text-slate-400">({{ productionStore.totalBatches }} lotes madre en total)</span>
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            @click="productionStore.goToPage(productionStore.currentPage - 1)"
            :disabled="productionStore.currentPage <= 1 || productionStore.isLoading"
            class="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm transition-all active:scale-95 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed dark:border-slate-700 dark:bg-surface-dark-canvas dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <ChevronLeft class="h-4 w-4" />
            <span>Anterior</span>
          </button>

          <button
            type="button"
            @click="productionStore.goToPage(productionStore.currentPage + 1)"
            :disabled="productionStore.currentPage >= productionStore.totalPages || productionStore.isLoading"
            class="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm transition-all active:scale-95 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed dark:border-slate-700 dark:bg-surface-dark-canvas dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <span>Siguiente</span>
            <ChevronRight class="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>

    <!-- ============================================== -->
    <!-- CONTENIDO PESTAÑA 2: FASE B (LOTES ENVASADOS)  -->
    <!-- ============================================== -->
    <div v-else-if="activeMainTab === 'PACKAGING'" class="space-y-6">
      <!-- Barra de Filtros y Buscador de Fracciones Envasadas -->
      <div class="space-y-3 rounded-2xl border border-surface-light-border bg-surface-light-card p-4 shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <!-- Buscador por código de fracción, sabor o lote madre -->
          <div class="relative w-full sm:w-80">
            <Search class="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              v-model="productionStore.packagingSearchQuery"
              type="text"
              placeholder="Buscar fracción, sabor o lote..."
              class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas py-2.5 pl-10 pr-3.5 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
            />
          </div>

          <!-- Tira de Chips Táctiles de Fase B -->
          <div class="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <!-- 1. Todos -->
            <button
              type="button"
              @click="handleSelectPackagingChip('ALL')"
              class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition-all"
              :class="
                productionStore.packagingChip === 'ALL'
                  ? 'bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              "
            >
              <Boxes class="h-4 w-4 stroke-[1.75]" />
              <span>Todos los Envasados ({{ productionStore.totalPackagings }})</span>
            </button>

            <!-- 2. Disponibles -->
            <button
              type="button"
              @click="handleSelectPackagingChip('DISPONIBLE')"
              class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition-all"
              :class="
                productionStore.packagingChip === 'DISPONIBLE'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              "
            >
              <Timer class="h-4 w-4 stroke-[1.75]" />
              <span>Disponibles con Stock</span>
            </button>

            <!-- 3. Agotados -->
            <button
              type="button"
              @click="handleSelectPackagingChip('AGOTADO')"
              class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition-all"
              :class="
                productionStore.packagingChip === 'AGOTADO'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              "
            >
              <AlertTriangle class="h-4 w-4 stroke-[1.75]" />
              <span>Agotados / Sin Stock</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Tarjetas de Fracciones Envasadas (Fase B) con v-auto-animate -->
      <div v-auto-animate class="space-y-4">
        <!-- Estado Vacío -->
        <div
          v-if="productionStore.packagings.length === 0"
          class="rounded-3xl border border-dashed border-surface-light-border bg-surface-light-card p-10 text-center dark:border-surface-dark-border dark:bg-surface-dark-card"
        >
          <PackageCheck class="mx-auto h-12 w-12 text-slate-400 stroke-[1.5]" />
          <h3 class="mt-3 text-base font-extrabold text-slate-900 dark:text-white">
            No hay fracciones envasadas registradas
          </h3>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Ve a la pestaña "Fase A · Lotes Base" y presiona "Envasar / Fraccionar" en un lote disponible.
          </p>
        </div>

        <!-- Tarjetas de Fracción Envasada -->
        <div
          v-for="pkg in productionStore.packagings"
          :key="pkg.id"
          class="rounded-3xl border border-surface-light-border bg-surface-light-card p-5 sm:p-6 shadow-card transition-all hover:border-slate-300 dark:border-surface-dark-border dark:bg-surface-dark-card"
        >
          <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <!-- Cabecera de la Fracción -->
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <span class="rounded-xl bg-purple-50 px-3 py-1 font-mono text-xs font-black text-purple-800 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40">
                  {{ pkg.packagingCode || `FRAC-${pkg.id}` }}
                </span>

                <span class="rounded-xl bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  Lote: {{ pkg.batch?.batchCode || pkg.batchCode || 'N/A' }}
                </span>

                <span class="text-base font-extrabold text-slate-900 dark:text-white sm:text-lg">
                  {{ pkg.flavor }}
                </span>

                <!-- Badge Dinámico de Disponibilidad -->
                <span
                  class="rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider"
                  :class="
                    pkg.status === 'AGOTADO' || pkg.freeLiters <= 0
                      ? 'border border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      : 'border border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                  "
                >
                  {{ pkg.status === 'AGOTADO' || pkg.freeLiters <= 0 ? 'Agotado' : `Disponible (${pkg.freeLiters} L)` }}
                </span>
              </div>

              <!-- Metadatos de la Fracción -->
              <div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span>Envasado: {{ formatDate(pkg.packagedAt) }}</span>
                <span v-if="pkg.packagedBy">• Por: {{ pkg.packagedBy }}</span>
                <span v-if="pkg.linkedOrdersCount" class="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-black text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                  {{ pkg.linkedOrdersCount }} pedido(s) vinculado(s)
                </span>
              </div>

              <p v-if="pkg.notes" class="mt-1.5 text-xs text-slate-500 dark:text-slate-400 italic">
                "{{ pkg.notes }}"
              </p>
            </div>

            <!-- Desglose de Presentaciones y Litros -->
            <div class="flex flex-col sm:items-end">
              <div class="text-right">
                <span class="text-xs font-bold text-slate-400">Volumen Fracción:</span>
                <div class="text-xl font-black text-purple-700 dark:text-purple-300 sm:text-2xl">
                  {{ pkg.totalLiters }} Litros
                </div>
              </div>

              <div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold text-slate-500">
                <span>Costo: <strong class="text-slate-900 dark:text-white">{{ formatCOP(pkg.fractionCostPerLiter) }}/L</strong></span>
                <span v-if="pkg.profitPerLiter" class="inline-flex items-center gap-1 font-black text-emerald-600 dark:text-emerald-400">
                  <TrendingUp class="h-3.5 w-3.5 stroke-[2.5]" />
                  <span>Ganancia/L: +{{ formatCOP(pkg.profitPerLiter) }}</span>
                  <span v-if="pkg.profitMarginPercent" class="rounded-md bg-emerald-100 px-1.5 py-0.2 text-[10px] font-extrabold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                    {{ pkg.profitMarginPercent }}%
                  </span>
                </span>
              </div>
            </div>
          </div>

          <!-- Desglose Visual de Presentaciones -->
          <div class="mt-4 flex flex-wrap gap-2">
            <template v-if="pkg.presentations && pkg.presentations.length > 0">
              <div
                v-for="(pres, idx) in pkg.presentations"
                :key="idx"
                class="flex items-center gap-2 rounded-xl border border-slate-200 bg-surface-light-canvas px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-surface-dark-canvas"
              >
                <Tag class="h-3.5 w-3.5 text-brand-800 dark:text-brand-darkText" />
                <span class="font-extrabold text-slate-800 dark:text-white">
                  {{ pres.containerName }}:
                </span>
                <span class="font-black text-emerald-600 dark:text-emerald-400">
                  {{ pres.quantity }} unds ({{ pres.free }} libres)
                </span>
                <span class="text-[10px] font-semibold text-slate-400">
                  • {{ formatCOP(pres.price) }}
                </span>
                <span
                  v-if="pres.profitPerLiter"
                  class="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-black text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                  title="Ganancia neta estimada por litro en esta presentación"
                >
                  +{{ formatCOP(pres.profitPerLiter) }}/L
                </span>
              </div>
            </template>
            <template v-else>
              <div v-if="pkg.bottles1L > 0" class="flex items-center gap-2 rounded-xl border border-slate-200 bg-surface-light-canvas px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-surface-dark-canvas">
                <Tag class="h-3.5 w-3.5 text-brand-800 dark:text-brand-darkText" />
                <span class="font-extrabold">1 Litro:</span>
                <span class="font-black text-emerald-600">{{ pkg.bottles1L }} unds</span>
                <span class="text-[10px] text-slate-400">• {{ formatCOP(pkg.price1L || 12000) }}</span>
              </div>
              <div v-if="pkg.bottles2L > 0" class="flex items-center gap-2 rounded-xl border border-slate-200 bg-surface-light-canvas px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-surface-dark-canvas">
                <Tag class="h-3.5 w-3.5 text-brand-800 dark:text-brand-darkText" />
                <span class="font-extrabold">2 Litros:</span>
                <span class="font-black text-emerald-600">{{ pkg.bottles2L }} unds</span>
                <span class="text-[10px] text-slate-400">• {{ formatCOP(pkg.price2L || 24000) }}</span>
              </div>
            </template>
          </div>

          <!-- Barra Reactiva de Salidas Comerciales (Fase B) -->
          <div class="mt-4 space-y-2 border-t border-surface-light-border pt-4 dark:border-surface-dark-border">
            <div class="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
              <span>
                Comercializado / Retirado:
                {{ ((pkg.soldLiters || 0) + (pkg.dischargedLiters || 0)).toFixed(2) }} L
                ({{ pkg.progressPercentage }}%)
                <span class="text-slate-400 font-semibold">
                  / Total Fracción: {{ pkg.totalLiters }} L ({{ (pkg.freeLiters || 0).toFixed(2) }} L disponibles)
                </span>
              </span>
              <span class="font-black" :class="pkg.freeLiters <= 0 ? 'text-amber-600' : 'text-emerald-600'">
                {{ pkg.freeLiters <= 0 ? 'Agotado' : `${(pkg.freeLiters || 0).toFixed(2)} L en Stock` }}
              </span>
            </div>

            <div class="h-2.5 w-full overflow-hidden rounded-full bg-surface-light-canvas dark:bg-surface-dark-canvas border border-surface-light-border dark:border-surface-dark-border">
              <div
                class="h-full rounded-full transition-all duration-500"
                :class="pkg.freeLiters <= 0 ? 'bg-amber-500' : 'bg-emerald-500'"
                :style="{ width: `${Math.min(100, pkg.progressPercentage)}%` }"
              ></div>
            </div>
          </div>

          <!-- Acciones por Fracción Envasada -->
          <div class="mt-4 border-t border-surface-light-border pt-3 dark:border-surface-dark-border">
            <div class="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center md:justify-end">
              <!-- Acción Principal: Auditoría Exclusiva de Fracción -->
              <button
                type="button"
                @click="openPackagingSummaryModal(pkg.id)"
                class="inline-flex h-9 w-full md:w-auto items-center justify-center gap-1.5 rounded-xl bg-brand-900 px-3.5 text-xs font-extrabold text-white shadow-sm transition-transform active:scale-95 hover:bg-brand-950 dark:bg-white dark:text-slate-900"
                title="Auditoría de presentaciones, pedidos vinculados y retiros de socios"
              >
                <Eye class="h-3.5 w-3.5 shrink-0 stroke-[2]" />
                <span>Auditoría de Fracción</span>
              </button>

              <!-- Fila Secundaria: Editar y Eliminar en cuadrícula simétrica en móvil y horizontal en desktop -->
              <div class="grid grid-cols-2 gap-2 w-full md:w-auto md:flex md:items-center">
                <!-- Acción Editar Fracción -->
                <button
                  type="button"
                  @click="handleEditPackagingFromCard(pkg)"
                  class="inline-flex h-9 w-full md:w-auto items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-surface-dark-canvas dark:text-slate-300"
                  title="Editar presentaciones y parámetros del envasado"
                >
                  <Pencil class="h-3.5 w-3.5 shrink-0 text-slate-500" />
                  <span class="truncate">Editar</span>
                </button>

                <!-- Acción Eliminar Fracción (con confirmación destructiva) -->
                <button
                  type="button"
                  @click="handleDeletePackaging(pkg)"
                  class="inline-flex h-9 w-full md:w-auto items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 text-xs font-bold text-rose-700 transition-colors hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300 dark:hover:bg-rose-900/40"
                  title="Eliminar fracción y reintegrar litros al lote madre e insumos al inventario"
                >
                  <Trash2 class="h-3.5 w-3.5 shrink-0 stroke-[2]" />
                  <span class="truncate">Eliminar</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Barra de Paginación Institucional Fase B (Estricta a 5 fracciones por página) -->
      <div
        v-if="productionStore.totalPackagings > 0"
        class="flex flex-col items-center justify-between gap-3 rounded-2xl border border-surface-light-border bg-surface-light-card p-4 shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card sm:flex-row"
      >
        <div class="text-xs font-bold text-slate-600 dark:text-slate-400">
          Página
          <span class="font-black text-slate-900 dark:text-white">{{ productionStore.packagingCurrentPage }}</span>
          de
          <span class="font-black text-slate-900 dark:text-white">{{ productionStore.totalPackagingPages }}</span>
          <span class="ml-1 text-slate-400">({{ productionStore.totalPackagings }} fracciones envasadas en total)</span>
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            @click="productionStore.goToPackagingPage(productionStore.packagingCurrentPage - 1)"
            :disabled="productionStore.packagingCurrentPage <= 1 || productionStore.isLoadingPackagings"
            class="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm transition-all active:scale-95 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed dark:border-slate-700 dark:bg-surface-dark-canvas dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <ChevronLeft class="h-4 w-4" />
            <span>Anterior</span>
          </button>

          <button
            type="button"
            @click="productionStore.goToPackagingPage(productionStore.packagingCurrentPage + 1)"
            :disabled="productionStore.packagingCurrentPage >= productionStore.totalPackagingPages || productionStore.isLoadingPackagings"
            class="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm transition-all active:scale-95 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed dark:border-slate-700 dark:bg-surface-dark-canvas dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <span>Siguiente</span>
            <ChevronRight class="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>

    <!-- ============================================== -->
    <!-- MODALES DE CONTROL Y AUDITORÍA                 -->
    <!-- ============================================== -->
    <BatchModal
      v-model:open="isBatchModalOpen"
      :batch-to-edit="selectedBatchToEdit"
      @saved="productionStore.fetchBatches(productionStore.currentPage)"
    />

    <FlavorsManagementModal v-model:open="isFlavorsModalOpen" />

    <PackagingModal
      v-model:open="isPackagingModalOpen"
      :batch="selectedBatchForPackaging"
      :packaging-to-edit="selectedPackagingToEdit"
      @packaged="handlePackagingSaved"
    />

    <BatchSummaryModal
      v-model:open="isSummaryModalOpen"
      :batch-id="selectedBatchIdForSummary"
      @updated="handlePackagingSaved"
      @edit-packaging="handleEditPackaging"
    />

    <PackagingSummaryModal
      v-model:open="isPackagingSummaryModalOpen"
      :packaging-id="selectedPackagingIdForSummary"
      @updated="handlePackagingSummaryUpdated"
    />

    <CompleteFermentationModal
      v-model:open="isCompleteModalOpen"
      :batch="selectedBatchForCompletion"
      @completed="productionStore.fetchBatches(productionStore.currentPage)"
    />
  </div>
</template>

<style scoped>
.scrollbar-none {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.scrollbar-none::-webkit-scrollbar {
  display: none;
}
</style>
