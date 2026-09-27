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
  Pencil,
  X,
  AlertCircle,
} from 'lucide-vue-next';
import { http } from '@/api/client';
import { toast } from 'vue-sonner';
import { getTodayDateBogota } from '@/stores/finance.store';

export interface ExpenseItemData {
  id: number;
  category: string;
  description: string;
  amount: number;
  expenseDate: string;
  paymentMethod: string;
  supplier?: string | null;
  notes?: string | null;
  registeredBy?: string | null;
}

const props = defineProps<{
  open: boolean;
  expense?: ExpenseItemData | null;
}>();

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void;
  (e: 'saved'): void;
}>();

const amount = ref<number | ''>('');
const category = ref<string>('OPERATIVO');
const description = ref<string>('');
const supplier = ref<string>('');
const paymentMethod = ref<string>('EFECTIVO');
const expenseDate = ref<string>(getTodayDateBogota());
const notes = ref<string>('');
const isSubmitting = ref<boolean>(false);
const errorMessage = ref<string>('');

const categories = [
  { id: 'INSUMOS_EXTRA', label: 'Materia Prima / Insumos' },
  { id: 'COMBUSTIBLE', label: 'Domicilio y Gasolina' },
  { id: 'SERVICIOS_PUBLICOS', label: 'Servicios Públicos (Luz / Agua)' },
  { id: 'MANTENIMIENTO', label: 'Mantenimiento & Infraestructura' },
  { id: 'OPERATIVO', label: 'Insumos Operativos / Empaques' },
  { id: 'OTRO', label: 'Varios y Otros' },
];

watch(
  () => [props.open, props.expense],
  () => {
    if (!props.open) return;

    if (props.expense) {
      amount.value = Math.abs(Number(props.expense.amount) || 0);
      category.value = props.expense.category || 'OPERATIVO';
      description.value = props.expense.description || '';
      supplier.value = props.expense.supplier || '';
      paymentMethod.value = props.expense.paymentMethod || 'EFECTIVO';
      const rawDate = props.expense.expenseDate;
      expenseDate.value = rawDate ? String(rawDate).slice(0, 10) : getTodayDateBogota();
      notes.value = props.expense.notes || '';
    } else {
      amount.value = '';
      category.value = 'OPERATIVO';
      description.value = '';
      supplier.value = '';
      paymentMethod.value = 'EFECTIVO';
      expenseDate.value = getTodayDateBogota();
      notes.value = '';
    }
    errorMessage.value = '';
  },
  { immediate: true }
);

const isFormValid = computed(() => {
  return typeof amount.value === 'number' && amount.value > 0 && description.value.trim().length > 0;
});

function handleClose() {
  emit('update:open', false);
  errorMessage.value = '';
}

async function handleSubmit() {
  if (!isFormValid.value || typeof amount.value !== 'number' || !props.expense) {
    errorMessage.value = 'Por favor ingresa un monto válido mayor a 0 y una descripción.';
    return;
  }

  isSubmitting.value = true;
  errorMessage.value = '';

  try {
    const payload = {
      category: category.value,
      description: description.value.trim(),
      amount: amount.value,
      expenseDate: expenseDate.value,
      paymentMethod: paymentMethod.value,
      supplier: supplier.value.trim() || null,
      notes: notes.value.trim() || null,
    };

    await http.put(`/expenses/${props.expense.id}`, payload);

    toast.success('¡Gasto Actualizado!', {
      description: 'El gasto fue modificado satisfactoriamente.',
    });

    emit('saved');
    handleClose();
  } catch (err: any) {
    errorMessage.value = err?.message || 'Error al actualizar el gasto';
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
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-800 dark:bg-brand-950/40 dark:text-brand-400">
              <Pencil class="h-5 w-5 stroke-[2]" />
            </div>
            <div>
              <DialogTitle class="text-base font-extrabold text-slate-900 dark:text-white sm:text-lg">
                Editar Gasto u Operación
              </DialogTitle>
              <DialogDescription class="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Corrige monto, categoría, descripción, proveedor o fecha
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

        <form @submit.prevent="handleSubmit" novalidate class="mt-5 space-y-4">
          <!-- Categoría -->
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Categoría del Gasto *
            </label>
            <select
              v-model="category"
              class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
            >
              <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                {{ cat.label }}
              </option>
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
                  min="0"
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
                <option value="EFECTIVO">Efectivo Caja Menor</option>
                <option value="NEQUI">Nequi</option>
                <option value="BANCOLOMBIA">Bancolombia</option>
                <option value="DAVIPLATA">DaviPlata</option>
                <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                <option value="NEQUI_BANCOLOMBIA">Nequi o Bancolombia</option>
              </select>
            </div>
          </div>

          <!-- Descripción y Proveedor -->
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Descripción del Gasto *
              </label>
              <input
                v-model="description"
                type="text"
                placeholder="Ej: Gasolina moto de reparto..."
                required
                class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Proveedor / Beneficiario
              </label>
              <input
                v-model="supplier"
                type="text"
                placeholder="Ej: Estación Terpel / Distribuidora..."
                class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
              />
            </div>
          </div>

          <!-- Fecha del Gasto y Notas -->
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Fecha del Gasto
              </label>
              <input
                v-model="expenseDate"
                type="date"
                required
                class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Notas / Factura / Observación
              </label>
              <input
                v-model="notes"
                type="text"
                placeholder="Ej: Factura #10245"
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
              <Pencil class="h-4 w-4 stroke-[2.5]" />
              <span>{{ isSubmitting ? 'Guardando...' : 'Guardar Cambios' }}</span>
            </button>
          </div>
        </form>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
