<script setup lang="ts">
import { computed } from 'vue';
import type { RecipeStepItem } from '@/api/recipes';
import { Timer, Thermometer, ShieldCheck, AlertCircle } from 'lucide-vue-next';

const props = defineProps<{
  steps: RecipeStepItem[];
}>();

// Pasos ordenados secuencialmente
const sortedSteps = computed(() => {
  return [...props.steps].sort((a, b) => a.stepNumber - b.stepNumber);
});

// Tiempo total estimado de proceso
const totalEstimatedTime = computed(() => {
  return props.steps.reduce((acc, s) => acc + (s.estimatedMinutes || 0), 0);
});

// Formateador de tiempo amigable
const formatMinutes = (mins?: number | null) => {
  if (!mins) return '—';
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const remaining = mins % 60;
  return remaining > 0 ? `${hours} h ${remaining} min` : `${hours} h`;
};
</script>

<template>
  <div class="space-y-4">
    <!-- Header de Procedimiento -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <h4 class="text-sm font-bold text-slate-900 dark:text-white sm:text-base">
          Procedimiento Operativo Estandarizado (SOP)
        </h4>
        <span class="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {{ sortedSteps.length }} {{ sortedSteps.length === 1 ? 'paso' : 'pasos' }}
        </span>
      </div>

      <div
        v-if="totalEstimatedTime > 0"
        class="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
      >
        <Timer class="h-3.5 w-3.5" />
        <span>Tiempo total: {{ formatMinutes(totalEstimatedTime) }}</span>
      </div>
    </div>

    <!-- Lista vacía -->
    <div
      v-if="sortedSteps.length === 0"
      class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 p-8 text-center dark:border-slate-800"
    >
      <AlertCircle class="h-8 w-8 text-amber-500 mb-2" />
      <p class="text-sm font-bold text-slate-700 dark:text-slate-200">
        Procedimiento pendiente
      </p>
      <p class="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">
        Esta receta aún no tiene pasos operativos documentados. El administrador puede editarla para agregar la secuencia oficial.
      </p>
    </div>

    <!-- Timeline de Pasos -->
    <div v-else class="space-y-3">
      <div
        v-for="step in sortedSteps"
        :key="step.id || step.stepNumber"
        class="relative flex gap-4 rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-700"
      >
        <!-- Número de Paso -->
        <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 font-black text-slate-700 dark:bg-slate-800 dark:text-slate-200 text-sm">
          {{ step.stepNumber }}
        </div>

        <!-- Contenido del Paso -->
        <div class="flex-1 space-y-2">
          <!-- Título y Parámetros -->
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h5 class="text-sm font-bold text-slate-900 dark:text-white">
              {{ step.title }}
            </h5>

            <!-- Badges de Tiempo y Temperatura -->
            <div class="flex flex-wrap items-center gap-2">
              <span
                v-if="step.estimatedMinutes"
                class="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                <Timer class="h-3 w-3 text-slate-400" />
                {{ formatMinutes(step.estimatedMinutes) }}
              </span>

              <span
                v-if="step.temperatureTarget || (step.temperatureMin && step.temperatureMax)"
                class="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
              >
                <Thermometer class="h-3 w-3 text-rose-500" />
                <template v-if="step.temperatureTarget">
                  {{ step.temperatureTarget }} °C
                </template>
                <template v-if="step.temperatureMin && step.temperatureMax">
                  <span class="text-rose-500/80 font-normal">
                    [{{ step.temperatureMin }} °C - {{ step.temperatureMax }} °C]
                  </span>
                </template>
              </span>
            </div>
          </div>

          <!-- Descripción detallada -->
          <p class="text-xs leading-relaxed text-slate-600 dark:text-slate-300 whitespace-pre-line">
            {{ step.description }}
          </p>

          <!-- Control de Calidad Crítico (si existe) -->
          <div
            v-if="step.qualityCheck"
            class="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50/70 p-2.5 text-xs text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300"
          >
            <ShieldCheck class="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
            <div>
              <span class="font-bold">Control de Calidad:</span>
              <span class="ml-1">{{ step.qualityCheck }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
