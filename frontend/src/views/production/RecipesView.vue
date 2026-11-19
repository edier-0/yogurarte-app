<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { recipesApi, type RecipeItem, type RecipeQueryFilters } from '@/api/recipes';
import { useAuthStore } from '@/stores/auth.store';
import { useConfirm } from '@/composables/useConfirm';
import {
  BookOpen,
  Search,
  Plus,
  RefreshCw,
  ChefHat,
  FlaskConical,
  Sparkles,
  AlertTriangle,
  Archive,
  RotateCcw,
  Pencil,
  Eye,
} from 'lucide-vue-next';
import RecipeDetailModal from '@/components/production/recipes/RecipeDetailModal.vue';
import RecipeFormModal from '@/components/production/recipes/RecipeFormModal.vue';

const authStore = useAuthStore();
const { confirm } = useConfirm();

// Permisos del usuario actual
const canManageRecipes = computed(() => {
  return authStore.userRole === 'ADMIN' || (authStore.user as any)?.role === 'SOCIO';
});

// Estado de listado
const recipes = ref<RecipeItem[]>([]);
const isLoading = ref<boolean>(false);
const errorMessage = ref<string | null>(null);

// Filtros reactivos
const searchQuery = ref<string>('');
const selectedCategory = ref<'ALL' | 'ELABORACION' | 'FASE_A' | 'FASE_B'>('ALL');
const selectedStatus = ref<'ALL' | 'ACTIVA' | 'ARCHIVADA'>('ACTIVA');

// Modales
const isDetailModalOpen = ref<boolean>(false);
const selectedRecipeForDetail = ref<RecipeItem | null>(null);

const isFormModalOpen = ref<boolean>(false);
const selectedRecipeForEdit = ref<RecipeItem | null>(null);

// Cargar catálogo de recetas
async function loadRecipes() {
  isLoading.value = true;
  errorMessage.value = null;
  try {
    const filters: RecipeQueryFilters = {};
    if (selectedCategory.value !== 'ALL') {
      filters.category = selectedCategory.value;
    }
    if (selectedStatus.value !== 'ALL') {
      filters.status = selectedStatus.value;
    }
    const res = await recipesApi.getRecipes(filters);
    recipes.value = res;
  } catch (err: any) {
    console.error('Error cargando recetas:', err);
    errorMessage.value = err?.response?.data?.message || 'Error al conectar con el servidor para obtener las recetas.';
  } finally {
    isLoading.value = false;
  }
}

// Recetas filtradas en cliente por buscador de texto
const filteredRecipes = computed(() => {
  const q = searchQuery.value.toLowerCase().trim();
  if (!q) return recipes.value;
  return recipes.value.filter((r) => {
    return (
      r.name.toLowerCase().includes(q) ||
      r.code.toLowerCase().includes(q) ||
      (r.flavor && r.flavor.toLowerCase().includes(q)) ||
      (r.description && r.description.toLowerCase().includes(q))
    );
  });
});

onMounted(() => {
  loadRecipes();
});

// Abrir detalle
function openDetail(recipe: RecipeItem) {
  selectedRecipeForDetail.value = recipe;
  isDetailModalOpen.value = true;
}

// Abrir modal de creación
function openCreateModal() {
  selectedRecipeForEdit.value = null;
  isFormModalOpen.value = true;
}

// Abrir modal de edición
function openEditModal(recipe: RecipeItem) {
  selectedRecipeForEdit.value = recipe;
  isFormModalOpen.value = true;
}

// Alternar archivado
async function handleToggleArchive(recipe: RecipeItem) {
  const isArchiving = recipe.status === 'ACTIVA';
  const confirmed = await confirm({
    title: isArchiving ? '¿Archivar Receta?' : '¿Reactivar Receta?',
    message: isArchiving
      ? `La receta "${recipe.name}" pasará a estado inactivo y no aparecerá en las sugerencias de producción rápida.`
      : `La receta "${recipe.name}" volverá a estar disponible para producción en planta.`,
    confirmText: isArchiving ? 'Archivar' : 'Reactivar',
    variant: isArchiving ? 'danger' : 'info',
  });

  if (!confirmed) return;

  try {
    await recipesApi.toggleArchiveRecipe(recipe.id);
    await loadRecipes();
    if (selectedRecipeForDetail.value?.id === recipe.id) {
      selectedRecipeForDetail.value.status = isArchiving ? 'ARCHIVADA' : 'ACTIVA';
    }
  } catch (err: any) {
    console.error('Error alternando estado:', err);
    alert(err?.response?.data?.message || 'Error al cambiar estado de la receta.');
  }
}

// Callback tras guardar receta
async function onRecipeSaved(saved: RecipeItem) {
  await loadRecipes();
  if (selectedRecipeForDetail.value?.id === saved.id) {
    selectedRecipeForDetail.value = saved;
  }
}

// Formateador de moneda
const formatCurrency = (val?: number | null) => {
  if (val === null || val === undefined) return '$0';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(val);
};
</script>

<template>
  <div class="space-y-6">
    <!-- Encabezado de la Vista -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          Libro de Recetas (SOP)
        </h1>
        <p class="text-xs font-semibold text-slate-500 dark:text-slate-400">
          Fórmulas maestras estandarizadas: Procedimientos operativos, escalador de lotes y rentabilidad por presentación.
        </p>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          @click="loadRecipes"
          :disabled="isLoading"
          class="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-surface-light-card px-3 py-2.5 text-xs font-bold text-slate-700 shadow-2xs transition-all active:scale-95 hover:bg-slate-50 dark:border-slate-700 dark:bg-surface-dark-card dark:text-slate-200"
          title="Refrescar catálogo"
        >
          <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': isLoading }" />
          <span class="hidden sm:inline">Refrescar</span>
        </button>

        <button
          v-if="canManageRecipes"
          type="button"
          @click="openCreateModal"
          class="inline-flex items-center gap-2 rounded-xl bg-hero-gradient px-4 py-2.5 text-xs font-extrabold text-white shadow-card transition-transform active:scale-95"
        >
          <Plus class="h-4 w-4 stroke-[2.5]" />
          <span>Nueva Receta</span>
        </button>
      </div>
    </div>

    <!-- Barra de Filtros y Búsqueda -->
    <div class="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900/60 sm:flex-row sm:items-center sm:justify-between">
      <!-- Pestañas por Categoría -->
      <div class="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          @click="selectedCategory = 'ALL'"
          class="rounded-xl px-3 py-1.5 text-xs font-bold transition-all"
          :class="
            selectedCategory === 'ALL'
              ? 'bg-slate-900 text-white shadow-2xs dark:bg-white dark:text-slate-900'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
          "
        >
          Todas
        </button>

        <button
          type="button"
          @click="selectedCategory = 'FASE_B'"
          class="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all"
          :class="
            selectedCategory === 'FASE_B'
              ? 'bg-purple-600 text-white shadow-2xs'
              : 'text-purple-700 hover:bg-purple-50 dark:text-purple-300 dark:hover:bg-purple-950/40'
          "
        >
          <Sparkles class="h-3.5 w-3.5" />
          <span>Fase B (Saborización)</span>
        </button>

        <button
          type="button"
          @click="selectedCategory = 'FASE_A'"
          class="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all"
          :class="
            selectedCategory === 'FASE_A'
              ? 'bg-sky-600 text-white shadow-2xs'
              : 'text-sky-700 hover:bg-sky-50 dark:text-sky-300 dark:hover:bg-sky-950/40'
          "
        >
          <FlaskConical class="h-3.5 w-3.5" />
          <span>Fase A (Base Láctea)</span>
        </button>

        <button
          type="button"
          @click="selectedCategory = 'ELABORACION'"
          class="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all"
          :class="
            selectedCategory === 'ELABORACION'
              ? 'bg-amber-600 text-white shadow-2xs'
              : 'text-amber-700 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-950/40'
          "
        >
          <ChefHat class="h-3.5 w-3.5" />
          <span>Elaboraciones / Mermeladas</span>
        </button>
      </div>

      <!-- Buscador y Filtro de Estado -->
      <div class="flex items-center gap-2">
        <div class="relative flex-1 sm:w-64">
          <Search class="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Buscar por nombre, código o sabor..."
            class="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs font-semibold text-slate-900 focus:border-primary-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>

        <select
          v-model="selectedStatus"
          @change="loadRecipes"
          class="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-bold text-slate-700 focus:border-primary-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
        >
          <option value="ALL">Todos los Estados</option>
          <option value="ACTIVA">Solo Activas</option>
          <option value="ARCHIVADA">Archivadas</option>
        </select>
      </div>
    </div>

    <!-- Error al cargar -->
    <div
      v-if="errorMessage"
      class="flex items-center gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300"
    >
      <AlertTriangle class="h-4 w-4 shrink-0" />
      <span>{{ errorMessage }}</span>
    </div>

    <!-- Loading Skeleton -->
    <div v-if="isLoading" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="i in 6"
        :key="i"
        class="h-56 animate-pulse rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-800/40"
      ></div>
    </div>

    <!-- Lista Vacía -->
    <div
      v-else-if="filteredRecipes.length === 0"
      class="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 py-16 text-center dark:border-slate-800"
    >
      <BookOpen class="h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
      <h3 class="text-base font-bold text-slate-800 dark:text-slate-200">
        No se encontraron recetas
      </h3>
      <p class="text-xs text-slate-500 max-w-sm mt-1">
        No hay fórmulas que coincidan con la búsqueda o categoría seleccionada. Puedes crear una nueva receta maestra para estandarizar la planta.
      </p>
      <button
        v-if="canManageRecipes"
        type="button"
        @click="openCreateModal"
        class="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary-600 px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-primary-500"
      >
        <Plus class="h-4 w-4" />
        <span>Crear Nueva Receta</span>
      </button>
    </div>

    <!-- Cuadrícula de Tarjetas de Receta -->
    <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="recipe in filteredRecipes"
        :key="recipe.id"
        class="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs transition-all hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-700"
      >
        <!-- Parte Superior: Badges y Código -->
        <div>
          <div class="flex items-center justify-between gap-2 mb-2.5">
            <div class="flex flex-wrap items-center gap-1.5">
              <!-- Categoría -->
              <span
                class="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold"
                :class="{
                  'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300':
                    recipe.category === 'ELABORACION',
                  'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300': recipe.category === 'FASE_A',
                  'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300':
                    recipe.category === 'FASE_B',
                }"
              >
                <component
                  :is="
                    recipe.category === 'ELABORACION'
                      ? ChefHat
                      : recipe.category === 'FASE_A'
                        ? FlaskConical
                        : Sparkles
                  "
                  class="h-3 w-3"
                />
                {{
                  recipe.category === 'ELABORACION'
                    ? 'Elaboración'
                    : recipe.category === 'FASE_A'
                      ? 'Fase A'
                      : 'Fase B'
                }}
              </span>

              <!-- Sabor -->
              <span
                v-if="recipe.flavor"
                class="inline-flex items-center gap-1 rounded-md bg-pink-100 px-2 py-0.5 text-[11px] font-bold text-pink-800 dark:bg-pink-950/60 dark:text-pink-300"
              >
                {{ recipe.flavor }}
              </span>
            </div>

            <!-- Estado -->
            <span
              class="font-mono text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded"
              :class="
                recipe.status === 'ACTIVA'
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
              "
            >
              {{ recipe.status }}
            </span>
          </div>

          <!-- Nombre y Código -->
          <div class="cursor-pointer" @click="openDetail(recipe)">
            <h3 class="text-base font-black text-slate-900 group-hover:text-primary-600 dark:text-white dark:group-hover:text-primary-400 transition-colors">
              {{ recipe.name }}
            </h3>
            <span class="font-mono text-xs text-slate-400">
              {{ recipe.code }}
            </span>
          </div>

          <!-- Descripción o Insumo Compuesto -->
          <p
            v-if="recipe.description || recipe.outputMaterial"
            class="mt-2 line-clamp-2 text-xs text-slate-500 dark:text-slate-400"
          >
            <template v-if="recipe.outputMaterial">
              Produce: <strong>{{ recipe.outputMaterial.name }}</strong>
            </template>
            <template v-else>
              {{ recipe.description }}
            </template>
          </p>
        </div>

        <!-- Parte Inferior: Parámetros Técnicos y Botones -->
        <div class="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
          <!-- Datos técnicos de planta -->
          <div class="grid grid-cols-2 gap-2 text-xs">
            <div class="rounded-lg bg-slate-50 p-2 dark:bg-slate-800/40">
              <span class="text-[10px] text-slate-400 block font-semibold">Rendimiento Base</span>
              <span class="font-bold text-slate-800 dark:text-slate-200">
                {{ recipe.baseYield }} {{ recipe.yieldUnit }}
              </span>
            </div>

            <div
              v-if="recipe.category === 'FASE_B' && recipe.baseLiters"
              class="rounded-lg bg-purple-50/60 p-2 dark:bg-purple-950/30"
            >
              <span class="text-[10px] text-purple-600 dark:text-purple-400 block font-semibold">Base Láctea</span>
              <span class="font-bold text-purple-900 dark:text-purple-200">
                {{ recipe.baseLiters }} L
              </span>
            </div>

            <div
              v-else
              class="rounded-lg bg-slate-50 p-2 dark:bg-slate-800/40"
            >
              <span class="text-[10px] text-slate-400 block font-semibold">Estructura SOP</span>
              <span class="font-bold text-slate-800 dark:text-slate-200">
                {{ recipe.ingredients.length }} insumos • {{ recipe.steps.length }} pasos
              </span>
            </div>
          </div>

          <!-- Costo Teórico Unitario (solo si canManageRecipes y disponible) -->
          <div
            v-if="canManageRecipes && recipe.theoreticalUnitCost !== undefined"
            class="flex items-center justify-between rounded-xl bg-emerald-50/60 px-3 py-1.5 text-xs text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300"
          >
            <span class="font-semibold text-[11px]">Costo Teórico / {{ recipe.yieldUnit }}:</span>
            <span class="font-mono font-black text-sm text-emerald-700 dark:text-emerald-300">
              {{ formatCurrency(recipe.theoreticalUnitCost) }}
            </span>
          </div>

          <!-- Alerta si no tiene pasos -->
          <div
            v-if="recipe.steps.length === 0"
            class="flex items-center gap-1.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400"
          >
            <AlertTriangle class="h-3.5 w-3.5 shrink-0" />
            <span>Procedimiento SOP pendiente</span>
          </div>

          <!-- Barra de Acciones de la Tarjeta -->
          <div class="flex items-center justify-between pt-1">
            <button
              type="button"
              @click="openDetail(recipe)"
              class="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <Eye class="h-3.5 w-3.5" />
              <span>Ver Ficha Técnica</span>
            </button>

            <div v-if="canManageRecipes" class="flex items-center gap-1">
              <button
                type="button"
                @click="openEditModal(recipe)"
                class="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-white"
                title="Editar Receta"
              >
                <Pencil class="h-4 w-4" />
              </button>

              <button
                type="button"
                @click="handleToggleArchive(recipe)"
                class="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-white"
                :title="recipe.status === 'ACTIVA' ? 'Archivar Receta' : 'Reactivar Receta'"
              >
                <component :is="recipe.status === 'ACTIVA' ? Archive : RotateCcw" class="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modales -->
    <RecipeDetailModal
      :is-open="isDetailModalOpen"
      :recipe="selectedRecipeForDetail"
      @close="isDetailModalOpen = false"
      @edit="
        (rec) => {
          isDetailModalOpen = false;
          openEditModal(rec);
        }
      "
      @toggle-archive="handleToggleArchive"
    />

    <RecipeFormModal
      :is-open="isFormModalOpen"
      :recipe-to-edit="selectedRecipeForEdit"
      @close="isFormModalOpen = false"
      @saved="onRecipeSaved"
    />
  </div>
</template>
