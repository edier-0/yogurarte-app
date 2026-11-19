<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { recipesApi, type SimulationResponse, type RecipeItem } from '@/api/recipes';
import { useProductionStore } from '@/stores/production.store';
import {
  TrendingUp,
  Package,
  AlertCircle,
  RefreshCw,
} from 'lucide-vue-next';

const props = defineProps<{
  recipe: RecipeItem;
}>();

const productionStore = useProductionStore();

const selectedPresentationId = ref<number | null>(null);
const isLoading = ref<boolean>(false);
const simulationData = ref<SimulationResponse | null>(null);
const errorMessage = ref<string | null>(null);

// Presentaciones activas disponibles
const activePresentations = computed(() => {
  return productionStore.presentations.filter((p) => p.isActive);
});

// Cargar simulacion al cambiar de presentación seleccionada
async function runSimulation(presentationId: number) {
  if (!presentationId) return;
  isLoading.value = true;
  errorMessage.value = null;
  try {
    const res = await recipesApi.simulatePresentation(props.recipe.id, presentationId);
    simulationData.value = res;
  } catch (err: any) {
    console.error('Error simulando rentabilidad:', err);
    errorMessage.value = err?.response?.data?.message || 'Error al calcular la simulación de rentabilidad.';
    simulationData.value = null;
  } finally {
    isLoading.value = false;
  }
}

watch(selectedPresentationId, (newId) => {
  if (newId) {
    runSimulation(newId);
  }
});

onMounted(async () => {
  if (productionStore.presentations.length === 0) {
    await productionStore.fetchPresentations(true);
  }
  // Seleccionar la primera presentación activa por defecto (ej. 1 Litro si existe)
  if (activePresentations.value.length > 0) {
    const oneLiter = activePresentations.value.find((p) => p.capacityLiters === 1);
    selectedPresentationId.value = oneLiter ? oneLiter.id : activePresentations.value[0].id;
  }
});

const formatCurrency = (val?: number | null) => {
  if (val === null || val === undefined) return '$0';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(val);
};

// Clases CSS del semáforo visual de margen
const marginStatusBadge = computed(() => {
  if (!simulationData.value?.marginStatus) return null;
  switch (simulationData.value.marginStatus) {
    case 'GREEN':
      return {
        bg: 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300',
        dot: 'bg-emerald-500',
        label: 'Margen Saludable (≥ 40%)',
      };
    case 'YELLOW':
      return {
        bg: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300',
        dot: 'bg-amber-500',
        label: 'Margen Moderado (25% - 39.9%)',
      };
    case 'RED':
      return {
        bg: 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300',
        dot: 'bg-rose-500',
        label: 'Margen Bajo (< 25%)',
      };
    default:
      return null;
  }
});
</script>

<template>
  <div class="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 sm:p-5">
    <!-- Header del Simulador -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex items-center gap-2.5">
        <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400">
          <TrendingUp class="h-5 w-5" />
        </div>
        <div>
          <h3 class="text-sm font-bold text-slate-900 dark:text-white sm:text-base">
            Simulador de Rentabilidad por Presentación
          </h3>
          <p class="text-xs text-slate-500 dark:text-slate-400">
            Evalúa el costo de líquido, envase con tapa integrada y etiqueta contra el PVP oficial.
          </p>
        </div>
      </div>

      <!-- Selector de Presentación -->
      <div class="flex items-center gap-2">
        <label for="presentation-select" class="text-xs font-semibold text-slate-600 dark:text-slate-400">
          Presentación:
        </label>
        <select
          id="presentation-select"
          v-model="selectedPresentationId"
          class="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-900 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        >
          <option v-for="p in activePresentations" :key="p.id" :value="p.id">
            {{ p.name }} ({{ p.label || p.capacityLiters + ' L' }})
          </option>
        </select>
      </div>
    </div>

    <!-- Spinner de Carga -->
    <div v-if="isLoading" class="flex flex-col items-center justify-center py-10">
      <RefreshCw class="h-6 w-6 animate-spin text-purple-600 mb-2" />
      <span class="text-xs text-slate-500">Calculando proyección de costos y márgenes...</span>
    </div>

    <!-- Error al simular -->
    <div
      v-else-if="errorMessage"
      class="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300"
    >
      <AlertCircle class="h-4 w-4 shrink-0 mt-0.5" />
      <span>{{ errorMessage }}</span>
    </div>

    <!-- Resultados de la Simulación -->
    <div v-else-if="simulationData" class="space-y-4">
      <!-- Tarjetas de Resumen Económico -->
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <!-- Costo Líquido -->
        <div class="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/40">
          <div class="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Costo Líquido</div>
          <div class="mt-1 text-base font-black text-slate-900 dark:text-white">
            {{ formatCurrency(simulationData.liquidCost) }}
          </div>
          <div class="text-[10px] text-slate-400">
            Base + fruta para {{ simulationData.presentation.capacityLiters }} L
          </div>
        </div>

        <!-- Costo Empaques -->
        <div class="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/40">
          <div class="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Costo Empaque</div>
          <div class="mt-1 text-base font-black text-slate-900 dark:text-white">
            {{ formatCurrency(simulationData.packagingCost) }}
          </div>
          <div class="text-[10px] text-slate-400">
            Botella (con tapa) + Etiqueta
          </div>
        </div>

        <!-- Costo Total Unidad -->
        <div class="rounded-xl border border-purple-200 bg-purple-50/70 p-3 dark:border-purple-900/40 dark:bg-purple-950/30">
          <div class="text-[11px] font-bold text-purple-700 dark:text-purple-300">Costo Total Unidad</div>
          <div class="mt-1 text-base font-black text-purple-900 dark:text-purple-200">
            {{ formatCurrency(simulationData.totalUnitCost) }}
          </div>
          <div class="text-[10px] text-purple-600/80 dark:text-purple-400">
            Líquido + Empaques
          </div>
        </div>

        <!-- Precio Oficial y Margen -->
        <div class="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/40">
          <div class="text-[11px] font-semibold text-slate-500 dark:text-slate-400">PVP Oficial</div>
          <div class="mt-1 text-base font-black text-emerald-700 dark:text-emerald-400">
            {{ formatCurrency(simulationData.defaultPrice) }}
          </div>
          <div class="text-[10px] text-slate-400">
            Precio de venta público
          </div>
        </div>
      </div>

      <!-- Banner de Semáforo de Margen y Utilidad Proyectada -->
      <div
        v-if="marginStatusBadge"
        class="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"
        :class="marginStatusBadge.bg"
      >
        <div class="flex items-center gap-2.5">
          <span class="h-3 w-3 rounded-full animate-pulse" :class="marginStatusBadge.dot"></span>
          <div>
            <div class="text-xs font-black uppercase tracking-wider">
              {{ marginStatusBadge.label }}
            </div>
            <div class="text-xs">
              Utilidad neta estimada por botella: <strong>{{ formatCurrency(simulationData.projectedProfit) }}</strong>
            </div>
          </div>
        </div>

        <div class="flex items-baseline gap-1.5 self-end sm:self-auto">
          <span class="text-xs font-semibold">Margen Bruto:</span>
          <span class="text-2xl font-black">
            {{ simulationData.marginPercentage?.toFixed(1) }}%
          </span>
        </div>
      </div>

      <!-- Desglose de Materiales de Empaque Resueltos -->
      <div class="rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 space-y-2">
        <h5 class="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          Desglose de Empaques Resueltos en Almacén
        </h5>

        <div class="space-y-1.5 text-xs">
          <div
            v-for="item in simulationData.packagingItems"
            :key="item.code"
            class="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/60"
          >
            <div class="flex items-center gap-2">
              <Package class="h-3.5 w-3.5 text-slate-400" />
              <div>
                <span class="font-bold text-slate-800 dark:text-slate-200">{{ item.name }}</span>
                <span class="ml-1 text-[11px] font-mono text-slate-400">({{ item.code }})</span>
                <span v-if="item.type === 'BOTELLA'" class="ml-1.5 text-[10px] text-purple-600 dark:text-purple-400 font-semibold">
                  [Tapa integrada]
                </span>
              </div>
            </div>

            <div class="text-right">
              <span v-if="item.cost !== undefined" class="font-mono font-bold text-slate-700 dark:text-slate-300">
                {{ formatCurrency(item.cost) }}
              </span>
              <span v-if="item.warning" class="block text-[10px] text-amber-600 dark:text-amber-400">
                {{ item.warning }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
