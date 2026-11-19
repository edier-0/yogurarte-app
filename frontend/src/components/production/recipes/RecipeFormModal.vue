<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { http } from '@/api/client';
import { recipesApi, type RecipeItem, type CreateRecipePayload } from '@/api/recipes';
import { useProductionStore } from '@/stores/production.store';
import SearchableSelect from '@/components/common/SearchableSelect.vue';
import type { SelectOption } from '@/utils/searchUtils';
import {
  X,
  Plus,
  Trash2,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Save,
} from 'lucide-vue-next';

interface RawMaterialSimple {
  id: number;
  code: string;
  name: string;
  unit: string;
  category: string;
  isCompound?: boolean;
  isActive: boolean;
  avgCost?: number;
  currentStock?: number;
}

const props = defineProps<{
  isOpen: boolean;
  recipeToEdit: RecipeItem | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'saved', recipe: RecipeItem): void;
}>();

const productionStore = useProductionStore();

const isSubmitting = ref(false);
const errorMessage = ref<string | null>(null);

// Catálogo de materias primas cargadas de la API
const materials = ref<RawMaterialSimple[]>([]);
const isLoadingMaterials = ref(false);

// Estado del Formulario
const formData = ref<{
  code: string;
  name: string;
  category: 'ELABORACION' | 'FASE_A' | 'FASE_B';
  flavor: string;
  outputMaterialId: number | null;
  description: string;
  baseYield: number;
  yieldUnit: string;
  baseLiters: number | null;
  ingredients: Array<{
    rawMaterialId: number | '';
    quantity: number;
    unit: string;
    notes: string;
  }>;
  steps: Array<{
    stepNumber: number;
    title: string;
    description: string;
    estimatedMinutes: number | null;
    temperatureTarget: number | null;
    temperatureMin: number | null;
    temperatureMax: number | null;
    qualityCheck: string;
  }>;
}>({
  code: '',
  name: '',
  category: 'FASE_B',
  flavor: '',
  outputMaterialId: null,
  description: '',
  baseYield: 40,
  yieldUnit: 'Litros',
  baseLiters: 35,
  ingredients: [],
  steps: [],
});

// Cargar catálogo de materias primas
async function fetchMaterials() {
  isLoadingMaterials.value = true;
  try {
    const res = await http.get<any>('/inventory/materials');
    if (Array.isArray(res)) {
      materials.value = res;
    } else if (res && Array.isArray(res.data)) {
      materials.value = res.data;
    } else if (res && Array.isArray(res.items)) {
      materials.value = res.items;
    }
  } catch (err) {
    console.error('Error cargando materias primas:', err);
  } finally {
    isLoadingMaterials.value = false;
  }
}

// Insumos compuestos (mermeladas y elaboraciones) para outputMaterialId
const compoundSelectOptions = computed<SelectOption[]>(() => {
  const filtered = materials.value.filter(
    (m) => m.isCompound || m.category === 'COMPUESTO' || m.category === 'INSUMO'
  );
  const list = filtered.length > 0 ? filtered : materials.value;
  return list.map((c) => ({
    id: c.id,
    name: c.name,
    code: c.code,
    category: c.isCompound ? 'INSUMO COMPUESTO' : c.category,
    unit: c.unit,
    stock: c.currentStock,
  }));
});

// Materias primas e insumos disponibles para ingredientes (activos)
const rawMaterialSelectOptions = computed<SelectOption[]>(() => {
  return materials.value
    .filter((m) => m.isActive)
    .map((m) => ({
      id: m.id,
      name: m.name,
      code: m.code,
      category: m.category,
      unit: m.unit,
      stock: m.currentStock,
    }));
});

function onCompoundChange(opt: SelectOption | null) {
  if (opt) {
    formData.value.outputMaterialId = Number(opt.id);
    if (opt.unit && (!formData.value.yieldUnit || formData.value.yieldUnit === 'Litros')) {
      formData.value.yieldUnit = opt.unit;
    }
  } else {
    formData.value.outputMaterialId = null;
  }
}

function onIngredientMaterialChange(index: number, opt: SelectOption | null) {
  const ing = formData.value.ingredients[index];
  if (!ing) return;
  if (opt) {
    ing.rawMaterialId = Number(opt.id);
    if (opt.unit) {
      ing.unit = opt.unit;
    }
  } else {
    ing.rawMaterialId = '';
  }
}

// Inicializar o resetear formulario
function initForm() {
  errorMessage.value = null;
  if (props.recipeToEdit) {
    formData.value = {
      code: props.recipeToEdit.code,
      name: props.recipeToEdit.name,
      category: props.recipeToEdit.category,
      flavor: props.recipeToEdit.flavor || '',
      outputMaterialId: props.recipeToEdit.outputMaterialId || null,
      description: props.recipeToEdit.description || '',
      baseYield: props.recipeToEdit.baseYield,
      yieldUnit: props.recipeToEdit.yieldUnit || 'Litros',
      baseLiters: props.recipeToEdit.baseLiters ?? null,
      ingredients: props.recipeToEdit.ingredients.map((ing) => ({
        rawMaterialId: ing.rawMaterialId,
        quantity: ing.quantity,
        unit: ing.unit,
        notes: ing.notes || '',
      })),
      steps: props.recipeToEdit.steps.map((st) => ({
        stepNumber: st.stepNumber,
        title: st.title,
        description: st.description,
        estimatedMinutes: st.estimatedMinutes ?? null,
        temperatureTarget: st.temperatureTarget ?? null,
        temperatureMin: st.temperatureMin ?? null,
        temperatureMax: st.temperatureMax ?? null,
        qualityCheck: st.qualityCheck || '',
      })),
    };
  } else {
    formData.value = {
      code: '',
      name: '',
      category: 'FASE_B',
      flavor: '',
      outputMaterialId: null,
      description: '',
      baseYield: 40,
      yieldUnit: 'Litros',
      baseLiters: 35,
      ingredients: [],
      steps: [],
    };
  }
}

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      initForm();
      fetchMaterials();
      if (productionStore.flavors.length === 0) {
        productionStore.fetchFlavors();
      }
    }
  }
);

// Ajustar defaults cuando cambia de categoría
watch(
  () => formData.value.category,
  (newCat) => {
    if (newCat === 'FASE_A') {
      formData.value.yieldUnit = 'Litros';
      formData.value.flavor = '';
      formData.value.outputMaterialId = null;
      formData.value.baseLiters = null;
    } else if (newCat === 'FASE_B') {
      formData.value.yieldUnit = 'Litros';
      formData.value.outputMaterialId = null;
      if (!formData.value.baseLiters) {
        formData.value.baseLiters = 35;
      }
    } else if (newCat === 'ELABORACION') {
      if (formData.value.yieldUnit === 'Litros') {
        formData.value.yieldUnit = 'Kilogramos';
      }
      formData.value.baseLiters = null;
    }
  }
);

// Gestión de Ingredientes
function addIngredient() {
  formData.value.ingredients.push({
    rawMaterialId: '',
    quantity: 1,
    unit: 'Kilogramos',
    notes: '',
  });
}

function removeIngredient(index: number) {
  formData.value.ingredients.splice(index, 1);
}


// Gestión de Pasos SOP
function addStep() {
  const nextNum = formData.value.steps.length + 1;
  formData.value.steps.push({
    stepNumber: nextNum,
    title: '',
    description: '',
    estimatedMinutes: null,
    temperatureTarget: null,
    temperatureMin: null,
    temperatureMax: null,
    qualityCheck: '',
  });
}

function removeStep(index: number) {
  formData.value.steps.splice(index, 1);
  reindexSteps();
}

function moveStepUp(index: number) {
  if (index <= 0) return;
  const item = formData.value.steps.splice(index, 1)[0];
  formData.value.steps.splice(index - 1, 0, item);
  reindexSteps();
}

function moveStepDown(index: number) {
  if (index >= formData.value.steps.length - 1) return;
  const item = formData.value.steps.splice(index, 1)[0];
  formData.value.steps.splice(index + 1, 0, item);
  reindexSteps();
}

function reindexSteps() {
  formData.value.steps.forEach((st, idx) => {
    st.stepNumber = idx + 1;
  });
}

// Validación y Submit
async function handleSubmit() {
  errorMessage.value = null;

  // Validaciones básicas de cliente
  if (!formData.value.code.trim()) {
    errorMessage.value = 'El código de la receta es obligatorio (ej. REC-FASEB-FRESA-TRAD).';
    return;
  }
  if (!formData.value.name.trim()) {
    errorMessage.value = 'El nombre de la receta es obligatorio.';
    return;
  }
  if (!formData.value.baseYield || formData.value.baseYield <= 0) {
    errorMessage.value = 'El rendimiento base debe ser mayor a 0.';
    return;
  }

  // Validaciones por categoría
  if (formData.value.category === 'FASE_B') {
    if (!formData.value.flavor.trim()) {
      errorMessage.value = 'El sabor es obligatorio para recetas de Fase B (ej. Natural, Fresa, Mora).';
      return;
    }
    if (!formData.value.baseLiters || formData.value.baseLiters <= 0) {
      errorMessage.value = 'Los litros de base láctea son obligatorios y deben ser mayores a 0 para Fase B.';
      return;
    }
    if (formData.value.baseYield < formData.value.baseLiters) {
      errorMessage.value = 'El rendimiento total del yogur no puede ser menor a los litros de base láctea extraídos.';
      return;
    }
  }

  if (formData.value.category === 'ELABORACION') {
    if (!formData.value.outputMaterialId) {
      errorMessage.value = 'Debe seleccionar el insumo compuesto de salida que produce esta elaboración.';
      return;
    }
    if (formData.value.ingredients.length === 0) {
      errorMessage.value = 'Una receta de elaboración debe tener al menos un ingrediente de almacén.';
      return;
    }
  }

  if (formData.value.category === 'FASE_A' && formData.value.ingredients.length === 0) {
    errorMessage.value = 'Una receta de Fase A debe tener al menos un ingrediente (ej. leche entera, fermento láctico).';
    return;
  }

  // Verificar ingredientes con material válido
  for (let i = 0; i < formData.value.ingredients.length; i++) {
    const ing = formData.value.ingredients[i];
    if (!ing.rawMaterialId) {
      errorMessage.value = `El ingrediente #${i + 1} no tiene una materia prima seleccionada.`;
      return;
    }
    if (!ing.quantity || ing.quantity <= 0) {
      errorMessage.value = `La cantidad del ingrediente #${i + 1} debe ser mayor a 0.`;
      return;
    }
  }

  // Verificar pasos con título y descripción
  for (let i = 0; i < formData.value.steps.length; i++) {
    const st = formData.value.steps[i];
    if (!st.title.trim()) {
      errorMessage.value = `El paso #${st.stepNumber} debe tener un título.`;
      return;
    }
    if (!st.description.trim()) {
      errorMessage.value = `El paso #${st.stepNumber} debe tener una descripción o instrucción detallada.`;
      return;
    }
  }

  // Construir payload
  const payload: CreateRecipePayload = {
    code: formData.value.code.trim().toUpperCase(),
    name: formData.value.name.trim(),
    category: formData.value.category,
    flavor: formData.value.category === 'FASE_B' ? formData.value.flavor.trim() : null,
    outputMaterialId: formData.value.category === 'ELABORACION' ? Number(formData.value.outputMaterialId) : null,
    description: formData.value.description.trim() || null,
    baseYield: Number(formData.value.baseYield),
    yieldUnit: formData.value.yieldUnit.trim(),
    baseLiters: formData.value.category === 'FASE_B' ? Number(formData.value.baseLiters) : null,
    ingredients: formData.value.ingredients.map((ing) => ({
      rawMaterialId: Number(ing.rawMaterialId),
      quantity: Number(ing.quantity),
      unit: ing.unit.trim(),
      notes: ing.notes.trim() || null,
    })),
    steps: formData.value.steps.map((st) => ({
      stepNumber: st.stepNumber,
      title: st.title.trim(),
      description: st.description.trim(),
      estimatedMinutes: st.estimatedMinutes ? Number(st.estimatedMinutes) : null,
      temperatureTarget: st.temperatureTarget ? Number(st.temperatureTarget) : null,
      temperatureMin: st.temperatureMin ? Number(st.temperatureMin) : null,
      temperatureMax: st.temperatureMax ? Number(st.temperatureMax) : null,
      qualityCheck: st.qualityCheck.trim() || null,
    })),
  };

  isSubmitting.value = true;
  try {
    let savedRecipe: RecipeItem;
    if (props.recipeToEdit) {
      savedRecipe = await recipesApi.updateRecipe(props.recipeToEdit.id, payload);
    } else {
      savedRecipe = await recipesApi.createRecipe(payload);
    }
    emit('saved', savedRecipe);
    emit('close');
  } catch (err: any) {
    console.error('Error guardando receta:', err);
    errorMessage.value = err?.response?.data?.message || 'Error al guardar la receta en la base de datos.';
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4"
  >
    <div
      class="flex max-h-[92vh] w-full max-w-4xl flex-col rounded-3xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150"
    >
      <!-- Capa 1: Header Fijo -->
      <div class="flex items-center justify-between border-b border-slate-200 p-5 dark:border-slate-800 sm:px-6">
        <div>
          <h2 class="text-lg font-black text-slate-900 dark:text-white sm:text-xl">
            {{ recipeToEdit ? 'Editar Receta Maestra' : 'Nueva Receta Maestra (SOP)' }}
          </h2>
          <p class="text-xs text-slate-500 dark:text-slate-400">
            Define la fórmula base, materias primas y procedimiento oficial de planta.
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

      <!-- Banner de Error si existe -->
      <div
        v-if="errorMessage"
        class="flex items-start gap-2.5 border-b border-rose-200 bg-rose-50 px-6 py-3 text-xs text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300"
      >
        <AlertTriangle class="h-4 w-4 shrink-0 mt-0.5" />
        <span>{{ errorMessage }}</span>
      </div>

      <!-- Capa 2: Cuerpo con Scroll Independiente -->
      <form id="recipe-form" @submit.prevent="handleSubmit" class="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
        <!-- Bloque 1: Datos Generales -->
        <div class="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/20">
          <h3 class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            1. Identificación y Parámetros Base
          </h3>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <!-- Categoría -->
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Categoría *
              </label>
              <select
                v-model="formData.category"
                class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:border-primary-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="FASE_B">Fase B — Saborización & Envasado</option>
                <option value="FASE_A">Fase A — Base Láctea Fermentada</option>
                <option value="ELABORACION">Elaboración / Mermelada Artesanal</option>
              </select>
            </div>

            <!-- Código -->
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Código Único *
              </label>
              <input
                v-model="formData.code"
                type="text"
                placeholder="REC-FASEB-FRESA-TRAD"
                class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono font-bold uppercase text-slate-900 focus:border-primary-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <!-- Nombre -->
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nombre de la Receta *
              </label>
              <input
                v-model="formData.name"
                type="text"
                placeholder="Yogur de Fresa Tradicional"
                class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:border-primary-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          <!-- Campos Específicos de Fase B -->
          <div v-if="formData.category === 'FASE_B'" class="grid grid-cols-1 gap-4 sm:grid-cols-3 pt-2">
            <!-- Sabor -->
            <div>
              <label class="block text-xs font-bold text-purple-700 dark:text-purple-300 mb-1">
                Sabor Obligatorio *
              </label>
              <input
                v-model="formData.flavor"
                type="text"
                list="flavors-list"
                placeholder="Fresa, Mora, Natural..."
                class="w-full rounded-xl border border-purple-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:border-purple-500 focus:outline-none dark:border-purple-800 dark:bg-slate-800 dark:text-white"
              />
              <datalist id="flavors-list">
                <option v-for="f in productionStore.flavors" :key="f.id" :value="f.name" />
              </datalist>
            </div>

            <!-- Litros Base Láctea (Fase A) -->
            <div>
              <label class="block text-xs font-bold text-purple-700 dark:text-purple-300 mb-1">
                Litros de Base Láctea (Fase A) *
              </label>
              <input
                v-model.number="formData.baseLiters"
                type="number"
                min="0.1"
                step="any"
                class="w-full rounded-xl border border-purple-300 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:border-purple-500 focus:outline-none dark:border-purple-800 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <!-- Rendimiento Total Yogur -->
            <div>
              <label class="block text-xs font-bold text-purple-700 dark:text-purple-300 mb-1">
                Rendimiento Total (Litros) *
              </label>
              <input
                v-model.number="formData.baseYield"
                type="number"
                min="0.1"
                step="any"
                class="w-full rounded-xl border border-purple-300 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:border-purple-500 focus:outline-none dark:border-purple-800 dark:bg-slate-800 dark:text-white"
              />
              <span v-if="formData.baseLiters && formData.baseYield < formData.baseLiters" class="text-[10px] text-rose-600 block mt-0.5">
                No puede ser menor a los litros de base láctea
              </span>
            </div>
          </div>

          <!-- Campos Específicos de Elaboración -->
          <div v-if="formData.category === 'ELABORACION'" class="grid grid-cols-1 gap-4 sm:grid-cols-3 pt-2">
            <!-- Insumo Compuesto de Salida -->
            <div class="sm:col-span-2">
              <SearchableSelect
                v-model="formData.outputMaterialId"
                :options="compoundSelectOptions"
                label="Insumo Compuesto de Salida (Almacén)"
                placeholder="Buscar o seleccionar insumo compuesto del catálogo..."
                :required="formData.category === 'ELABORACION'"
                @change="onCompoundChange"
              />
            </div>

            <!-- Rendimiento Base -->
            <div>
              <label class="block text-xs font-bold text-amber-700 dark:text-amber-300 mb-1">
                Rendimiento Producido *
              </label>
              <div class="flex items-center gap-2">
                <input
                  v-model.number="formData.baseYield"
                  type="number"
                  min="0.1"
                  step="any"
                  class="w-full rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:border-amber-500 focus:outline-none dark:border-amber-800 dark:bg-slate-800 dark:text-white"
                />
                <input
                  v-model="formData.yieldUnit"
                  type="text"
                  placeholder="Kg"
                  class="w-20 rounded-xl border border-slate-300 bg-white px-2 py-2 text-xs font-bold text-slate-900 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>
          </div>

          <!-- Campos Específicos de Fase A -->
          <div v-if="formData.category === 'FASE_A'" class="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2">
            <div>
              <label class="block text-xs font-bold text-sky-700 dark:text-sky-300 mb-1">
                Litros Base Producidos (Litros) *
              </label>
              <input
                v-model.number="formData.baseYield"
                type="number"
                min="0.1"
                step="any"
                class="w-full rounded-xl border border-sky-300 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:border-sky-500 focus:outline-none dark:border-sky-800 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          <!-- Descripción -->
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Descripción u Observaciones Generales
            </label>
            <textarea
              v-model="formData.description"
              rows="2"
              placeholder="Notas generales de preparación, advertencias de vida útil o particularidades del lote..."
              class="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:border-primary-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            ></textarea>
          </div>
        </div>

        <!-- Bloque 2: Ingredientes de Receta -->
        <div class="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/20">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                2. Materias Primas e Insumos de Almacén
              </h3>
              <p v-if="formData.category === 'FASE_B'" class="text-[11px] text-slate-400">
                Para yogur natural puro (solo base láctea), no es necesario agregar ingredientes adicionales.
              </p>
            </div>

            <button
              type="button"
              @click="addIngredient"
              class="inline-flex items-center gap-1.5 rounded-xl bg-primary-50 px-3 py-1.5 text-xs font-bold text-primary-700 hover:bg-primary-100 dark:bg-primary-950/40 dark:text-primary-300"
            >
              <Plus class="h-3.5 w-3.5" />
              <span>Agregar Insumo</span>
            </button>
          </div>

          <!-- Tabla de Ingredientes -->
          <div class="space-y-2">
            <div
              v-for="(ing, idx) in formData.ingredients"
              :key="idx"
              class="flex flex-col sm:flex-row items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800"
            >
              <!-- Selector de Materia Prima e Insumos con Búsqueda Predictiva -->
              <div class="w-full sm:flex-1">
                <SearchableSelect
                  v-model="ing.rawMaterialId"
                  :options="rawMaterialSelectOptions"
                  placeholder="Buscar materia prima o insumo..."
                  :required="true"
                  @change="(opt) => onIngredientMaterialChange(idx, opt)"
                />
              </div>

              <!-- Cantidad y Unidad -->
              <div class="flex items-center gap-2 w-full sm:w-auto">
                <input
                  v-model.number="ing.quantity"
                  type="number"
                  min="0.001"
                  step="any"
                  placeholder="Cant"
                  class="w-24 rounded-xl border border-slate-300 bg-white px-2.5 py-2.5 text-xs font-mono font-bold text-slate-900 text-right focus:border-primary-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
                <input
                  v-model="ing.unit"
                  type="text"
                  placeholder="Unidad"
                  class="w-20 rounded-xl border border-slate-300 bg-white px-2.5 py-2.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>

              <!-- Notas de adición -->
              <div class="w-full sm:w-48">
                <input
                  v-model="ing.notes"
                  type="text"
                  placeholder="Notas de adición..."
                  class="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>

              <!-- Eliminar -->
              <button
                type="button"
                @click="removeIngredient(idx)"
                class="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                title="Eliminar insumo"
              >
                <Trash2 class="h-4 w-4" />
              </button>
            </div>

            <div
              v-if="formData.ingredients.length === 0"
              class="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400 dark:border-slate-800"
            >
              No hay ingredientes de almacén agregados.
            </div>
          </div>
        </div>

        <!-- Bloque 3: Procedimiento SOP de Pasos -->
        <div class="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/20">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                3. Procedimiento Operativo Estandarizado (SOP)
              </h3>
              <p class="text-[11px] text-slate-400">
                Pasos secuenciales, parámetros de control térmico y puntos de inspección crítica.
              </p>
            </div>

            <button
              type="button"
              @click="addStep"
              class="inline-flex items-center gap-1.5 rounded-xl bg-primary-50 px-3 py-1.5 text-xs font-bold text-primary-700 hover:bg-primary-100 dark:bg-primary-950/40 dark:text-primary-300"
            >
              <Plus class="h-3.5 w-3.5" />
              <span>Agregar Paso</span>
            </button>
          </div>

          <div class="space-y-3">
            <div
              v-for="(st, idx) in formData.steps"
              :key="idx"
              class="space-y-2.5 rounded-xl border border-slate-200 bg-white p-3.5 dark:border-slate-700 dark:bg-slate-800"
            >
              <!-- Cabecera de fila de paso -->
              <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-2">
                  <span class="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-100 text-xs font-black text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                    {{ st.stepNumber }}
                  </span>
                  <input
                    v-model="st.title"
                    type="text"
                    placeholder="Título del paso (ej: Pasteurización lenta)"
                    class="rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-900 focus:border-primary-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white sm:w-80"
                  />
                </div>

                <div class="flex items-center gap-1">
                  <button
                    type="button"
                    @click="moveStepUp(idx)"
                    :disabled="idx === 0"
                    class="rounded-lg p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-700"
                    title="Mover arriba"
                  >
                    <ArrowUp class="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    @click="moveStepDown(idx)"
                    :disabled="idx === formData.steps.length - 1"
                    class="rounded-lg p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-700"
                    title="Mover abajo"
                  >
                    <ArrowDown class="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    @click="removeStep(idx)"
                    class="rounded-lg p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    title="Eliminar paso"
                  >
                    <Trash2 class="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <!-- Instrucción detallada -->
              <div>
                <textarea
                  v-model="st.description"
                  rows="2"
                  placeholder="Instrucción detallada para el operario de planta..."
                  class="w-full rounded-lg border border-slate-300 bg-slate-50 p-2 text-xs text-slate-900 focus:border-primary-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                ></textarea>
              </div>

              <!-- Parámetros de Tiempo, Temperatura y Calidad -->
              <div class="grid grid-cols-1 gap-2 sm:grid-cols-4">
                <!-- Tiempo -->
                <div>
                  <label class="block text-[10px] font-semibold text-slate-500">Tiempo Est. (min)</label>
                  <input
                    v-model.number="st.estimatedMinutes"
                    type="number"
                    min="1"
                    placeholder="Minutos"
                    class="w-full rounded-lg border border-slate-300 bg-slate-50 px-2 py-1 text-xs text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  />
                </div>

                <!-- Temp Target -->
                <div>
                  <label class="block text-[10px] font-semibold text-slate-500">Temp. Objetivo (°C)</label>
                  <input
                    v-model.number="st.temperatureTarget"
                    type="number"
                    step="0.1"
                    placeholder="42 °C"
                    class="w-full rounded-lg border border-slate-300 bg-slate-50 px-2 py-1 text-xs text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  />
                </div>

                <!-- Temp Min / Max -->
                <div>
                  <label class="block text-[10px] font-semibold text-slate-500">Rango [Mín - Máx] °C</label>
                  <div class="flex items-center gap-1">
                    <input
                      v-model.number="st.temperatureMin"
                      type="number"
                      step="0.1"
                      placeholder="Mín"
                      class="w-1/2 rounded-lg border border-slate-300 bg-slate-50 px-2 py-1 text-xs text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    />
                    <input
                      v-model.number="st.temperatureMax"
                      type="number"
                      step="0.1"
                      placeholder="Máx"
                      class="w-1/2 rounded-lg border border-slate-300 bg-slate-50 px-2 py-1 text-xs text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    />
                  </div>
                </div>

                <!-- Calidad -->
                <div>
                  <label class="block text-[10px] font-semibold text-slate-500">Control Crítico</label>
                  <input
                    v-model="st.qualityCheck"
                    type="text"
                    placeholder="ej. pH 4.5, Brix 65°"
                    class="w-full rounded-lg border border-emerald-300 bg-emerald-50/50 px-2 py-1 text-xs text-slate-900 dark:border-emerald-800 dark:bg-emerald-950/20 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div
              v-if="formData.steps.length === 0"
              class="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400 dark:border-slate-800"
            >
              No se han definido pasos de procedimiento. Puedes guardar la receta y documentar los pasos más tarde.
            </div>
          </div>
        </div>
      </form>

      <!-- Capa 3: Footer Fijo con Acciones -->
      <div class="flex items-center justify-between border-t border-slate-200 p-4 dark:border-slate-800 sm:px-6">
        <button
          type="button"
          @click="emit('close')"
          class="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Cancelar
        </button>

        <button
          type="submit"
          form="recipe-form"
          :disabled="isSubmitting"
          class="inline-flex items-center gap-2 rounded-xl bg-hero-gradient px-5 py-2.5 text-xs font-extrabold text-white shadow-card transition-transform active:scale-95 disabled:opacity-50"
        >
          <Save class="h-4 w-4" />
          <span>{{ isSubmitting ? 'Guardando...' : recipeToEdit ? 'Actualizar Receta' : 'Guardar Receta' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
