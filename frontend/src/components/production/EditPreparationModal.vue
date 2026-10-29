<script setup lang="ts">
import { ref, watch } from 'vue';
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
  Pencil,
  Calendar,
  FileText,
  User,
} from 'lucide-vue-next';
import { http } from '@/api/client';
import { toast } from 'vue-sonner';
import { toInputDateFormat } from '@/stores/finance.store';
import { formatStockQuantity } from '@/utils/formatters';

export interface PreparationItem {
  id: number;
  code: string;
  name: string;
  outputMaterialId: number;
  quantityProduced: number;
  unit: string;
  totalCost: number;
  costPerUnit: number;
  preparationDate: string;
  notes?: string | null;
  registeredBy?: string | null;
  outputMaterial?: {
    id: number;
    name: string;
    unit: string;
    currentStock: number;
  };
  ingredients?: Array<{
    id: number;
    rawMaterialId: number;
    quantityUsed: number;
    unitUsed?: string;
    totalCost: number;
    rawMaterial?: {
      id: number;
      name: string;
      unit: string;
      currentStock: number;
    };
  }>;
}

const props = defineProps<{
  open: boolean;
  preparation: PreparationItem | null;
}>();

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void;
  (e: 'updated'): void;
}>();

const preparationDate = ref('');
const notes = ref('');
const registeredBy = ref('');

const isSubmitting = ref(false);
const errorMessage = ref('');

watch(
  () => [props.open, props.preparation],
  ([isOpen]) => {
    if (isOpen && props.preparation) {
      errorMessage.value = '';
      preparationDate.value = toInputDateFormat(props.preparation.preparationDate);
      notes.value = props.preparation.notes || '';
      registeredBy.value = props.preparation.registeredBy || '';
    }
  },
  { immediate: true }
);

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(val || 0);
};

async function handleSave() {
  if (!props.preparation) return;

  isSubmitting.value = true;
  errorMessage.value = '';

  try {
    await http.put(`/preparations/${props.preparation.id}`, {
      preparationDate: preparationDate.value || undefined,
      notes: notes.value.trim() || null,
      registeredBy: registeredBy.value.trim() || undefined,
    });

    toast.success('Elaboración actualizada exitosamente');
    emit('updated');
    emit('update:open', false);
  } catch (err: any) {
    errorMessage.value =
      err?.response?.data?.error || err?.message || 'Error al actualizar la elaboración';
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
        class="fixed left-1/2 top-1/2 z-50 flex max-h-[90dvh] w-[calc(100vw-1.5rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-3xl border border-surface-light-border bg-surface-light-card shadow-2xl transition-all dark:border-surface-dark-border dark:bg-surface-dark-card"
      >
        <!-- Header Fijo (shrink-0) -->
        <div class="flex shrink-0 items-start justify-between border-b border-surface-light-border p-5 dark:border-surface-dark-border sm:p-6">
          <div class="flex items-center gap-3">
            <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 shadow-sm dark:bg-amber-950/60 dark:text-amber-300">
              <Pencil class="h-5 w-5 stroke-[2]" />
            </div>
            <div>
              <DialogTitle class="text-lg font-black text-slate-900 dark:text-white sm:text-xl">
                Editar Elaboración {{ preparation?.code }}
              </DialogTitle>
              <DialogDescription class="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Modifica fecha, lote o notas descriptivas sin alterar el inventario
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
        <form @submit.prevent="handleSave" novalidate class="flex flex-1 flex-col min-h-0 overflow-hidden">
          <!-- Cuerpo Scrollable (flex-1 overflow-y-auto min-h-0) -->
          <div class="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 overscroll-contain touch-pan-y">
            <!-- Alerta de Error -->
            <div
              v-if="errorMessage"
              class="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
            >
              <AlertCircle class="h-4 w-4 shrink-0 stroke-[2]" />
              <span>{{ errorMessage }}</span>
            </div>

            <!-- Resumen Informativo Fijo de lo Elaborado -->
            <div class="rounded-2xl border border-surface-light-border bg-surface-light-canvas p-4 dark:border-surface-dark-border dark:bg-surface-dark-canvas space-y-2">
              <div class="flex items-center justify-between text-xs font-extrabold text-slate-700 dark:text-slate-200">
                <span class="flex items-center gap-1.5">
                  <ChefHat class="h-4 w-4 text-amber-600" />
                  {{ preparation?.name }}
                </span>
                <span class="text-brand-800 dark:text-brand-darkText font-black">
                  +{{ preparation?.quantityProduced }} {{ preparation?.unit }}
                </span>
              </div>
              <div class="flex items-center justify-between text-[11px] text-slate-400">
                <span>Costo total: {{ formatCurrency(preparation?.totalCost || 0) }}</span>
                <span>Costo unitario: {{ formatCurrency(preparation?.costPerUnit || 0) }} / {{ preparation?.unit }}</span>
              </div>
            </div>

            <!-- Campos Editables -->
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Fecha de Fabricación
                </label>
                <div class="relative">
                  <Calendar class="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    v-model="preparationDate"
                    type="date"
                    required
                    class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas py-2.5 pl-9 pr-3 text-xs font-semibold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Responsable
                </label>
                <div class="relative">
                  <User class="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    v-model="registeredBy"
                    type="text"
                    placeholder="Ej. Edier"
                    class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas py-2.5 pl-9 pr-3 text-xs font-semibold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
                  />
                </div>
              </div>

              <div class="sm:col-span-2">
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Observaciones / Lote
                </label>
                <div class="relative">
                  <FileText class="absolute left-3 top-3 h-3.5 w-3.5 text-slate-400" />
                  <textarea
                    v-model="notes"
                    rows="2"
                    placeholder="Ej. Preparación tanda matutina para sabor fresa"
                    class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas py-2 pl-9 pr-3 text-xs font-semibold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
                  ></textarea>
                </div>
              </div>
            </div>

            <!-- Desglose Informativo de Materias Primas Consumidas -->
            <div v-if="preparation?.ingredients && preparation.ingredients.length > 0" class="space-y-1.5 pt-2">
              <span class="text-[11px] font-black uppercase tracking-wider text-slate-500">
                Materias Primas Descontadas (Solo Lectura)
              </span>
              <div class="space-y-1">
                <div
                  v-for="ing in preparation.ingredients"
                  :key="ing.id"
                  class="flex items-center justify-between rounded-xl border border-surface-light-border bg-surface-light-card p-2.5 text-xs dark:border-surface-dark-border dark:bg-surface-dark-card"
                >
                  <div class="font-bold text-slate-800 dark:text-slate-200">
                    {{ ing.rawMaterial?.name || `Insumo #${ing.rawMaterialId}` }}
                  </div>
                  <div class="font-extrabold text-slate-900 dark:text-white">
                    -{{ formatStockQuantity(ing.quantityUsed, ing.unitUsed || ing.rawMaterial?.unit || 'Kg') }} {{ ing.unitUsed || ing.rawMaterial?.unit || 'Kg' }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Pie de Acción Fijo (shrink-0) -->
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
              :disabled="isSubmitting"
              class="inline-flex items-center gap-2 rounded-xl bg-hero-gradient px-5 py-2.5 text-xs font-extrabold text-white shadow-card transition-transform active:scale-95 disabled:opacity-50"
            >
              <Pencil class="h-4 w-4 stroke-[2]" />
              <span>{{ isSubmitting ? 'Guardando...' : 'Guardar Cambios' }}</span>
            </button>
          </div>
        </form>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
