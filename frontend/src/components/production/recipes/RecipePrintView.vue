<script setup lang="ts">
import { computed } from 'vue';
import type { RecipeItem } from '@/api/recipes';

const props = defineProps<{
  recipe: RecipeItem;
  scaledYield?: number;
}>();

const currentYield = computed(() => {
  return props.scaledYield && props.scaledYield > 0 ? props.scaledYield : props.recipe.baseYield;
});

const scaleFactor = computed(() => {
  if (!props.recipe.baseYield || props.recipe.baseYield <= 0) return 1;
  return currentYield.value / props.recipe.baseYield;
});

const scaledBaseLiters = computed(() => {
  if (props.recipe.category !== 'FASE_B' || !props.recipe.baseLiters) return null;
  return Number((props.recipe.baseLiters * scaleFactor.value).toFixed(2));
});

const formattedDate = computed(() => {
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());
});

const sortedSteps = computed(() => {
  return [...props.recipe.steps].sort((a, b) => a.stepNumber - b.stepNumber);
});

const formatMinutes = (mins?: number | null) => {
  if (!mins) return '—';
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const remaining = mins % 60;
  return remaining > 0 ? `${hours} h ${remaining} min` : `${hours} h`;
};
</script>

<template>
  <div class="print-container bg-white text-black p-6 font-sans">
    <!-- Encabezado Oficial de Planta -->
    <div class="border-b-2 border-black pb-4 mb-4 flex justify-between items-start">
      <div>
        <h1 class="text-xl font-black uppercase tracking-tight">YOGURARTE — FONSECA, LA GUAJIRA</h1>
        <h2 class="text-sm font-bold uppercase tracking-wider text-slate-700">
          FICHA TÉCNICA Y PROCEDIMIENTO OPERATIVO ESTÁNDAR (SOP)
        </h2>
        <div class="text-xs mt-1 text-slate-600">
          Documento maestro de producción en planta láctea
        </div>
      </div>
      <div class="text-right text-xs">
        <div><strong>Código:</strong> {{ recipe.code }}</div>
        <div><strong>Emisión:</strong> {{ formattedDate }}</div>
        <div><strong>Estado:</strong> {{ recipe.status }}</div>
      </div>
    </div>

    <!-- Metadatos de la Receta -->
    <div class="grid grid-cols-2 gap-4 border border-black p-3 mb-4 text-xs">
      <div>
        <div><strong>Nombre de la Receta:</strong> {{ recipe.name }}</div>
        <div><strong>Categoría:</strong> {{ recipe.category }}</div>
        <div v-if="recipe.flavor"><strong>Sabor:</strong> {{ recipe.flavor }}</div>
        <div v-if="recipe.description" class="mt-1">
          <strong>Descripción:</strong> {{ recipe.description }}
        </div>
      </div>
      <div>
        <div>
          <strong>Tanda Programada:</strong> {{ currentYield }} {{ recipe.yieldUnit }}
          <span v-if="currentYield !== recipe.baseYield" class="text-slate-600">
            (Escalado {{ scaleFactor.toFixed(3) }}x desde base {{ recipe.baseYield }} {{ recipe.yieldUnit }})
          </span>
        </div>
        <div v-if="recipe.category === 'FASE_B' && scaledBaseLiters !== null">
          <strong>Base Láctea Necesaria (Fase A):</strong> {{ scaledBaseLiters }} Litros
        </div>
        <div><strong>Pasos Totales:</strong> {{ recipe.steps.length }}</div>
      </div>
    </div>

    <!-- Tabla de Dosificación de Materias Primas -->
    <div class="mb-5">
      <h3 class="text-xs font-black uppercase tracking-wider mb-1 border-b border-black pb-0.5">
        1. DOSIFICACIÓN DE MATERIAS PRIMAS E INSUMOS
      </h3>
      <table class="w-full text-left text-xs border-collapse border border-black">
        <thead>
          <tr class="bg-slate-100 border-b border-black">
            <th class="border border-black p-1.5">Insumo</th>
            <th class="border border-black p-1.5 text-right">Cant. Base</th>
            <th class="border border-black p-1.5 text-right font-black">Dosificación Requerida</th>
            <th class="border border-black p-1.5">Instrucciones de Dosificación / Adición</th>
          </tr>
        </thead>
        <tbody>
          <!-- Fila de base láctea si es Fase B -->
          <tr v-if="recipe.category === 'FASE_B' && recipe.baseLiters">
            <td class="border border-black p-1.5 font-bold">Base Láctea Fermentada (Tanque Madre)</td>
            <td class="border border-black p-1.5 text-right">{{ recipe.baseLiters }} L</td>
            <td class="border border-black p-1.5 text-right font-black">{{ scaledBaseLiters }} L</td>
            <td class="border border-black p-1.5">Extraer a temperatura 4 °C - 6 °C antes de mezcla</td>
          </tr>

          <tr v-for="ing in recipe.ingredients" :key="ing.id || ing.rawMaterialId">
            <td class="border border-black p-1.5">
              <strong>{{ ing.rawMaterial?.name || 'Insumo #' + ing.rawMaterialId }}</strong>
              <span class="text-[10px] ml-1">({{ ing.rawMaterial?.code }})</span>
            </td>
            <td class="border border-black p-1.5 text-right">{{ ing.quantity }} {{ ing.unit }}</td>
            <td class="border border-black p-1.5 text-right font-black">
              {{ (ing.quantity * scaleFactor).toFixed(2) }} {{ ing.unit }}
            </td>
            <td class="border border-black p-1.5">{{ ing.notes || '—' }}</td>
          </tr>

          <tr v-if="recipe.ingredients.length === 0 && recipe.category !== 'FASE_B'">
            <td colspan="4" class="border border-black p-2 text-center text-slate-500">
              Sin ingredientes registrados
            </td>
          </tr>
          <tr v-else-if="recipe.ingredients.length === 0 && recipe.category === 'FASE_B'">
            <td colspan="4" class="border border-black p-2 text-center text-slate-500">
              Yogur Natural Puro: No requiere ingredientes adicionales de almacén.
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Secuencia SOP de Pasos -->
    <div class="mb-6">
      <h3 class="text-xs font-black uppercase tracking-wider mb-1 border-b border-black pb-0.5">
        2. PROCEDIMIENTO OPERATIVO Y CONTROLES CRÍTICOS
      </h3>
      <table class="w-full text-left text-xs border-collapse border border-black">
        <thead>
          <tr class="bg-slate-100 border-b border-black">
            <th class="border border-black p-1.5 w-8 text-center">#</th>
            <th class="border border-black p-1.5 w-1/4">Paso</th>
            <th class="border border-black p-1.5 w-1/6 text-center">Tiempo / Temperatura</th>
            <th class="border border-black p-1.5">Instrucciones y Control de Calidad</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="step in sortedSteps" :key="step.id || step.stepNumber">
            <td class="border border-black p-1.5 font-black text-center">{{ step.stepNumber }}</td>
            <td class="border border-black p-1.5 font-bold">{{ step.title }}</td>
            <td class="border border-black p-1.5 text-center">
              <div v-if="step.estimatedMinutes">{{ formatMinutes(step.estimatedMinutes) }}</div>
              <div v-if="step.temperatureTarget" class="font-bold">
                {{ step.temperatureTarget }} °C
              </div>
              <div v-if="step.temperatureMin && step.temperatureMax" class="text-[10px]">
                [{{ step.temperatureMin }} °C - {{ step.temperatureMax }} °C]
              </div>
            </td>
            <td class="border border-black p-1.5">
              <p class="mb-1">{{ step.description }}</p>
              <div v-if="step.qualityCheck" class="border border-black bg-slate-50 p-1 font-bold text-[11px]">
                [CONTROL CRÍTICO]: {{ step.qualityCheck }}
              </div>
            </td>
          </tr>
          <tr v-if="sortedSteps.length === 0">
            <td colspan="4" class="border border-black p-2 text-center text-slate-500">
              Sin pasos registrados
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Firmas de Responsabilidad en Planta -->
    <div class="grid grid-cols-2 gap-8 pt-8 mt-4 border-t border-black text-xs">
      <div class="text-center">
        <div class="border-b border-black pb-1 mb-1 h-10"></div>
        <p class="font-bold">OPERARIO RESPONSABLE DE PLANTA</p>
        <p class="text-[10px] text-slate-600">Nombre, Cédula y Firma</p>
      </div>
      <div class="text-center">
        <div class="border-b border-black pb-1 mb-1 h-10"></div>
        <p class="font-bold">CONTROL DE CALIDAD / SUPERVISOR</p>
        <p class="text-[10px] text-slate-600">Visto Bueno y Aprobación</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
@media screen {
  .print-container {
    max-width: 800px;
    margin: 0 auto;
  }
}

@media print {
  @page {
    margin: 1cm;
    size: portrait;
  }
  body * {
    visibility: hidden;
  }
  .print-container,
  .print-container * {
    visibility: visible;
  }
  .print-container {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    margin: 0;
    padding: 0;
  }
}
</style>
