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
  ShoppingBag,
  Plus,
  X,
  AlertCircle,
} from 'lucide-vue-next';
import { http } from '@/api/client';
import { toast } from 'vue-sonner';
import { getTodayDateBogota } from '@/stores/finance.store';

export interface MaterialOption {
  id: number;
  name: string;
  category: string;
  unit: string;
  currentStock: number;
  minStockAlert?: number;
  avgCost: number;
  code?: string;
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

// Estado del formulario
const selectedMaterialId = ref<number | null>(null);
const quantity = ref<number | ''>('');
const unitCost = ref<number | ''>('');
const totalCost = ref<number | ''>('');
const supplier = ref('');
const purchaseDate = ref(getTodayDateBogota());
const paymentMethod = ref('EFECTIVO');
const notes = ref('');
const registeredBy = ref('Edier');
const registerExpense = ref(true);

const isSubmitting = ref(false);
const errorMessage = ref('');

// Sincronización al abrir modal
watch(
  () => [props.open, props.preselectedMaterialId],
  ([isOpen, preselected]) => {
    if (isOpen) {
      errorMessage.value = '';
      quantity.value = '';
      unitCost.value = '';
      totalCost.value = '';
      supplier.value = '';
      notes.value = '';
      purchaseDate.value = getTodayDateBogota();
      paymentMethod.value = 'EFECTIVO';
      registerExpense.value = true;

      if (preselected) {
        selectedMaterialId.value = preselected as number;
        const mat = props.materials.find((m) => m.id === preselected);
        if (mat && mat.avgCost > 0) {
          unitCost.value = mat.avgCost;
        }
      } else if (props.materials.length > 0 && !selectedMaterialId.value) {
        selectedMaterialId.value = props.materials[0].id;
        if (props.materials[0].avgCost > 0) {
          unitCost.value = props.materials[0].avgCost;
        }
      }
    }
  },
  { immediate: true }
);

// Insumo seleccionado
const currentMaterial = computed(() => {
  return props.materials.find((m) => m.id === selectedMaterialId.value);
});

// Al cambiar de insumo sugerir el costo unitario existente
function handleMaterialChange() {
  if (currentMaterial.value && currentMaterial.value.avgCost > 0 && !unitCost.value) {
    unitCost.value = currentMaterial.value.avgCost;
    calculateCostsFromUnit();
  }
}

// Sincronización bidireccional de costos
function calculateCostsFromUnit() {
  const qty = typeof quantity.value === 'number' ? quantity.value : 0;
  const unit = typeof unitCost.value === 'number' ? unitCost.value : 0;
  if (qty > 0 && unit >= 0) {
    totalCost.value = Math.round(qty * unit);
  }
}

function calculateCostsFromTotal() {
  const qty = typeof quantity.value === 'number' ? quantity.value : 0;
  const tot = typeof totalCost.value === 'number' ? totalCost.value : 0;
  if (qty > 0 && tot >= 0) {
    unitCost.value = Math.round((tot / qty) * 100) / 100;
  }
}

function handleQuantityInput() {
  if (typeof unitCost.value === 'number' && unitCost.value > 0) {
    calculateCostsFromUnit();
  } else if (typeof totalCost.value === 'number' && totalCost.value > 0) {
    calculateCostsFromTotal();
  }
}

// Proyecciones de stock y costo promedio ponderado (PMP)
const projectedNewStock = computed(() => {
  if (!currentMaterial.value) return 0;
  const curr = currentMaterial.value.currentStock || 0;
  const qty = typeof quantity.value === 'number' ? quantity.value : 0;
  return Math.round((curr + qty) * 1000) / 1000;
});

const projectedNewAvgCost = computed(() => {
  if (!currentMaterial.value) return 0;
  const currStock = currentMaterial.value.currentStock || 0;
  const currAvg = currentMaterial.value.avgCost || 0;
  const qty = typeof quantity.value === 'number' ? quantity.value : 0;
  const tCost = typeof totalCost.value === 'number' ? totalCost.value : 0;

  const totalStock = currStock + qty;
  if (totalStock <= 0) return 0;

  const totalValue = currStock * currAvg + tCost;
  return Math.round(totalValue / totalStock);
});

// Formateador de moneda
const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(val || 0);
};

const isFormValid = computed(() => {
  const qty = typeof quantity.value === 'number' ? quantity.value : 0;
  const tot = typeof totalCost.value === 'number' ? totalCost.value : 0;
  return (
    selectedMaterialId.value !== null &&
    qty > 0 &&
    tot >= 0 &&
    !isSubmitting.value
  );
});

function handleClose() {
  emit('update:open', false);
  errorMessage.value = '';
}

async function handleSubmit() {
  if (!isFormValid.value || !currentMaterial.value) return;

  const qty = Number(quantity.value);
  const tot = Number(totalCost.value);
  const unit = typeof unitCost.value === 'number' && unitCost.value > 0
    ? Number(unitCost.value)
    : (qty > 0 ? tot / qty : 0);

  isSubmitting.value = true;
  errorMessage.value = '';

  try {
    const payload = {
      rawMaterialId: selectedMaterialId.value,
      quantity: qty,
      unitCost: Math.round(unit * 100) / 100,
      totalCost: Math.round(tot),
      supplier: supplier.value.trim() || null,
      purchaseDate: purchaseDate.value,
      paymentMethod: paymentMethod.value,
      notes: notes.value.trim() || null,
      registeredBy: registeredBy.value.trim() || 'Edier',
      registerExpense: registerExpense.value,
      expenseCategory: 'INSUMOS_EXTRA',
    };

    await http.post('/inventory/purchases', payload);

    toast.success(
      `Compra registrada exitosamente: +${qty} ${currentMaterial.value.unit} de ${currentMaterial.value.name}`,
      { duration: 4000 }
    );

    emit('saved');
    handleClose();
  } catch (err: any) {
    errorMessage.value =
      err?.response?.data?.error ||
      err?.message ||
      'Error al registrar la compra de materia prima';
    toast.error(errorMessage.value);
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <DialogRoot :open="open" @update:open="emit('update:open', $event)">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm transition-opacity" />
      <DialogContent
        class="fixed left-[50%] top-[50%] z-50 max-h-[90vh] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl border border-surface-light-border bg-surface-light-canvas p-6 shadow-2xl transition-all focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas sm:p-7"
      >
        <!-- Cabecera del Modal -->
        <div class="flex items-start justify-between border-b border-surface-light-border pb-4 dark:border-surface-dark-border">
          <div class="flex items-center gap-3">
            <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-800 dark:bg-brand-900/40 dark:text-brand-darkText">
              <ShoppingBag class="h-5 w-5 stroke-[2.2]" />
            </div>
            <div>
              <DialogTitle class="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                Registrar Compra / Entrada
              </DialogTitle>
              <DialogDescription class="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Abastecimiento de stock físico y recálculo de costo promedio ponderado
              </DialogDescription>
            </div>
          </div>
          <button
            type="button"
            @click="handleClose"
            class="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            title="Cerrar"
          >
            <X class="h-5 w-5 stroke-[2]" />
          </button>
        </div>

        <form @submit.prevent="handleSubmit" class="mt-5 space-y-4">
          <!-- 1. Selección de Insumo -->
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Insumo o Materia Prima a Reabastecer *
            </label>
            <select
              v-model.number="selectedMaterialId"
              @change="handleMaterialChange"
              required
              class="w-full rounded-xl border border-surface-light-border bg-surface-light-card px-3.5 py-2.5 text-xs font-extrabold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-card dark:text-white"
            >
              <option v-for="mat in materials" :key="mat.id" :value="mat.id">
                {{ mat.name }} (Stock: {{ mat.currentStock }} {{ mat.unit }} | Costo: {{ formatCurrency(mat.avgCost) }})
              </option>
            </select>
          </div>

          <!-- 2. Cantidad Adquirida y Costos -->
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Cantidad Adquirida *
              </label>
              <div class="relative">
                <input
                  v-model.number="quantity"
                  @input="handleQuantityInput"
                  type="number"
                  min="0.001"
                  step="any"
                  required
                  placeholder="0"
                  class="w-full rounded-xl border border-surface-light-border bg-surface-light-card px-3.5 py-2.5 text-sm font-extrabold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-card dark:text-white"
                />
                <span class="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  {{ currentMaterial?.unit || 'und' }}
                </span>
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Costo Unitario ($ COP)
              </label>
              <div class="relative">
                <input
                  v-model.number="unitCost"
                  @input="calculateCostsFromUnit"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0"
                  class="w-full rounded-xl border border-surface-light-border bg-surface-light-card px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-card dark:text-white"
                />
                <span class="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  COP
                </span>
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Costo Total Pagado *
              </label>
              <div class="relative">
                <input
                  v-model.number="totalCost"
                  @input="calculateCostsFromTotal"
                  type="number"
                  min="0"
                  step="any"
                  required
                  placeholder="0"
                  class="w-full rounded-xl border border-surface-light-border bg-surface-light-card px-3.5 py-2.5 text-sm font-extrabold text-brand-800 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-card dark:text-brand-darkText"
                />
                <span class="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  COP
                </span>
              </div>
            </div>
          </div>

          <!-- 3. Tarjeta de Proyección de PMP y Stock -->
          <div
            v-if="currentMaterial"
            class="rounded-2xl border border-surface-light-border bg-surface-light-card p-4 dark:border-surface-dark-border dark:bg-surface-dark-card"
          >
            <div class="flex items-center justify-between border-b border-slate-100 pb-2.5 text-xs dark:border-slate-800">
              <span class="font-bold text-slate-500 dark:text-slate-400">Existencias Resultantes:</span>
              <div class="flex items-center gap-2">
                <span class="text-slate-400">{{ currentMaterial.currentStock }} {{ currentMaterial.unit }}</span>
                <span class="text-slate-400">&rarr;</span>
                <span class="font-black text-emerald-600 dark:text-emerald-400">
                  {{ projectedNewStock }} {{ currentMaterial.unit }}
                </span>
              </div>
            </div>

            <div class="flex items-center justify-between pt-2.5 text-xs">
              <span class="font-bold text-slate-500 dark:text-slate-400">Nuevo Costo Promedio (PMP):</span>
              <div class="flex items-center gap-2">
                <span class="text-slate-400">{{ formatCurrency(currentMaterial.avgCost) }}</span>
                <span class="text-slate-400">&rarr;</span>
                <span class="font-black text-slate-900 dark:text-white">
                  {{ formatCurrency(projectedNewAvgCost) }} / {{ currentMaterial.unit }}
                </span>
              </div>
            </div>
          </div>

          <!-- 4. Proveedor y Método de Pago -->
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Proveedor <span class="font-normal text-slate-400">(Opcional)</span>
              </label>
              <input
                v-model="supplier"
                type="text"
                placeholder="Ej. Lácteos del Norte, Envases S.A.S."
                class="w-full rounded-xl border border-surface-light-border bg-surface-light-card px-3.5 py-2 text-xs font-bold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-card dark:text-white"
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Método de Pago
              </label>
              <select
                v-model="paymentMethod"
                class="w-full rounded-xl border border-surface-light-border bg-surface-light-card px-3.5 py-2 text-xs font-bold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-card dark:text-white"
              >
                <option value="EFECTIVO">Efectivo</option>
                <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                <option value="NEQUI">Nequi</option>
                <option value="BANCOLOMBIA">Bancolombia</option>
              </select>
            </div>
          </div>

          <!-- 5. Fecha y Responsable -->
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Fecha de Compra
              </label>
              <input
                v-model="purchaseDate"
                type="date"
                required
                class="w-full rounded-xl border border-surface-light-border bg-surface-light-card px-3.5 py-2 text-xs font-bold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-card dark:text-white"
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Responsable
              </label>
              <input
                v-model="registeredBy"
                type="text"
                placeholder="Edier"
                class="w-full rounded-xl border border-surface-light-border bg-surface-light-card px-3.5 py-2 text-xs font-bold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-card dark:text-white"
              />
            </div>
          </div>

          <!-- 6. Toggle de Egreso Automático en Caja -->
          <div class="rounded-2xl border border-surface-light-border bg-surface-light-card p-3.5 dark:border-surface-dark-border dark:bg-surface-dark-card">
            <label class="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                v-model="registerExpense"
                class="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-800 focus:ring-brand-800 dark:border-slate-700"
              />
              <div class="space-y-0.5">
                <span class="block text-xs font-extrabold text-slate-900 dark:text-white">
                  Registrar egreso en Caja / Gastos Operativos automáticamente
                </span>
                <p class="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Crea un registro de egreso contable en la categoría de Insumos para cuadre de caja inmediato.
                </p>
              </div>
            </label>
          </div>

          <!-- 7. Observaciones -->
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Notas / Observaciones <span class="font-normal text-slate-400">(Opcional)</span>
            </label>
            <textarea
              v-model="notes"
              rows="2"
              placeholder="Número de factura, detalles de entrega o estado del material..."
              class="w-full rounded-xl border border-surface-light-border bg-surface-light-card px-3.5 py-2 text-xs font-medium text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-card dark:text-white resize-none"
            ></textarea>
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
              :disabled="!isFormValid || isSubmitting"
              class="inline-flex items-center gap-2 rounded-xl bg-hero-gradient px-5 py-2.5 text-xs font-extrabold text-white shadow-card transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus class="h-4 w-4 stroke-[2.5]" />
              <span v-if="isSubmitting">Registrando...</span>
              <span v-else>Guardar Entrada de Stock</span>
            </button>
          </div>
        </form>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
