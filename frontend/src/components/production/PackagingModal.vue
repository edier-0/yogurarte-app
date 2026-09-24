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
  PackageCheck,
  X,
  AlertCircle,
  ShoppingCart,
  Sparkles,
  Milk,
} from 'lucide-vue-next';
import { useProductionStore, type BatchItem, type BatchPackagingPayload } from '@/stores/production.store';
import { getTodayDateBogota } from '@/stores/finance.store';
import { http } from '@/api/client';

const props = defineProps<{
  open: boolean;
  batch: BatchItem | null;
}>();

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void;
  (e: 'packaged'): void;
}>();

const productionStore = useProductionStore();

// Estado del formulario
const baseFlavor = ref<string>('Natural');
const customFlavorName = ref<string>('');
const flavorVariant = ref<string>('');
const bottles1L = ref<number>(0);
const bottles2L = ref<number>(0);
const fruitRawMaterialId = ref<number | null>(null);
const fruitQuantityUsed = ref<number>(0);
const notes = ref<string>('');
const packagedBy = ref<string>('Edier');
const packagedAt = ref<string>(getTodayDateBogota());

// Pre-ventas
const pendingOrders = ref<any[]>([]);
const selectedOrderIds = ref<number[]>([]);
const isLoadingOrders = ref<boolean>(false);

// Insumos de frutas / mermeladas
interface FruitMaterialItem {
  id: number;
  name: string;
  code: string;
  unit: string;
  currentStock: number;
  avgCost: number;
  category: string;
}
const fruitMaterials = ref<FruitMaterialItem[]>([]);
const isLoadingMaterials = ref<boolean>(false);

// Control de envío
const isSubmitting = ref<boolean>(false);
const errorMessage = ref<string | null>(null);

// Sabores disponibles
const flavors = computed(() => {
  const activeNames = productionStore.activeFlavors.map((f) => f.name);
  if (activeNames.length === 0) {
    return [
      'Natural',
      'Fresa',
      'Melocotón',
      'Mora',
      'Frutos Rojos',
      'Maracuyá',
      'Guanábana',
      'Arequipe',
      'Piña',
      'Personalizado',
    ];
  }
  return [...activeNames, 'Personalizado'];
});

// Sabor resuelto
const resolvedFlavor = computed(() => {
  if (baseFlavor.value === 'Personalizado') {
    return customFlavorName.value.trim() || 'Artesanal';
  }
  if (flavorVariant.value.trim()) {
    return `${baseFlavor.value} (${flavorVariant.value.trim()})`;
  }
  return baseFlavor.value;
});

// Litros requeridos por las botellas
const requiredLiters = computed(() => {
  const b1 = Number(bottles1L.value) || 0;
  const b2 = Number(bottles2L.value) || 0;
  return b1 * 1.0 + b2 * 2.0;
});

// Litros sin envasar del lote
const unpackagedLiters = computed(() => {
  if (!props.batch) return 0;
  const total = Number(props.batch.totalLitersProduced) || Number(props.batch.milkUsedLiters) || 0;
  const packaged = Number(props.batch.packagedLiters) || 0;
  return Math.max(0, Math.round((total - packaged) * 100) / 100);
});

// Validación de capacidad
const exceedsVolume = computed(() => {
  return requiredLiters.value > (unpackagedLiters.value + 0.05);
});

const isValid = computed(() => {
  return (
    requiredLiters.value > 0 &&
    !exceedsVolume.value &&
    resolvedFlavor.value.trim().length > 0 &&
    !isSubmitting.value
  );
});

// Total de litros requeridos por las órdenes pre-seleccionadas
const selectedOrdersTotalLiters = computed(() => {
  return pendingOrders.value
    .filter((o) => selectedOrderIds.value.includes(o.id))
    .reduce((sum, o) => sum + (Number(o.totalLiters) || 0), 0);
});

// Cargar insumos de frutas / preparaciones
async function loadFruitMaterials() {
  if (fruitMaterials.value.length > 0) return;
  isLoadingMaterials.value = true;
  try {
    const list = await http.get<FruitMaterialItem[]>('/inventory/materials');
    if (Array.isArray(list)) {
      fruitMaterials.value = list.filter(
        (m) =>
          m.category === 'INSUMO' ||
          m.category === 'MATERIA_PRIMA' ||
          m.name.toLowerCase().includes('mermelada') ||
          m.name.toLowerCase().includes('fruta') ||
          m.name.toLowerCase().includes('pulpa')
      );
    }
  } catch {
    fruitMaterials.value = [];
  } finally {
    isLoadingMaterials.value = false;
  }
}

// Cargar pedidos pre-venta para el sabor
async function loadPendingOrders(flavor: string) {
  isLoadingOrders.value = true;
  try {
    const res = await productionStore.fetchPendingOrders(flavor);
    pendingOrders.value = res.orders || [];
    // Deseleccionar IDs que ya no estén
    selectedOrderIds.value = selectedOrderIds.value.filter((id) =>
      pendingOrders.value.some((o) => o.id === id)
    );
  } catch {
    pendingOrders.value = [];
  } finally {
    isLoadingOrders.value = false;
  }
}

// Alternar selección de una orden
function toggleOrderSelection(orderId: number) {
  const idx = selectedOrderIds.value.indexOf(orderId);
  if (idx >= 0) {
    selectedOrderIds.value.splice(idx, 1);
  } else {
    selectedOrderIds.value.push(orderId);
  }
}

// Seleccionar todas o ninguna
function toggleAllOrders() {
  if (selectedOrderIds.value.length === pendingOrders.value.length) {
    selectedOrderIds.value = [];
  } else {
    selectedOrderIds.value = pendingOrders.value.map((o) => o.id);
  }
}

// Observador cuando cambia el modal o el lote
watch(
  () => [props.open, props.batch],
  async ([isOpen, currentBatch]) => {
    if (isOpen && currentBatch) {
      errorMessage.value = null;
      baseFlavor.value = (currentBatch as BatchItem).flavor || 'Natural';
      customFlavorName.value = '';
      flavorVariant.value = '';
      bottles1L.value = 0;
      bottles2L.value = 0;
      fruitRawMaterialId.value = null;
      fruitQuantityUsed.value = 0;
      notes.value = '';
      packagedBy.value = 'Edier';
      packagedAt.value = getTodayDateBogota();
      selectedOrderIds.value = [];

      await Promise.all([loadFruitMaterials(), loadPendingOrders(resolvedFlavor.value)]);
    }
  },
  { immediate: true }
);

// Observador al cambiar el sabor para refrescar las pre-ventas
watch(
  resolvedFlavor,
  (newFlavor) => {
    if (props.open && newFlavor) {
      loadPendingOrders(newFlavor);
    }
  }
);

function handleClose() {
  emit('update:open', false);
}

async function handleSubmit() {
  if (!isValid.value || !props.batch) return;

  isSubmitting.value = true;
  errorMessage.value = null;

  try {
    const payload: BatchPackagingPayload = {
      flavor: resolvedFlavor.value,
      bottles1L: Number(bottles1L.value) || 0,
      bottles2L: Number(bottles2L.value) || 0,
      fruitRawMaterialId: fruitRawMaterialId.value ? Number(fruitRawMaterialId.value) : undefined,
      fruitQuantityUsed: fruitQuantityUsed.value ? Number(fruitQuantityUsed.value) : undefined,
      notes: notes.value ? notes.value.trim() : undefined,
      packagedBy: packagedBy.value ? packagedBy.value.trim() : 'Edier',
      packagedAt: packagedAt.value || getTodayDateBogota(),
      linkOrderIds: selectedOrderIds.value.length > 0 ? selectedOrderIds.value : undefined,
    };

    await productionStore.packageBatch(props.batch.id, payload);
    emit('packaged');
    handleClose();
  } catch (err: any) {
    errorMessage.value = err?.message || 'Error al registrar el envasado';
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
        class="fixed left-1/2 top-1/2 z-50 w-[95%] max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-surface-light-border bg-surface-light-card p-6 shadow-2xl transition-all focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-card sm:p-7 max-h-[92vh] overflow-y-auto"
      >
        <!-- Cabecera del Diálogo -->
        <div class="flex items-center justify-between border-b border-surface-light-border pb-4 dark:border-surface-dark-border">
          <div class="flex items-center gap-2.5">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <PackageCheck class="h-5 w-5 stroke-[2]" />
            </div>
            <div>
              <DialogTitle class="text-base font-extrabold text-slate-900 dark:text-white sm:text-lg">
                Envasar y Fraccionar Lote
              </DialogTitle>
              <DialogDescription class="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Fase B · Fraccionamiento multi-sabor, botellas y vinculación de pre-ventas
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
          <!-- Resumen del Lote Madre -->
          <div v-if="batch" class="rounded-2xl border border-surface-light-border bg-slate-50/70 p-3.5 dark:border-surface-dark-border dark:bg-surface-dark-canvas">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <span class="rounded-lg bg-surface-light-card px-2.5 py-1 font-mono text-xs font-black text-brand-800 border border-slate-200 dark:border-slate-700 dark:bg-surface-dark-card dark:text-brand-darkText">
                  {{ batch.batchCode }}
                </span>
                <span class="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                  Base: {{ batch.flavor }}
                </span>
              </div>

              <!-- Indicador de Litros Restantes -->
              <div class="flex items-center gap-3 text-xs">
                <div>
                  <span class="text-[11px] text-slate-400">Total Lote:</span>
                  <span class="ml-1 font-bold text-slate-700 dark:text-slate-300">
                    {{ batch.totalLitersProduced || batch.milkUsedLiters }} L
                  </span>
                </div>
                <div>
                  <span class="text-[11px] text-slate-400">Sin Envasar:</span>
                  <span
                    class="ml-1 rounded-md px-1.5 py-0.5 font-black"
                    :class="
                      unpackagedLiters > 0
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                    "
                  >
                    {{ unpackagedLiters }} L
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Selección del Sabor de la Fracción -->
          <div class="space-y-3 rounded-2xl border border-surface-light-border bg-surface-light-card p-4 dark:border-surface-dark-border dark:bg-surface-dark-card">
            <div class="flex items-center gap-1.5 text-xs font-extrabold text-slate-800 dark:text-white">
              <Sparkles class="h-4 w-4 text-purple-500" />
              <span>Sabor de la Fracción a Envasar</span>
            </div>

            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label class="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Catálogo de Sabores *
                </label>
                <select
                  v-model="baseFlavor"
                  class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2 text-xs font-bold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
                >
                  <option v-for="fl in flavors" :key="fl" :value="fl">
                    {{ fl }}
                  </option>
                </select>
              </div>

              <!-- Variante o Manual -->
              <div v-if="baseFlavor === 'Personalizado'">
                <label class="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Sabor Artesanal *
                </label>
                <input
                  v-model="customFlavorName"
                  type="text"
                  required
                  placeholder="Ej. Frutos Silvestres"
                  class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2 text-xs font-bold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
                />
              </div>

              <div v-else>
                <label class="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Variante <span class="font-normal text-slate-400">(Opcional)</span>
                </label>
                <input
                  v-model="flavorVariant"
                  type="text"
                  placeholder="Ej. bajo en azúcar, con stevia..."
                  class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2 text-xs font-bold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
                />
              </div>
            </div>

            <!-- Previsualización del Sabor Final -->
            <div class="flex items-center justify-between border-t border-slate-100 pt-2 dark:border-slate-800">
              <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Sabor Final Registrado:
              </span>
              <span class="rounded-lg bg-purple-50 px-2 py-0.5 text-xs font-black text-purple-800 dark:bg-purple-950/40 dark:text-purple-300">
                {{ resolvedFlavor }}
              </span>
            </div>
          </div>

          <!-- Botellas a Envasar (1L y 2L) -->
          <div class="space-y-3 rounded-2xl border border-surface-light-border bg-surface-light-card p-4 dark:border-surface-dark-border dark:bg-surface-dark-card">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-1.5 text-xs font-extrabold text-slate-800 dark:text-white">
                <Milk class="h-4 w-4 text-emerald-500" />
                <span>Fraccionamiento en Envases</span>
              </div>
              <div class="text-right text-xs">
                <span class="text-slate-400">Volumen requerido:</span>
                <span
                  class="ml-1 font-black"
                  :class="exceedsVolume ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'"
                >
                  {{ requiredLiters }} L
                </span>
                <span class="text-slate-400"> / {{ unpackagedLiters }} L libres</span>
              </div>
            </div>

            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Botellas de 1 Litro
                </label>
                <div class="relative">
                  <input
                    v-model.number="bottles1L"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2.5 text-sm font-extrabold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
                  />
                  <span class="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    Unds (1L)
                  </span>
                </div>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Botellas de 2 Litros
                </label>
                <div class="relative">
                  <input
                    v-model.number="bottles2L"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2.5 text-sm font-extrabold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
                  />
                  <span class="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    Unds (2L)
                  </span>
                </div>
              </div>
            </div>

            <!-- Advertencia si excede el saldo libre -->
            <div
              v-if="exceedsVolume"
              class="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50/80 p-2.5 text-xs font-semibold text-rose-800 dark:border-rose-800/40 dark:bg-rose-950/30 dark:text-rose-300"
            >
              <AlertCircle class="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>
                El volumen requerido ({{ requiredLiters }}L) supera el saldo disponible sin envasar del lote ({{ unpackagedLiters }}L). Reduce las unidades.
              </span>
            </div>
          </div>

          <!-- Fruta o Mermelada Opcional -->
          <div class="space-y-3 rounded-2xl border border-surface-light-border bg-surface-light-card p-4 dark:border-surface-dark-border dark:bg-surface-dark-card">
            <div class="flex items-center justify-between">
              <label class="text-xs font-extrabold text-slate-800 dark:text-white">
                Fruta o Mermelada Utilizada <span class="font-normal text-slate-400">(Opcional)</span>
              </label>
              <span class="text-[11px] text-slate-400">Descuenta del inventario</span>
            </div>

            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <select
                  v-model.number="fruitRawMaterialId"
                  class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2 text-xs font-bold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
                >
                  <option :value="null">-- Ninguna / Sin fruta extra --</option>
                  <option v-for="mat in fruitMaterials" :key="mat.id" :value="mat.id">
                    {{ mat.name }} (Stock: {{ mat.currentStock }} {{ mat.unit }})
                  </option>
                </select>
              </div>

              <div v-if="fruitRawMaterialId">
                <input
                  v-model.number="fruitQuantityUsed"
                  type="number"
                  min="0.01"
                  step="any"
                  placeholder="Cantidad utilizada (g o kg)"
                  class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2 text-xs font-bold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
                />
              </div>
            </div>
          </div>

          <!-- Pre-ventas Pendientes por Sabor -->
          <div class="space-y-3 rounded-2xl border border-surface-light-border bg-surface-light-card p-4 dark:border-surface-dark-border dark:bg-surface-dark-card">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-1.5 text-xs font-extrabold text-slate-800 dark:text-white">
                <ShoppingCart class="h-4 w-4 text-brand-700 dark:text-brand-darkText" />
                <span>Pre-ventas Disponibles para Vincular</span>
                <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {{ pendingOrders.length }}
                </span>
              </div>

              <button
                v-if="pendingOrders.length > 0"
                type="button"
                @click="toggleAllOrders"
                class="text-[11px] font-bold text-brand-800 hover:underline dark:text-brand-darkText"
              >
                {{ selectedOrderIds.length === pendingOrders.length ? 'Deseleccionar todas' : 'Vincular todas' }}
              </button>
            </div>

            <!-- Listado de Pre-ventas -->
            <div v-if="isLoadingOrders" class="py-4 text-center text-xs text-slate-400">
              Consultando pedidos en pre-venta...
            </div>

            <div v-else-if="pendingOrders.length === 0" class="rounded-xl border border-dashed border-slate-200 p-3.5 text-center text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
              No hay encargos en pre-venta registrados para el sabor {{ resolvedFlavor }}.
            </div>

            <div v-else class="max-h-48 space-y-2 overflow-y-auto pr-1">
              <div
                v-for="order in pendingOrders"
                :key="order.id"
                @click="toggleOrderSelection(order.id)"
                class="flex cursor-pointer items-center justify-between rounded-xl border p-2.5 transition-all"
                :class="
                  selectedOrderIds.includes(order.id)
                    ? 'border-emerald-500 bg-emerald-50/50 dark:border-emerald-700/60 dark:bg-emerald-950/20'
                    : 'border-slate-200 bg-surface-light-canvas hover:border-slate-300 dark:border-slate-700 dark:bg-surface-dark-canvas'
                "
              >
                <div class="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    :checked="selectedOrderIds.includes(order.id)"
                    class="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
                    @click.stop="toggleOrderSelection(order.id)"
                  />
                  <div>
                    <div class="flex items-center gap-1.5">
                      <span class="font-mono text-xs font-bold text-brand-800 dark:text-brand-darkText">
                        #{{ order.orderNumber || order.orderCode || order.id }}
                      </span>
                      <span class="text-xs font-extrabold text-slate-800 dark:text-white">
                        {{ order.customer?.fullName || 'Cliente' }}
                      </span>
                    </div>
                    <p class="text-[11px] text-slate-400">
                      {{ order.customer?.phone || 'Sin teléfono' }}
                    </p>
                  </div>
                </div>

                <div class="text-right text-xs">
                  <span class="font-bold text-emerald-600 dark:text-emerald-400">
                    {{ order.totalLiters }} L
                  </span>
                  <p class="text-[10px] text-slate-400">
                    ${{ (order.totalAmount || 0).toLocaleString('es-CO') }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Resumen de pre-ventas seleccionadas -->
            <div
              v-if="selectedOrderIds.length > 0"
              class="flex items-center justify-between border-t border-slate-100 pt-2 text-xs dark:border-slate-800"
            >
              <span class="text-slate-500">
                {{ selectedOrderIds.length }} pedido(s) seleccionado(s)
              </span>
              <span class="font-bold text-slate-700 dark:text-slate-300">
                Compromete: {{ selectedOrdersTotalLiters }} L
              </span>
            </div>
          </div>

          <!-- Fecha, Responsable y Notas -->
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Fecha de Envasado
              </label>
              <input
                v-model="packagedAt"
                type="date"
                required
                class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2 text-xs font-bold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Responsable
              </label>
              <input
                v-model="packagedBy"
                type="text"
                placeholder="Edier"
                class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2 text-xs font-bold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
              />
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Notas del Envasado <span class="font-normal text-slate-400">(Opcional)</span>
            </label>
            <textarea
              v-model="notes"
              rows="2"
              placeholder="Detalles de la preparación, textura o recomendaciones..."
              class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2 text-xs font-medium text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white resize-none"
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
              :disabled="!isValid || isSubmitting"
              class="inline-flex items-center gap-2 rounded-xl bg-hero-gradient px-5 py-2.5 text-xs font-extrabold text-white shadow-card transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PackageCheck class="h-4 w-4 stroke-[2.5]" />
              <span v-if="isSubmitting">Registrando...</span>
              <span v-else>Confirmar Envasado ({{ requiredLiters }}L)</span>
            </button>
          </div>
        </form>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
