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
  Receipt,
  BadgeDollarSign,
  Banknote,
  Smartphone,
  X,
  AlertCircle,
  Plus,
  User,
  Calendar,
} from 'lucide-vue-next';
import { http } from '@/api/client';
import { toast } from 'vue-sonner';
import { getTodayDateBogota } from '@/stores/finance.store';
import type { StaffMemberItem } from './StaffModal.vue';

const props = defineProps<{
  open: boolean;
  staffList: StaffMemberItem[];
  preselectedStaffId?: number | null;
}>();

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void;
  (e: 'saved'): void;
}>();

const selectedStaffId = ref<number | null>(null);
const paymentType = ref<string>('JORNAL');
const amount = ref<number | ''>('');
const deductions = ref<number | ''>(0);
const paymentMethod = ref<'EFECTIVO' | 'TRANSFERENCIA'>('EFECTIVO');
const paymentDate = ref(getTodayDateBogota());
const notes = ref('');
const registeredBy = ref('Edier');

const isSubmitting = ref(false);
const errorMessage = ref('');

// Sincronizar selección al abrir modal
watch(
  () => [props.open, props.preselectedStaffId],
  ([isOpen, preselected]) => {
    if (isOpen) {
      errorMessage.value = '';
      notes.value = '';
      deductions.value = 0;
      paymentDate.value = getTodayDateBogota();

      if (preselected) {
        selectedStaffId.value = preselected as number;
      } else if (props.staffList.length > 0 && !selectedStaffId.value) {
        selectedStaffId.value = props.staffList[0].id;
      }

      // Sugerir monto y concepto según integrante seleccionado
      syncSuggestedPayment();
    }
  },
  { immediate: true }
);

function syncSuggestedPayment() {
  const member = props.staffList.find((s) => s.id === selectedStaffId.value);
  if (member) {
    if (member.type === 'SOCIO') {
      paymentType.value = 'RETIRO_SOCIO';
    } else {
      paymentType.value = member.paymentScheme === 'JORNAL' ? 'JORNAL' : 'NOMINA';
    }
    if (member.defaultRate > 0) {
      amount.value = member.defaultRate;
    }
  }
}

watch(selectedStaffId, () => {
  syncSuggestedPayment();
});

const currentMember = computed(() => {
  return props.staffList.find((s) => s.id === selectedStaffId.value);
});

// Neto a pagar
const netAmount = computed(() => {
  const gross = typeof amount.value === 'number' ? amount.value : 0;
  const ded = typeof deductions.value === 'number' ? deductions.value : 0;
  return Math.max(0, gross - ded);
});

const isFormValid = computed(() => {
  return (
    selectedStaffId.value !== null &&
    typeof amount.value === 'number' &&
    amount.value > 0
  );
});

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(val || 0);
};

function handleClose() {
  emit('update:open', false);
  errorMessage.value = '';
}

async function handleSubmit() {
  if (!isFormValid.value || !currentMember.value) {
    errorMessage.value = 'Selecciona un colaborador y un monto válido a liquidar.';
    return;
  }

  isSubmitting.value = true;
  errorMessage.value = '';

  try {
    await http.post('/staff/payments', {
      staffId: selectedStaffId.value,
      paymentType: paymentType.value,
      amount: Number(amount.value),
      deductions: Number(deductions.value) || 0,
      netAmount: netAmount.value,
      paymentMethod: paymentMethod.value,
      paymentDate: paymentDate.value,
      notes: notes.value.trim() || null,
      registeredBy: registeredBy.value || 'Edier',
    });

    toast.success('¡Liquidación Asentada!', {
      description: `Pago de ${formatCurrency(netAmount.value)} a ${currentMember.value.fullName} registrado en ${paymentMethod.value}.`,
    });

    emit('saved');
    handleClose();
  } catch (err: any) {
    errorMessage.value = err?.message || 'Error al liquidar el pago';
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
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              <Receipt class="h-5 w-5 stroke-[2.2]" />
            </div>
            <div>
              <DialogTitle class="text-base font-extrabold text-slate-900 dark:text-white sm:text-lg">
                Registrar Pago / Liquidación
              </DialogTitle>
              <DialogDescription class="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Liquidación de jornales, nómina y retiros de socios
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
          <!-- Selección del Colaborador -->
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Integrante del Equipo *
            </label>
            <div class="relative">
              <User class="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 stroke-[2]" />
              <select
                v-model="selectedStaffId"
                required
                class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas py-2.5 pl-10 pr-3.5 text-xs font-bold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
              >
                <option v-for="s in staffList" :key="s.id" :value="s.id">
                  {{ s.fullName }} ({{ s.type === 'SOCIO' ? 'Socio' : s.role || 'Colaborador' }})
                </option>
              </select>
            </div>
          </div>

          <!-- Concepto y Tipo de Pago -->
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Concepto de Liquidación *
            </label>
            <select
              v-model="paymentType"
              required
              class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
            >
              <option value="JORNAL">Jornal Diario de Producción</option>
              <option value="NOMINA">Nómina / Sueldo Quincenal</option>
              <option value="RETIRO_SOCIO">Retiro de Utilidades / Socio</option>
              <option value="BONIFICACION">Bonificación / Rendimiento</option>
              <option value="ANTICIPO">Anticipo de Pago</option>
            </select>
          </div>

          <!-- Monto Bruto y Deducciones -->
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Valor a Liquidar ($ COP) *
              </label>
              <div class="relative">
                <BadgeDollarSign class="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 stroke-[2]" />
                <input
                  v-model.number="amount"
                  type="number"
                  min="1"
                  step="1000"
                  placeholder="50000"
                  required
                  class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas py-2.5 pl-10 pr-3.5 text-sm font-extrabold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
                />
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Deducciones ($ COP)
              </label>
              <input
                v-model.number="deductions"
                type="number"
                min="0"
                step="1000"
                placeholder="0"
                class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
              />
            </div>
          </div>

          <!-- Total Neto Preview -->
          <div class="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/20">
            <div class="flex items-center justify-between">
              <span class="text-xs font-extrabold text-emerald-800 dark:text-emerald-300">
                Neto a Pagar
              </span>
              <span class="text-xl font-black text-emerald-900 dark:text-emerald-100">
                {{ formatCurrency(netAmount) }}
              </span>
            </div>
          </div>

          <!-- Medio de Pago (Efectivo Caja Menor vs Bancos) -->
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Canal de Desembolso *
            </label>
            <div class="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                @click="paymentMethod = 'EFECTIVO'"
                class="flex items-center justify-center gap-2 rounded-2xl border p-3 text-xs font-extrabold transition-all"
                :class="
                  paymentMethod === 'EFECTIVO'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-700 shadow-xs dark:border-emerald-400 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : 'border-surface-light-border bg-surface-light-canvas text-slate-600 hover:border-slate-300 dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-slate-400'
                "
              >
                <Banknote class="h-4 w-4 stroke-[2]" />
                <span>Efectivo (Caja Menor)</span>
              </button>

              <button
                type="button"
                @click="paymentMethod = 'TRANSFERENCIA'"
                class="flex items-center justify-center gap-2 rounded-2xl border p-3 text-xs font-extrabold transition-all"
                :class="
                  paymentMethod === 'TRANSFERENCIA'
                    ? 'border-purple-600 bg-purple-50 text-purple-700 shadow-xs dark:border-purple-400 dark:bg-purple-950/40 dark:text-purple-300'
                    : 'border-surface-light-border bg-surface-light-canvas text-slate-600 hover:border-slate-300 dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-slate-400'
                "
              >
                <Smartphone class="h-4 w-4 stroke-[2]" />
                <span>Bancos / Nequi</span>
              </button>
            </div>
          </div>

          <!-- Fecha y Notas -->
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Fecha del Pago *
              </label>
              <div class="relative">
                <Calendar class="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 stroke-[2]" />
                <input
                  v-model="paymentDate"
                  type="date"
                  required
                  class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas py-2.5 pl-10 pr-3.5 text-xs font-bold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
                />
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Comprobante / Detalle
              </label>
              <input
                v-model="notes"
                type="text"
                placeholder="Ej: Jornal lote LOT-20260922-001..."
                class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
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
              <span>{{ isSubmitting ? 'Asentando...' : 'Asentar Liquidación' }}</span>
            </button>
          </div>
        </form>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
