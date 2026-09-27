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
} from 'lucide-vue-next';
import { http } from '@/api/client';
import { toast } from 'vue-sonner';
import { getTodayDateBogota } from '@/stores/finance.store';
import { formatStockQuantity } from '@/utils/formatters';

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

const props = defineProps<{
  open: boolean;
  compoundMaterials: CompoundMaterialOption[];
  preselectedMaterialId?: number | null;
}>();

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void;
  (e: 'prepared'): void;
}>();

// Estado del formulario
const selectedMaterialId = ref<number | null>(null);
const quantityToProduce = ref<number | ''>('');
const preparationDate = ref(getTodayDateBogota());
const notes = ref('');

const isSubmitting = ref(false);
const errorMessage = ref('');

// Sincronizar al abrir el modal
watch(
  () => [props.open, props.preselectedMaterialId],
  ([isOpen, preselected]) => {
    if (isOpen) {
      errorMessage.value = '';
      notes.value = '';
      preparationDate.value = getTodayDateBogota();

      if (preselected) {
        selectedMaterialId.value = preselected as number;
      } else if (props.compoundMaterials.length > 0 && !selectedMaterialId.value) {
        selectedMaterialId.value = props.compoundMaterials[0].id;
      }

      const mat = currentCompound.value;
      if (mat) {
        quantityToProduce.value = mat.recipeYield || 1;
      } else {
        quantityToProduce.value = 1;
      }
    }
  },
  { immediate: true }
);

// Insumo compuesto seleccionado
const currentCompound = computed(() => {
  return props.compoundMaterials.find((m) => m.id === selectedMaterialId.value) || null;
});

// Al cambiar el selector de insumo compuesto, actualizar cantidad por defecto al rendimiento base
function handleCompoundChange() {
  const mat = currentCompound.value;
  if (mat) {
    quantityToProduce.value = mat.recipeYield || 1;
  }
}

// Insumos calculados y escalados para la cantidad a fabricar
const scaledIngredients = computed(() => {
  const comp = currentCompound.value;
  if (!comp || !comp.recipeIngredients) return [];

  const targetQty = typeof quantityToProduce.value === 'number' && quantityToProduce.value > 0
    ? quantityToProduce.value
    : 0;
  const baseYield = comp.recipeYield || 1;
  const ratio = baseYield > 0 ? targetQty / baseYield : 1;

  return comp.recipeIngredients.map((ri) => {
    const requiredQty = ri.quantity * ratio;
    const currentAvailable = ri.ingredient?.currentStock ?? 0;
    const isSufficient = currentAvailable >= requiredQty;

    return {
      name: ri.ingredient?.name || `Ingrediente #${ri.ingredientId}`,
      unit: ri.unit || ri.ingredient?.unit || 'Kg',
      requiredQty,
      currentAvailable,
      isSufficient,
      avgCost: ri.ingredient?.avgCost || 0,
      totalCost: Math.round(requiredQty * (ri.ingredient?.avgCost || 0)),
    };
  });
});

// Validación si todos los insumos tienen stock suficiente
const hasInsufficientStock = computed(() => {
  return scaledIngredients.value.some((ing) => !ing.isSufficient);
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

  if (hasInsufficientStock.value) {
    errorMessage.value = 'No hay suficiente inventario de uno o más ingredientes para completar la preparación';
    return;
  }

  isSubmitting.value = true;
  errorMessage.value = '';

  try {
    await http.post(`/inventory/materials/${selectedMaterialId.value}/prepare`, {
      quantityToProduce: qty,
      preparationDate: preparationDate.value,
      notes: notes.value.trim() || undefined,
    });

    const comp = currentCompound.value;
    toast.success('¡Insumo Compuesto Elaborado!', {
      description: `Se fabricaron ${qty} ${comp?.unit || 'Kg'} de ${comp?.name} y se descontaron los insumos del almacén.`,
    });

    emit('prepared');
    emit('update:open', false);
  } catch (err: any) {
    errorMessage.value =
      err?.response?.data?.error || err?.message || 'Error al registrar la preparación del insumo';
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
            <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 shadow-sm dark:bg-amber-950/60 dark:text-amber-300">
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

        <!-- Alerta Regla Contable Estricta -->
        <div class="mt-4 flex items-start gap-2.5 rounded-2xl border border-natural-200 bg-natural-50/70 p-3.5 text-xs text-natural-900 dark:border-natural-900/40 dark:bg-natural-950/20 dark:text-natural-200">
          <Info class="mt-0.5 h-4 w-4 shrink-0 text-natural-600 stroke-[2]" />
          <p class="leading-relaxed">
            <strong>Regla Contable Estricta:</strong> La preparación interna transforma stock existente sin generar egresos en Caja Menor ni nuevos Gastos. En Fase B, el yogur envasado absorbe este costo de forma transparente.
          </p>
        </div>

        <!-- Formulario -->
        <form @submit.prevent="handlePrepare" novalidate class="mt-5 space-y-4">
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
              <label class="block text-xs font-bold text-slate-600 dark:text-slate-300">
                Insumo Compuesto a Elaborar
              </label>
              <select
                v-model="selectedMaterialId"
                @change="handleCompoundChange"
                class="mt-1 w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
              >
                <option v-for="c in compoundMaterials" :key="c.id" :value="c.id">
                  {{ c.name }} (Stock: {{ c.currentStock }} {{ c.unit }})
                </option>
              </select>
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

          <!-- Tabla / Checklist de Insumos que se Descontarán -->
          <div class="space-y-2 rounded-2xl border border-surface-light-border bg-surface-light-canvas p-4 dark:border-surface-dark-border dark:bg-surface-dark-canvas">
            <div class="flex items-center justify-between">
              <span class="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                Materias Primas Requeridas (Descuento Automático)
              </span>
              <span class="text-[11px] font-bold text-slate-400">
                Rendimiento base: {{ currentCompound?.recipeYield || 1 }} {{ currentCompound?.unit || 'Kg' }}
              </span>
            </div>

            <div v-if="scaledIngredients.length === 0" class="py-3 text-center text-xs text-slate-400">
              No hay ingredientes configurados en la receta de este insumo.
            </div>

            <div v-else class="space-y-2 pt-1">
              <div
                v-for="(ing, idx) in scaledIngredients"
                :key="idx"
                class="flex items-center justify-between rounded-xl border p-3 text-xs"
                :class="
                  ing.isSufficient
                    ? 'border-surface-light-border bg-surface-light-card dark:border-surface-dark-border dark:bg-surface-dark-card'
                    : 'border-rose-300 bg-rose-50/50 dark:border-rose-900/60 dark:bg-rose-950/20'
                "
              >
                <div>
                  <div class="font-extrabold text-slate-900 dark:text-white">
                    {{ ing.name }}
                  </div>
                  <div class="mt-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Stock en almacén: <strong>{{ formatStockQuantity(ing.currentAvailable, ing.unit) }} {{ ing.unit }}</strong>
                  </div>
                </div>

                <div class="flex items-center gap-3">
                  <div class="text-right">
                    <div class="font-black text-slate-900 dark:text-white">
                      -{{ formatStockQuantity(ing.requiredQty, ing.unit) }} {{ ing.unit }}
                    </div>
                    <div class="text-[10px] font-semibold text-slate-400">
                      {{ formatCurrency(ing.totalCost) }}
                    </div>
                  </div>

                  <span
                    v-if="ing.isSufficient"
                    class="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                  >
                    <CheckCircle2 class="h-3 w-3 stroke-[2.5]" />
                    <span>Disponible</span>
                  </span>
                  <span
                    v-else
                    class="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-black text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                  >
                    <AlertTriangle class="h-3 w-3 stroke-[2.5]" />
                    <span>Insuficiente</span>
                  </span>
                </div>
              </div>
            </div>

            <!-- Advertencia de Stock Insuficiente -->
            <div
              v-if="hasInsufficientStock"
              class="flex items-center gap-2 rounded-xl bg-amber-50 p-2.5 text-xs font-bold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
            >
              <AlertTriangle class="h-4 w-4 shrink-0 stroke-[2]" />
              <span>No es posible continuar: uno o más insumos no tienen suficiente stock en bodega.</span>
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
              :disabled="isSubmitting || hasInsufficientStock || scaledIngredients.length === 0"
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
