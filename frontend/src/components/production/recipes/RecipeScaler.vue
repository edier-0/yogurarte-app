<script setup lang="ts">
import { ref, computed } from 'vue';
import type { RecipeItem } from '@/api/recipes';
import { Calculator, AlertTriangle, Layers } from 'lucide-vue-next';

const props = defineProps<{
  recipe: RecipeItem;
  canViewCosts?: boolean;
}>();

// Rendimiento objetivo reactivo, inicializado en baseYield
const targetYield = ref<number>(props.recipe.baseYield);

// Factor de escala multiplicador
const scaleFactor = computed(() => {
  if (!props.recipe.baseYield || props.recipe.baseYield <= 0) return 1;
  const target = Number(targetYield.value);
  if (isNaN(target) || target <= 0) return 1;
  return target / props.recipe.baseYield;
});

// Litros de base láctea escalados (solo para Fase B)
const scaledBaseLiters = computed(() => {
  if (props.recipe.category !== 'FASE_B' || !props.recipe.baseLiters) return null;
  return Number((props.recipe.baseLiters * scaleFactor.value).toFixed(2));
});

// Ingredientes escalados
const scaledIngredients = computed(() => {
  return props.recipe.ingredients.map((ing) => {
    const rawScaled = ing.quantity * scaleFactor.value;
    const isPackaging = ing.rawMaterial?.category === 'EMPAQUE' || ing.unit.toLowerCase() === 'unidades';
    const finalQuantity = isPackaging ? Math.ceil(rawScaled) : Number(rawScaled.toFixed(2));
    
    // Cálculo de costo estimado si tiene permisos
    let estimatedCost: number | null = null;
    if (props.canViewCosts && ing.avgCost !== undefined) {
      estimatedCost = Number((finalQuantity * ing.avgCost).toFixed(0));
    }

    return {
      ...ing,
      scaledQuantity: finalQuantity,
      estimatedCost,
      isInactive: ing.rawMaterial?.isActive === false,
    };
  });
});

// Costo total escalado estimado (solo si canViewCosts)
const totalScaledCost = computed(() => {
  if (!props.canViewCosts) return null;
  let sum = 0;
  // Base láctea en Fase B
  if (props.recipe.category === 'FASE_B' && props.recipe.baseLitersCost && props.recipe.baseLiters) {
    const costPerLiter = props.recipe.baseLitersCost / props.recipe.baseLiters;
    sum += (scaledBaseLiters.value || 0) * costPerLiter;
  }
  // Ingredientes
  for (const item of scaledIngredients.value) {
    if (item.estimatedCost !== null) {
      sum += item.estimatedCost;
    }
  }
  return Math.round(sum);
});

// Formateador de moneda en pesos colombianos
const formatCurrency = (val?: number | null) => {
  if (val === null || val === undefined) return '$0';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(val);
};

// Reset al rendimiento base
const resetToBase = () => {
  targetYield.value = props.recipe.baseYield;
};
</script>

<template>
  <div class="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 sm:p-5">
    <!-- Header del Escalador -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex items-center gap-2.5">
        <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100 text-primary-700 dark:bg-primary-950/60 dark:text-primary-400">
          <Calculator class="h-5 w-5" />
        </div>
        <div>
          <h3 class="text-sm font-bold text-slate-900 dark:text-white sm:text-base">
            Escalador de Lote en Tiempo Real
          </h3>
          <p class="text-xs text-slate-500 dark:text-slate-400">
            Ajusta la cantidad deseada y obtén la dosificación exacta para la paila.
          </p>
        </div>
      </div>

      <!-- Controles de Escala -->
      <div class="flex items-center gap-2">
        <div class="relative flex items-center">
          <input
            v-model.number="targetYield"
            type="number"
            min="0.1"
            step="any"
            class="w-32 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-right text-sm font-black text-slate-900 focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            placeholder="0"
          />
          <span class="ml-2 text-xs font-bold text-slate-600 dark:text-slate-300">
            {{ recipe.yieldUnit }}
          </span>
        </div>

        <button
          v-if="targetYield !== recipe.baseYield"
          type="button"
          @click="resetToBase"
          class="rounded-xl border border-slate-200 px-2.5 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          title="Restablecer a fórmula base"
        >
          Reset
        </button>
      </div>
    </div>

    <!-- Multiplicador y datos de referencia -->
    <div class="flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 px-3.5 py-2.5 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
      <span class="font-semibold">Factor de escala:</span>
      <span class="rounded-md bg-white px-2 py-0.5 font-mono font-bold text-primary-600 shadow-2xs dark:bg-slate-900 dark:text-primary-400">
        {{ scaleFactor.toFixed(3) }}x
      </span>
      <span class="text-slate-400">•</span>
      <span>Base de receta: <strong>{{ recipe.baseYield }} {{ recipe.yieldUnit }}</strong></span>
      
      <!-- Si es Fase B, mostrar litros de base requerida -->
      <template v-if="recipe.category === 'FASE_B' && scaledBaseLiters !== null">
        <span class="text-slate-400">•</span>
        <span class="flex items-center gap-1 font-semibold text-purple-700 dark:text-purple-400">
          <Layers class="h-3.5 w-3.5" />
          Base láctea requerida: <strong>{{ scaledBaseLiters }} L</strong>
        </span>
      </template>

      <!-- Costo total de la tanda si tiene permisos -->
      <template v-if="canViewCosts && totalScaledCost !== null">
        <span class="ml-auto font-semibold text-emerald-700 dark:text-emerald-400">
          Costo tanda: <strong class="text-sm font-black">{{ formatCurrency(totalScaledCost) }}</strong>
        </span>
      </template>
    </div>

    <!-- Advertencia si hay insumos inactivos -->
    <div
      v-if="scaledIngredients.some((i) => i.isInactive)"
      class="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300"
    >
      <AlertTriangle class="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
      <span>
        Uno o más insumos de esta receta están marcados como <strong>inactivos</strong> en el inventario. Verifícalos antes de ordenar la preparación en planta.
      </span>
    </div>

    <!-- Tabla de Dosificación Escalada -->
    <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
      <table class="w-full text-left text-xs">
        <thead class="bg-slate-50 font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-800/80 dark:text-slate-400">
          <tr>
            <th class="px-3.5 py-2.5">Insumo / Materia Prima</th>
            <th class="px-3.5 py-2.5 text-right">Cant. Base</th>
            <th class="px-3.5 py-2.5 text-right font-black text-primary-700 dark:text-primary-300">
              Dosificación Escalada
            </th>
            <th v-if="canViewCosts" class="px-3.5 py-2.5 text-right">Costo Estimado</th>
            <th class="px-3.5 py-2.5">Notas de Adición</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
          <!-- Si es Fase B, mostrar fila destacada de Base Láctea -->
          <tr v-if="recipe.category === 'FASE_B' && recipe.baseLiters" class="bg-purple-50/50 dark:bg-purple-950/20">
            <td class="px-3.5 py-3 font-semibold text-purple-900 dark:text-purple-200">
              <div class="flex items-center gap-1.5">
                <span class="inline-block h-2 w-2 rounded-full bg-purple-500"></span>
                <span>Base Láctea Fermentada (Fase A)</span>
              </div>
            </td>
            <td class="px-3.5 py-3 text-right font-mono text-slate-600 dark:text-slate-400">
              {{ recipe.baseLiters }} L
            </td>
            <td class="px-3.5 py-3 text-right font-mono font-black text-purple-700 dark:text-purple-300">
              {{ scaledBaseLiters }} L
            </td>
            <td v-if="canViewCosts" class="px-3.5 py-3 text-right font-mono font-bold text-slate-700 dark:text-slate-300">
              <template v-if="recipe.baseLitersCost">
                {{ formatCurrency(Math.round((recipe.baseLitersCost / recipe.baseLiters) * (scaledBaseLiters || 0))) }}
              </template>
              <span v-else class="text-slate-400">$0</span>
            </td>
            <td class="px-3.5 py-3 text-slate-500 dark:text-slate-400">
              Extraer del tanque madre a 4 °C - 6 °C antes de batir
            </td>
          </tr>

          <!-- Lista de ingredientes de receta -->
          <tr
            v-for="item in scaledIngredients"
            :key="item.id || item.rawMaterialId"
            class="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
            :class="{ 'opacity-60 bg-amber-50/30': item.isInactive }"
          >
            <td class="px-3.5 py-3">
              <div class="font-bold text-slate-900 dark:text-white">
                {{ item.rawMaterial?.name || 'Insumo #' + item.rawMaterialId }}
              </div>
              <div class="text-[11px] font-mono text-slate-400">
                {{ item.rawMaterial?.code }}
                <span v-if="item.isInactive" class="ml-1 text-amber-600 dark:text-amber-400 font-sans font-bold">
                  (Inactivo en almacén)
                </span>
              </div>
            </td>
            <td class="px-3.5 py-3 text-right font-mono text-slate-600 dark:text-slate-400">
              {{ item.quantity }} {{ item.unit }}
            </td>
            <td class="px-3.5 py-3 text-right font-mono font-black text-primary-700 dark:text-primary-400">
              <span class="rounded bg-primary-50 px-2 py-0.5 dark:bg-primary-950/40">
                {{ item.scaledQuantity }} {{ item.unit }}
              </span>
            </td>
            <td v-if="canViewCosts" class="px-3.5 py-3 text-right font-mono font-semibold text-slate-700 dark:text-slate-300">
              {{ formatCurrency(item.estimatedCost) }}
            </td>
            <td class="px-3.5 py-3 text-slate-500 dark:text-slate-400">
              {{ item.notes || '—' }}
            </td>
          </tr>

          <tr v-if="scaledIngredients.length === 0 && recipe.category !== 'FASE_B'">
            <td colspan="5" class="px-3.5 py-6 text-center text-slate-400">
              No se han registrado ingredientes en la receta base.
            </td>
          </tr>
          <tr v-else-if="scaledIngredients.length === 0 && recipe.category === 'FASE_B'">
            <td colspan="5" class="px-3.5 py-4 text-center text-slate-500 dark:text-slate-400">
              Receta de yogur natural puro: No requiere ingredientes adicionales de almacén.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
