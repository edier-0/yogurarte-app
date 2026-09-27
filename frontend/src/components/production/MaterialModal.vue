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
  Boxes,
  ChefHat,
  Plus,
  Trash2,
  X,
  AlertCircle,
  Sparkles,
  Calculator,
} from 'lucide-vue-next';
import { http } from '@/api/client';
import { toast } from 'vue-sonner';

export interface IngredientOption {
  id: number;
  name: string;
  code: string;
  unit: string;
  avgCost: number;
  currentStock: number;
  category?: string;
  isCompound?: boolean;
}

export interface RecipeIngredientRow {
  ingredientId: number | null;
  quantity: number | '';
  unit: string;
}

export interface MaterialToEdit {
  id?: number;
  code?: string;
  name: string;
  category: string;
  unit: string;
  minStockAlert: number;
  avgCost: number;
  currentStock: number;
  isCompound?: boolean;
  recipeYield?: number;
  recipeIngredients?: Array<{
    ingredientId: number;
    quantity: number;
    unit: string;
    ingredient?: {
      name: string;
      unit: string;
      avgCost: number;
    };
  }>;
}

const props = defineProps<{
  open: boolean;
  materialToEdit?: MaterialToEdit | null;
  availableIngredients: IngredientOption[];
}>();

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void;
  (e: 'saved'): void;
}>();

// Estado del formulario
const isCompound = ref(false);
const name = ref('');
const category = ref('MATERIA_PRIMA');
const unit = ref('Kilogramos');
const minStockAlert = ref<number | ''>(5);
const initialStock = ref<number | ''>(0);
const avgCost = ref<number | ''>(0);
const recipeYield = ref<number | ''>(1);
const recipeRows = ref<RecipeIngredientRow[]>([]);

const isSubmitting = ref(false);
const errorMessage = ref('');

// Opciones de unidades estándar
const unitOptions = ['Kilogramos', 'Litros', 'Gramos', 'Mililitros', 'Unidades'];

// Categorías comunes
const categoryOptions = [
  'MATERIA_PRIMA',
  'INSUMO',
  'LACTEOS',
  'EMPAQUES',
  'FRUTAS',
  'ENDULZANTES',
  'PREPARADOS',
  'OTRO',
];

// Insumos elegibles para formar parte de la receta (excluye al mismo si está en edición)
const selectableIngredients = computed(() => {
  return props.availableIngredients.filter(
    (m) => !props.materialToEdit?.id || m.id !== props.materialToEdit.id
  );
});

// Sincronizar datos al abrir modal
watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      errorMessage.value = '';
      if (props.materialToEdit) {
        isCompound.value = Boolean(props.materialToEdit.isCompound);
        name.value = props.materialToEdit.name;
        category.value = props.materialToEdit.category || 'INSUMO';
        unit.value = props.materialToEdit.unit || 'Kilogramos';
        minStockAlert.value = props.materialToEdit.minStockAlert;
        initialStock.value = props.materialToEdit.currentStock;
        avgCost.value = props.materialToEdit.avgCost;
        recipeYield.value = props.materialToEdit.recipeYield || 1;

        if (
          props.materialToEdit.recipeIngredients &&
          props.materialToEdit.recipeIngredients.length > 0
        ) {
          recipeRows.value = props.materialToEdit.recipeIngredients.map((r) => ({
            ingredientId: r.ingredientId,
            quantity: r.quantity,
            unit: r.unit || 'Kilogramos',
          }));
        } else {
          recipeRows.value = [];
        }
      } else {
        // Nuevo insumo por defecto
        isCompound.value = false;
        name.value = '';
        category.value = 'MATERIA_PRIMA';
        unit.value = 'Kilogramos';
        minStockAlert.value = 5;
        initialStock.value = 0;
        avgCost.value = 0;
        recipeYield.value = 1;
        recipeRows.value = [];
      }
    }
  },
  { immediate: true }
);

// Alternar entre Simple y Compuesto
function setCompoundMode(compound: boolean) {
  isCompound.value = compound;
  if (compound) {
    if (category.value === 'MATERIA_PRIMA') {
      category.value = 'INSUMO';
    }
    if (recipeRows.value.length === 0) {
      addRecipeRow();
    }
  }
}

// Manipulación de filas de la receta
function addRecipeRow() {
  const firstAvailable = selectableIngredients.value[0]?.id || null;
  recipeRows.value.push({
    ingredientId: firstAvailable,
    quantity: 1,
    unit: unit.value || 'Kilogramos',
  });
}

function removeRecipeRow(index: number) {
  recipeRows.value.splice(index, 1);
}

// Costo individual de cada ingrediente de la fila según su PMP
function getRowCost(row: RecipeIngredientRow): number {
  if (!row.ingredientId || typeof row.quantity !== 'number' || row.quantity <= 0) return 0;
  const ing = props.availableIngredients.find((m) => m.id === row.ingredientId);
  if (!ing) return 0;

  let qty = row.quantity;
  const isIngKg = ing.unit.toLowerCase().includes('k') || ing.unit.toLowerCase().includes('kg');
  const isRowGram = (row.unit || '').toLowerCase().includes('g') && !(row.unit || '').toLowerCase().includes('k');

  if (isIngKg && isRowGram) {
    qty = qty / 1000;
  } else if (!isIngKg && (row.unit || '').toLowerCase().includes('k')) {
    qty = qty * 1000;
  }

  return Math.round(qty * ing.avgCost);
}

// Cálculo en vivo del costo total de la receta y unitario por kg/L
const totalRecipeCost = computed(() => {
  return recipeRows.value.reduce((sum, row) => sum + getRowCost(row), 0);
});

const calculatedUnitCost = computed(() => {
  const y = typeof recipeYield.value === 'number' && recipeYield.value > 0 ? recipeYield.value : 1;
  return Math.round(totalRecipeCost.value / y);
});

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(val || 0);
};

// Guardar / Registrar Insumo
async function handleSave() {
  errorMessage.value = '';

  if (!name.value.trim()) {
    errorMessage.value = 'Ingresa el nombre del insumo';
    return;
  }

  if (isCompound.value) {
    const validRows = recipeRows.value.filter(
      (r) => r.ingredientId && typeof r.quantity === 'number' && r.quantity > 0
    );
    if (validRows.length === 0) {
      errorMessage.value = 'Debes agregar al menos un ingrediente válido a la receta';
      return;
    }
  }

  isSubmitting.value = true;
  try {
    const payload: any = {
      name: name.value.trim(),
      category: category.value,
      unit: unit.value.trim(),
      minStockAlert: Number(minStockAlert.value) || 0,
      isCompound: isCompound.value,
    };

    if (isCompound.value) {
      payload.recipeYield = Number(recipeYield.value) > 0 ? Number(recipeYield.value) : 1;
      payload.recipeIngredients = recipeRows.value
        .filter((r) => r.ingredientId && typeof r.quantity === 'number' && r.quantity > 0)
        .map((r) => ({
          ingredientId: Number(r.ingredientId),
          quantity: Number(r.quantity),
          unit: r.unit || 'Kilogramos',
        }));
      payload.avgCost = calculatedUnitCost.value;
    } else {
      payload.avgCost = Number(avgCost.value) || 0;
      if (!props.materialToEdit) {
        payload.currentStock = Number(initialStock.value) || 0;
      }
    }

    if (props.materialToEdit?.id) {
      await http.put(`/inventory/materials/${props.materialToEdit.id}`, payload);
      toast.success('Insumo Actualizado', {
        description: `Se guardaron los cambios de ${name.value.trim()}.`,
      });
    } else {
      await http.post('/inventory/materials', payload);
      toast.success(
        isCompound.value ? 'Insumo Compuesto Creado' : 'Insumo Simple Registrado',
        {
          description: `${name.value.trim()} está listo para su uso en producción.`,
        }
      );
    }

    emit('saved');
    emit('update:open', false);
  } catch (err: any) {
    errorMessage.value = err?.response?.data?.error || err?.message || 'Error al guardar el insumo';
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <DialogRoot :open="open" @update:open="(val: boolean) => emit('update:open', val)">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm transition-opacity" />
      <DialogContent
        class="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[95vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl border border-surface-light-border bg-surface-light-card p-6 shadow-2xl transition-all dark:border-surface-dark-border dark:bg-surface-dark-card sm:p-7"
      >
        <!-- Header -->
        <div class="flex items-start justify-between border-b border-surface-light-border pb-4 dark:border-surface-dark-border">
          <div class="flex items-center gap-3">
            <div
              class="flex h-11 w-11 items-center justify-center rounded-2xl shadow-sm"
              :class="
                isCompound
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                  : 'bg-brand-50 text-brand-800 dark:bg-brand-900/40 dark:text-brand-darkText'
              "
            >
              <ChefHat v-if="isCompound" class="h-6 w-6 stroke-[2]" />
              <Boxes v-else class="h-6 w-6 stroke-[2]" />
            </div>
            <div>
              <DialogTitle class="text-lg font-black text-slate-900 dark:text-white sm:text-xl">
                {{ materialToEdit ? 'Editar Insumo o Materia Prima' : 'Nuevo Insumo de Producción' }}
              </DialogTitle>
              <DialogDescription class="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Define insumos simples abastecidos por compras o recetas compuestas internas
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

        <!-- Selector de Tipo: Simple vs Compuesto -->
        <div class="mt-5 grid grid-cols-2 gap-2 rounded-2xl bg-surface-light-canvas p-1.5 dark:bg-surface-dark-canvas">
          <button
            type="button"
            @click="setCompoundMode(false)"
            class="flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-extrabold transition-all"
            :class="
              !isCompound
                ? 'bg-white text-slate-900 shadow-sm dark:bg-surface-dark-card dark:text-white'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            "
          >
            <Boxes class="h-4 w-4 stroke-[2]" />
            <span>Insumo Simple (Compras)</span>
          </button>

          <button
            type="button"
            @click="setCompoundMode(true)"
            class="flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-extrabold transition-all"
            :class="
              isCompound
                ? 'bg-brand-800 text-white shadow-sm dark:bg-brand-600'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            "
          >
            <ChefHat class="h-4 w-4 stroke-[2]" />
            <span>Insumo Compuesto (Receta)</span>
          </button>
        </div>

        <!-- Banner informativo según tipo -->
        <div
          class="mt-4 flex items-start gap-2.5 rounded-2xl border p-3.5 text-xs"
          :class="
            isCompound
              ? 'border-amber-200 bg-amber-50/60 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200'
              : 'border-slate-200 bg-slate-50/80 text-slate-700 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-300'
          "
        >
          <Sparkles class="mt-0.5 h-4 w-4 shrink-0 stroke-[2]" :class="isCompound ? 'text-amber-600' : 'text-slate-500'" />
          <p class="leading-relaxed">
            <template v-if="isCompound">
              <strong>Insumo Compuesto:</strong> Se elabora en planta a partir de otros insumos (ej. Mermelada = Fruta + Azúcar).
              Su costo se calcula automáticamente según el PMP de los ingredientes y <strong>no genera egresos de caja al fabricarse</strong>.
            </template>
            <template v-else>
              <strong>Insumo Simple:</strong> Materia prima directa adquirida a proveedores externos (ej. Leche cruda, azúcar, botellas, etiquetas).
            </template>
          </p>
        </div>

        <!-- Formulario -->
        <form @submit.prevent="handleSave" novalidate class="mt-5 space-y-4">
          <!-- Alerta de Error -->
          <div
            v-if="errorMessage"
            class="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
          >
            <AlertCircle class="h-4 w-4 shrink-0 stroke-[2]" />
            <span>{{ errorMessage }}</span>
          </div>

          <!-- Datos Generales -->
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div class="sm:col-span-2">
              <label class="block text-xs font-bold text-slate-600 dark:text-slate-300">
                Nombre del Insumo / Preparación
              </label>
              <input
                v-model="name"
                type="text"
                required
                :placeholder="isCompound ? 'Ej. Mermelada de Fresa Especial' : 'Ej. Leche Entera Pasteurizada'"
                class="mt-1 w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2.5 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-600 dark:text-slate-300">
                Categoría
              </label>
              <select
                v-model="category"
                class="mt-1 w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
              >
                <option v-for="cat in categoryOptions" :key="cat" :value="cat">
                  {{ cat }}
                </option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-600 dark:text-slate-300">
                Unidad de Medida
              </label>
              <select
                v-model="unit"
                class="mt-1 w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
              >
                <option v-for="u in unitOptions" :key="u" :value="u">
                  {{ u }}
                </option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-600 dark:text-slate-300">
                Stock Mínimo de Alerta
              </label>
              <input
                v-model.number="minStockAlert"
                type="number"
                min="0"
                step="any"
                class="mt-1 w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
              />
            </div>

            <!-- Campos específicos para Insumo Simple -->
            <template v-if="!isCompound">
              <div>
                <label class="block text-xs font-bold text-slate-600 dark:text-slate-300">
                  Costo Promedio Inicial ($ COP / {{ unit }})
                </label>
                <input
                  v-model.number="avgCost"
                  type="number"
                  min="0"
                  step="any"
                  class="mt-1 w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
                />
              </div>

              <div v-if="!materialToEdit">
                <label class="block text-xs font-bold text-slate-600 dark:text-slate-300">
                  Stock Inicial Físico
                </label>
                <input
                  v-model.number="initialStock"
                  type="number"
                  min="0"
                  step="any"
                  class="mt-1 w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
                />
              </div>
            </template>
          </div>

          <!-- SECCIÓN: CONSTRUCTOR DE RECETA DINÁMICA (Solo Insumos Compuestos) -->
          <div
            v-if="isCompound"
            class="space-y-3 rounded-2xl border border-amber-300/70 bg-amber-50/20 p-4 dark:border-amber-900/40 dark:bg-amber-950/10"
          >
            <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 class="text-xs font-black uppercase tracking-wider text-amber-900 dark:text-amber-300">
                  Constructor de Receta Base
                </h4>
                <p class="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Ingredientes simples requeridos para producir una tanda base
                </p>
              </div>

              <div class="flex items-center gap-2">
                <span class="text-xs font-bold text-slate-600 dark:text-slate-300">Rendimiento Base:</span>
                <input
                  v-model.number="recipeYield"
                  type="number"
                  min="0"
                  step="any"
                  required
                  class="w-20 rounded-xl border border-surface-light-border bg-white px-2.5 py-1.5 text-xs font-black text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
                />
                <span class="text-xs font-bold text-slate-500">{{ unit }}</span>
              </div>
            </div>

            <!-- Lista Dinámica de Ingredientes -->
            <div class="space-y-2 pt-1">
              <div
                v-for="(row, idx) in recipeRows"
                :key="idx"
                class="flex flex-col gap-2 rounded-xl border border-surface-light-border bg-white p-3 dark:border-surface-dark-border dark:bg-surface-dark-canvas sm:flex-row sm:items-center sm:justify-between"
              >
                <!-- Selector de Materia Prima -->
                <div class="flex-1">
                  <label class="block text-[10px] font-bold text-slate-400">Ingrediente {{ idx + 1 }}</label>
                  <select
                    v-model="row.ingredientId"
                    class="mt-0.5 w-full rounded-lg border border-surface-light-border bg-surface-light-card px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-card dark:text-white"
                  >
                    <option v-for="ing in selectableIngredients" :key="ing.id" :value="ing.id">
                      {{ ing.name }} (Stock: {{ ing.currentStock }} {{ ing.unit }} • PMP: {{ formatCurrency(ing.avgCost) }})
                    </option>
                  </select>
                </div>

                <!-- Cantidad Requerida -->
                <div class="w-full sm:w-28">
                  <label class="block text-[10px] font-bold text-slate-400">Cantidad</label>
                  <input
                    v-model.number="row.quantity"
                    type="number"
                    min="0"
                    step="any"
                    placeholder="Cant."
                    class="mt-0.5 w-full rounded-lg border border-surface-light-border bg-surface-light-card px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-card dark:text-white"
                  />
                </div>

                <!-- Unidad -->
                <div class="w-full sm:w-28">
                  <label class="block text-[10px] font-bold text-slate-400">Unidad</label>
                  <select
                    v-model="row.unit"
                    class="mt-0.5 w-full rounded-lg border border-surface-light-border bg-surface-light-card px-2 py-1.5 text-xs font-semibold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-card dark:text-white"
                  >
                    <option value="Kilogramos">Kilogramos</option>
                    <option value="Gramos">Gramos</option>
                    <option value="Litros">Litros</option>
                    <option value="Mililitros">Mililitros</option>
                    <option value="Unidades">Unidades</option>
                  </select>
                </div>

                <!-- Costo parcial y botón eliminar -->
                <div class="flex items-center justify-between sm:justify-end gap-2 pt-1 sm:pt-4">
                  <div class="text-right">
                    <span class="block text-[10px] font-bold text-slate-400">Costo Estimado</span>
                    <span class="text-xs font-black text-slate-800 dark:text-slate-200">
                      {{ formatCurrency(getRowCost(row)) }}
                    </span>
                  </div>

                  <button
                    type="button"
                    @click="removeRecipeRow(idx)"
                    class="rounded-lg p-1.5 text-rose-500 transition-colors hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    title="Eliminar ingrediente de la receta"
                  >
                    <Trash2 class="h-4 w-4 stroke-[2]" />
                  </button>
                </div>
              </div>

              <!-- Botón Añadir Ingrediente -->
              <button
                type="button"
                @click="addRecipeRow"
                class="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-amber-400/80 bg-white/60 py-2.5 text-xs font-extrabold text-amber-800 transition-colors hover:bg-amber-100/50 dark:border-amber-700/60 dark:bg-surface-dark-canvas/60 dark:text-amber-300"
              >
                <Plus class="h-4 w-4 stroke-[2.5]" />
                <span>Añadir Ingrediente a la Receta</span>
              </button>
            </div>

            <!-- Resumen de Costos de Fabricación -->
            <div class="mt-4 rounded-xl border border-amber-200 bg-white p-3.5 shadow-sm dark:border-amber-900/40 dark:bg-surface-dark-card">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-slate-600 dark:text-slate-300">Costo Total Lote Base:</span>
                <span class="text-sm font-black text-slate-900 dark:text-white">
                  {{ formatCurrency(totalRecipeCost) }}
                </span>
              </div>
              <div class="mt-1.5 flex items-center justify-between border-t border-slate-100 pt-1.5 dark:border-slate-800">
                <div class="flex items-center gap-1.5">
                  <Calculator class="h-4 w-4 text-brand-800 dark:text-brand-darkText" />
                  <span class="text-xs font-black text-brand-800 dark:text-brand-darkText">
                    Costo de Fabricación Unitario Calculado:
                  </span>
                </div>
                <span class="text-base font-black text-brand-800 dark:text-brand-darkText">
                  {{ formatCurrency(calculatedUnitCost) }} / {{ unit }}
                </span>
              </div>
            </div>
          </div>

          <!-- Botones de Acción -->
          <div class="flex items-center justify-end gap-2 pt-3">
            <button
              type="button"
              @click="emit('update:open', false)"
              class="rounded-xl border border-surface-light-border bg-surface-light-card px-4 py-2.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-100 dark:border-surface-dark-border dark:bg-surface-dark-card dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>

            <button
              type="submit"
              :disabled="isSubmitting"
              class="inline-flex items-center gap-2 rounded-xl bg-hero-gradient px-5 py-2.5 text-xs font-extrabold text-white shadow-card transition-transform active:scale-95 disabled:opacity-50"
            >
              <ChefHat v-if="isCompound" class="h-4 w-4 stroke-[2]" />
              <Boxes v-else class="h-4 w-4 stroke-[2]" />
              <span>{{ isSubmitting ? 'Guardando...' : materialToEdit ? 'Guardar Cambios' : 'Registrar Insumo' }}</span>
            </button>
          </div>
        </form>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
