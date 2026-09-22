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
  PiggyBank,
  Scale,
  ArrowDownLeft,
  X,
  AlertCircle,
  Plus,
} from 'lucide-vue-next';
import { useFinanceStore, getTodayDateBogota } from '@/stores/finance.store';

export type MovementMode = 'BASE' | 'ADJUST' | 'WITHDRAW';

const props = defineProps<{
  open: boolean;
  mode: MovementMode;
}>();

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void;
  (e: 'saved'): void;
}>();

const financeStore = useFinanceStore();

const movementType = ref<
  | 'BASE_INICIAL'
  | 'APORTE_SOCIO'
  | 'RETIRO_BASE'
  | 'AJUSTE_CAJA'
  | 'AJUSTE_SOBRANTE'
  | 'AJUSTE_FALTANTE'
>('BASE_INICIAL');

const amount = ref<number | ''>('');
const paymentMethod = ref<string>('EFECTIVO');
const concept = ref<string>('');
const movementDate = ref<string>(getTodayDateBogota());
const notes = ref<string>('');
const isSubmitting = ref<boolean>(false);
const errorMessage = ref<string>('');

// Sincronizar defaults según el modo
watch(
  () => props.mode,
  (newMode) => {
    if (newMode === 'BASE') {
      movementType.value = 'BASE_INICIAL';
      concept.value = 'Base inicial de caja menor';
      paymentMethod.value = 'EFECTIVO';
    } else if (newMode === 'WITHDRAW') {
      movementType.value = 'RETIRO_BASE';
      concept.value = 'Retiro de base de caja menor';
      paymentMethod.value = 'EFECTIVO';
    } else if (newMode === 'ADJUST') {
      movementType.value = 'AJUSTE_CAJA';
      concept.value = 'Ajuste de arqueo / cuadre de caja';
      paymentMethod.value = 'EFECTIVO';
    }
  },
  { immediate: true }
);

const modalTitle = computed(() => {
  if (props.mode === 'BASE') return 'Base / Aporte a Caja';
  if (props.mode === 'WITHDRAW') return 'Retiro de Base de Caja';
  return 'Ajustar / Cuadrar Caja';
});

const modalDescription = computed(() => {
  if (props.mode === 'BASE') return 'Inyección de dinero físico o aporte de socios para operar';
  if (props.mode === 'WITHDRAW') return 'Salida de dinero de la base o fondos asignados';
  return 'Conciliación de diferencias por 4x1000, comisiones o descuadre físico';
});

const isFormValid = computed(() => {
  return typeof amount.value === 'number' && amount.value > 0 && concept.value.trim().length > 0;
});

function handleClose() {
  emit('update:open', false);
  errorMessage.value = '';
}

async function handleSubmit() {
  if (!isFormValid.value || typeof amount.value !== 'number') {
    errorMessage.value = 'Por favor ingresa un monto válido mayor a 0 y un concepto.';
    return;
  }

  isSubmitting.value = true;
  errorMessage.value = '';

  try {
    await financeStore.createCashMovement({
      type: movementType.value,
      amount: amount.value,
      concept: concept.value.trim(),
      paymentMethod: paymentMethod.value,
      movementDate: movementDate.value,
      notes: notes.value.trim() || null,
    });

    amount.value = '';
    notes.value = '';
    emit('saved');
    handleClose();
  } catch (err: any) {
    errorMessage.value = err?.message || 'Error al registrar el movimiento de caja';
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
        class="fixed left-1/2 top-1/2 z-50 w-[95%] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-surface-light-border bg-surface-light-card p-6 shadow-2xl transition-all focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-card sm:p-7"
      >
        <div class="flex items-center justify-between border-b border-surface-light-border pb-4 dark:border-surface-dark-border">
          <div class="flex items-center gap-2.5">
            <div
              class="flex h-10 w-10 items-center justify-center rounded-xl"
              :class="
                mode === 'BASE'
                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                  : mode === 'WITHDRAW'
                  ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
                  : 'bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400'
              "
            >
              <PiggyBank v-if="mode === 'BASE'" class="h-5 w-5 stroke-[2]" />
              <ArrowDownLeft v-else-if="mode === 'WITHDRAW'" class="h-5 w-5 stroke-[2]" />
              <Scale v-else class="h-5 w-5 stroke-[2]" />
            </div>
            <div>
              <DialogTitle class="text-base font-extrabold text-slate-900 dark:text-white sm:text-lg">
                {{ modalTitle }}
              </DialogTitle>
              <DialogDescription class="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {{ modalDescription }}
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
          <!-- Selector de Subtipo según Modo -->
          <div v-if="mode === 'BASE'">
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Tipo de Inyección *
            </label>
            <select
              v-model="movementType"
              class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
            >
              <option value="BASE_INICIAL">Base Inicial de Caja</option>
              <option value="APORTE_SOCIO">Aporte Extraordinario de Socio</option>
            </select>
          </div>

          <div v-else-if="mode === 'ADJUST'">
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Naturaleza del Ajuste *
            </label>
            <select
              v-model="movementType"
              class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
            >
              <option value="AJUSTE_CAJA">Ajuste General de Cuadre</option>
              <option value="AJUSTE_SOBRANTE">Sobrante de Caja (Ingreso a favor)</option>
              <option value="AJUSTE_FALTANTE">Faltante de Caja (Egreso / Pérdida / 4x1000)</option>
            </select>
          </div>

          <!-- Monto y Medio de Pago -->
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Monto ($ COP) *
              </label>
              <div class="relative">
                <span class="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400">$</span>
                <input
                  v-model.number="amount"
                  type="number"
                  min="1"
                  step="any"
                  placeholder="50000"
                  required
                  class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas py-2.5 pl-8 pr-3 text-sm font-extrabold text-slate-900 placeholder-slate-400 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
                />
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Canal / Medio de Pago
              </label>
              <select
                v-model="paymentMethod"
                class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
              >
                <option value="EFECTIVO">Efectivo Físico</option>
                <option value="NEQUI">Nequi</option>
                <option value="BANCOLOMBIA">Bancolombia</option>
                <option value="DAVIPLATA">Daviplata</option>
              </select>
            </div>
          </div>

          <!-- Concepto y Fecha -->
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Concepto / Motivo *
              </label>
              <input
                v-model="concept"
                type="text"
                placeholder="Ej: Base para cambio de mañana..."
                required
                class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Fecha del Movimiento
              </label>
              <input
                v-model="movementDate"
                type="date"
                required
                class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
              />
            </div>
          </div>

          <!-- Notas -->
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Notas Adicionales (Opcional)
            </label>
            <input
              v-model="notes"
              type="text"
              placeholder="Ej: Autorizado por Edier"
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
              <span>{{ isSubmitting ? 'Guardando...' : 'Asentar Movimiento' }}</span>
            </button>
          </div>
        </form>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
