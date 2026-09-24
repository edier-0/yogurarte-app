<script setup lang="ts">
import { ref, onMounted } from 'vue';
import {
  FlaskConical,
  Milk,
  TrendingUp,
  Boxes,
  Timer,
  AlertTriangle,
  Archive,
  Plus,
  Search,
  CheckCircle2,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-vue-next';
import { useProductionStore, type BatchItem } from '@/stores/production.store';
import BatchModal from '@/components/production/BatchModal.vue';
import FlavorsManagementModal from '@/components/production/FlavorsManagementModal.vue';

const productionStore = useProductionStore();
const isBatchModalOpen = ref(false);
const isFlavorsModalOpen = ref(false);

onMounted(() => {
  productionStore.fetchBatches();
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

// Acciones sobre lote
function handleFinishFermentation(batch: BatchItem) {
  const produced = window.prompt(
    `Ingresa los litros finales obtenidos para el lote ${batch.batchCode} (Leche usada: ${batch.milkUsedLiters}L):`,
    String(batch.totalLitersProduced || batch.milkUsedLiters)
  );
  if (!produced) return;
  const num = Number(produced);
  if (isNaN(num) || num <= 0) return;
  productionStore.finishFermentation(batch.id, num);
}

function handleAdjustLiters(batch: BatchItem) {
  const newLiters = window.prompt(
    `Ajustar litros totales producidos para el lote ${batch.batchCode}:`,
    String(batch.totalLitersProduced)
  );
  if (!newLiters) return;
  const num = Number(newLiters);
  if (isNaN(num) || num < 0) return;
  productionStore.adjustBatchLiters(batch.id, num);
}
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
          Control de fermentación, trazabilidad de leche, descargos de mermas y costos por litro.
        </p>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          @click="productionStore.fetchBatches"
          :disabled="productionStore.isLoading"
          class="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-surface-light-card px-3 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition-all active:scale-95 hover:bg-slate-50 dark:border-slate-700 dark:bg-surface-dark-card dark:text-slate-200"
          title="Actualizar lotes"
        >
          <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': productionStore.isLoading }" />
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
          @click="isBatchModalOpen = true"
          class="inline-flex items-center gap-2 rounded-xl bg-hero-gradient px-4 py-2.5 text-xs font-extrabold text-white shadow-card transition-transform active:scale-95"
        >
          <Plus class="h-4 w-4 stroke-[2.5]" />
          <span>Registrar Lote</span>
        </button>
      </div>
    </div>

    <!-- 1. Métricas Superiores de Producción -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <!-- Litros en Fermentación -->
      <div class="rounded-2xl border border-surface-light-border bg-surface-light-card p-5 shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card">
        <span class="text-xs font-bold uppercase tracking-wider text-slate-400">
          Litros en Fermentación
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

      <!-- Yogur Terminado Disponible -->
      <div class="rounded-2xl border border-surface-light-border bg-surface-light-card p-5 shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card">
        <span class="text-xs font-bold uppercase tracking-wider text-natural-500">
          Yogur Terminado Disponible
        </span>
        <div class="mt-2 flex items-baseline justify-between">
          <span class="text-2xl font-black text-natural-500 sm:text-3xl">
            {{ productionStore.finishedYogurtLiters }} L
          </span>
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-natural-50 text-natural-500 dark:bg-emerald-950/40 dark:text-emerald-400">
            <Milk class="h-5 w-5 stroke-[1.75]" />
          </div>
        </div>
        <span class="mt-1 block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
          Stock listo para empaque y venta
        </span>
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

    <!-- 2. Barra de Filtros Ergonómica y Buscador -->
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
            @click="productionStore.activeChip = 'ALL'"
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
            @click="productionStore.activeChip = 'ACTIVE'"
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
            @click="productionStore.activeChip = 'DEPLETED'"
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
            @click="productionStore.activeChip = 'ARCHIVED'"
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

    <!-- 3. Tarjetas de Lote con v-auto-animate -->
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
          Inicia un nuevo lote de producción presionando el botón "Registrar Lote".
        </p>
      </div>

      <!-- Tarjetas de Lote -->
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

              <!-- Badge de Estado -->
              <span
                class="rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider"
                :class="
                  batch.status === 'EN_FERMENTACION'
                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300'
                    : batch.status === 'DISPONIBLE' && batch.remainingAvailableLiters > 0
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : batch.status === 'AGOTADO' || batch.remainingAvailableLiters <= 0
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                "
              >
                {{
                  batch.status === 'EN_FERMENTACION'
                    ? 'En Fermentación'
                    : batch.remainingAvailableLiters > 0
                    ? 'Disponible'
                    : 'Agotado'
                }}
              </span>
            </div>

            <!-- Fechas -->
            <div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span>Elaborado: {{ formatDate(batch.preparationDate) }}</span>
              <span>•</span>
              <span>Vencimiento: {{ formatDate(batch.expirationDate) }}</span>
              <span v-if="batch.registeredBy">• Por: {{ batch.registeredBy }}</span>
            </div>

            <p v-if="batch.notes" class="mt-1.5 text-xs text-slate-500 dark:text-slate-400 italic">
              "{{ batch.notes }}"
            </p>
          </div>

          <!-- Métricas de Litros y Merma -->
          <div class="flex flex-col sm:items-end">
            <div class="text-right">
              <span class="text-xs font-bold text-slate-400">Disponible:</span>
              <div class="text-xl font-black text-natural-500 sm:text-2xl">
                {{ batch.remainingAvailableLiters }} L
                <span class="text-xs font-normal text-slate-400">/ {{ batch.totalLitersProduced }} L</span>
              </div>
            </div>

            <div class="mt-1 flex items-center gap-2 text-xs font-bold text-slate-500">
              <span>Rendimiento:</span>
              <span class="font-extrabold text-dairy-500">
                {{
                  batch.yieldPercentage ||
                  Math.round((batch.totalLitersProduced / (batch.milkUsedLiters || 1)) * 1000) / 10
                }}%
              </span>
              <span class="text-slate-300">•</span>
              <span class="text-slate-400">
                Merma: {{ Math.max(0, batch.milkUsedLiters - batch.totalLitersProduced) }} L
              </span>
            </div>
          </div>
        </div>

        <!-- Barra de Progreso Visual de Volumen -->
        <div class="mt-5 space-y-2 border-t border-surface-light-border pt-4 dark:border-surface-dark-border">
          <div class="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
            <span>
              Consumido:
              {{ (batch.totalSoldLiters || 0) + (batch.totalDischargedLiters || 0) }} L
              ({{
                Math.round(
                  (((batch.totalSoldLiters || 0) + (batch.totalDischargedLiters || 0)) /
                    (batch.totalLitersProduced || 1)) *
                    100
                )
              }}%)
            </span>
            <span>Leche Utilizada: {{ batch.milkUsedLiters }} L</span>
          </div>

          <div class="h-2.5 w-full overflow-hidden rounded-full bg-surface-light-canvas dark:bg-surface-dark-canvas border border-surface-light-border dark:border-surface-dark-border">
            <div
              class="h-full rounded-full transition-all duration-500"
              :class="
                batch.remainingAvailableLiters <= 0
                  ? 'bg-slate-400'
                  : batch.status === 'EN_FERMENTACION'
                  ? 'bg-purple-500'
                  : 'bg-hero-gradient'
              "
              :style="{
                width: `${Math.min(
                  100,
                  Math.round(
                    ((batch.remainingAvailableLiters) / (batch.totalLitersProduced || 1)) * 100
                  )
                )}%`,
              }"
            ></div>
          </div>
        </div>

        <!-- Acciones Directas por Tarjeta -->
        <div class="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-surface-light-border pt-3 dark:border-surface-dark-border">
          <!-- Finalizar Fermentación -->
          <button
            v-if="batch.status === 'EN_FERMENTACION'"
            type="button"
            @click="handleFinishFermentation(batch)"
            class="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-3.5 py-1.5 text-xs font-extrabold text-white shadow-sm transition-transform active:scale-95 hover:bg-purple-700"
          >
            <CheckCircle2 class="h-3.5 w-3.5 stroke-[2.5]" />
            <span>Finalizar Fermentación</span>
          </button>

          <!-- Ajustar Litros -->
          <button
            type="button"
            @click="handleAdjustLiters(batch)"
            class="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-surface-dark-canvas dark:text-slate-300"
          >
            <SlidersHorizontal class="h-3.5 w-3.5 text-slate-500" />
            <span>Ajustar Litros</span>
          </button>

          <!-- Archivar Lote -->
          <button
            v-if="batch.isActive !== false && batch.status !== 'ARCHIVADO'"
            type="button"
            @click="productionStore.archiveBatch(batch.id)"
            class="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-surface-dark-canvas dark:text-slate-400 hover:text-slate-900"
          >
            <Archive class="h-3.5 w-3.5" />
            <span>Archivar</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Modal de Registro de Lote -->
    <BatchModal
      v-model:open="isBatchModalOpen"
      @saved="productionStore.fetchBatches"
    />

    <!-- Modal de Catálogo de Sabores -->
    <FlavorsManagementModal v-model:open="isFlavorsModalOpen" />
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
