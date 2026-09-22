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
  FlaskConical,
  X,
  AlertCircle,
  Plus,
} from 'lucide-vue-next';
import { useProductionStore } from '@/stores/production.store';
import { getTodayDateBogota } from '@/stores/finance.store';

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void;
  (e: 'saved'): void;
}>();

const productionStore = useProductionStore();

const flavors = [
  'Fresa',
  'Melocotón',
  'Mora',
  'Frutos Rojos',
  'Maracuyá',
  'Guanábana',
  'Arequipe',
  'Piña',
  'Natural',
];

const cultureTypes = [
  'Cultivo Termófilo Tradicional (Streptococcus thermophilus + Lactobacillus bulgaricus)',
  'Probiótico Activo (Bifidobacterium + Lactobacillus acidophilus)',
  'Cultivo Artesanal de Cepas Vivas Liofilizadas',
];

// Generar código autogenerado LOT-YYYYMMDD-XXX
function generateBatchCode(): string {
  const todayStr = getTodayDateBogota().replace(/-/g, '');
  const randomSuffix = Math.floor(100 + Math.random() * 900);
  return `LOT-${todayStr}-${randomSuffix}`;
}

const batchCode = ref(generateBatchCode());
const flavor = ref('Fresa');
const milkUsedLiters = ref<number | ''>(50);
const expectedLiters = ref<number | ''>(48);
const cultureType = ref(cultureTypes[0]);
const preparationDate = ref(getTodayDateBogota());
const ripeningDate = ref('');
const status = ref<'EN_FERMENTACION' | 'DISPONIBLE'>('EN_FERMENTACION');
const notes = ref('');

const isSubmitting = ref(false);
const errorMessage = ref('');

// Calcular fecha estimada de maduración (aprox 3 a 5 días)
function updateEstimatedRipening() {
  try {
    const d = new Date(preparationDate.value || getTodayDateBogota());
    d.setDate(d.getDate() + 4);
    ripeningDate.value = d.toISOString().split('T')[0];
  } catch {
    ripeningDate.value = '';
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      batchCode.value = generateBatchCode();
      preparationDate.value = getTodayDateBogota();
      updateEstimatedRipening();
      errorMessage.value = '';
    }
  },
  { immediate: true }
);

// Calcular rendimiento esperado
const expectedYield = computed(() => {
  if (!milkUsedLiters.value || !expectedLiters.value) return 96;
  return Math.round((Number(expectedLiters.value) / Number(milkUsedLiters.value)) * 1000) / 10;
});

const isFormValid = computed(() => {
  return (
    typeof milkUsedLiters.value === 'number' &&
    milkUsedLiters.value > 0 &&
    flavor.value.trim().length > 0
  );
});

function handleClose() {
  emit('update:open', false);
  errorMessage.value = '';
}

async function handleSubmit() {
  if (!isFormValid.value || typeof milkUsedLiters.value !== 'number') {
    errorMessage.value = 'Por favor ingresa los litros de leche y selecciona el sabor.';
    return;
  }

  isSubmitting.value = true;
  errorMessage.value = '';

  try {
    const fullNotes = [
      `Cultivo: ${cultureType.value}`,
      notes.value.trim() ? `Inoculación: ${notes.value.trim()}` : '',
    ]
      .filter(Boolean)
      .join(' | ');

    await productionStore.createBatch({
      flavor: flavor.value,
      milkUsedLiters: milkUsedLiters.value,
      totalLitersProduced: expectedLiters.value ? Number(expectedLiters.value) : milkUsedLiters.value,
      preparationDate: preparationDate.value,
      expirationDate: ripeningDate.value || undefined,
      notes: fullNotes,
      status: status.value,
    });

    emit('saved');
    handleClose();
  } catch (err: any) {
    errorMessage.value = err?.message || 'Error al registrar el lote de producción';
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
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-natural-50 text-natural-500 dark:bg-emerald-950/40 dark:text-emerald-400">
              <FlaskConical class="h-5 w-5 stroke-[2]" />
            </div>
            <div>
              <DialogTitle class="text-base font-extrabold text-slate-900 dark:text-white sm:text-lg">
                Iniciar Lote de Producción
              </DialogTitle>
              <DialogDescription class="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Inoculación, control de leche, fermentación y rendimiento
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
          <!-- Código de Lote Autogenerado y Sabor -->
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Código de Lote
              </label>
              <input
                v-model="batchCode"
                type="text"
                readonly
                class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2.5 text-xs font-extrabold text-brand-800 dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-brand-darkText cursor-not-allowed"
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Sabor del Yogur *
              </label>
              <select
                v-model="flavor"
                class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
              >
                <option v-for="fl in flavors" :key="fl" :value="fl">
                  {{ fl }}
                </option>
              </select>
            </div>
          </div>

          <!-- Litros de Leche y Rendimiento Estimado -->
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Litros de Leche Utilizados *
              </label>
              <div class="relative">
                <input
                  v-model.number="milkUsedLiters"
                  type="number"
                  min="1"
                  step="any"
                  placeholder="50"
                  required
                  class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2.5 text-sm font-extrabold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
                />
                <span class="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  Litros
                </span>
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Yogur Esperado / Producido
              </label>
              <div class="relative">
                <input
                  v-model.number="expectedLiters"
                  type="number"
                  min="1"
                  step="any"
                  placeholder="48"
                  class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2.5 text-sm font-extrabold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
                />
                <span class="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  Litros
                </span>
              </div>
            </div>
          </div>

          <!-- Indicador de Rendimiento Estimado -->
          <div class="flex items-center justify-between rounded-xl bg-natural-50/50 p-2.5 text-xs text-natural-700 dark:bg-emerald-950/20 dark:text-emerald-300">
            <span class="font-bold">Rendimiento proyectado:</span>
            <span class="font-black">{{ expectedYield }}%</span>
          </div>

          <!-- Tipo de Cultivo / Fermento -->
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Tipo de Cultivo / Fermento
            </label>
            <select
              v-model="cultureType"
              class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
            >
              <option v-for="c in cultureTypes" :key="c" :value="c">
                {{ c }}
              </option>
            </select>
          </div>

          <!-- Fechas: Elaboración y Maduración -->
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Fecha de Inoculación
              </label>
              <input
                v-model="preparationDate"
                type="date"
                required
                class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Maduración / Vencimiento
              </label>
              <input
                v-model="ripeningDate"
                type="date"
                class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
              />
            </div>
          </div>

          <!-- Estado Inicial -->
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Estado Inicial del Lote
            </label>
            <div class="grid grid-cols-2 gap-2">
              <button
                type="button"
                @click="status = 'EN_FERMENTACION'"
                class="rounded-xl border p-2.5 text-xs font-extrabold transition-all"
                :class="
                  status === 'EN_FERMENTACION'
                    ? 'border-brand-800 bg-brand-50 text-brand-800 dark:border-brand-400 dark:bg-brand-950/40 dark:text-brand-darkText'
                    : 'border-surface-light-border bg-surface-light-canvas text-slate-600 dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-slate-400'
                "
              >
                En Fermentación
              </button>

              <button
                type="button"
                @click="status = 'DISPONIBLE'"
                class="rounded-xl border p-2.5 text-xs font-extrabold transition-all"
                :class="
                  status === 'DISPONIBLE'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-700 dark:border-emerald-400 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : 'border-surface-light-border bg-surface-light-canvas text-slate-600 dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-slate-400'
                "
              >
                Listo / Disponible
              </button>
            </div>
          </div>

          <!-- Notas de Inoculación -->
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Notas de Inoculación & pH (Opcional)
            </label>
            <input
              v-model="notes"
              type="text"
              placeholder="Ej: pH inicial 6.6, temperatura incubación 42°C..."
              class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
            />
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
              <span>{{ isSubmitting ? 'Iniciando Lote...' : 'Crear Lote' }}</span>
            </button>
          </div>
        </form>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
