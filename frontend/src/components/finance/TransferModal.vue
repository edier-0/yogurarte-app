<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from 'reka-ui';
import {
  ArrowLeftRight,
  Banknote,
  Smartphone,
  X,
  AlertCircle,
  CheckCircle2,
} from 'lucide-vue-next';
import { useFinanceStore, getTodayDateBogota } from '@/stores/finance.store';

defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void;
  (e: 'transferred'): void;
}>();

const financeStore = useFinanceStore();

const transferType = ref<'TRASLADO_EFECTIVO_A_BANCO' | 'TRASLADO_BANCO_A_EFECTIVO'>(
  'TRASLADO_EFECTIVO_A_BANCO'
);
const amount = ref<number | ''>('');
const concept = ref<string>('Consignación de ventas en efectivo a cuenta digital');
const movementDate = ref<string>(getTodayDateBogota());
const notes = ref<string>('');
const isSubmitting = ref<boolean>(false);
const errorMessage = ref<string>('');

// Ajustar concepto por defecto al cambiar la dirección
function onTypeChange(type: 'TRASLADO_EFECTIVO_A_BANCO' | 'TRASLADO_BANCO_A_EFECTIVO') {
  transferType.value = type;
  if (type === 'TRASLADO_EFECTIVO_A_BANCO') {
    concept.value = 'Consignación de ventas en efectivo a cuenta digital / Nequi';
  } else {
    concept.value = 'Retiro de cajero a efectivo para caja menor';
  }
}

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(val || 0);
};

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

  // Validación de fondos en efectivo para consignaciones
  if (transferType.value === 'TRASLADO_EFECTIVO_A_BANCO' && amount.value > financeStore.cashInHand) {
    errorMessage.value = `El monto supera el efectivo físico disponible (${formatCurrency(financeStore.cashInHand)}).`;
    return;
  }

  isSubmitting.value = true;
  errorMessage.value = '';

  try {
    await financeStore.createTransfer({
      type: transferType.value,
      amount: amount.value,
      concept: concept.value.trim(),
      movementDate: movementDate.value,
      notes: notes.value.trim() || null,
    });

    amount.value = '';
    notes.value = '';
    emit('transferred');
    handleClose();
  } catch (err: any) {
    errorMessage.value = err?.message || 'Error al asentar el traslado entre cuentas';
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
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-dairy-50 text-dairy-500 dark:bg-blue-950/40 dark:text-blue-400">
              <ArrowLeftRight class="h-5 w-5 stroke-[2]" />
            </div>
            <div>
              <DialogTitle class="text-base font-extrabold text-slate-900 dark:text-white sm:text-lg">
                Traslado de Fondos
              </DialogTitle>
              <DialogDescription class="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Nivelación entre efectivo físico y cuentas digitales / Nequi
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
          <!-- Selector de Dirección del Traslado -->
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Dirección del Traslado
            </label>
            <div class="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <!-- Efectivo a Banco -->
              <button
                type="button"
                @click="onTypeChange('TRASLADO_EFECTIVO_A_BANCO')"
                class="flex flex-col rounded-2xl border p-3.5 text-left transition-all"
                :class="
                  transferType === 'TRASLADO_EFECTIVO_A_BANCO'
                    ? 'border-brand-800 bg-brand-50/50 shadow-sm dark:border-brand-400 dark:bg-brand-950/30'
                    : 'border-surface-light-border bg-surface-light-canvas hover:border-slate-300 dark:border-surface-dark-border dark:bg-surface-dark-canvas'
                "
              >
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-1.5 text-xs font-black text-amber-600 dark:text-amber-400">
                    <Banknote class="h-4 w-4" />
                    <span>Efectivo</span>
                  </div>
                  <ArrowLeftRight class="h-3.5 w-3.5 text-slate-400" />
                  <div class="flex items-center gap-1.5 text-xs font-black text-dairy-500 dark:text-blue-400">
                    <Smartphone class="h-4 w-4" />
                    <span>Bancos</span>
                  </div>
                </div>
                <span class="mt-2 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                  Consignación de ventas a Nequi / Bancolombia
                </span>
              </button>

              <!-- Banco a Efectivo -->
              <button
                type="button"
                @click="onTypeChange('TRASLADO_BANCO_A_EFECTIVO')"
                class="flex flex-col rounded-2xl border p-3.5 text-left transition-all"
                :class="
                  transferType === 'TRASLADO_BANCO_A_EFECTIVO'
                    ? 'border-brand-800 bg-brand-50/50 shadow-sm dark:border-brand-400 dark:bg-brand-950/30'
                    : 'border-surface-light-border bg-surface-light-canvas hover:border-slate-300 dark:border-surface-dark-border dark:bg-surface-dark-canvas'
                "
              >
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-1.5 text-xs font-black text-dairy-500 dark:text-blue-400">
                    <Smartphone class="h-4 w-4" />
                    <span>Bancos</span>
                  </div>
                  <ArrowLeftRight class="h-3.5 w-3.5 text-slate-400" />
                  <div class="flex items-center gap-1.5 text-xs font-black text-amber-600 dark:text-amber-400">
                    <Banknote class="h-4 w-4" />
                    <span>Efectivo</span>
                  </div>
                </div>
                <span class="mt-2 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                  Retiro de cajero para caja menor física
                </span>
              </button>
            </div>
          </div>

          <!-- Monto y Fecha -->
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Monto a Trasladar ($ COP) *
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
                Fecha del Traslado
              </label>
              <div class="relative">
                <input
                  v-model="movementDate"
                  type="date"
                  required
                  class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
                />
              </div>
            </div>
          </div>

          <!-- Concepto -->
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Concepto / Motivo *
            </label>
            <input
              v-model="concept"
              type="text"
              placeholder="Ej: Consignación de cobros en efectivo a Nequi..."
              required
              class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
            />
          </div>

          <!-- Notas opcionales -->
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Notas Adicionales (Comprobante / Referencia)
            </label>
            <input
              v-model="notes"
              type="text"
              placeholder="Ej: Comprobante Nequi M123456"
              class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
            />
          </div>

          <!-- Callout Informativo -->
          <div class="rounded-2xl border border-blue-200 bg-blue-50/70 p-3.5 text-xs text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200">
            <div class="flex items-start gap-2">
              <CheckCircle2 class="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400 stroke-[2]" />
              <p>
                <strong>Conciliación Balanceada:</strong> Este movimiento ajusta los saldos entre
                <strong>Efectivo</strong> y <strong>Cuentas Bancarias / Nequi</strong> sin alterar el dinero global total disponible en YogurArte.
              </p>
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
              <ArrowLeftRight class="h-4 w-4 stroke-[2]" />
              <span>{{ isSubmitting ? 'Registrando...' : 'Confirmar Traslado' }}</span>
            </button>
          </div>
        </form>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
