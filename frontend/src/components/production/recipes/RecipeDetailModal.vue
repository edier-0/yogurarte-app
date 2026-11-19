<script setup lang="ts">
import { ref, computed } from 'vue';
import type { RecipeItem } from '@/api/recipes';
import { useAuthStore } from '@/stores/auth.store';
import {
  X,
  Printer,
  Pencil,
  Archive,
  RotateCcw,
  BookOpen,
  FlaskConical,
  ChefHat,
  TrendingUp,
  Sparkles,
} from 'lucide-vue-next';
import RecipeScaler from './RecipeScaler.vue';
import RecipeStepsList from './RecipeStepsList.vue';
import RecipeProfitSimulator from './RecipeProfitSimulator.vue';
import RecipePrintView from './RecipePrintView.vue';

const props = defineProps<{
  isOpen: boolean;
  recipe: RecipeItem | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'edit', recipe: RecipeItem): void;
  (e: 'toggleArchive', recipe: RecipeItem): void;
}>();

const authStore = useAuthStore();

// Rol del usuario actual
const canViewCosts = computed(() => {
  return authStore.userRole === 'ADMIN' || (authStore.user as any)?.role === 'SOCIO';
});

// Pestaña activa
const activeTab = ref<'SOP' | 'SIMULATOR'>('SOP');

// Formateador de moneda
const formatCurrency = (val?: number | null) => {
  if (val === null || val === undefined) return '$0';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(val);
};

// Configuración visual por categoría
const categoryConfig = computed(() => {
  if (!props.recipe) return { label: '', badgeClass: '', icon: BookOpen };
  switch (props.recipe.category) {
    case 'ELABORACION':
      return {
        label: 'Elaboración / Mermelada',
        badgeClass: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
        icon: ChefHat,
      };
    case 'FASE_A':
      return {
        label: 'Fase A — Base Láctea',
        badgeClass: 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800',
        icon: FlaskConical,
      };
    case 'FASE_B':
      return {
        label: 'Fase B — Saborización',
        badgeClass: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800',
        icon: Sparkles,
      };
    default:
      return { label: props.recipe.category, badgeClass: 'bg-slate-100 text-slate-800', icon: BookOpen };
  }
});

function handlePrint() {
  window.print();
}
</script>

<template>
  <div
    v-if="isOpen && recipe"
    class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4"
  >
    <div
      class="flex max-h-[92vh] w-full max-w-4xl flex-col rounded-3xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150"
    >
      <!-- Capa 1: Header Fijo -->
      <div class="flex items-start justify-between border-b border-slate-200 p-5 dark:border-slate-800 sm:px-6">
        <div class="space-y-1.5">
          <div class="flex flex-wrap items-center gap-2">
            <span
              class="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold"
              :class="categoryConfig.badgeClass"
            >
              <component :is="categoryConfig.icon" class="h-3.5 w-3.5" />
              {{ categoryConfig.label }}
            </span>

            <span
              v-if="recipe.flavor"
              class="inline-flex items-center gap-1 rounded-lg bg-pink-100 px-2.5 py-1 text-xs font-bold text-pink-800 dark:bg-pink-950/60 dark:text-pink-300"
            >
              <Sparkles class="h-3 w-3" />
              Sabor: {{ recipe.flavor }}
            </span>

            <span
              class="inline-flex items-center rounded-lg px-2 py-0.5 font-mono text-xs font-bold"
              :class="
                recipe.status === 'ACTIVA'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
              "
            >
              {{ recipe.status }}
            </span>
          </div>

          <div class="flex items-baseline gap-2">
            <h2 class="text-xl font-black text-slate-900 dark:text-white sm:text-2xl">
              {{ recipe.name }}
            </h2>
            <span class="font-mono text-xs text-slate-400">
              ({{ recipe.code }})
            </span>
          </div>

          <p v-if="recipe.description" class="text-xs text-slate-500 dark:text-slate-400">
            {{ recipe.description }}
          </p>
        </div>

        <button
          type="button"
          @click="emit('close')"
          class="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <X class="h-5 w-5" />
        </button>
      </div>

      <!-- Resumen Económico para ADMIN / SOCIO (si canViewCosts) -->
      <div
        v-if="canViewCosts && recipe.theoreticalUnitCost !== undefined"
        class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-6 py-2.5 text-xs dark:border-slate-800 dark:bg-slate-800/30"
      >
        <div class="flex items-center gap-4">
          <div>
            <span class="text-slate-500">Rendimiento Base:</span>
            <strong class="ml-1 text-slate-800 dark:text-slate-200">
              {{ recipe.baseYield }} {{ recipe.yieldUnit }}
            </strong>
          </div>
          <div>
            <span class="text-slate-500">Costo Total Base:</span>
            <strong class="ml-1 text-slate-800 dark:text-slate-200">
              {{ formatCurrency(recipe.totalCost) }}
            </strong>
          </div>
          <div>
            <span class="text-slate-500">Costo Teórico / {{ recipe.yieldUnit }}:</span>
            <strong class="ml-1 text-emerald-700 dark:text-emerald-400 font-black">
              {{ formatCurrency(recipe.theoreticalUnitCost) }}
            </strong>
          </div>
        </div>

        <div v-if="recipe.baseCostWarning" class="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
          ⚠️ {{ recipe.baseCostWarning }}
        </div>
      </div>

      <!-- Navegación de Pestañas (si es Fase B y canViewCosts) -->
      <div
        v-if="recipe.category === 'FASE_B' && canViewCosts"
        class="flex border-b border-slate-200 px-6 dark:border-slate-800"
      >
        <button
          type="button"
          @click="activeTab = 'SOP'"
          class="flex items-center gap-2 border-b-2 py-3 text-xs font-bold transition-colors"
          :class="
            activeTab === 'SOP'
              ? 'border-primary-600 text-primary-700 dark:border-primary-400 dark:text-primary-300'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
          "
        >
          <BookOpen class="h-4 w-4" />
          Ficha Técnica & Escalador
        </button>

        <button
          type="button"
          @click="activeTab = 'SIMULATOR'"
          class="flex items-center gap-2 border-b-2 py-3 ml-6 text-xs font-bold transition-colors"
          :class="
            activeTab === 'SIMULATOR'
              ? 'border-purple-600 text-purple-700 dark:border-purple-400 dark:text-purple-300'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
          "
        >
          <TrendingUp class="h-4 w-4" />
          Simulador de Rentabilidad por Presentación
        </button>
      </div>

      <!-- Capa 2: Cuerpo con Scroll Independiente -->
      <div class="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
        <template v-if="activeTab === 'SOP' || recipe.category !== 'FASE_B' || !canViewCosts">
          <!-- Escalador reactivo -->
          <RecipeScaler :recipe="recipe" :canViewCosts="canViewCosts" />

          <!-- Procedimiento SOP de Pasos -->
          <RecipeStepsList :steps="recipe.steps" />
        </template>

        <template v-else-if="activeTab === 'SIMULATOR'">
          <!-- Simulador de Rentabilidad -->
          <RecipeProfitSimulator :recipe="recipe" />
        </template>
      </div>

      <!-- Capa 3: Footer Fijo con Acciones Principales -->
      <div class="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-4 dark:border-slate-800 sm:px-6">
        <div class="flex items-center gap-2">
          <!-- Botón Imprimir Ficha Limpia -->
          <button
            type="button"
            @click="handlePrint"
            class="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <Printer class="h-4 w-4 text-slate-500" />
            <span>Imprimir Ficha (SOP)</span>
          </button>

          <!-- Botón Archivar / Reactivar (solo admin/socio) -->
          <button
            v-if="canViewCosts"
            type="button"
            @click="emit('toggleArchive', recipe)"
            class="inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition-colors"
            :class="
              recipe.status === 'ACTIVA'
                ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300'
            "
          >
            <component :is="recipe.status === 'ACTIVA' ? Archive : RotateCcw" class="h-4 w-4" />
            <span>{{ recipe.status === 'ACTIVA' ? 'Archivar Receta' : 'Reactivar Receta' }}</span>
          </button>
        </div>

        <div class="flex items-center gap-2">
          <!-- Botón Editar (solo admin/socio) -->
          <button
            v-if="canViewCosts"
            type="button"
            @click="emit('edit', recipe)"
            class="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            <Pencil class="h-4 w-4" />
            <span>Editar Receta</span>
          </button>

          <!-- Cerrar -->
          <button
            type="button"
            @click="emit('close')"
            class="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Vista oculta para impresión con @media print -->
  <div v-if="recipe" class="hidden print:block">
    <RecipePrintView :recipe="recipe" />
  </div>
</template>
