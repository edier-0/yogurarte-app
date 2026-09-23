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
  Receipt,
  CreditCard,
  X,
  AlertCircle,
  Plus,
  Fuel,
  Zap,
  Wrench,
  Boxes,
  HelpCircle,
} from 'lucide-vue-next';
import { http } from '@/api/client';
import { toast } from 'vue-sonner';
import { getTodayDateBogota } from '@/stores/finance.store';

defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void;
  (e: 'saved'): void;
}>();

// Datos del formulario
const description = ref('');
const amount = ref<number | ''>('');
const category = ref('COMBUSTIBLE');
const paymentMethod = ref('EFECTIVO');
const expenseDate = ref(getTodayDateBogota());
const registeredBy = ref('Edier');
const notes = ref('');

// Modo compra a crédito / cuotas
const isCredit = ref(false);
const creditor = ref('');
const totalInstallments = ref<number | ''>(6);
const frequency = ref<'MENSUAL' | 'QUINCENAL' | 'SEMANAL'>('MENSUAL');
const initialPayment = ref<number | ''>(0);

const isSubmitting = ref(false);
const errorMessage = ref('');

// Categorías oficiales
const categories = [
  { id: 'COMBUSTIBLE', label: 'Domicilio y Gasolina', icon: Fuel },
  { id: 'SERVICIOS', label: 'Servicios Públicos (Luz / Agua)', icon: Zap },
  { id: 'MANTENIMIENTO', label: 'Mantenimiento & Infraestructura', icon: Wrench },
  { id: 'OPERATIVO', label: 'Insumos Operativos', icon: Boxes },
  { id: 'OTRO', label: 'Varios y Otros', icon: HelpCircle },
];

const calculatedInstallment = computed(() => {
  if (!amount.value || typeof amount.value !== 'number') return 0;
  const initial = typeof initialPayment.value === 'number' ? initialPayment.value : 0;
  const installments = typeof totalInstallments.value === 'number' && totalInstallments.value > 0 ? totalInstallments.value : 1;
  const netDebt = Math.max(0, amount.value - initial);
  return Math.round(netDebt / installments);
});

const isFormValid = computed(() => {
  if (!description.value.trim() || typeof amount.value !== 'number' || amount.value <= 0) {
    return false;
  }
  if (isCredit.value && !creditor.value.trim()) {
    return false;
  }
  return true;
});

function handleClose() {
  emit('update:open', false);
  errorMessage.value = '';
}

async function handleSubmit() {
  if (!isFormValid.value || typeof amount.value !== 'number') {
    errorMessage.value = 'Por favor completa todos los campos requeridos con valores válidos.';
    return;
  }

  isSubmitting.value = true;
  errorMessage.value = '';

  try {
    if (isCredit.value) {
      // Registro de Obligación / Crédito a cuotas
      const initial = typeof initialPayment.value === 'number' ? initialPayment.value : 0;
      const installments = typeof totalInstallments.value === 'number' && totalInstallments.value > 0 ? totalInstallments.value : 1;

      await http.post('/credits', {
        title: description.value.trim(),
        category: category.value,
        creditor: creditor.value.trim(),
        principalAmount: amount.value,
        initialPayment: initial,
        initialPaymentMethod: paymentMethod.value,
        paymentType: 'CUOTAS_FIJAS',
        frequency: frequency.value,
        installmentAmount: calculatedInstallment.value,
        totalInstallments: installments,
        startDate: expenseDate.value,
        notes: notes.value.trim() || null,
        registeredBy: registeredBy.value || 'Edier',
      });

      toast.success('¡Compra a Cuotas Registrada!', {
        description: `Se registró ${description.value} con saldo financiado.`,
      });
    } else {
      // Registro de Gasto Directo
      await http.post('/expenses', {
        description: description.value.trim(),
        amount: amount.value,
        category: category.value,
        paymentMethod: paymentMethod.value,
        expenseDate: expenseDate.value,
        notes: notes.value.trim() || null,
        registeredBy: registeredBy.value || 'Edier',
      });

      toast.success('¡Gasto Registrado con Éxito!', {
        description: `${description.value} por $ ${new Intl.NumberFormat('es-CO').format(amount.value)}.`,
      });
    }

    // Resetear formulario
    description.value = '';
    amount.value = '';
    notes.value = '';
    creditor.value = '';
    initialPayment.value = 0;
    isCredit.value = false;

    emit('saved');
    handleClose();
  } catch (err: any) {
    errorMessage.value = err?.message || 'Error al asentar el registro en la API financiera';
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
                isCredit
                  ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'
                  : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
              "
            >
              <CreditCard v-if="isCredit" class="h-5 w-5 stroke-[2]" />
              <Receipt v-else class="h-5 w-5 stroke-[2]" />
            </div>
            <div>
              <DialogTitle class="text-base font-extrabold text-slate-900 dark:text-white sm:text-lg">
                {{ isCredit ? 'Registrar Compra a Cuotas' : 'Registrar Gasto Operativo' }}
              </DialogTitle>
              <DialogDescription class="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {{
                  isCredit
                    ? 'Insumo, equipo o maquinaria financiado a crédito'
                    : 'Egreso corriente de planta, flete o servicios'
                }}
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
          <!-- Toggle Compra a Cuotas / Crédito -->
          <div class="flex items-center justify-between rounded-2xl border border-surface-light-border bg-surface-light-canvas p-3 dark:border-surface-dark-border dark:bg-surface-dark-canvas">
            <div class="flex items-center gap-2">
              <CreditCard class="h-4 w-4 text-brand-800 dark:text-brand-darkText stroke-[1.75]" />
              <span class="text-xs font-bold text-slate-800 dark:text-slate-200">
                ¿Es compra a cuotas / crédito?
              </span>
            </div>
            <label class="relative inline-flex cursor-pointer items-center">
              <input type="checkbox" v-model="isCredit" class="peer sr-only" />
              <div
                class="peer h-5 w-9 rounded-full bg-slate-300 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-brand-800 peer-checked:after:translate-x-full peer-focus:outline-none dark:bg-slate-700 dark:peer-checked:bg-brand-500"
              ></div>
            </label>
          </div>

          <!-- Concepto y Monto -->
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Concepto / Descripción del Gasto *
            </label>
            <input
              v-model="description"
              type="text"
              placeholder="Ej: Gasolina ruta domicilios, Recibo de Luz, etc."
              required
              class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
            />
          </div>

          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {{ isCredit ? 'Valor Total del Bien ($ COP) *' : 'Monto Total ($ COP) *' }}
              </label>
              <div class="relative">
                <span class="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400">$</span>
                <input
                  v-model.number="amount"
                  type="number"
                  min="1"
                  step="any"
                  placeholder="35000"
                  required
                  class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas py-2.5 pl-8 pr-3 text-sm font-extrabold text-slate-900 placeholder-slate-400 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
                />
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Categoría Oficial
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
          </div>

          <!-- Campos adicionales si es compra a crédito -->
          <div
            v-if="isCredit"
            class="space-y-3 rounded-2xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20"
          >
            <div class="flex items-center gap-1.5 text-xs font-extrabold text-amber-700 dark:text-amber-400">
              <CreditCard class="h-4 w-4" />
              <span>Condiciones del Financiamiento</span>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Acreedor / Proveedor o Entidad *
              </label>
              <input
                v-model="creditor"
                type="text"
                placeholder="Ej: Distribuidora Láctea del Norte, Banco..."
                required
                class="w-full rounded-xl border border-surface-light-border bg-white px-3.5 py-2 text-xs font-semibold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-card dark:text-white"
              />
            </div>

            <div class="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              <div>
                <label class="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Número de Cuotas
                </label>
                <input
                  v-model.number="totalInstallments"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="6"
                  class="w-full rounded-xl border border-surface-light-border bg-white px-3 py-1.5 text-xs font-extrabold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-card dark:text-white"
                />
              </div>

              <div>
                <label class="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Frecuencia de Pago
                </label>
                <select
                  v-model="frequency"
                  class="w-full rounded-xl border border-surface-light-border bg-white px-3 py-1.5 text-xs font-bold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-card dark:text-white"
                >
                  <option value="MENSUAL">Mensual</option>
                  <option value="QUINCENAL">Quincenal</option>
                  <option value="SEMANAL">Semanal</option>
                </select>
              </div>

              <div>
                <label class="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Cuota Inicial ($)
                </label>
                <input
                  v-model.number="initialPayment"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0"
                  class="w-full rounded-xl border border-surface-light-border bg-white px-3 py-1.5 text-xs font-extrabold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-card dark:text-white"
                />
              </div>
            </div>

            <!-- Resumen de Cuota Estimada -->
            <div class="flex items-center justify-between rounded-xl bg-white p-2.5 text-xs dark:bg-surface-dark-card">
              <span class="font-bold text-slate-500">Valor estimado por cuota:</span>
              <span class="font-black text-amber-600 dark:text-amber-400">
                $ {{ new Intl.NumberFormat('es-CO').format(calculatedInstallment) }}
              </span>
            </div>
          </div>

          <!-- Medio de Pago y Fecha -->
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {{ isCredit ? 'Canal de Cuota Inicial' : 'Medio de Pago' }}
              </label>
              <select
                v-model="paymentMethod"
                class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
              >
                <option value="EFECTIVO">Efectivo Caja Menor</option>
                <option value="NEQUI_BANCOLOMBIA">Nequi o Bancolombia</option>
              </select>
            </div>

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
          </div>

          <!-- Responsable y Notas -->
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Registrado por
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
                Notas / N° Comprobante
              </label>
              <input
                v-model="notes"
                type="text"
                placeholder="Factura #1234, ticket..."
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
              <span>{{ isSubmitting ? 'Guardando...' : (isCredit ? 'Asentar Compra' : 'Registrar Gasto') }}</span>
            </button>
          </div>
        </form>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
