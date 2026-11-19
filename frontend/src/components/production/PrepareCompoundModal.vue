<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import {
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from 'reka-ui';
import {
  ChefHat,
  X,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  BookOpen,
  RotateCcw,
} from 'lucide-vue-next';
import { http } from '@/api/client';
import { recipesApi, type RecipeItem } from '@/api/recipes';
import { toast } from 'vue-sonner';
import { getTodayDateBogota } from '@/stores/finance.store';
import { formatStockQuantity } from '@/utils/formatters';
import SearchableSelect from '@/components/common/SearchableSelect.vue';

export interface CompoundMaterialOption {
  id: number;
  name: string;
  code: string;
  unit: string;
  avgCost: number;
  currentStock: number;
  recipeYield?: number;
  recipeIngredients?: Array<{
    id?: number;
    ingredientId: number;
    quantity: number;
    unit: string;
    ingredient?: {
      id: number;
      name: string;
      code: string;
      unit: string;
      avgCost: number;
      currentStock: number;
    };
  }>;
}

export interface EditableIngredient {
  rawMaterialId: number;
  name: string;
  unit: string;
  currentAvailable: number;
  customQuantity: number;
  baseRatioQuantity: number;
  avgCost: number;
}

const props = defineProps<{
  open: boolean;
  compoundMaterials: CompoundMaterialOption[];
  preselectedMaterialId?: number | null;
}>();

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void;
  (e: 'prepared'): void;
}>();

// Recetas de Elaboración maestras disponibles
const elaborationRecipes = ref<RecipeItem[]>([]);
const selectedRecipeId = ref<number | ''>('');
const isLoadingRecipes = ref(false);

// Estado del formulario
const selectedMaterialId = ref<number | null>(null);
const quantityToProduce = ref<number | ''>('');
const preparationDate = ref(getTodayDateBogota());
const notes = ref('');

// Lista de ingredientes editables in situ
const editableIngredients = ref<EditableIngredient[]>([]);

const isSubmitting = ref(false);
const errorMessage = ref('');

// Cargar recetas de elaboración
async function fetchElaborationRecipes() {
  isLoadingRecipes.value = true;
  try {
    const res = await recipesApi.getRecipes({ category: 'ELABORACION', status: 'ACTIVA' });
    elaborationRecipes.value = res;
  } catch (err) {
    console.error('Error cargando recetas de elaboración:', err);
  } finally {
    isLoadingRecipes.value = false;
  }
}

// Insumo compuesto seleccionado
const currentCompound = computed(() => {
  return props.compoundMaterials.find((m) => m.id === selectedMaterialId.value) || null;
});

const compoundSelectOptions = computed(() => {
  return props.compoundMaterials.map((c) => ({
    id: c.id,
    name: c.name,
    code: c.code,
    category: 'INSUMO COMPUESTO',
    stock: c.currentStock,
    unit: c.unit,
  }));
});

// Inicializar lista de ingredientes desde el insumo o receta
function populateIngredientsFromCompound(comp: CompoundMaterialOption, targetQty: number) {
  if (!comp.recipeIngredients) {
    editableIngredients.value = [];
    return;
  }
  const baseYield = comp.recipeYield || 1;
  const ratio = baseYield > 0 ? targetQty / baseYield : 1;

  editableIngredients.value = comp.recipeIngredients.map((ri) => ({
    rawMaterialId: ri.ingredientId,
    name: ri.ingredient?.name || `Ingrediente #${ri.ingredientId}`,
    unit: ri.unit || ri.ingredient?.unit || 'Kg',
    currentAvailable: ri.ingredient?.currentStock ?? 0,
    baseRatioQuantity: ri.quantity,
    customQuantity: Number((ri.quantity * ratio).toFixed(2)),
    avgCost: ri.ingredient?.avgCost || 0,
  }));
}

// Cargar desde Receta de Elaboración seleccionada
function handleRecipeChange() {
  if (!selectedRecipeId.value) return;
  const rec = elaborationRecipes.value.find((r) => r.id === selectedRecipeId.value);
  if (!rec) return;

  if (rec.outputMaterialId) {
    selectedMaterialId.value = rec.outputMaterialId;
  }
  quantityToProduce.value = rec.baseYield;

  editableIngredients.value = rec.ingredients.map((ing) => ({
    rawMaterialId: ing.rawMaterialId,
    name: ing.rawMaterial?.name || `Insumo #${ing.rawMaterialId}`,
    unit: ing.unit,
    currentAvailable: ing.rawMaterial?.currentStock ?? 0,
    baseRatioQuantity: ing.quantity,
    customQuantity: Number(ing.quantity.toFixed(2)),
    avgCost: ing.rawMaterial?.avgCost || 0,
  }));
}

// Al cambiar el selector de insumo compuesto manualmente
function handleCompoundChange() {
  selectedRecipeId.value = '';
  const mat = currentCompound.value;
  if (mat) {
    const defaultQty = mat.recipeYield || 1;
    quantityToProduce.value = defaultQty;
    populateIngredientsFromCompound(mat, defaultQty);
  }
}

// Recalcular proporciones al cambiar cantidad a fabricar si el usuario no ha puesto valores a mano
function handleQuantityChange() {
  const qty = Number(quantityToProduce.value);
  if (!qty || qty <= 0) return;

  // Si hay una receta seleccionada
  if (selectedRecipeId.value) {
    const rec = elaborationRecipes.value.find((r) => r.id === selectedRecipeId.value);
    if (rec && rec.baseYield > 0) {
      const ratio = qty / rec.baseYield;
      editableIngredients.value.forEach((ing) => {
        ing.customQuantity = Number((ing.baseRatioQuantity * ratio).toFixed(2));
      });
      return;
    }
  }

  // Si es un compuesto de catálogo
  const mat = currentCompound.value;
  if (mat && mat.recipeYield && mat.recipeYield > 0) {
    const ratio = qty / mat.recipeYield;
    editableIngredients.value.forEach((ing) => {
      ing.customQuantity = Number((ing.baseRatioQuantity * ratio).toFixed(2));
    });
  }
}

// Restablecer dosificación teórica proporcional
function resetTheoreticalIngredients() {
  handleQuantityChange();
  toast.info('Dosificación restablecida', {
    description: 'Se volvieron a calcular los insumos teóricos según la fórmula base.',
  });
}

// Sincronizar al abrir el modal
watch(
  () => [props.open, props.preselectedMaterialId],
  ([isOpen, preselected]) => {
    if (isOpen) {
      errorMessage.value = '';
      notes.value = '';
      selectedRecipeId.value = '';
      preparationDate.value = getTodayDateBogota();
      fetchElaborationRecipes();

      if (preselected) {
        selectedMaterialId.value = preselected as number;
      } else if (props.compoundMaterials.length > 0 && !selectedMaterialId.value) {
        selectedMaterialId.value = props.compoundMaterials[0].id;
      }

      const mat = currentCompound.value;
      if (mat) {
        const defaultQty = mat.recipeYield || 1;
        quantityToProduce.value = defaultQty;
        populateIngredientsFromCompound(mat, defaultQty);
      } else {
        quantityToProduce.value = 1;
        editableIngredients.value = [];
      }
    }
  },
  { immediate: true }
);

// Validación si algún insumo tiene stock insuficiente
const hasInsufficientStock = computed(() => {
  return editableIngredients.value.some((ing) => ing.currentAvailable < ing.customQuantity);
});

// Costo estimado total de la preparación
const totalEstimatedCost = computed(() => {
  return editableIngredients.value.reduce((acc, ing) => {
    return acc + ing.customQuantity * ing.avgCost;
  }, 0);
});

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(val || 0);
};

// Ejecutar fabricación
async function handlePrepare() {
  if (!selectedMaterialId.value) {
    errorMessage.value = 'Selecciona un insumo compuesto';
    return;
  }

  const qty = Number(quantityToProduce.value);
  if (!qty || qty <= 0) {
    errorMessage.value = 'Ingresa una cantidad válida mayor a 0';
    return;
  }

  if (editableIngredients.value.length === 0) {
    errorMessage.value = 'Debe haber al menos un insumo para realizar la preparación.';
    return;
  }

  // Validar cantidades no negativas
  for (const ing of editableIngredients.value) {
    if (isNaN(ing.customQuantity) || ing.customQuantity <= 0) {
      errorMessage.value = `La cantidad consumida de "${ing.name}" debe ser mayor a 0.`;
      return;
    }
  }

  if (hasInsufficientStock.value) {
    errorMessage.value = 'No hay suficiente inventario en bodega de uno o más ingredientes para completar la preparación.';
    return;
  }

  isSubmitting.value = true;
  errorMessage.value = '';

  try {
    await http.post(`/inventory/materials/${selectedMaterialId.value}/prepare`, {
      quantityToProduce: qty,
      preparationDate: preparationDate.value,
      notes: notes.value.trim() || undefined,
      recipeId: selectedRecipeId.value ? Number(selectedRecipeId.value) : undefined,
      ingredients: editableIngredients.value.map((ing) => ({
        rawMaterialId: ing.rawMaterialId,
        quantityUsed: Number(ing.customQuantity),
        unitUsed: ing.unit,
      })),
    });

    const comp = currentCompound.value;
    toast.success('¡Insumo Compuesto Elaborado!', {
      description: `Se fabricaron ${qty} ${comp?.unit || 'Kg'} de ${comp?.name} y se descontaron los insumos del almacén.`,
    });

    emit('prepared');
    emit('update:open', false);
  } catch (err: any) {
    errorMessage.value =
      err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Error al registrar la preparación del insumo';
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <DialogRoot :open="open" @update:open="(val: boolean) => emit('update:open', val)">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs transition-opacity" />
      <DialogContent
        class="fixed left-1/2 top-1/2 z-50 flex max-h-[90dvh] w-[calc(100vw-1.5rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-3xl border border-surface-light-border bg-surface-light-card shadow-2xl transition-all dark:border-surface-dark-border dark:bg-surface-dark-card"
      >
        <!-- Header Fijo -->
        <div class="flex shrink-0 items-start justify-between border-b border-surface-light-border p-5 dark:border-surface-dark-border sm:p-6">
          <div class="flex items-center gap-3">
            <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 shadow-2xs dark:bg-amber-950/60 dark:text-amber-300">
              <ChefHat class="h-6 w-6 stroke-[2]" />
            </div>
            <div>
              <DialogTitle class="text-lg font-black text-slate-900 dark:text-white sm:text-xl">
                Preparar Insumo Compuesto
              </DialogTitle>
              <DialogDescription class="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Transforma materias primas en mermeladas, almíbares o preparados internos
              </DialogDescription>
            </div>
          </div>

          <button
            type="button"
            @click="emit('update:open', false)"
            class="rounded-xl p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X class="h-5 w-5 stroke-[2]" />
          </button>
        </div>

        <!-- Formulario -->
        <form @submit.prevent="handlePrepare" novalidate class="flex flex-1 flex-col min-h-0 overflow-hidden">
          <!-- Cuerpo Scrollable -->
          <div class="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 overscroll-contain touch-pan-y">
            <!-- Selector de Receta Maestra (Opcional) -->
            <div
              v-if="elaborationRecipes.length > 0"
              class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-2xl border border-amber-200 bg-amber-50/60 p-3.5 dark:border-amber-900/40 dark:bg-amber-950/20"
            >
              <div class="flex items-center gap-2">
                <BookOpen class="h-4 w-4 text-amber-700 dark:text-amber-400 shrink-0" />
                <div>
                  <span class="text-xs font-bold text-amber-900 dark:text-amber-200">
                    Cargar Receta del Libro (SOP):
                  </span>
                  <p class="text-[11px] text-amber-800/80 dark:text-amber-300">
                    Precarga la fórmula oficial y materias primas estándar con 1 clic
                  </p>
                </div>
              </div>

              <select
                v-model="selectedRecipeId"
                @change="handleRecipeChange"
                class="rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-900 focus:border-amber-600 focus:outline-none dark:border-amber-800 dark:bg-slate-800 dark:text-white sm:w-64"
              >
                <option value="">-- Sin vincular a receta --</option>
                <option v-for="rec in elaborationRecipes" :key="rec.id" :value="rec.id">
                  {{ rec.name }} ({{ rec.code }})
                </option>
              </select>
            </div>

            <!-- Alerta Regla Contable Estricta -->
            <div class="flex items-start gap-2.5 rounded-2xl border border-natural-200 bg-natural-50/70 p-3.5 text-xs text-natural-900 dark:border-natural-900/40 dark:bg-natural-950/20 dark:text-natural-200">
              <Info class="mt-0.5 h-4 w-4 shrink-0 text-natural-600 stroke-[2]" />
              <p class="leading-relaxed">
                <strong>Regla Contable Estricta:</strong> La preparación interna transforma stock existente sin generar egresos en Caja Menor. En Fase B, el yogur envasado absorbe este costo de forma transparente.
              </p>
            </div>

            <!-- Alerta de Error -->
            <div
              v-if="errorMessage"
              class="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
            >
              <AlertCircle class="h-4 w-4 shrink-0 stroke-[2]" />
              <span>{{ errorMessage }}</span>
            </div>

            <!-- Selección de Insumo Compuesto y Cantidad -->
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <SearchableSelect
                  v-model="selectedMaterialId"
                  :options="compoundSelectOptions"
                  label="Insumo Compuesto a Elaborar"
                  placeholder="Buscar compuesto a elaborar..."
                  :required="true"
                  @change="handleCompoundChange"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-600 dark:text-slate-300">
                  Cantidad a Fabricar ({{ currentCompound?.unit || 'Kg' }})
                </label>
                <input
                  v-model.number="quantityToProduce"
                  type="number"
                  min="0"
                  step="any"
                  required
                  placeholder="Ej. 5"
                  @input="handleQuantityChange"
                  class="mt-1 w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2.5 text-xs font-black text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-600 dark:text-slate-300">
                  Fecha de Fabricación
                </label>
                <input
                  v-model="preparationDate"
                  type="date"
                  required
                  class="mt-1 w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-600 dark:text-slate-300">
                  Observaciones / Lote
                </label>
                <input
                  v-model="notes"
                  type="text"
                  placeholder="Ej. Tanda para fresa de la semana"
                  class="mt-1 w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2.5 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
                />
              </div>
            </div>

            <!-- Tabla de Insumos Editables in situ -->
            <div class="space-y-3 rounded-2xl border border-surface-light-border bg-surface-light-canvas p-4 dark:border-surface-dark-border dark:bg-surface-dark-canvas">
              <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <div>
                  <span class="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Materias Primas Requeridas (Ajuste In Situ)
                  </span>
                  <p class="text-[11px] text-slate-500 dark:text-slate-400">
                    Puedes ajustar las cantidades reales pesadas en la paila para esta tanda puntual.
                  </p>
                </div>

                <button
                  type="button"
                  @click="resetTheoreticalIngredients"
                  class="inline-flex items-center gap-1 text-[11px] font-bold text-primary-600 hover:text-primary-700 dark:text-primary-400 self-start sm:self-auto"
                >
                  <RotateCcw class="h-3 w-3" />
                  <span>Restablecer teóricos</span>
                </button>
              </div>

              <div v-if="editableIngredients.length === 0" class="py-4 text-center text-xs text-slate-400">
                No hay ingredientes configurados para este insumo compuesto.
              </div>

              <div v-else class="space-y-2 pt-1">
                <div
                  v-for="(ing, idx) in editableIngredients"
                  :key="idx"
                  class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border p-3 text-xs"
                  :class="
                    ing.currentAvailable >= ing.customQuantity
                      ? 'border-surface-light-border bg-surface-light-card dark:border-surface-dark-border dark:bg-surface-dark-card'
                      : 'border-rose-300 bg-rose-50/50 dark:border-rose-900/60 dark:bg-rose-950/20'
                  "
                >
                  <div class="flex-1">
                    <div class="font-extrabold text-slate-900 dark:text-white">
                      {{ ing.name }}
                    </div>
                    <div class="mt-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      Stock en bodega: <strong>{{ formatStockQuantity(ing.currentAvailable, ing.unit) }} {{ ing.unit }}</strong>
                    </div>
                  </div>

                  <!-- Input editable in situ de cantidad real -->
                  <div class="flex items-center gap-3">
                    <div class="flex items-center gap-1.5">
                      <label class="text-[10px] font-bold text-slate-500">A descontar:</label>
                      <input
                        v-model.number="ing.customQuantity"
                        type="number"
                        min="0.001"
                        step="any"
                        class="w-24 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-right text-xs font-black text-slate-900 focus:border-brand-800 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                      <span class="text-xs font-bold text-slate-600 dark:text-slate-300">
                        {{ ing.unit }}
                      </span>
                    </div>

                    <!-- Insignia de stock -->
                    <span
                      v-if="ing.currentAvailable >= ing.customQuantity"
                      class="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                    >
                      <CheckCircle2 class="h-3 w-3 stroke-[2.5]" />
                      <span class="hidden sm:inline">Disponible</span>
                    </span>
                    <span
                      v-else
                      class="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-black text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                    >
                      <AlertTriangle class="h-3 w-3 stroke-[2.5]" />
                      <span>Falta stock</span>
                    </span>
                  </div>
                </div>
              </div>

              <!-- Resumen de Costo Estimado -->
              <div v-if="totalEstimatedCost > 0" class="flex justify-between items-center pt-2 text-xs text-slate-500 dark:text-slate-400">
                <span>Costo estimado materias primas:</span>
                <span class="font-bold text-slate-800 dark:text-slate-200 font-mono">
                  {{ formatCurrency(totalEstimatedCost) }}
                </span>
              </div>

              <!-- Advertencia de Stock Insuficiente -->
              <div
                v-if="hasInsufficientStock"
                class="flex items-center gap-2 rounded-xl bg-amber-50 p-2.5 text-xs font-bold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
              >
                <AlertTriangle class="h-4 w-4 shrink-0 stroke-[2]" />
                <span>Uno o más insumos no tienen suficiente stock en bodega para la cantidad solicitada.</span>
              </div>
            </div>
          </div>

          <!-- Botones de Acción Fijos en el Fondo -->
          <div class="flex shrink-0 items-center justify-end gap-2 border-t border-surface-light-border bg-surface-light-card p-4 sm:p-6 dark:border-surface-dark-border dark:bg-surface-dark-card">
            <button
              type="button"
              @click="emit('update:open', false)"
              class="rounded-xl border border-surface-light-border bg-surface-light-card px-4 py-2.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-100 dark:border-surface-dark-border dark:bg-surface-dark-card dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>

            <button
              type="submit"
              :disabled="isSubmitting || hasInsufficientStock || editableIngredients.length === 0"
              class="inline-flex items-center gap-2 rounded-xl bg-hero-gradient px-5 py-2.5 text-xs font-extrabold text-white shadow-card transition-transform active:scale-95 disabled:opacity-50"
            >
              <ChefHat class="h-4 w-4 stroke-[2]" />
              <span>{{ isSubmitting ? 'Procesando...' : 'Preparar Insumo' }}</span>
            </button>
          </div>
        </form>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
