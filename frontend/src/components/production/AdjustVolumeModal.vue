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
  Scale,
  X,
  AlertCircle,
  TrendingDown,
  TrendingUp,
  Save,
  Milk,
} from 'lucide-vue-next';
import { useProductionStore, type BatchItem } from '@/stores/production.store';

const props = defineProps<{
  open: boolean;
  batch: BatchItem | null;
}>();

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void;
  (e: 'updated'): void;
}>();

const productionStore = useProductionStore();

const newVolume = ref<number | ''>(0);
const notes = ref<string>('');
const isSubmitting = ref<boolean>(false);
const errorMessage = ref<string | null>(null);

watch(
  () => [props.open, props.batch],
  ([isOpen, currentBatch]) => {
    if (isOpen && currentBatch) {
      const b = currentBatch as BatchItem;
      newVolume.value = Number(b.totalLitersProduced) || Number(b.milkUsedLiters) || 0;
      notes.value = '';
      errorMessage.value = null;
    }
  },
  { immediate: true }
);

const milkLiters = computed(() => Number(props.batch?.milkUsedLiters) || 0);
const packagedLiters = computed(() => Number(props.batch?.packagedLiters) || 0);

const resolvedVolume = computed(() => {
  return typeof newVolume.value === 'number' && !isNaN(newVolume.value) ? newVolume.value : 0;
});

// Guardia de seguridad: no reducir por debajo de lo ya envasado
const isBelowPackaged = computed(() => {
  return resolvedVolume.value < packagedLiters.value - 0.001;
});

// Rendimiento calculado en tiempo real
const calculatedYield = computed(() => {
  if (milkLiters.value <= 0) return 100;
  return Math.round((resolvedVolume.value / milkLiters.value) * 1000) / 10;
});

// Tipo de variación de volumen
const volumeVariation = computed(() => {
  if (resolvedVolume.value > milkLiters.value) return 'EXPANSION';
  if (resolvedVolume.value < milkLiters.value) return 'MERMA';
  return 'EQUAL';
});

// Formateador de moneda
const formatCOP = (val: number) => `$ ${Math.round(val).toLocaleString('es-CO')}`;

// Recálculo del costo por litro proyectado
const projectedCostPerLiter = computed(() => {
  if (!props.batch || resolvedVolume.value <= 0) return 0;
  const currentTotal = Number(props.batch.totalLitersProduced) || milkLiters.value || 1;
  const currentCostPerLiter = Number(props.batch.costPerLiter) || 2800;
  const totalBaseCost = currentCostPerLiter * currentTotal;
  return Math.round(totalBaseCost / resolvedVolume.value);
});

const isValid = computed(() => {
  return (
    typeof newVolume.value === 'number' &&
    newVolume.value > 0 &&
    !isBelowPackaged.value &&
    !isSubmitting.value
  );
});

function handleClose() {
  emit('update:open', false);
}

async function handleSubmit() {
  if (!isValid.value || !props.batch) return;

  isSubmitting.value = true;
  errorMessage.value = null;

  try {
    await productionStore.patchBatchVolume(
      props.batch.id,
      Number(newVolume.value),
      notes.value.trim() || undefined
    );
    emit('updated');
    handleClose();
  } catch (err: any) {
    errorMessage.value = err?.message || 'Error al ajustar el volumen del lote';
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
        <!-- Cabecera del Diálogo -->
        <div class="flex items-center justify-between border-b border-surface-light-border pb-4 dark:border-surface-dark-border">
          <div class="flex items-center gap-2.5">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
              <Scale class="h-5 w-5 stroke-[2]" />
            </div>
            <div>
              <DialogTitle class="text-base font-extrabold text-slate-900 dark:text-white sm:text-lg">
                Ajustar Volumen Real / Rendimiento
              </DialogTitle>
              <DialogDescription class="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Merma por desuerado (griego) o expansión por almíbar en lote madre
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

        <form v-if="batch" @submit.prevent="handleSubmit" class="mt-5 space-y-4">
          <!-- Resumen de Estado Actual del Lote -->
          <div class="rounded-2xl border border-surface-light-border bg-slate-50/70 p-3.5 dark:border-surface-dark-border dark:bg-surface-dark-canvas">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <span class="font-mono text-xs font-black text-brand-800 dark:text-brand-darkText">
                  #{{ batch.batchCode }}
                </span>
                <span class="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-black text-purple-800 dark:bg-purple-950/50 dark:text-purple-300">
                  {{ batch.flavor }}
                </span>
              </div>

              <div class="flex items-center gap-3 text-xs">
                <div>
                  <span class="text-slate-400">Leche Inoculada:</span>
                  <span class="ml-1 font-extrabold text-slate-700 dark:text-slate-300">
                    {{ milkLiters }} L
                  </span>
                </div>
                <div>
                  <span class="text-slate-400">Ya Envasado:</span>
                  <span class="ml-1 font-black text-purple-700 dark:text-purple-300">
                    {{ packagedLiters }} L
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Input de Volumen Real Obtenido -->
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Volumen Real Final Obtenido (Litros) *
            </label>
            <div class="relative">
              <input
                v-model.number="newVolume"
                type="number"
                min="0.1"
                step="0.1"
                required
                placeholder="Ej. 11 (griego) o 26 (almíbar)"
                class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2.5 text-base font-extrabold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
                :class="{
                  'border-rose-500 focus:border-rose-500': isBelowPackaged,
                }"
              />
              <span class="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                Litros Finales
              </span>
            </div>
            <p class="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Tope físico disponible para fraccionar en Fase B.
            </p>
          </div>

          <!-- Alerta de Guardia: Volumen menor a lo envasado -->
          <div
            v-if="isBelowPackaged"
            class="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50/80 p-3 text-xs font-semibold text-rose-800 dark:border-rose-800/40 dark:bg-rose-950/30 dark:text-rose-300"
          >
            <AlertCircle class="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>
              El volumen real no puede ser menor a los {{ packagedLiters }} L que ya fueron fraccionados y envasados.
            </span>
          </div>

          <!-- Tarjeta de Diagnóstico y Rendimiento Proyectado -->
          <div
            class="rounded-2xl border p-4 text-xs transition-all"
            :class="
              volumeVariation === 'MERMA'
                ? 'border-amber-200 bg-amber-50/70 dark:border-amber-800/40 dark:bg-amber-950/20'
                : volumeVariation === 'EXPANSION'
                ? 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-800/40 dark:bg-emerald-950/20'
                : 'border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900/40'
            "
          >
            <div class="flex items-center justify-between border-b pb-2"
                 :class="volumeVariation === 'MERMA' ? 'border-amber-200/60 dark:border-amber-800/60' : volumeVariation === 'EXPANSION' ? 'border-emerald-200/60 dark:border-emerald-800/60' : 'border-slate-200 dark:border-slate-800'">
              <div class="flex items-center gap-1.5 font-extrabold">
                <TrendingDown v-if="volumeVariation === 'MERMA'" class="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <TrendingUp v-else-if="volumeVariation === 'EXPANSION'" class="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <Milk v-else class="h-4 w-4 text-slate-500" />
                <span>
                  {{
                    volumeVariation === 'MERMA'
                      ? 'Merma por Desuerado (Yogur Griego)'
                      : volumeVariation === 'EXPANSION'
                      ? 'Expansión de Volumen (Almíbar / Adición Base)'
                      : 'Rendimiento Estándar (1:1)'
                  }}
                </span>
              </div>
              <span class="rounded-lg px-2 py-0.5 text-xs font-black"
                    :class="volumeVariation === 'MERMA' ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-200' : volumeVariation === 'EXPANSION' ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-200' : 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300'">
                {{ calculatedYield }}% Rendimiento
              </span>
            </div>

            <div class="mt-3 grid grid-cols-2 gap-3">
              <div>
                <span class="text-[10px] font-bold uppercase text-slate-400">Saldo Disponible Tras Ajuste</span>
                <p class="text-sm font-black text-slate-900 dark:text-white">
                  {{ Math.max(0, Math.round((resolvedVolume - packagedLiters) * 100) / 100) }} L
                </p>
              </div>

              <div>
                <span class="text-[10px] font-bold uppercase text-slate-400">Costo / Litro Recalculado</span>
                <p class="text-sm font-black text-brand-800 dark:text-brand-darkText">
                  {{ formatCOP(projectedCostPerLiter) }} / L
                </p>
              </div>
            </div>

            <p class="mt-2.5 text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
              <span v-if="volumeVariation === 'MERMA'">
                La inversión total en leche se absorbe en menos litros finales, elevando el costo unitario de cada litro fraccionado.
              </span>
              <span v-else-if="volumeVariation === 'EXPANSION'">
                El almíbar o adición expande el rendimiento y amplía el tope máximo disponible para envasar botellas de 1L y 2L.
              </span>
              <span v-else>
                El rendimiento final es idéntico a la cantidad de leche inoculada.
              </span>
            </p>
          </div>

          <!-- Notas Opcionales del Ajuste -->
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Notas / Justificación del Ajuste <span class="font-normal text-slate-400">(Opcional)</span>
            </label>
            <input
              v-model="notes"
              type="text"
              placeholder="Ej. Desuerado prolongado de tela (textura griega) o adición de 2L de almíbar"
              class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2 text-xs font-semibold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
            />
          </div>

          <!-- Mensaje de Error si aplica -->
          <div
            v-if="errorMessage"
            class="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50/80 p-3 text-xs font-semibold text-rose-800 dark:border-rose-800/40 dark:bg-rose-950/30 dark:text-rose-300"
          >
            <AlertCircle class="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{{ errorMessage }}</span>
          </div>

          <!-- Acciones del Modal -->
          <div class="flex items-center justify-end gap-2.5 border-t border-surface-light-border pt-4 dark:border-surface-dark-border">
            <button
              type="button"
              @click="handleClose"
              class="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>

            <button
              type="submit"
              :disabled="!isValid || isSubmitting"
              class="inline-flex items-center gap-2 rounded-xl bg-hero-gradient px-5 py-2.5 text-xs font-extrabold text-white shadow-card transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save class="h-4 w-4 stroke-[2.5]" />
              <span v-if="isSubmitting">Guardando...</span>
              <span v-else>Aplicar Ajuste de Volumen</span>
            </button>
          </div>
        </form>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
