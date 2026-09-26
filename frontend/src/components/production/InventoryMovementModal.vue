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
  ArrowUpRight,
  ArrowDownLeft,
  X,
  AlertCircle,
  Plus,
} from 'lucide-vue-next';
import { http } from '@/api/client';
import { toast } from 'vue-sonner';
import { getTodayDateBogota } from '@/stores/finance.store';
import { formatStockQuantity } from '@/utils/formatters';

export interface MaterialOption {
  id: number;
  name: string;
  category: string;
  unit: string;
  currentStock: number;
  minStockAlert: number;
}

const props = defineProps<{
  open: boolean;
  materials: MaterialOption[];
  preselectedMaterialId?: number | null;
}>();

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void;
  (e: 'saved'): void;
}>();

const selectedMaterialId = ref<number | null>(null);
const movementType = ref<'ENTRADA' | 'SALIDA'>('ENTRADA');
const quantity = ref<number | ''>('');
const reason = ref('');
const registeredBy = ref('Edier');
const adjustmentDate = ref(getTodayDateBogota());

const isSubmitting = ref(false);
const errorMessage = ref('');

// Sincronizar selección de insumo
watch(
  () => [props.open, props.preselectedMaterialId],
  ([isOpen, preselected]) => {
    if (isOpen) {
      errorMessage.value = '';
      quantity.value = '';
      reason.value = '';
      if (preselected) {
        selectedMaterialId.value = preselected as number;
      } else if (props.materials.length > 0 && !selectedMaterialId.value) {
        selectedMaterialId.value = props.materials[0].id;
      }
    }
  },
  { immediate: true }
);

const currentMaterial = computed(() => {
  return props.materials.find((m) => m.id === selectedMaterialId.value);
});

// Cálculo del nuevo stock resultante
const calculatedNewStock = computed(() => {
  if (!currentMaterial.value) return 0;
  const curr = currentMaterial.value.currentStock || 0;
  const qty = typeof quantity.value === 'number' ? quantity.value : 0;
  if (movementType.value === 'ENTRADA') {
    return Math.round((curr + qty) * 1000) / 1000;
  } else {
    return Math.max(0, Math.round((curr - qty) * 1000) / 1000);
  }
});

const isFormValid = computed(() => {
  return (
    selectedMaterialId.value !== null &&
    typeof quantity.value === 'number' &&
    quantity.value > 0 &&
    reason.value.trim().length > 0
  );
});

function handleClose() {
  emit('update:open', false);
  errorMessage.value = '';
}

async function handleSubmit() {
  if (!isFormValid.value || !currentMaterial.value) {
    errorMessage.value = 'Por favor completa todos los campos con valores válidos.';
    return;
  }

  isSubmitting.value = true;
  errorMessage.value = '';

  try {
    const typeLabel = movementType.value === 'ENTRADA' ? 'COMPRA_REPOSICION' : 'MERMA_CONSUMO';

    await http.post('/inventory/adjustments', {
      rawMaterialId: selectedMaterialId.value,
      newStock: calculatedNewStock.value,
      type: typeLabel,
      reason: reason.value.trim(),
      registeredBy: registeredBy.value || 'Edier',
      adjustmentDate: adjustmentDate.value,
    });

    toast.success('¡Movimiento Registrado en Kardex!', {
      description: `${currentMaterial.value.name}: ${movementType.value === 'ENTRADA' ? '+' : '-'}${quantity.value} ${currentMaterial.value.unit}. Nuevo stock: ${calculatedNewStock.value} ${currentMaterial.value.unit}.`,
    });

    emit('saved');
    handleClose();
  } catch (err: any) {
    errorMessage.value = err?.message || 'Error al asentar el movimiento en el Kardex';
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <DialogRoot :open="open" @update:open="(val: boolean) => emit('update:open', val)">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity" />

      <DialogContent
        class="fixed left-1/2 top-1/2 z-50 w-[95%] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-surface-light-border bg-surface-light-card p-6 shadow-2xl transition-all focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-card sm:p-7 max-h-[92vh] overflow-y-auto"
      >
        <div class="flex items-center justify-between border-b border-surface-light-border pb-4 dark:border-surface-dark-border">
          <div class="flex items-center gap-2.5">
            <div
              class="flex h-10 w-10 items-center justify-center rounded-xl"
              :class="
                movementType === 'ENTRADA'
                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                  : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
              "
            >
              <ArrowUpRight v-if="movementType === 'ENTRADA'" class="h-5 w-5 stroke-[2.5]" />
              <ArrowDownLeft v-else class="h-5 w-5 stroke-[2.5]" />
            </div>
            <div>
              <DialogTitle class="text-base font-extrabold text-slate-900 dark:text-white sm:text-lg">
                Movimiento de Kardex
              </DialogTitle>
              <DialogDescription class="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Ajuste atómico de entrada o salida con trazabilidad de almacén
              </DialogDescription>
            </div>
          </div>

          <button
            type="button"
            @click="handleClose"
            class="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X class="h-5 w-5" />
          </button>
        </div>

        <form @submit.prevent="handleSubmit" class="mt-5 space-y-4">
          <!-- Tipo de Movimiento (Entrada vs Salida) -->
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Tipo de Movimiento *
            </label>
            <div class="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                @click="movementType = 'ENTRADA'"
                class="flex items-center justify-center gap-2 rounded-2xl border p-3 text-xs font-extrabold transition-all"
                :class="
                  movementType === 'ENTRADA'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-700 shadow-sm dark:border-emerald-400 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : 'border-surface-light-border bg-surface-light-canvas text-slate-600 hover:border-slate-300 dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-slate-400'
                "
              >
                <ArrowUpRight class="h-4 w-4 stroke-[2.5]" />
                <span>Entrada (Compra / Reposición)</span>
              </button>

              <button
                type="button"
                @click="movementType = 'SALIDA'"
                class="flex items-center justify-center gap-2 rounded-2xl border p-3 text-xs font-extrabold transition-all"
                :class="
                  movementType === 'SALIDA'
                    ? 'border-rose-600 bg-rose-50 text-rose-700 shadow-sm dark:border-rose-400 dark:bg-rose-950/40 dark:text-rose-300'
                    : 'border-surface-light-border bg-surface-light-canvas text-slate-600 hover:border-slate-300 dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-slate-400'
                "
              >
                <ArrowDownLeft class="h-4 w-4 stroke-[2.5]" />
                <span>Salida (Merma / Consumo)</span>
              </button>
            </div>
          </div>

          <!-- Selección del Insumo -->
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Insumo / Materia Prima *
            </label>
            <select
              v-model="selectedMaterialId"
              required
              class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
            >
              <option v-for="mat in materials" :key="mat.id" :value="mat.id">
                {{ mat.name }} (Stock: {{ formatStockQuantity(mat.currentStock, mat.unit) }} {{ mat.unit }})
              </option>
            </select>
          </div>

          <!-- Cantidad y Stock Resultante -->
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Cantidad a {{ movementType === 'ENTRADA' ? 'Ingresar' : 'Descontar' }} *
              </label>
              <div class="relative">
                <input
                  v-model.number="quantity"
                  type="number"
                  min="0.01"
                  step="any"
                  placeholder="10"
                  required
                  class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas py-2.5 pl-3.5 pr-14 text-sm font-extrabold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
                />
                <span class="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  {{ currentMaterial?.unit || 'Und' }}
                </span>
              </div>
            </div>

            <!-- Preview del Stock -->
            <div class="rounded-xl border border-surface-light-border bg-surface-light-canvas p-3 dark:border-surface-dark-border dark:bg-surface-dark-canvas">
              <span class="block text-[10px] font-extrabold uppercase text-slate-400">
                Stock Resultante en Kardex
              </span>
              <div class="mt-1 flex items-baseline gap-2">
                <span class="text-sm font-bold text-slate-400 line-through">
                  {{ formatStockQuantity(currentMaterial?.currentStock || 0, currentMaterial?.unit || 'und') }}
                </span>
                <span class="text-base font-black text-slate-900 dark:text-white">
                  ➔ {{ formatStockQuantity(calculatedNewStock, currentMaterial?.unit || 'und') }} {{ currentMaterial?.unit || '' }}
                </span>
              </div>
            </div>
          </div>

          <!-- Motivo / Justificación -->
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Motivo / Justificación *
            </label>
            <input
              v-model="reason"
              type="text"
              placeholder="Ej: Reposición proveedor, merma por tapa defectuosa..."
              required
              class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
            />
          </div>

          <!-- Responsable y Fecha -->
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Responsable
              </label>
              <input
                v-model="registeredBy"
                type="text"
                placeholder="Edier"
                class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Fecha del Movimiento
              </label>
              <input
                v-model="adjustmentDate"
                type="date"
                required
                class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
              />
            </div>
          </div>

          <!-- Error Alert -->
          <div
            v-if="errorMessage"
            class="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-600 dark:bg-rose-950/40 dark:text-rose-400"
          >
            <AlertCircle class="h-4 w-4 shrink-0" />
            <span>{{ errorMessage }}</span>
          </div>

          <!-- Botones de Acción -->
          <div class="flex items-center justify-end gap-2.5 pt-3">
            <button
              type="button"
              @click="handleClose"
              class="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              :disabled="!isFormValid || isSubmitting"
              class="inline-flex items-center gap-2 rounded-xl bg-hero-gradient px-5 py-2.5 text-xs font-extrabold text-white shadow-card transition-transform active:scale-95 disabled:opacity-50"
            >
              <Plus class="h-4 w-4 stroke-[2.5]" />
              <span>{{ isSubmitting ? 'Asentando...' : 'Asentar en Kardex' }}</span>
            </button>
          </div>
        </form>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
